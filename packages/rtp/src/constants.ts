export const RtpStatus = {
  CREATED: "Created",
  ACTIVE: "Active",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
} as const;

export type RtpStatus = (typeof RtpStatus)[keyof typeof RtpStatus];
