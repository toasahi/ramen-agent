"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
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
        },
        credentials: "include",
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
      credentials: "include",
    });
    
    return { remoteId: result.id, externalId: result.id };
  },
  
  async rename(remoteId, title) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "PATCH",
      params: { agentId: AGENT_ID },
      body: { title },
      credentials: "include",
    });

  },
  
  async archive(remoteId) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "PATCH",
      params: { agentId: AGENT_ID },
      body: { metadata: { archived: true } },
      credentials: "include",
    });
  },
  
  async unarchive(remoteId) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "PATCH",
      params: { agentId: AGENT_ID },
      body: { metadata: { archived: false } },
      credentials: "include",
    });
  },
  
  async delete(remoteId) {
    await upFetch(`/memory/threads/${remoteId}`, {
      method: "DELETE",
      params: { agentId: AGENT_ID },
      credentials: "include",
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
      credentials: "include",
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
        credentials: "include",
      });
      
      controller.appendText(title);
      controller.close();
    });
  },
};

// RuntimeHookコンポーネント: 各スレッドのランタイムを作成
function RuntimeHook() {
  const id = useAssistantState(({ threadListItem }) => threadListItem.id);

  const [threadId] = useState(() => id || uuidv4());
  const effectiveThreadId = id || threadId;

  // スレッドIDの変更を追跡するRef
  // これにより、会話中（chatの変更時）ではなく、スレッド切り替え時のみ履歴を取得する
  const prevIdRef = useRef<string | null>(null);
  const chatRef = useRef<ReturnType<typeof useChat> | null>(null);

  const transport = new AssistantChatTransport({
    api: `http://localhost:4111/chat/${RESOURCE_ID}`, 
    body: {
      resourceId: RESOURCE_ID,
      threadId: effectiveThreadId,
    },
    credentials: "include",
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
    id: effectiveThreadId,
    transport,
  });

  // chatRefを更新
  chatRef.current = chat;

  useEffect(() => {
    // idがない場合（新規スレッド）は履歴取得をスキップ
    if (!id) return;

    // 同じスレッドIDの場合は履歴取得をスキップ（会話中の再実行を防ぐ）
    if (prevIdRef.current === id) return;

    // スレッドIDが変更された場合のみ履歴を取得
    prevIdRef.current = id;

    const fetchMessages = async () => {
      try {
        const data = await upFetch(`/memory/threads/${id}/messages`, {
          schema: z.object({
            uiMessages: z.array(z.any()),
          }),
          params: { agentId: AGENT_ID },
          credentials: "include",
        });
        if (data?.uiMessages && chatRef.current) {
          chatRef.current.setMessages(data.uiMessages);
        }
      } catch (error) {
        // 404は新規スレッドの場合などで発生する可能性があるため、エラーログを出さない
        // @ts-expect-error error is unknown
        if (error?.status === 404 || error?.response?.status === 404) {
          return;
        }
        console.error("Failed to fetch messages:", error);
      }
    };

    fetchMessages();
  }, [id]); // 依存配列からchatを削除し、idのみに依存

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