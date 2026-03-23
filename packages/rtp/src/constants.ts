export const RtpStatus = {
  CREATED: "Created",
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
} as const;

export type RtpStatus = (typeof RtpStatus)[keyof typeof RtpStatus];
