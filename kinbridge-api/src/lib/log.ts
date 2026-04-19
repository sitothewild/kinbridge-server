import pino from "pino";
import { env } from "../config.js";

/**
 * Central pino logger. In production writes line-delimited JSON to stdout
 * so systemd / journalctl captures structured fields. In dev uses pino-pretty
 * for human-readable output.
 *
 * Never log secrets: redact lists every path that might carry auth material.
 */
export const log = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-kinbridge-service-token']",
      'res.headers["set-cookie"]',
      "password",
      "token",
      "supabase_jwt",
      "kinbridge_token",
      "HEADSCALE_API_KEY",
      "KINBRIDGE_SERVICE_TOKEN",
      "KINBRIDGE_JWT_SECRET",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { singleLine: true } }
      : undefined,
});
