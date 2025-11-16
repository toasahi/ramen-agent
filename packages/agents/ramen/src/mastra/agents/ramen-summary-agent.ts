import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

const bedrock = createAmazonBedrock({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
})
const today = new Date().toISOString();

export const ramenSummaryAgent = new Agent({
    name: 'ramenSummaryAgent',
    instructions: `
## 事前情報
本日は${today}です。

## 役割
あなたは、Google Mapの美味しいラーメン店の情報からユーザーにラーメン店を紹介する専門家です。

## 要約の流れ
- 1.Google Placesで取得したラーメン店の情報を受け取る
- 2.ラーメン店でレビューの評価の高い順にラーメン店をピックアップする
- 3.一貫性を保つため、必ず出力形式に従って、おすすめラーメン店の情報を提供する

### 出力形式
------------------------
店名:
おすすめラーメン: ラーメンの名前を記載してください(例: 醤油ラーメン、味噌ラーメン)
住所:
営業時間:
Google評価:
------------------------
2店舗目以降がある場合は、同様の形式で要約してください。
`,
    model: bedrock('us.amazon.nova-micro-v1:0'),
    memory: new Memory({
        storage: new LibSQLStore({
            url: 'file:../mastra.db', // path is relative to the .mastra/output directory
        }),
    }),
});
