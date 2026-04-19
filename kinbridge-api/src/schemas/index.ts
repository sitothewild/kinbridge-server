import { z } from "zod";

/**
 * Zod schemas for every request body the API accepts. Strict by default —
 * unknown fields are rejected so a misconfigured caller fails loudly instead
 * of silently drifting.
 */

export const StartSessionBody = z
  .object({
    // Dashboard session id (Supabase sessions.id)
    dashboard_session_id: z.string().uuid(),
    device_id: z.string().uuid(),
    helper_id: z.string().uuid(),
    owner_id: z.string().uuid(),
  })
  .strict();
export type StartSessionBody = z.infer<typeof StartSessionBody>;

export const EndSessionParams = z.object({ id: z.string().uuid() }).strict();

export const HeartbeatBody = z
  .object({
    device_id: z.string().uuid(),
    /** ISO-8601 timestamp, optional — server fills if absent. */
    at: z.string().datetime().optional(),
  })
  .strict();
export type HeartbeatBody = z.infer<typeof HeartbeatBody>;

export const HelpRequestBody = z
  .object({
    device_id: z.string().uuid(),
    session_id: z.string().uuid().optional(),
    message: z.string().max(280).optional(),
  })
  .strict();
export type HelpRequestBody = z.infer<typeof HelpRequestBody>;

export const AuthExchangeBody = z
  .object({
    supabase_jwt: z.string().min(1),
  })
  .strict();
export type AuthExchangeBody = z.infer<typeof AuthExchangeBody>;
