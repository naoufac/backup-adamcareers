import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";

const PORT = Number(process.env.AUTH_PORT ?? 8782);
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
  service: "adamjobs-auth",
  time: new Date().toISOString(),
}));

app.get("/", async () => ({ name: "adamjobs-auth", version: "0.1.0" }));

await app.register(authRoutes, { prefix: "/api" });
await app.register(meRoutes, { prefix: "/api" });

app.setErrorHandler((err, _req, reply) => {
  const e = err as Error & { statusCode?: number };
  const status = e.statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send({ error: e.message });
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, origins: allowedOrigins }, "auth listening");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
