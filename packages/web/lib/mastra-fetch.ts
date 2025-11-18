import { up } from "up-fetch";

const MASTRA_BASE_URL = process.env.MASTRA_API_URL || "http://localhost:4111";

/**
 * Mastra API用のup-fetchインスタンス
 * サーバーサイドでのみ使用
 */
export const mastraFetch = up(fetch, () => ({
    baseUrl: MASTRA_BASE_URL,
    retry: {
        attempts: 3,
        delay: 1000,
    },
    timeout: 30000, // 30秒
}));

export { MASTRA_BASE_URL };
