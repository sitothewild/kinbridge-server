import type { FastifyInstance } from "fastify";
import { verifyKinbridgeToken } from "../lib/kinbridge-token.js";
import { log } from "../lib/log.js";

interface KinbridgeEvent {
  type:
    | "device.online"
    | "device.offline"
    | "help.requested"
    | "session.started"
    | "session.ended";
  at: string;
  payload: Record<string, unknown>;
}

/**
 * In-process pub/sub hub. One instance today; if we ever scale out, swap in
 * Redis Pub/Sub and this interface stays.
 */
class EventHub {
  private subscribers = new Set<(ev: KinbridgeEvent) => void>();

  subscribe(fn: (ev: KinbridgeEvent) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  publish(ev: KinbridgeEvent): void {
    for (const fn of this.subscribers) {
      try {
        fn(ev);
      } catch (err) {
        log.error({ err }, "ws subscriber threw");
      }
    }
  }
}

export const eventHub = new EventHub();

/**
 * WS /ws/events?token=<kinbridge_token>
 *
 * Clients (mostly the Lovable dashboard over a WebSocket) subscribe to realtime
 * events. The token is the same kinbridge_token minted by /sessions/start; it
 * authorizes the socket for the lifetime of that session. No renewal — when
 * the session ends the socket is closed and a new one is opened on next start.
 */
export async function wsEventRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ws/events", { websocket: true }, async (socket, req) => {
    const token =
      typeof (req.query as { token?: unknown }).token === "string"
        ? (req.query as { token: string }).token
        : null;
    if (!token) {
      socket.close(1008, "missing_token");
      return;
    }
    try {
      const claims = await verifyKinbridgeToken(token);
      log.info({ sid: claims.sid }, "ws connected");
      const unsubscribe = eventHub.subscribe((ev) => {
        socket.send(JSON.stringify(ev));
      });
      socket.on("close", () => {
        unsubscribe();
        log.info({ sid: claims.sid }, "ws disconnected");
      });
    } catch (err) {
      log.warn({ err }, "ws token verify failed");
      socket.close(1008, "invalid_token");
    }
  });
}
