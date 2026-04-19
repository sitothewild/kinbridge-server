import type { FastifyInstance } from "fastify";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { env } from "../config.js";
import { AuthExchangeBody } from "../schemas/index.js";
import { mintKinbridgeToken } from "../lib/kinbridge-token.js";
import { log } from "../lib/log.js";

const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

/**
 * POST /api/auth/exchange
 *
 * One-shot trade: Lovable's browser hands us a Supabase JWT of the
 * authenticated user; we hand back a short-lived kinbridge_token scoped for
 * the KinBridge client. Today the session-start flow goes through
 * /api/sessions/start instead, so this endpoint is mostly reserved for
 * future out-of-band client flows (e.g., desktop client first-boot pairing).
 */
export async function authExchangeRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/exchange", async (req, reply) => {
    const parsed = AuthExchangeBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "bad_request" });
      return;
    }
    try {
      const { payload } = await jwtVerify(parsed.data.supabase_jwt, jwks, {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
      });
      if (typeof payload.sub !== "string") {
        reply.code(401).send({ error: "invalid_jwt" });
        return;
      }
      // Minimal token scope — real session tokens are minted by /sessions/start.
      const token = await mintKinbridgeToken({
        sid: "pending",
        owner: payload.sub,
        helper: payload.sub,
        device: "pending",
        hs_key: "pending",
      });
      return reply.send({ kinbridge_token: token });
    } catch (err) {
      log.warn({ err }, "auth-exchange verify failed");
      reply.code(401).send({ error: "invalid_jwt" });
    }
  });
}
