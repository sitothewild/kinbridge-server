import type { FastifyInstance } from "fastify";
import { requireServiceToken } from "../middleware/require-service-token.js";
import { HeartbeatBody } from "../schemas/index.js";
import { log } from "../lib/log.js";

/**
 * Device presence. The on-device KinBridge agent heartbeats here so Lovable's
 * dashboard knows when a device is online. We don't persist presence in our
 * own DB — we forward the beat to Lovable (via their devices.last_seen column
 * or a realtime channel) and let their dashboard own the truth.
 *
 * TODO(week2): implement the Supabase write. For now the endpoint validates
 * + logs + returns 204 so the agent contract is testable end-to-end.
 */
export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>(
    "/api/devices/:id/heartbeat",
    { preHandler: requireServiceToken },
    async (req, reply) => {
      const parsed = HeartbeatBody.safeParse({
        device_id: req.params.id,
        ...(typeof req.body === "object" && req.body !== null ? req.body : {}),
      });
      if (!parsed.success) {
        reply.code(400).send({ error: "bad_request", issues: parsed.error.flatten() });
        return;
      }
      const { device_id, at } = parsed.data;
      log.info(
        { device_id, at: at ?? new Date().toISOString() },
        "device heartbeat",
      );
      // TODO: supabaseAdmin.from('devices').update({ last_seen: at }).eq('id', device_id)
      return reply.code(204).send();
    },
  );
}
