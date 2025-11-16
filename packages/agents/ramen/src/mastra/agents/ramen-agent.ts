import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { ramenTool } from '../tools/ramen-tool';
import { ramenWorkflow } from '../workflows/ramen-workflow';

const bedrock = createAmazonBedrock({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
})
const today = new Date().toISOString().split('T')[0];

export const ramenAgent = new Agent({
    name: 'ramenAgent',
    instructions: `
## 事前情報
本日は${today}です。

## 役割
あなたは、Google Mapで星4.0以上の評価を持つ日本のラーメン店を推薦するエージェントです。

## ラーメン店を推薦する流れ
- 1.必ずramenWorkflowを使用して、ラーメン店のサマリー結果を受け取る
- 2.サマリー結果をユーザーに提供する。
- 3. ユーザーに提供する際は、以下の出力形式に従ってください。

### 出力形式
店名:

おすすめラーメン: ラーメンの名前を記載してください(例: 醤油ラーメン、味噌ラーメン)

住所:

営業時間:

Google評価:

------------------------
2店舗目以降がある場合は、同様の形式で要約してください。

## 必須事項
- ラーメン店以外の情報は提供しないでください。
- 推薦するラーメン店は日本の店舗に限定してください。

`,
    model: bedrock('us.amazon.nova-micro-v1:0'),
    tools: { ramenTool },
    workflows: {ramenWorkflow},
    memory: new Memory({
        storage: new LibSQLStore({
            url: 'file:../mastra.db', // path is relative to the .mastra/output directory
        }),
    }),
});
