import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const ISSUER = process.env.MASTRA_JWT_ISSUER ?? "ramen-web";
const AUDIENCE = process.env.MASTRA_JWT_AUDIENCE ?? "mastra-server";

function getSharedSecret() {
  const secret = process.env.MASTRA_SHARED_SECRET;
  if (!secret) {
    throw new Error("MASTRA_SHARED_SECRET is not set");
  }

  return encoder.encode(secret);
}

export type MastraUserClaims = {
  sub: string;
  email?: string;
  name?: string;
};

export async function verifyMastraAccessToken(token: string) {
  const key = getSharedSecret();
  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return payload as MastraUserClaims;
}
