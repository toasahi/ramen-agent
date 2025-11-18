import type { NextRequest } from "next/server";
import { up } from "up-fetch";
import { createUIMessageStream } from "ai";
import { toAISdkFormat } from "@mastra/ai-sdk";
import type { ChunkType, MastraModelOutput } from "@mastra/core/stream";

import { MastraClient } from "@mastra/client-js";

export const mastraClient = new MastraClient({
    baseUrl: process.env.MASTRA_API_URL || "http://localhost:4111",
});

const MASTRA_BASE_URL = process.env.MASTRA_API_URL || "http://localhost:4111";
const AGENT_ID = "ramenAgent";

// up-fetchインスタンス（リトライ設定付き）
const upFetch = up(fetch, () => ({
    baseUrl: MASTRA_BASE_URL,
    retry: {
        attempts: 3,
        delay: 1000,
    },
    timeout: 30000,
}));

/**
 * POST /api/chat
 * Mastraのチャットエンドポイントへのプロキシ
 * ストリーミングレスポンスを返す
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "Invalid request: messages array is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const agent = mastraClient.getAgent(AGENT_ID); // エージェントの存在確認

        const stream = await agent.stream(messages)

        const chunkStream: ReadableStream<ChunkType> = new ReadableStream<ChunkType>({
            start(controller) {
                stream
                    .processDataStream({
                        onChunk: async (chunk) => controller.enqueue(chunk as ChunkType),
                    })
                    .finally(() => controller.close());
            },
        });

        const uiMessageStream = createUIMessageStream({
            execute: async ({ writer }) => {
                for await (const part of toAISdkFormat(
                    chunkStream as unknown as MastraModelOutput,
                    { from: "agent" },
                )) {
                    writer.write(part);
                }
            },
        });

        for await (const part of uiMessageStream) {
            console.log(part);
        }

        // // up-fetchを使ってMastraのチャットエンドポイントを呼び出す
        // // ストリーミングの場合、Responseオブジェクトを直接取得
        // const response = await upFetch(`/chat/${AGENT_ID}`, {
        //     method: "POST",
        //     body: { messages },
        //     // parseResponseをスキップしてResponseオブジェクトを取得
        //     parseResponse: (res) => res,
        // });

        // // ストリーミングレスポンスをそのまま返す
        // return new Response(response.body, {
        //     headers: {
        //         "Content-Type": "text/event-stream",
        //         "Cache-Control": "no-cache",
        //         Connection: "keep-alive",
        //     },
        // });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
