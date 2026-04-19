import { fetch } from "undici";
import { env } from "../config.js";
import { log } from "./log.js";

/**
 * Minimal Headscale REST client. Headscale exposes a gRPC gateway with JSON
 * bindings at /api/v1/*. We only need two verbs for v1:
 *   - mint a pre-authorized, single-use, short-TTL user key for a device
 *   - revoke all keys for a user (kill-switch on pairing revoke)
 *
 * Keep the HTTP surface small; every addition expands our attack surface.
 */

const HEADSCALE_USER = env.HEADSCALE_USER;
const AUTH_HEADER = { authorization: `Bearer ${env.HEADSCALE_API_KEY}` };

interface HeadscalePreAuthKeyResponse {
  preAuthKey: {
    key: string;
    reusable: boolean;
    ephemeral: boolean;
    expiration: string;
    user: string;
  };
}

/**
 * Mint a one-shot pre-auth key that a specific KinBridge client will use once
 * to register with our Headscale tailnet. The key is ephemeral (device is
 * expired if offline > 24h), single-use, and expires in 10 minutes whether or
 * not it's consumed.
 */
export async function mintHeadscalePreAuthKey(opts: {
  deviceId: string;
  minutesValid?: number;
}): Promise<string> {
  const minutes = opts.minutesValid ?? 10;
  const expiration = new Date(Date.now() + minutes * 60_000).toISOString();

  const body = {
    user: HEADSCALE_USER,
    reusable: false,
    ephemeral: true,
    expiration,
    aclTags: [`tag:kb-device-${opts.deviceId}`],
  };

  const res = await fetch(`${env.HEADSCALE_URL}/api/v1/preauthkey`, {
    method: "POST",
    headers: { ...AUTH_HEADER, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    log.error({ status: res.status, text }, "headscale preauthkey failed");
    throw new Error("headscale_preauthkey_failed");
  }
  const data = (await res.json()) as HeadscalePreAuthKeyResponse;
  return data.preAuthKey.key;
}

/**
 * Revoke a device's node entry + any active auth keys tagged for it.
 * Used when the dashboard revokes a pairing or the owner hits the panic kill.
 */
export async function revokeHeadscaleDevice(deviceId: string): Promise<void> {
  const tag = `tag:kb-device-${deviceId}`;
  // List nodes tagged for this device.
  const res = await fetch(
    `${env.HEADSCALE_URL}/api/v1/node?user=${encodeURIComponent(HEADSCALE_USER)}`,
    { headers: AUTH_HEADER },
  );
  if (!res.ok) {
    log.error({ status: res.status }, "headscale node list failed");
    throw new Error("headscale_node_list_failed");
  }
  const { nodes } = (await res.json()) as { nodes: Array<{ id: string; forcedTags: string[] }> };
  const matching = nodes.filter((n) => n.forcedTags?.includes(tag));
  for (const node of matching) {
    const del = await fetch(`${env.HEADSCALE_URL}/api/v1/node/${node.id}`, {
      method: "DELETE",
      headers: AUTH_HEADER,
    });
    if (!del.ok) {
      log.error({ status: del.status, nodeId: node.id }, "headscale node delete failed");
    } else {
      log.info({ nodeId: node.id, deviceId }, "headscale node revoked");
    }
  }
}
