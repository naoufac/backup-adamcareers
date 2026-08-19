import { hash, verify as verifyArgon } from "@node-rs/argon2";
import { sign, verify as verifyJwt } from "@node-rs/jsonwebtoken";

const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export async function verifyPassword(
  password: string,
  hashed: string,
): Promise<boolean> {
  return verifyArgon(hashed, password);
}

const SECRET = process.env.AUTH_JWT_SECRET ?? "dev-insecure-change-me";

export interface SessionClaims {
  sub: string;
  email: string;
}

export async function issueSession(user: SessionClaims): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
  return sign({ data: user, sub: user.sub, exp }, SECRET);
}

export async function readSession(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const claims = await verifyJwt(token, SECRET);
    const data = (claims.data ?? {}) as Record<string, unknown>;
    return { sub: String(data.sub ?? claims.sub), email: String(data.email) };
  } catch {
    return null;
  }
}

export class Unauthorized extends Error {
  statusCode = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "Unauthorized";
  }
}
