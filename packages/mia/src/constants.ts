import { PaymentStatus } from "@maib/core";

// Shared enums are centralised in @maib/core and re-exported here for convenience.
export { PaymentStatus } from "@maib/core";

/** QR code type. */
export const QrType = {
  STATIC: "Static",
  DYNAMIC: "Dynamic",
  HYBRID: "Hybrid",
} as const;

export type QrType = (typeof QrType)[keyof typeof QrType];

/** QR code amount type. */
export const AmountType = {
  FIXED: "Fixed",
  CONTROLLED: "Controlled",
  FREE: "Free",
} as const;

export type AmountType = (typeof AmountType)[keyof typeof AmountType];

/** QR code lifecycle status. */
export const QrStatus = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  EXPIRED: "Expired",
  PAID: "Paid",
  CANCELLED: "Cancelled",
} as const;

export type QrStatus = (typeof QrStatus)[keyof typeof QrStatus];

/**
 * @deprecated Use `PaymentStatus` from `@maib/core` (also re-exported from
 * `@maib/mia`). The MIA API currently emits only `Executed` and `Refunded`,
 * both of which are values of the shared {@link PaymentStatus} enum.
 */
export const MiaPaymentStatus = {
  EXECUTED: PaymentStatus.EXECUTED,
  REFUNDED: PaymentStatus.REFUNDED,
} as const;

/** @deprecated Use {@link PaymentStatus} from `@maib/core`. */
export type MiaPaymentStatus = (typeof MiaPaymentStatus)[keyof typeof MiaPaymentStatus];
