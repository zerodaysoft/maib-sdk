/** Transaction statuses returned by the maib API. */
export const TransactionStatus = {
  OK: "OK",
  FAILED: "FAILED",
  CREATED: "CREATED",
  PENDING: "PENDING",
  DECLINED: "DECLINED",
  TIMEOUT: "TIMEOUT",
  REVERSED: "REVERSED",
} as const;

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

/** 3D Secure authentication statuses. */
export const ThreeDsStatus = {
  AUTHENTICATED: "AUTHENTICATED",
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  UNAVAILABLE: "UNAVAILABLE",
  ATTEMPTED: "ATTEMPTED",
  REJECTED: "REJECTED",
  SKIPPED: "SKIPPED",
  NOTPARTICIPATED: "NOTPARTICIPATED",
} as const;

export type ThreeDsStatus = (typeof ThreeDsStatus)[keyof typeof ThreeDsStatus];
