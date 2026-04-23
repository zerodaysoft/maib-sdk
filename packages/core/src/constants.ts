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

/** Supported currencies for maib transactions. */
export const Currency = {
  MDL: "MDL",
  EUR: "EUR",
  USD: "USD",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

/** Supported checkout page languages. */
export const Language = {
  RO: "ro",
  EN: "en",
  RU: "ru",
} as const;

export type Language = (typeof Language)[keyof typeof Language];

/** Status of a payment processed through the maib platform. */
export const PaymentStatus = {
  EXECUTED: "Executed",
  PARTIALLY_REFUNDED: "PartiallyRefunded",
  REFUNDED: "Refunded",
  FAILED: "Failed",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Status of a refund processed through the shared `/v2/payments/{payId}/refund` endpoint. */
export const RefundStatus = {
  CREATED: "Created",
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  MANUAL: "Manual",
} as const;

export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

/** Refund coverage — full transaction or partial amount. */
export const RefundType = {
  FULL: "Full",
  PARTIAL: "Partial",
} as const;

export type RefundType = (typeof RefundType)[keyof typeof RefundType];

/** Entry point through which a payment was initiated. */
export const PaymentEntryPoint = {
  CHECKOUT: "Checkout",
  API: "API",
  PAY_BY_LINK: "PayByLink",
  POS: "Pos",
} as const;

export type PaymentEntryPoint = (typeof PaymentEntryPoint)[keyof typeof PaymentEntryPoint];
