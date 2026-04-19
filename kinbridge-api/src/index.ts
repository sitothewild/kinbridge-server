import Fastify from "fastify";
import websocket from "@fastify/websocket";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { env } from "./config.js";
import { log } from "./lib/log.js";
import { sessionRoutes } from "./routes/sessions.js";
import { deviceRoutes } from "./routes/devices.js";
import { helpRequestRoutes } from "./routes/help-requests.js";
import { authExchangeRoutes } from "./routes/auth-exchange.js";
import { wsEventRoutes } from "./routes/ws-events.js";

async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: log,
    disableRequestLogging: false,
    trustProxy: true, // behind Cloudflare Tunnel; honor X-Forwarded-For for rate-limit keys
    bodyLimit: 64 * 1024, // 64 KiB — we handle no large payloads
  });

  await app.register(helmet, {
    // API is not browser-facing directly; Cloudflare Tunnel terminates TLS
    // and Lovable's Worker is the sole browser-facing surface.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    // Only Lovable's Worker calls our HTTPS endpoints from outside. Everything
    // else is server-side with service token. Block the browser from calling
    // us directly by default.
    origin: false,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_PER_MIN,
    timeWindow: "1 minute",
    // Key = X-Forwarded-For first hop (Cloudflare Tunnel preserves it), plus
    // a scope (service-token vs anon) so service calls share one bucket.
    keyGenerator: (req) => `${req.ip}:${req.routerPath ?? "_"}`,
    errorResponseBuilder: () => ({ error: "rate_limited" }),
  });

  await app.register(websocket);

  app.get("/api/version", async () => ({
    service: "kinbridge-api",
    version: process.env.npm_package_version ?? "0.1.0",
    now: new Date().toISOString(),
  }));

  app.get("/api/health", async (_req, reply) => reply.code(200).send("ok"));

  await app.register(authExchangeRoutes);
  await app.register(sessionRoutes);
  await app.register(deviceRoutes);
  await app.register(helpRequestRoutes);
  await app.register(wsEventRoutes);

  return app;
}

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    log.info({ signal }, "shutting down");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      log.error({ err }, "shutdown error");
      process.exit(1);
    }
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    log.info(
      { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
      "kinbridge-api listening",
    );
  } catch (err) {
    log.fatal({ err }, "failed to listen");
    process.exit(1);
  }
}

void main();
