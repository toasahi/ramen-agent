import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { upfetch } from '../../lib/up-fetch';
import { isResponseError, isValidationError } from 'up-fetch';

// Google Places API のスキーマ定義
const dateSchema = z.object({
    year: z.number(),
    month: z.number(),
    day: z.number(),
});

const timeSchema = z.object({
    day: z.number(),
    hour: z.number(),
    minute: z.number(),
    date: dateSchema,
});

const periodSchema = z.object({
    open: timeSchema,
    close: timeSchema,
});

const openingHoursSchema = z.object({
    openNow: z.boolean(),
    periods: z.array(periodSchema),
    weekdayDescriptions: z.array(z.string()),
    nextCloseTime: z.string().optional(),
});

const displayNameSchema = z.object({
    text: z.string(),
    languageCode: z.string(),
});

const locationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});

const authorAttributionSchema = z.object({
    displayName: z.string(),
    uri: z.string().url(),
    photoUri: z.string().url(),
});

const photoSchema = z.object({
    name: z.string(),
    widthPx: z.number(),
    heightPx: z.number(),
    authorAttributions: z.array(authorAttributionSchema),
    flagContentUri: z.string().url(),
    googleMapsUri: z.string().url(),
});

const placeSchema = z.object({
    id: z.string(),
    types: z.array(z.string()),
    formattedAddress: z.string(),
    location: locationSchema,
    rating: z.number(),
    priceLevel: z.enum(['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']).optional(),
    userRatingCount: z.number(),
    displayName: displayNameSchema,
    currentOpeningHours: openingHoursSchema.optional(),
    photos: z.array(photoSchema).optional(),
});

const placesResponseSchema = z.object({
    places: z.array(placeSchema,{message:"ラーメン店の情報が見つかりませんでした。"}).describe('Google Map Places API response for ramen restaurant search'),
});

type PlacesResponse = z.infer<typeof placesResponseSchema>;

type TextSearchParameter = {
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

export const ramenTool = createTool({
    id: 'get-ramen',
    description: 'Get ramen shop recommendations for a Google Map',
    inputSchema: z.object({
        prefecture: z.string().describe('都道府県名（例：大阪、東京、北海道）'),
        city: z.string().optional().describe('（例：梅田、本町、品川）'),
        name: z.string().optional().describe('Name of the ramen shop to search for (e.g., "一風堂、人類みな麺類")'),
    }),
    outputSchema: placesResponseSchema,
    execute: async ({ context }) => {
        return await getRamenRecommendations(context.prefecture, context.city, context.name);
    },
});

const getRamenRecommendations = async (prefecture: string, city?: string, name?: string): Promise<PlacesResponse> => {

    const googlePlaceSearchTextURL = 'https://places.googleapis.com/v1/places:searchText'

    const cityPart = city ? ` ${city}` : '';
    const textQuery = name ? `${name} ${prefecture} ${cityPart} ラーメン` : `${prefecture} ${cityPart} ラーメン`;

    const textSearchParameter = {
        includedType: "ramen_restaurant",
        textQuery: textQuery,
        languageCode: "ja",
        rankPreference: "RELEVANCE",
        minRating: 4.0,
        pageSize: 3
    } as const satisfies TextSearchParameter;

    try {
        return upfetch(googlePlaceSearchTextURL, {
            schema: placesResponseSchema,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': process.env.GOOGLE_API_KEY ?? '',
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.types,places.priceLevel,places.currentOpeningHours,places.photos',
            },
            body: {
                ...textSearchParameter
            },
            retry: {
                when({ response }) {
                    if (!response) return false
                    return [408, 413, 429, 500, 502, 503, 504].includes(response.status)
                },
                attempts: 3,
                delay: (ctx) => ctx.attempt ** 2 ** 1000,
            }
        });
    } catch (error) {
        if (isResponseError(error)) {
            console.error(error.status);
        }

        if (isValidationError(error)) {
            console.error(error.issues)
        }
        return {
            places: []
        };
    }
};
