import { embedMany } from "ai";
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { MDocument } from "@mastra/rag";
import { UpstashVector } from "@mastra/upstash";

const bedrock = createAmazonBedrock({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
})

const model = bedrock.embedding('amazon.titan-embed-text-v2:0');

// const doc = MDocument.fromJSON(`{}`);

// const chunks = await doc.chunk({
//     strategy: 'recursive',
//     size: 1024,
//     overlap: 50
// })

// const { embeddings } = await embedMany({
//     model,
//     values: chunks.map(c => c.text),
// });

// const store = new UpstashVector({
//     url: process.env.UPSTASH_VECTOR_REST_URL ?? "",
//     token: process.env.UPSTASH_VECTOR_REST_TOKEN ?? "",
// });

// await store.upsert({
//     indexName: "embeddings",
//     vectors: embeddings,
// });