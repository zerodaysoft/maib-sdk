/**
 * String-union constants shared across @maib/* packages.
 *
 * These are re-exported from `@maib/core` as part of its public API. They live
 * here so the same `as const` arrays can power both the public TS unions and
 * the Zod enums in {@link ./enums.ts} without duplication.
 */

/** Sort direction for list endpoints (maib convention: lowercase). */
export const SortOrder = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

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
