import type { Currency, MaibClientConfig, PaginationParams, RefundStatus } from "@maib/core";
import type { RtpStatus } from "./constants.js";

/** Configuration for {@link RtpClient}. */
export type RtpClientConfig = MaibClientConfig;

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

/** Request body for {@link RtpClient.create}. */
export interface CreateRtpRequest {
  /** Customer identification (phone number). Format: `373xxxxxxxx`. */
  alias: string;
  /** RTP amount in major currency units. */
  amount: number;
  /**
   * Expiration timestamp (ISO 8601). Min 1 minute, max 60 days.
   * Example: `"2029-10-22T10:32:28+03:00"`.
   */
  expiresAt: string;
  /** Payment currency. Allowed value: `MDL`. */
  currency: Currency | (string & {});
  /** Order description (max 500 chars). */
  description: string;
  /** Merchant's internal order identifier (max 100 chars). */
  orderId?: string;
  /** Terminal ID provided by the bank (max 100 chars). */
  terminalId?: string;
  /** HTTPS URL where the merchant receives payment data after a successful payment. */
  callbackUrl?: string;
  /** HTTPS URL where the customer is redirected after successful payment. */
  redirectUrl?: string;
}

/** Request body for {@link RtpClient.cancel}. */
export interface CancelRtpRequest {
  /** Reason for initiating the cancellation (max 500 chars). */
  reason: string;
}

/** Request body for {@link RtpClient.refund}. */
export interface RefundRtpRequest {
  /** Reason for initiating the refund (max 500 chars). */
  reason: string;
}

/** Query parameters for {@link RtpClient.list}. */
export interface ListRtpParams extends PaginationParams {
  /** Filter by RTP unique identifier. */
  rtpId?: string;
  /** Filter by merchant-side order identifier. */
  orderId?: string;
  /** Filter by amount (docs type: `string(enum)`). */
  amount?: string;
  /** Filter by description. */
  description?: string;
  /**
   * Filter by RTP status. Possible values:
   * `Created`, `Active`, `Cancelled`, `Accepted`, `Rejected`, `Expired`.
   */
  status?: string;
  /** Creation date — from (ISO 8601). */
  createdAtFrom?: string;
  /** Creation date — to (ISO 8601). */
  createdAtTo?: string;
  /** Expiration date — from (ISO 8601). */
  expiresAtFrom?: string;
  /** Expiration date — to (ISO 8601). */
  expiresAtTo?: string;
  /** Filter by terminal ID (provided by the bank). */
  terminalId?: string;
}

/** Request body for {@link RtpClient.testAccept} (sandbox only). */
export interface TestAcceptRequest {
  /** Payment amount. */
  amount: number;
  /** Payment currency. Allowed value: `MDL`. */
  currency: Currency | (string & {});
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

/** Result of {@link RtpClient.create}. */
export interface CreateRtpResult {
  /** Unique identifier of the created RTP. */
  rtpId: string;
  /** Merchant's order identifier. */
  orderId?: string;
  /** Timestamp when the RTP expires (ISO 8601). */
  expiresAt: string;
}

/**
 * Aggregated RTP details returned by `GET /v2/rtp/{id}` and list items
 * from `GET /v2/rtp`.
 */
export interface RtpStatusResult {
  /** RTP unique identifier. */
  rtpId: string;
  /** Merchant-side order identifier. */
  orderId?: string;
  /** RTP status. See {@link RtpStatus} for known values. */
  status: RtpStatus | (string & {});
  /** RTP amount. */
  amount: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Order description. */
  description: string;
  /** RTP URL (HTTPS). Returned on list items only. */
  url?: string;
  /** HTTPS callback URL. */
  callbackUrl?: string;
  /** HTTPS redirect URL. */
  redirectUrl?: string;
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Last status update timestamp (ISO 8601). */
  updatedAt: string;
  /** Expiration timestamp (ISO 8601). */
  expiresAt: string;
  /** Terminal ID provided by the bank. */
  terminalId?: string;
}

/** Result of {@link RtpClient.cancel}. */
export interface CancelRtpResult {
  /** RTP unique identifier. */
  rtpId: string;
  /** Final RTP status (always `Cancelled`). See {@link RtpStatus}. */
  status: RtpStatus | (string & {});
}

/** Result of {@link RtpClient.refund}. */
export interface RefundRtpResult {
  /** Refund unique identifier. */
  refundId: string;
  /** Initial refund status (always `Created`). See {@link RefundStatus}. */
  status: RefundStatus | (string & {});
}

/** Result of {@link RtpClient.testAccept} (sandbox only). */
export interface TestAcceptResult {
  /** RTP unique identifier. */
  rtpId: string;
  /** RTP status. See {@link RtpStatus} for known values. */
  rtpStatus: RtpStatus | (string & {});
  /** Merchant-side order identifier. */
  orderId?: string;
  /** Payment unique identifier. */
  payId: string;
  /** Payment amount. */
  amount: number;
  /** Payment commission. */
  commission: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Payer abbreviated name. */
  payerName: string;
  /** Payer IBAN. */
  payerIban: string;
  /** Payment execution timestamp (ISO 8601). */
  executedAt: string;
  /** Notification validation signature. */
  signature: string;
}

/** Result of {@link RtpClient.testReject} (sandbox only). */
export interface TestRejectResult {
  /** RTP unique identifier. */
  rtpId: string;
  /** RTP status. See {@link RtpStatus} for known values. */
  rtpStatus: RtpStatus | (string & {});
  /** Merchant-side order identifier. */
  orderId?: string;
  /** Payment unique identifier. */
  payId: string;
  /** Payment amount. */
  amount: number;
  /** Payment commission. */
  commission: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Payer abbreviated name. */
  payerName: string;
  /** Payer IBAN. */
  payerIban: string;
  /** Payment execution timestamp (ISO 8601). */
  executedAt: string;
  /** Notification validation signature. */
  signature: string;
}

/** Callback notification envelope delivered to the merchant's callback URL. */
export interface RtpCallbackPayload {
  /** Transaction result object. */
  result: RtpCallbackResult;
  /** Notification validation signature (Base64 SHA256 over sorted `result` fields + signatureKey). */
  signature: string;
}

/** Transaction data embedded in an {@link RtpCallbackPayload}. */
export interface RtpCallbackResult {
  /** RTP unique identifier. */
  rtpId: string;
  /** RTP status. See {@link RtpStatus} for known values. */
  rtpStatus: RtpStatus | (string & {});
  /** Merchant-side order identifier. */
  orderId?: string;
  /** Payment unique identifier. */
  payId: string;
  /** Payment amount. */
  amount: number;
  /** Payment commission. */
  commission: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Payer abbreviated name. */
  payerName: string;
  /** Payer IBAN. */
  payerIban: string;
  /** Payment execution timestamp (ISO 8601). */
  executedAt: string;
}
