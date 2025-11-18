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
 * GET /api/memory/threads
 * スレッド一覧を取得
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const resourceId = searchParams.get("resourceid") || AGENT_ID;
        const agentId = searchParams.get("agentId") || AGENT_ID;
        const orderBy = searchParams.get("orderBy") || "updatedAt";
        const sortDirection = searchParams.get("sortDirection") || "DESC";

        const threads = await upFetch("/memory/threads", {
            schema: z.array(z.object({
                id: z.string(),
                resourceId: z.string(),
                title: z.string().nullable(),
                metadata: z.any(),
                createdAt: z.string(),
                updatedAt: z.string(),
            })),
            params: {
                resourceid: resourceId,
                agentId: agentId,
                orderBy: orderBy,
                sortDirection: sortDirection,
            },
        });

        return NextResponse.json(threads);
    } catch (error) {
        console.error("Get threads error:", error);
        return NextResponse.json(
            { error: "Failed to fetch threads" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/memory/threads
 * 新しいスレッドを作成
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get("agentId") || AGENT_ID;

        const thread = await upFetch("/memory/threads", {
            method: "POST",
            schema: z.object({
                id: z.string(),
                resourceId: z.string(),
                title: z.string().nullable(),
            }),
            params: { agentId },
            body,
        });

        return NextResponse.json(thread);
    } catch (error) {
        console.error("Create thread error:", error);
        return NextResponse.json(
            { error: "Failed to create thread" },
            { status: 500 }
        );
    }
}
