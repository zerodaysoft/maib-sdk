export const QrType = {
  STATIC: "Static",
  DYNAMIC: "Dynamic",
  HYBRID: "Hybrid",
} as const;

export type QrType = (typeof QrType)[keyof typeof QrType];

export const AmountType = {
  FIXED: "Fixed",
  CONTROLLED: "Controlled",
  FREE: "Free",
} as const;

export type AmountType = (typeof AmountType)[keyof typeof AmountType];

export const QrStatus = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  EXPIRED: "Expired",
  PAID: "Paid",
  CANCELLED: "Cancelled",
} as const;

export type QrStatus = (typeof QrStatus)[keyof typeof QrStatus];

export const MiaPaymentStatus = {
  EXECUTED: "Executed",
  REFUNDED: "Refunded",
} as const;

export type MiaPaymentStatus = (typeof MiaPaymentStatus)[keyof typeof MiaPaymentStatus];
