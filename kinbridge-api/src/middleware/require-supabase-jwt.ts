import type { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config.js";
import { log } from "../lib/log.js";

/**
 * Guard for endpoints called directly by authenticated end-users
 * (via the Lovable browser client or the KinBridge desktop/mobile app).
 *
 * Supabase Auth issues RS256 JWTs; we verify them against the public JWKS.
 * The issuer / audience are checked per the Supabase defaults. After this
 * middleware runs, req.kinbridgeUser is populated with { sub } for the
 * route handler.
 */

const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL), {
  cooldownDuration: 60_000,
  cacheMaxAge: 10 * 60_000,
});

declare module "fastify" {
  interface FastifyRequest {
    kinbridgeUser?: { sub: string; email?: string };
  }
}

export async function requireSupabaseJwt(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = req.headers.authorization;
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    reply.code(401).send({ error: "missing_bearer" });
    return;
  }
  const token = auth.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });
    if (typeof payload.sub !== "string") {
      reply.code(401).send({ error: "invalid_jwt_sub" });
      return;
    }
    req.kinbridgeUser = {
      sub: payload.sub,
      ...(typeof payload.email === "string" ? { email: payload.email } : {}),
    };
  } catch (err) {
    log.warn({ err }, "supabase jwt verification failed");
    reply.code(401).send({ error: "invalid_jwt" });
  }
}
