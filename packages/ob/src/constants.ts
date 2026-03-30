/** Default host for the maib Open Banking sandbox. */
export const OB_DEFAULT_HOST = "https://ob-sandbox.maib.md";

/** Default TTL in milliseconds for DirectLogin tokens (OBP doesn't return expiry). */
export const OB_DEFAULT_TOKEN_TTL_MS = 3_600_000;

/** Consent lifecycle statuses. */
const ConsentStatus = {
  INITIATED: "INITIATED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
  AUTHORISED: "AUTHORISED",
} as const;

type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];

/** Transaction request statuses. */
const TransactionRequestStatus = {
  INITIATED: "INITIATED",
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

type TransactionRequestStatus =
  (typeof TransactionRequestStatus)[keyof typeof TransactionRequestStatus];

export { ConsentStatus, TransactionRequestStatus };
