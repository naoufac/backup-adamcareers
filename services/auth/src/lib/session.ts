import type { FastifyReply } from "fastify";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "adam_session";
const isProd = process.env.NODE_ENV === "production";

// Cross-origin cookies (adamcareers.com -> api.adamcareers.com) require
// SameSite=None + Secure in production. In dev (localhost) Lax is fine.
const COOKIE_OPTS = isProd
  ? { sameSite: "none" as const, secure: true }
  : { sameSite: "lax" as const, secure: false };

export async function setSessionCookie(
  reply: FastifyReply,
  token: string,
): Promise<void> {
  reply.setCookie(COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d
    ...COOKIE_OPTS,
  });
}

export async function clearSessionCookie(reply: FastifyReply): Promise<void> {
  reply.clearCookie(COOKIE, { path: "/", ...COOKIE_OPTS });
}
