export const CheckoutStatus = {
  WAITING_FOR_INIT: "WaitingForInit",
  INITIALIZED: "Initialized",
  PAYMENT_METHOD_SELECTED: "PaymentMethodSelected",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  ABANDONED: "Abandoned",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
} as const;

export type CheckoutStatus = (typeof CheckoutStatus)[keyof typeof CheckoutStatus];

export const PaymentStatus = {
  EXECUTED: "Executed",
  PARTIALLY_REFUNDED: "PartiallyRefunded",
  REFUNDED: "Refunded",
  FAILED: "Failed",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RefundStatus = {
  CREATED: "Created",
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  MANUAL: "Manual",
} as const;

export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];
