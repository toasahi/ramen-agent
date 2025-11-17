"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
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
import type { Message } from "ai";

const upFetch = up(fetch,()=> ({
    baseUrl: "http://localhost:4111/api",
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

// メッセージローダーコンポーネント: スレッドの会話履歴を取得
async function loadThreadMessages(remoteId: string): Promise<Message[]> {
  try {
    const messages = await upFetch(`/memory/threads/${remoteId}/messages`, {
      schema: z.array(z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system', 'tool']),
        content: z.union([z.string(), z.array(z.any())]),
        createdAt: z.string().optional(),
      })),
      params: {
        agentId: AGENT_ID,
      },
    });
    
    // Mastraのメッセージ形式からAI SDKの形式に変換
    const formattedMessages: Message[] = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));
    
    return formattedMessages;
  } catch (error) {
    console.error("Failed to load messages for thread:", remoteId, error);
    // エラーが発生しても続行（新しいスレッドの場合など）
    return [];
  }
}

// RuntimeHookコンポーネント: 各スレッドのランタイムを作成
function RuntimeHook() {
  const id = useAssistantState(({ threadListItem }) => threadListItem.id);
  const remoteId = useAssistantState(({ threadListItem }) => threadListItem.remoteId);
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);
  
  // スレッドの会話履歴をロード（remoteIdが変わった時のみ）
  useEffect(() => {
    if (!remoteId) {
      setInitialMessages([]);
      return;
    }
    
    loadThreadMessages(remoteId).then(setInitialMessages);
  }, [remoteId]);
  
  const transport = new AssistantChatTransport({
    api: "http://localhost:4111/chat/ramenAgent",
  });
  
  const chat = useChat({
    id,
    body: {
      threadId: remoteId || id,
      resourceId: RESOURCE_ID,
    },
    transport,
    initialMessages,
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