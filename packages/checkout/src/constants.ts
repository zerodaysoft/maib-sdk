// Shared enums are centralised in @maib/core and re-exported here for convenience.
export {
  PaymentEntryPoint,
  PaymentStatus,
  RefundStatus,
  RefundType,
} from "@maib/core";

/** Status of a hosted checkout session. */
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
