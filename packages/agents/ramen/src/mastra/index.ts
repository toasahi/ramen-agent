
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { LangfuseExporter } from "@mastra/langfuse";
import { ramenAgent } from './agents/ramen-agent';
import { ramenSummaryAgent } from './agents/ramen-summary-agent';
import { ramenWorkflow } from './workflows/ramen-workflow';
import { chatRoute } from '@mastra/ai-sdk';

export const mastra = new Mastra({
  workflows: { ramenWorkflow },
  agents: { ramenAgent, ramenSummaryAgent },
  server: {
    middleware: [
      async (c, next) => {
        console.log(`${c.req.method} ${c.req.url}`);
        await next();
      },
    ],
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
      }),
    ],
  },
  observability: {
    configs: {
      langfuse: {
        serviceName: "ramen",
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
            secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
            baseUrl: process.env.LANGFUSE_BASE_URL ?? "",
            options: {
              environment: process.env.NODE_ENV ?? "development",
            },
          }),
        ],
      },
    },
  },
  storage: new LibSQLStore({
    // スレッド履歴を永続化するためにファイルに保存
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
