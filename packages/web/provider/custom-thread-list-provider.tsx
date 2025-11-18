"use client";

import { useState, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  unstable_useRemoteThreadListRuntime as useRemoteThreadListRuntime,
  type unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  useAssistantState,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { up } from "up-fetch";
import z from "zod";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useChat } from "@ai-sdk/react";
import { v4 as uuidv4 } from "uuid";

// Next.js API Route経由でMastraを呼び出す
const upFetch = up(fetch,()=> ({
    baseUrl: "/api",
    retry: {
        attempts: 3,
        delay: 1000,
    },
}));

const RESOURCE_ID = "ramenAgent"; // 実運用時はユーザーIDを動的に設定
const AGENT_ID = "ramenAgent";

const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    try {
      const threads = await upFetch("/memory/threads", {
        schema: z.array(z.object({
          id: z.string(),
          resourceId: z.string(),
          title: z.string().nullable(),
          metadata: z.object({ archived: z.boolean().optional() }).optional().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })),
        params: {
          resourceid: RESOURCE_ID,
          agentId: AGENT_ID,
          orderBy: "updatedAt",
          sortDirection: "DESC"
        }
      });
      
      return {
        threads: threads.map((thread) => ({
          remoteId: thread.id,
          externalId: thread.id,
          title: thread.title ?? "新しい会話",
          status: thread.metadata?.archived ? "archived" : "regular",
        })),
      };
    } catch (error) {
      console.error("Failed to fetch threads:", error);
      return { threads: [] };
    }
  },
  
  async initialize(localId) {
    const result = await upFetch("/memory/threads", {
      method: "POST",
      schema: z.object({
        id: z.string(),
        resourceId: z.string(),
        title: z.string().nullable(),
      }),
      params: { agentId: AGENT_ID },
      body: {
        threadId: localId,
        resourceId: RESOURCE_ID,
        title: "新しい会話",
        metadata: { archived: false },
      },
    });
    
    return { remoteId: result.id, externalId: result.id };
  },
  
  async rename(remoteId, title) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "PATCH",
      params: { agentId: AGENT_ID },
      body: { title },
    });
  },
  
  async archive(remoteId) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "PATCH",
      params: { agentId: AGENT_ID },
      body: { metadata: { archived: true } },
    });
  },
  
  async unarchive(remoteId) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "PATCH",
      params: { agentId: AGENT_ID },
      body: { metadata: { archived: false } },
    });
  },
  
  async delete(remoteId) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "DELETE",
      params: { agentId: AGENT_ID },
    });
  },
  
  async fetch(remoteId) {
    const thread = await upFetch(`/memory/threads/${remoteId}`, {
      schema: z.object({
        id: z.string(),
        title: z.string().nullable(),
        metadata: z.object({ archived: z.boolean().optional() }).optional().nullable(),
      }),
      params: { agentId: AGENT_ID },
    });
    
    return {
      status: thread.metadata?.archived ? "archived" : "regular",
      remoteId: thread.id,
      title: thread.title ?? "新しい会話",
    };
  },
  
  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      // メッセージから簡易的にタイトルを生成
      const firstUserMessage = messages.find((m) => m.role === "user");
      const content = firstUserMessage?.content[0];
      const title = content && 'text' in content
        ? content.text.slice(0, 30) + (content.text.length > 30 ? "..." : "")
        : "新しい会話";
      
      // タイトルをMastraに保存
      await upFetch(`/memory/threads/${remoteId}`, {
        method: "PATCH",
        params: { agentId: AGENT_ID },
        body: { title },
      });
      
      controller.appendText(title);
      controller.close();
    });
  },
};

// RuntimeHookコンポーネント: 各スレッドのランタイムを作成
function RuntimeHook() {
  const id = useAssistantState(({ threadListItem }) => threadListItem.id);

  const [threadId, setThreadId] = useState(uuidv4());

  if(!id && !threadId){
    setThreadId(uuidv4());
  }

  const transport = new AssistantChatTransport({
    api: "/api/chat", // Next.js API Route経由
    body: {
      resourceId: RESOURCE_ID,
      threadId: threadId,
    },
    prepareSendMessagesRequest({messages,body}) {
      // idをUUIDに変換して送信する処理
      const changedMessagesId = messages.map((message) => ({
        ...message,
        messageId: uuidv4(),
      }))
      return {
        body: {
          ...body,
          messages: changedMessagesId,
        }
      };
    },
  });
  
  const chat = useChat({
    id,
    transport,
  });

  const runtime = useAISDKRuntime(chat);

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
  }

  return runtime;
}

export function CustomThreadListProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  // マルチスレッド機能を追加
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: RuntimeHook,
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}