import type { FastifyInstance } from "fastify";
import { env } from "../config.js";
import { verifyKinbridgeToken } from "../lib/kinbridge-token.js";
import { ResolveSessionParams } from "../schemas/index.js";
import { log } from "../lib/log.js";

/**
 * `/v1/*` endpoints. Distinct from `/api/*` because they're called by the
 * Android DeepLinkActivity, not by Lovable's Worker — the auth story is
 * different (Bearer kinbridge_token, not X-KinBridge-Service-Token) and we
 * want these URL-prefix-scoped so middleware picks the right guard.
 */
export async function v1SessionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/sessions/:id/resolve
   *
   * Called by the Android app after a helper taps a
   * `kinbridge://session/<id>?token=<kinbridge_token>` deep link.
   * Verifies the bearer token (minted by POST /api/sessions/start), binds
   * it to the URL :id, and hands back the relay config + hs_key the Rust
   * core needs to open the tunnel.
   *
   * Contract documented in
   *   android-snippets/README.md §"Backend contract: POST /v1/sessions/{id}/resolve"
   * of the Lovable dashboard repo (sitothewild/kinbridgesupport).
   *
   * Auth: `Authorization: Bearer <kinbridge_token>`.
   * The token's `sid` claim MUST equal the URL :id — otherwise an attacker
   * who got one session's token could use it to resolve a different
   * session's relay config.
   */
  app.post<{ Params: { id: string } }>(
    "/v1/sessions/:id/resolve",
    async (req, reply) => {
      const authHeader = req.headers.authorization ?? "";
      const m = /^Bearer\s+(\S+)$/i.exec(authHeader);
      if (!m) {
        reply.code(401).send({ error: "missing_bearer_token" });
        return;
      }
      const params = ResolveSessionParams.safeParse(req.params);
      if (!params.success) {
        reply.code(400).send({ error: "bad_request" });
        return;
      }

      let claims;
      try {
        claims = await verifyKinbridgeToken(m[1]);
      } catch (err) {
        log.warn({ err }, "resolve: token verify failed");
        reply.code(401).send({ error: "invalid_token" });
        return;
      }

      if (claims.sid !== params.data.id) {
        log.warn(
          { token_sid: claims.sid, url_sid: params.data.id },
          "resolve: session mismatch",
        );
        reply.code(403).send({ error: "session_mismatch" });
        return;
      }

      const ice_servers = env.KINBRIDGE_STUN_URLS
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.length > 0)
        .map((urls) => ({ urls }));

      log.info(
        { sid: claims.sid, helper: claims.helper },
        "session resolved",
      );
      return reply.send({
        session_id: claims.sid,
        relay_host: env.KINBRIDGE_RELAY_HOST,
        relay_port: env.KINBRIDGE_RELAY_PORT,
        rendezvous_token: claims.hs_key,
        ice_servers,
        device_fingerprint: env.KINBRIDGE_RELAY_PUBKEY,
      });
    },
  );
}
