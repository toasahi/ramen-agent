import z from "zod";

// Google Places API のスキーマ定義
export const dateSchema = z.object({
    year: z.number(),
    month: z.number(),
    day: z.number(),
});

export const timeSchema = z.object({
    day: z.number(),
    hour: z.number(),
    minute: z.number(),
    date: dateSchema,
});

export const periodSchema = z.object({
    open: timeSchema,
    close: timeSchema,
});

export const openingHoursSchema = z.object({
    openNow: z.boolean(),
    periods: z.array(periodSchema),
    weekdayDescriptions: z.array(z.string()),
    nextCloseTime: z.string().optional(),
});

export const displayNameSchema = z.object({
    text: z.string(),
    languageCode: z.string(),
});

export const locationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});

export const authorAttributionSchema = z.object({
    displayName: z.string(),
    uri: z.string().url(),
    photoUri: z.string().url(),
});

export const photoSchema = z.object({
    name: z.string(),
    widthPx: z.number(),
    heightPx: z.number(),
    authorAttributions: z.array(authorAttributionSchema),
    googleMapsUri: z.string().url(),
});

export const placeSchema = z.object({
    id: z.string(),
    types: z.array(z.string()),
    formattedAddress: z.string(),
    location: locationSchema,
    rating: z.number(),
    priceLevel: z.enum(['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']).optional(),
    userRatingCount: z.number(),
    displayName: displayNameSchema,
    currentOpeningHours: openingHoursSchema.optional(),
    // photos: z.array(photoSchema).optional(),
});

export const placesResponseSchema = z.object({
    places: z.array(placeSchema,{message:"ラーメン店の情報が見つかりませんでした。"}).describe('Google Map Places API response for ramen restaurant search'),
});

export type PlacesResponse = z.infer<typeof placesResponseSchema>;

export type TextSearchParameter = {
    textQuery: string,
    includedType: "ramen_restaurant",
    includePureServiceAreaBusinesses?: boolean,
    languageCode: "ja",
    minRating: 3.5 | 4.0 | 4.5 | 5.0,
    openNow?: boolean,
    pageSize?: number,
    pageToken?: string,
    priceLevels?: string[],
    rankPreference?: "RELEVANCE" | "DISTANCE",
    regionCode?: string,
    strictTypeFiltering?: boolean,
}
