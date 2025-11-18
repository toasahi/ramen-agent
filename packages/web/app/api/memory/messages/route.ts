import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { up } from "up-fetch";
import z from "zod";

const MASTRA_BASE_URL = process.env.MASTRA_API_URL || "http://localhost:4111";
const AGENT_ID = "ramenAgent";

// up-fetchインスタンス
const upFetch = up(fetch, () => ({
    baseUrl: `${MASTRA_BASE_URL}/api`,
    retry: {
        attempts: 3,
        delay: 1000,
    },
    timeout: 30000,
}));

/**
 * GET /api/memory/messages
 * スレッドのメッセージ履歴を取得
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const threadId = searchParams.get("threadId");
        const agentId = searchParams.get("agentId") || AGENT_ID;

        if (!threadId) {
            return NextResponse.json(
                { error: "threadId is required" },
                { status: 400 }
            );
        }

        const messages = await upFetch("/memory/messages", {
            schema: z.array(z.object({
                id: z.string(),
                role: z.enum(["user", "assistant", "system", "tool"]),
                content: z.any(),
                createdAt: z.string(),
            })),
            params: {
                threadId,
                agentId,
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Get messages error:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/memory/messages
 * 新しいメッセージを保存
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get("agentId") || AGENT_ID;

        const message = await upFetch("/memory/messages", {
            method: "POST",
            params: { agentId },
            body,
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error("Create message error:", error);
        return NextResponse.json(
            { error: "Failed to create message" },
            { status: 500 }
        );
    }
}
