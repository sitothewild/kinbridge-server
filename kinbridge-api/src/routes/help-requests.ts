import type { FastifyInstance } from "fastify";
import { requireServiceToken } from "../middleware/require-service-token.js";
import { HelpRequestBody } from "../schemas/index.js";
import { log } from "../lib/log.js";

/**
 * Doorbell. The on-device KinBridge agent calls this when the user taps
 * "Ask for help". We forward to Lovable's `requestHelp` server fn, which
 * handles fan-out (DoorbellBanner pulse, browser notification, push to
 * owner's phone) and respects the per-device auto_accept_help preference.
 *
 * We act as a relay so the agent never needs to hold a Supabase JWT.
 */
export async function helpRequestRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/help-requests",
    { preHandler: requireServiceToken },
    async (req, reply) => {
      const parsed = HelpRequestBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "bad_request", issues: parsed.error.flatten() });
        return;
      }
      const { device_id, session_id, message } = parsed.data;
      log.info({ device_id, session_id, hasMessage: !!message }, "help request");
      // TODO(week2): call Lovable server fn requestHelp via their /functions/v1
      // edge. For now just log so the agent-side contract can be tested.
      return reply.code(202).send({ status: "queued" });
    },
  );
}
