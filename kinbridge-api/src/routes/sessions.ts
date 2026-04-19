import type { FastifyInstance } from "fastify";
import { mintKinbridgeToken } from "../lib/kinbridge-token.js";
import { mintHeadscalePreAuthKey } from "../lib/headscale.js";
import { requireServiceToken } from "../middleware/require-service-token.js";
import { StartSessionBody, EndSessionParams } from "../schemas/index.js";
import { log } from "../lib/log.js";

/**
 * Session endpoints called by the Lovable dashboard's server functions
 * (so every hit here carries X-KinBridge-Service-Token — see requireServiceToken).
 */
export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/sessions/start
   *
   * Lovable has already: authenticated the helper, created the session row,
   * verified owner approval (TOTP-gated), checked RLS, etc. All we do here:
   *   1. Mint a Headscale pre-auth key scoped to this device.
   *   2. Bundle (session id, helper, owner, device, pre-auth-key) into a
   *      short-lived HS256 JWT.
   *   3. Hand back a connect_url the browser opens. The desktop/mobile app
   *      catches kinbridge://session?token=... and runs the handshake.
   */
  app.post(
    "/api/sessions/start",
    { preHandler: requireServiceToken },
    async (req, reply) => {
      const parsed = StartSessionBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "bad_request", issues: parsed.error.flatten() });
        return;
      }
      const { dashboard_session_id, device_id, helper_id, owner_id } = parsed.data;

      let preAuthKey: string;
      try {
        preAuthKey = await mintHeadscalePreAuthKey({ deviceId: device_id });
      } catch (err) {
        log.error({ err, device_id }, "failed minting headscale key");
        reply.code(502).send({ error: "headscale_unavailable" });
        return;
      }

      const token = await mintKinbridgeToken({
        sid: dashboard_session_id,
        owner: owner_id,
        helper: helper_id,
        device: device_id,
        hs_key: preAuthKey,
      });

      const connectUrl = `kinbridge://session?token=${encodeURIComponent(token)}`;
      log.info(
        { dashboard_session_id, device_id, helper_id },
        "session token minted",
      );
      return reply.send({ session_id: dashboard_session_id, connect_url: connectUrl });
    },
  );

  /**
   * POST /api/sessions/:id/end
   *
   * Lovable calls this on its side of endSession; we echo it back so our logs
   * have the explicit teardown. Idempotent — calling twice is a no-op.
   */
  app.post<{ Params: { id: string } }>(
    "/api/sessions/:id/end",
    { preHandler: requireServiceToken },
    async (req, reply) => {
      const parsed = EndSessionParams.safeParse(req.params);
      if (!parsed.success) {
        reply.code(400).send({ error: "bad_request" });
        return;
      }
      const { id } = parsed.data;
      const ended_at = new Date().toISOString();
      // TODO(week2): notify any in-flight kinbridge client holding this
      // session token so it drops the tunnel client-side too. For now we
      // just record the event; the client times out on its own.
      log.info({ session_id: id, ended_at }, "session end recorded");
      return reply.send({ session_id: id, ended_at });
    },
  );
}
