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
 * WS /ws/events
 *
 * Clients subscribe to realtime events. The token is the same kinbridge_token
 * minted by /sessions/start; it authorizes the socket for the lifetime of that
 * session. No renewal — when the session ends the socket is closed and a new
 * one is opened on next start.
 *
 * Auth: `Authorization: Bearer <kinbridge_token>` on the HTTP upgrade request.
 * Tokens are deliberately NOT accepted as a URL query parameter — query
 * params land in proxy logs, referer headers, and journald. The upgrade
 * request carries headers like any other HTTP request, so the browser's
 * WebSocket API can pass the bearer via `Sec-WebSocket-Protocol` negotiation
 * (see the client's subprotocol handler).
 */
export async function wsEventRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ws/events", { websocket: true }, async (socket, req) => {
    const authHeader = req.headers.authorization ?? "";
    const m = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (!m) {
      socket.close(1008, "missing_bearer_token");
      return;
    }
    try {
      const claims = await verifyKinbridgeToken(m[1]);
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
