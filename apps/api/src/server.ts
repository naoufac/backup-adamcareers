import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import authRoutes, { requireUser } from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import { registerOnboardingRoutes } from "./routes/onboarding.js";
import { registerCvBuilderRoutes } from "./routes/cv-builder.js";
import { registerOfferRoutes } from "./routes/offers.js";
import { registerExportAllowRoutes } from "./routes/export-allow.js";
import { registerJobRoutes } from "./routes/jobs.js";

const PORT = Number(process.env.API_PORT ?? 8781);
const HOST = "0.0.0.0";

const allowedOrigins = [
  process.env.APP_BASE_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  "https://adamcareers.com",
  "https://www.adamcareers.com",
  "http://localhost:8780",
].filter((o): o is string => Boolean(o));

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});
await app.register(cookie);

app.get("/healthz", async () => ({
  status: "ok",
  service: "adamjobs-api-gateway",
  time: new Date().toISOString(),
}));

app.get("/", async () => ({ name: "adamjobs-api", version: "0.1.0" }));

await app.register(authRoutes, { prefix: "/api" });
await app.register(meRoutes, { prefix: "/api" });
await app.register(registerOnboardingRoutes, { prefix: "/api" });
await app.register(registerCvBuilderRoutes, { prefix: "/api" });
await app.register(registerOfferRoutes, { prefix: "/api" });
await app.register(registerExportAllowRoutes, { prefix: "/api" });
await app.register(registerJobRoutes, { prefix: "/api" });

app.setErrorHandler((err, _req, reply) => {
  const e = err as Error & { statusCode?: number };
  const status = e.statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send({ error: e.message });
});

app.get("/api/_session", async (req) => {
  const user = await requireUser(req);
  return { user };
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, origins: allowedOrigins }, "api gateway listening");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
