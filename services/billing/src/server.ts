import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerExportAllowRoutes } from "./routes/export-allow.js";

const PORT = Number(process.env.BILLING_PORT ?? 8784);
const HOST = "0.0.0.0";

const allowedOrigins = [
  process.env.APP_BASE_URL,
  process.env.API_BASE_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  "https://adamcareers.com",
  "https://www.adamcareers.com",
  "http://localhost:8780",
  "http://localhost:8781",
].filter((o): o is string => Boolean(o));

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});
await app.register(cookie);

app.get("/healthz", async () => ({
  status: "ok",
  service: "adamjobs-billing",
  time: new Date().toISOString(),
}));

app.get("/", async () => ({ name: "adamjobs-billing", version: "0.1.0" }));

await app.register(registerBillingRoutes, { prefix: "/api" });
await app.register(registerExportAllowRoutes, { prefix: "/api" });

app.setErrorHandler((err, _req, reply) => {
  const e = err as Error & { statusCode?: number };
  const status = e.statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send({ error: e.message });
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, origins: allowedOrigins }, "billing listening");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
