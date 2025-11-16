import { z } from 'zod';

/**
 * ラーメンの味の種類
 */
export const FlavorTypeEnum = z.enum([
  'shoyu',      // 醤油
  'miso',       // 味噌
  'shio',       // 塩
  'tonkotsu',   // 豚骨
  'tantanmen',  // 担々麺
  'tsukemen',   // つけ麺
  'abura_soba', // 油そば
  'chicken',    // 鶏白湯
  'seafood',    // 魚介
  'other',      // その他
]);

/**
 * 麺の硬さ
 */
export const NoodleFirmnessEnum = z.enum([
  'soft',      // 柔らかめ
  'normal',    // 普通
  'firm',      // 硬め
  'very_firm', // バリカタ
]);

/**
 * スープの濃さ
 */
export const SoupRichnessEnum = z.enum([
  'light',      // あっさり
  'normal',     // 普通
  'rich',       // 濃いめ
  'very_rich',  // こってり
]);

/**
 * 辛さレベル
 */
export const SpicinessEnum = z.enum([
  'none',      // なし
  'mild',      // 少し
  'medium',    // 中辛
  'hot',       // 辛口
  'very_hot',  // 激辛
]);


/**
 * 訪問目的
 */
export const VisitPurposeEnum = z.enum([
  'quick_lunch',      // サクッとランチ
  'dinner_date',      // デート
  'family',           // 家族連れ
  'business',         // 接待・ビジネス
  'tourist',          // 観光
  'ramen_enthusiast', // ラーメン好きの探索
  'casual',           // 普通の食事
  'celebration',      // お祝い
]);

/**
 * 検索フェーズ
 */
export const SearchPhaseEnum = z.enum([
  'initial_query',  // 初期問い合わせ
  'refining',       // 条件の絞り込み中
  'comparing',      // 店舗比較中
  'finalizing',     // 最終決定中
  'post_visit',     // 訪問後フォローアップ
]);

/**
 * 会話のトーン
 */
export const ConversationToneEnum = z.enum([
  'casual',     // カジュアル
  'formal',     // フォーマル
  'enthusiast', // マニア向け
  'beginner',   // 初心者向け
]);

/**
 * 言語
 */
export const LanguageEnum = z.enum([
  'ja', // 日本語
  'en', // 英語
  'zh', // 中国語
  'ko', // 韓国語
]);

/**
 * 座標情報
 */
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * 位置情報
 */
export const LocationSchema = z.object({
  prefecture: z.string().optional(),     // 都道府県
  city: z.string().optional(),           // 市区町村
  area: z.string().optional(),           // エリア（梅田、新宿など）
  station: z.string().optional(),        // 最寄り駅
  coordinates: CoordinatesSchema.optional(), // GPS座標
  address: z.string().optional(),        // 住所
});

/**
 * ラーメンの好み
 */
export const RamenPreferencesSchema = z.object({
  flavorTypes: z.array(FlavorTypeEnum).optional(),  // 味の種類（複数選択可）
  noodleFirmness: NoodleFirmnessEnum.optional(),    // 麺の硬さ
  soupRichness: SoupRichnessEnum.optional(),        // スープの濃さ
  spiciness: SpicinessEnum.optional(),              // 辛さの好み
  
  // トッピングの好み
  favoriteTopppings: z.array(z.string()).optional(), // お気に入りトッピング
  dislikedToppings: z.array(z.string()).optional(),  // 苦手なトッピング
  
  // その他の好み
  preferThickNoodles: z.boolean().optional(),        // 太麺を好むか
  preferThinNoodles: z.boolean().optional(),         // 細麺を好むか
  preferStraightNoodles: z.boolean().optional(),     // ストレート麺を好むか
  preferCurlyNoodles: z.boolean().optional(),        // 縮れ麺を好むか
});

/**
 * 予算
 */
export const BudgetSchema = z.object({
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().nonnegative().optional(),
});

/**
 * 制約条件
 */
export const ConstraintsSchema = z.object({
  budget: BudgetSchema.optional(),                           // 予算（円）
  
  // その他の制約
  maxWaitTime: z.number().int().nonnegative().optional(), // 最大待ち時間（分）
});

/**
 * 訪問条件
 */
export const VisitConditionsSchema = z.object({
  partySize: z.number().int().positive().optional(),  // 訪問人数
  visitDateTime: z.string().datetime().optional(),    // 訪問日時（ISO形式）
  purpose: VisitPurposeEnum.optional(),               // 訪問目的
  
  // 時間帯の好み
  preferLunchTime: z.boolean().optional(),   // ランチタイムを好むか
  preferDinnerTime: z.boolean().optional(),  // ディナータイムを好むか
  preferOffPeakHours: z.boolean().optional(), // 混雑を避けたいか
});


/**
 * ユーザー情報
 */
export const UserSchema = z.object({
  location: LocationSchema.optional(),              // 位置情報
  preferences: RamenPreferencesSchema.optional(),   // ラーメンの好み
  constraints: ConstraintsSchema.optional(),        // 制約条件
  visitConditions: VisitConditionsSchema.optional(), // 訪問条件
});

/**
 * 推薦された店舗の履歴
 */
export const RecommendedShopSchema = z.object({
  shopId: z.string(),                              // 店舗ID
  shopName: z.string(),                            // 店舗名
  recommendedAt: z.string().datetime(),            // 推薦日時
  rejectedReason: z.string().optional(),           // 却下された理由
  visitedAt: z.string().datetime().optional(),     // 訪問日時
  rating: z.number().min(1).max(5).optional(),     // ユーザー評価（1-5）
  review: z.string().optional(),                   // レビューコメント
  
  // 詳細情報
  priceRange: z.string().optional(),               // 価格帯
  flavorType: FlavorTypeEnum.optional(),           // 味の種類
  distance: z.number().optional(),                 // 距離（km）
  
  // ステータス
  isInterested: z.boolean().optional(),            // 興味あり
  isComparing: z.boolean().optional(),             // 比較検討中
  isRejected: z.boolean().optional(),              // 却下済み
  isVisited: z.boolean().optional(),               // 訪問済み
});

/**
 * 会話の文脈
 */
export const ConversationContextSchema = z.object({
  previousRecommendations: z.array(RecommendedShopSchema).optional(), // 前回の推薦店舗
  searchPhase: SearchPhaseEnum.optional(),                            // 現在の検索フェーズ
  pendingQuestions: z.array(z.string()).optional(),                   // 追加の質問や不明点
  conversationTone: ConversationToneEnum.optional(),                  // 会話のトーン
  
  // 比較中の店舗
  comparingShops: z.array(z.string()).optional(), // 比較中の店舗ID
  
  // 最後のユーザー入力
  lastUserQuery: z.string().optional(),           // 最後のクエリ
  lastUserIntent: z.string().optional(),          // 最後のインテント
  
  // フォローアップ情報
  needsClarification: z.boolean().optional(),     // 明確化が必要か
  clarificationTopic: z.string().optional(),      // 明確化が必要なトピック
});

/**
 * 検索結果のキャッシュ
 */
export const SearchCacheSchema = z.object({
  lastSearchTimestamp: z.string().datetime().optional(), // 最後の検索日時
  lastSearchQuery: z.string().optional(),                // 最後の検索クエリ
  cachedResults: z.array(z.any()).optional(),            // 検索結果のキャッシュ
  cacheExpiresAt: z.string().datetime().optional(),      // キャッシュの有効期限
});

/**
 * セッション情報
 */
export const SessionSchema = z.object({
  sessionId: z.string(),                          // セッションID
  startTime: z.string().datetime(),               // セッション開始時刻
  lastActivityTime: z.string().datetime().optional(), // 最後のアクティビティ時刻
  interactionCount: z.number().int().nonnegative(), // やり取りの回数
  language: LanguageEnum,                         // 言語
  
  // ユーザー識別情報（オプション）
  userId: z.string().optional(),                  // ユーザーID
  deviceType: z.enum(['mobile', 'desktop', 'tablet']).optional(), // デバイスタイプ
});

/**
 * 統計情報（オプション）
 */
export const StatisticsSchema = z.object({
  totalShopsRecommended: z.number().int().nonnegative().optional(), // 推薦した店舗の総数
  totalShopsVisited: z.number().int().nonnegative().optional(),     // 訪問した店舗の総数
  totalShopsRejected: z.number().int().nonnegative().optional(),    // 却下した店舗の総数
  averageRating: z.number().min(1).max(5).optional(),               // 平均評価
  totalBudgetSpent: z.number().nonnegative().optional(),            // 総支出額
});

/**
 * ワーキングメモリのメインスキーマ
 */
export const RamenAgentWorkingMemorySchema = z.object({
  user: UserSchema.optional(),                        // ユーザー情報
  conversationContext: ConversationContextSchema.optional(), // 会話の文脈
  searchCache: SearchCacheSchema.optional(),          // 検索結果のキャッシュ
  session: SessionSchema,                             // セッション情報（必須）
  statistics: StatisticsSchema.optional(),            // 統計情報
});

/**
 * TypeScript型の生成
 */
export type FlavorType = z.infer<typeof FlavorTypeEnum>;
export type NoodleFirmness = z.infer<typeof NoodleFirmnessEnum>;
export type SoupRichness = z.infer<typeof SoupRichnessEnum>;
export type Spiciness = z.infer<typeof SpicinessEnum>;
export type VisitPurpose = z.infer<typeof VisitPurposeEnum>;
export type SearchPhase = z.infer<typeof SearchPhaseEnum>;
export type ConversationTone = z.infer<typeof ConversationToneEnum>;
export type Language = z.infer<typeof LanguageEnum>;

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type RamenPreferences = z.infer<typeof RamenPreferencesSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type VisitConditions = z.infer<typeof VisitConditionsSchema>;
export type User = z.infer<typeof UserSchema>;
export type RecommendedShop = z.infer<typeof RecommendedShopSchema>;
export type ConversationContext = z.infer<typeof ConversationContextSchema>;
export type SearchCache = z.infer<typeof SearchCacheSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Statistics = z.infer<typeof StatisticsSchema>;
export type RamenAgentWorkingMemory = z.infer<typeof RamenAgentWorkingMemorySchema>;

/**
 * デフォルト値のヘルパー関数
 */
export function createInitialWorkingMemory(
  sessionId: string = crypto.randomUUID(),
  language: Language = 'ja'
): RamenAgentWorkingMemory {
  const now = new Date().toISOString();
  
  return {
    session: {
      sessionId,
      startTime: now,
      lastActivityTime: now,
      interactionCount: 0,
      language,
    },
  };
}

/**
 * メモリの更新ヘルパー関数
 */
export function updateWorkingMemory(
  memory: RamenAgentWorkingMemory,
  updates: Partial<RamenAgentWorkingMemory>
): RamenAgentWorkingMemory {
  const updated = {
    ...memory,
    ...updates,
    lastUpdated: new Date().toISOString(),
    session: {
      ...memory.session,
      lastActivityTime: new Date().toISOString(),
      interactionCount: memory.session.interactionCount + 1,
    },
  };
  
  return RamenAgentWorkingMemorySchema.parse(updated);
}

/**
 * バリデーションヘルパー関数
 */
export function validateWorkingMemory(
  memory: unknown
): { success: true; data: RamenAgentWorkingMemory } | { success: false; errors: z.ZodError } {
  const result = RamenAgentWorkingMemorySchema.safeParse(memory);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}