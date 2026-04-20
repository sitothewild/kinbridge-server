import "dotenv/config";
import { z } from "zod";

/**
 * Environment schema. Every field we read must be declared here so a missing
 * or malformed env var fails at boot, not at the first request. This is
 * deliberately strict — the API has to be safe by default because it sits on
 * the seam between Lovable and the relay.
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("production"),

  KINBRIDGE_SERVICE_TOKEN: z
    .string()
    .min(32, "KINBRIDGE_SERVICE_TOKEN must be >=32 chars (use openssl rand -hex 32)"),

  KINBRIDGE_JWT_SECRET: z
    .string()
    .min(32, "KINBRIDGE_JWT_SECRET must be >=32 chars"),
  KINBRIDGE_JWT_ISSUER: z.string().url().default("https://api.kinbridge.support"),
  KINBRIDGE_JWT_AUDIENCE: z.string().default("kinbridge-client"),
  KINBRIDGE_JWT_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(120),

  SUPABASE_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  HEADSCALE_URL: z.string().url().default("http://127.0.0.1:8080"),
  HEADSCALE_API_KEY: z.string().min(1),
  HEADSCALE_USER: z.string().min(1).default("kinbridge"),

  HBBS_LOG_PATH: z.string().optional(),

  // Relay config surfaced by POST /v1/sessions/:id/resolve to the Android
  // DeepLinkActivity (see android-snippets/README.md in kinbridgesupport).
  // The client uses these to point its Rust core at hbbs/hbbr.
  //
  // RELAY_HOST: hostname or IP the agent should dial. LAN-only today
  //   (192.168.68.54); will be a tailnet IP once libtailscale is embedded.
  // RELAY_PORT: hbbr TCP port (21117 on stock RustDesk).
  // RELAY_PUBKEY: base64 Ed25519 pubkey from /var/lib/kinbridge/data/id_ed25519.pub
  //   — used by the agent to verify the relay's identity (end-to-end trust).
  // STUN_URLS: comma-separated STUN/TURN URLs for NAT traversal. Defaults
  //   to Google's public STUN; swap for a private TURN if/when we host one.
  KINBRIDGE_RELAY_HOST: z.string().min(1).default("192.168.68.54"),
  KINBRIDGE_RELAY_PORT: z.coerce.number().int().min(1).max(65535).default(21117),
  KINBRIDGE_RELAY_PUBKEY: z.string().min(1).default(
    "WqooDze2t33XwECZ7swZG+2xAk7JL0b9rGqj3I4vzcw=",
  ),
  KINBRIDGE_STUN_URLS: z.string().min(1).default("stun:stun.l.google.com:19302"),

  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().min(1).default(600),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().int().min(1).default(20),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error(
      "Invalid environment. Missing / malformed:",
      JSON.stringify(errors, null, 2),
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
