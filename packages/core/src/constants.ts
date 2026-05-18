/** Production API host. */
export const PRODUCTION_API_HOST = "https://api.maibmerchants.md";

/** Sandbox (test) API host. */
export const SANDBOX_API_HOST = "https://sandbox.maibmerchants.md";

/** @deprecated Use `PRODUCTION_API_HOST` instead. */
export const DEFAULT_API_HOST = PRODUCTION_API_HOST;

/** Buffer in seconds before token expiry to trigger a proactive refresh. */
export const TOKEN_REFRESH_BUFFER_S = 30;

/** Available API environments. */
export const Environment = {
  PRODUCTION: "production",
  SANDBOX: "sandbox",
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

export {
  Currency,
  Language,
  PaymentEntryPoint,
  PaymentStatus,
  RefundStatus,
  RefundType,
  SortOrder,
} from "@maib/internal-schemas";
