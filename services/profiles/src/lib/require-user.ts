import type { FastifyRequest } from "fastify";
import { verify as verifyJwt } from "@node-rs/jsonwebtoken";

const SECRET = process.env.AUTH_JWT_SECRET ?? "dev-insecure-change-me";
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "adam_session";

export interface SessionClaims {
  sub: string;
  email: string;
}

export async function requireUser(req: FastifyRequest): Promise<SessionClaims> {
  const token = req.cookies?.[COOKIE_NAME] ?? getBearerToken(req);
  if (!token) throw unauthorized();
  try {
    const claims = await verifyJwt(token, SECRET);
    const data = (claims.data ?? {}) as Record<string, unknown>;
    return { sub: String(data.sub ?? claims.sub), email: String(data.email) };
  } catch {
    throw unauthorized();
  }
}

function getBearerToken(req: FastifyRequest): string | undefined {
  const auth = req.headers.authorization;
  if (!auth) return undefined;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token;
  return undefined;
}

function unauthorized(): Error {
  const e = new Error("Unauthorized") as Error & { statusCode: number };
  e.statusCode = 401;
  return e;
}
