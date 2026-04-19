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
