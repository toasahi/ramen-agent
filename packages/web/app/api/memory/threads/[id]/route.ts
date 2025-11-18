import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { up } from "up-fetch";
import z from "zod";

const MASTRA_BASE_URL = process.env.MASTRA_API_URL || "http://localhost:4111";
const AGENT_ID = "ramenAgent";

type Params = Promise<{ id: string }>;

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
 * GET /api/memory/threads/[id]
 * 特定のスレッドを取得
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get("agentId") || AGENT_ID;

        const thread = await upFetch(`/memory/threads/${id}`, {
            schema: z.object({
                id: z.string(),
                title: z.string().nullable(),
                metadata: z.any(),
            }),
            params: { agentId },
        });

        return NextResponse.json(thread);
    } catch (error) {
        console.error("Get thread error:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/memory/threads/[id]
 * スレッドを更新（リネーム、アーカイブなど）
 */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get("agentId") || AGENT_ID;

        const thread = await upFetch(`/memory/threads/${id}`, {
            method: "PATCH",
            params: { agentId },
            body,
        });

        return NextResponse.json(thread);
    } catch (error) {
        console.error("Update thread error:", error);
        return NextResponse.json(
            { error: "Failed to update thread" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/memory/threads/[id]
 * スレッドを削除
 */
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get("agentId") || AGENT_ID;

        await upFetch(`/memory/threads/${id}`, {
            method: "DELETE",
            params: { agentId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Delete thread error:", error);
        return NextResponse.json(
            { error: "Failed to delete thread" },
            { status: 500 }
        );
    }
}
