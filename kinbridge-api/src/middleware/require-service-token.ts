import type { FastifyRequest, FastifyReply } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config.js";

/**
 * Guard for endpoints called by the Lovable dashboard's server-side functions.
 *
 * Lovable sets `KINBRIDGE_SERVICE_TOKEN` in its Worker secrets and sends it as
 * `X-KinBridge-Service-Token`. We never accept this header from the browser —
 * Lovable proxies all such calls through a server fn, so only their Worker
 * ever presents it.
 *
 * Comparison is constant-time to avoid leaking the token via timing.
 */
export async function requireServiceToken(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = req.headers["x-kinbridge-service-token"];
  const presented = Array.isArray(header) ? header[0] : header;
  if (typeof presented !== "string" || presented.length === 0) {
    reply.code(401).send({ error: "missing_service_token" });
    return;
  }

  const expected = env.KINBRIDGE_SERVICE_TOKEN;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    reply.code(401).send({ error: "invalid_service_token" });
    return;
  }
}
