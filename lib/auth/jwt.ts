import { SignJWT, jwtVerify } from "jose";
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from "@/lib/auth/constants";

type TokenPayload = {
  sub: string;
  username: string;
  role: string;
  fullName: string;
  type: "access" | "refresh";
};

function getSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return new TextEncoder().encode(value);
}

export async function signAccessToken(payload: Omit<TokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(getSecret("JWT_ACCESS_SECRET"));
}

export async function signRefreshToken(payload: Omit<TokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
    .sign(getSecret("JWT_REFRESH_SECRET"));
}

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, getSecret("JWT_ACCESS_SECRET"));
  return result.payload as TokenPayload;
}

export async function verifyRefreshToken(token: string) {
  const result = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
  return result.payload as TokenPayload;
}
