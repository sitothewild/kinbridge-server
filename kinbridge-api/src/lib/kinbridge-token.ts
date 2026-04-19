import { SignJWT, jwtVerify } from "jose";
import { env } from "../config.js";

/**
 * Short-lived JWT the API hands to the KinBridge client when a session starts.
 * The desktop / mobile client trades this for its rendezvous handshake and
 * discards it. TTL is intentionally ~2 minutes — this is a click-to-connect
 * bearer, not a login credential.
 *
 * Signed with HS256 over KINBRIDGE_JWT_SECRET (shared between API instances
 * of the same deployment; we run one instance today).
 */

const secret = new TextEncoder().encode(env.KINBRIDGE_JWT_SECRET);

export interface KinbridgeTokenClaims {
  /** Dashboard session id (Supabase sessions.id). */
  sid: string;
  /** Owner Supabase user id. */
  owner: string;
  /** Helper Supabase user id. */
  helper: string;
  /** Dashboard device id (Supabase devices.id). */
  device: string;
  /** The Headscale auth-key scope (one-shot, expires quickly). */
  hs_key: string;
}

export async function mintKinbridgeToken(
  claims: KinbridgeTokenClaims,
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(env.KINBRIDGE_JWT_ISSUER)
    .setAudience(env.KINBRIDGE_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.KINBRIDGE_JWT_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyKinbridgeToken(
  token: string,
): Promise<KinbridgeTokenClaims> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.KINBRIDGE_JWT_ISSUER,
    audience: env.KINBRIDGE_JWT_AUDIENCE,
  });
  // Narrow: every field we wrote must be present.
  const { sid, owner, helper, device, hs_key } = payload as Record<
    string,
    unknown
  >;
  if (
    typeof sid !== "string" ||
    typeof owner !== "string" ||
    typeof helper !== "string" ||
    typeof device !== "string" ||
    typeof hs_key !== "string"
  ) {
    throw new Error("malformed_kinbridge_token");
  }
  return { sid, owner, helper, device, hs_key };
}
