import type {
  Currency,
  MaibClientConfig,
  PaginationParams,
  PaymentStatus,
  RefundStatus,
} from "@maib/core";
import type { AmountType, QrStatus, QrType } from "./constants.js";

/** Configuration for {@link MiaClient}. */
export type MiaClientConfig = MaibClientConfig;

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

/** Request body for {@link MiaClient.createQr}. */
export interface CreateQrRequest {
  /**
   * QR code type. See {@link QrType} for known values (`Static`, `Dynamic`).
   */
  type: QrType | (string & {});
  /**
   * Amount type. See {@link AmountType} for known values
   * (`Fixed`, `Controlled`, `Free`).
   */
  amountType: AmountType | (string & {});
  /** Payment currency. Allowed value: `MDL` (ISO 4217). */
  currency: Currency | (string & {});
  /** Order description (max 500 chars). */
  description: string;
  /**
   * Expiration timestamp (ISO 8601). Required for `Dynamic`.
   * Min 1 minute, max 60 days. Not used for `Static`.
   */
  expiresAt?: string;
  /**
   * Paid amount (major units). Required for `Fixed` and `Controlled`.
   * Constraint: `amountMin ≤ amount ≤ amountMax`. Range: > 0 to 100000.
   */
  amount?: number;
  /** Minimum allowed amount (for `Controlled`). Must be > 0 and < `amountMax`. */
  amountMin?: number;
  /** Maximum allowed amount (for `Controlled`). Must be > `amountMin` and ≤ 100000. */
  amountMax?: number;
  /** Merchant-side order identifier (max 100 chars). */
  orderId?: string;
  /** HTTPS URL where the merchant receives payment result data (max 1000 chars). */
  callbackUrl?: string;
  /** HTTPS URL where the customer is redirected after a successful payment (max 1000 chars). */
  redirectUrl?: string;
  /** Terminal ID provided by the bank (max 100 chars). */
  terminalId?: string;
}

/** Request body for {@link MiaClient.createHybridQr}. */
export interface CreateHybridQrRequest {
  /**
   * Amount type. See {@link AmountType} for known values
   * (`Fixed`, `Controlled`, `Free`).
   */
  amountType: AmountType | (string & {});
  /** Payment currency. Allowed value: `MDL` (ISO 4217). */
  currency: Currency | (string & {});
  /** Terminal ID provided by the bank (max 100 chars). */
  terminalId?: string;
  /** Initial extension attached to the Hybrid QR. */
  extension?: HybridExtension;
}

/** Extension embedded in a {@link CreateHybridQrRequest}. */
export interface HybridExtension {
  /**
   * Expiration timestamp of the Hybrid QR (ISO 8601).
   * Min 1 minute, max 60 days.
   */
  expiresAt: string;
  /** Order description (max 500 chars). */
  description: string;
  /** Fixed amount (required for `Fixed` and `Controlled`). Range: > 0 to 100000. */
  amount?: number;
  /** Minimum allowed amount (for `Controlled`). */
  amountMin?: number;
  /** Maximum allowed amount (for `Controlled`). */
  amountMax?: number;
  /** Merchant-side order identifier (max 100 chars). */
  orderId?: string;
  /** HTTPS URL where the merchant receives payment result data. */
  callbackUrl?: string;
  /** HTTPS URL where the customer is redirected after successful payment. */
  redirectUrl?: string;
}

/** Request body for {@link MiaClient.createExtension}. */
export interface CreateExtensionRequest {
  /**
   * New expiration timestamp (ISO 8601).
   * Min 1 minute, max 60 days.
   */
  expiresAt: string;
  /** Order description (max 500 chars). */
  description: string;
  /** Fixed amount for the extension (required for `Fixed` and `Controlled`). */
  amount?: number;
  /** Minimum allowed amount (for `Controlled`). */
  amountMin?: number;
  /** Maximum allowed amount (for `Controlled`). */
  amountMax?: number;
  /** Merchant-side order identifier. */
  orderId?: string;
  /** HTTPS URL for payment result callback. */
  callbackUrl?: string;
  /** HTTPS URL for post-payment customer redirect. */
  redirectUrl?: string;
}

/** Request body for {@link MiaClient.cancelQr}. */
export interface CancelQrRequest {
  /** Reason for the cancellation request (max 500 chars). */
  reason: string;
}

/** Request body for {@link MiaClient.cancelExtension}. */
export interface CancelExtensionRequest {
  /** Optional reason for cancelling the extension (max 500 chars). */
  reason?: string;
}

/** Request body for {@link MiaClient.refund}. */
export interface RefundPaymentRequest {
  /** Reason for initiating the refund (recommended max 500 chars). */
  reason: string;
  /**
   * Refund amount. If provided, a partial refund is initiated.
   * If omitted, a full refund is initiated.
   */
  amount?: number;
  /** HTTPS URL the system will call when the refund is accepted/processed. */
  callbackUrl?: string;
}

/** Request body for {@link MiaClient.testPay} (sandbox only). */
export interface TestPayRequest {
  /** Unique identifier of the QR code. */
  qrId: string;
  /** Payment amount. */
  amount: number;
  /** Payer's IBAN. */
  iban: string;
  /** Payment currency. Allowed value: `MDL`. */
  currency: Currency | (string & {});
  /** Short name of the payer (max 200 chars). */
  payerName: string;
}

/** Query parameters for {@link MiaClient.listQrs}. */
export interface ListQrParams extends PaginationParams {
  /** Filter by QR ID. */
  qrId?: string;
  /** Filter by QR extension ID. */
  extensionId?: string;
  /** Filter by merchant order ID. */
  orderId?: string;
  /** QR type. See {@link QrType} for known values. */
  type?: QrType | (string & {});
  /** Amount type. See {@link AmountType} for known values. */
  amountType?: AmountType | (string & {});
  /** Minimum amount value (inclusive). */
  amountFrom?: number;
  /** Maximum amount value (inclusive). */
  amountTo?: number;
  /** Filter by description. */
  description?: string;
  /** QR status. See {@link QrStatus} for known values. */
  status?: QrStatus | (string & {});
  /** Creation date — from (ISO 8601). */
  createdAtFrom?: string;
  /** Creation date — to (ISO 8601). */
  createdAtTo?: string;
  /** Expiration date — from (ISO 8601). */
  expiresAtFrom?: string;
  /** Expiration date — to (ISO 8601). */
  expiresAtTo?: string;
  /** Filter by terminal ID. */
  terminalId?: string;
}

/** Query parameters for {@link MiaClient.listExtensions}. */
export interface ListExtensionsParams extends PaginationParams {
  /** Filter by QR ID. */
  qrId?: string;
  /** Filter by extension ID. */
  extensionId?: string;
  /** Filter by merchant order ID. */
  orderId?: string;
  /** Extension status. */
  status?: string;
  /** Creation date — from (ISO 8601). */
  createdAtFrom?: string;
  /** Creation date — to (ISO 8601). */
  createdAtTo?: string;
  /** Expiration date — from (ISO 8601). */
  expiresAtFrom?: string;
  /** Expiration date — to (ISO 8601). */
  expiresAtTo?: string;
}

/** Query parameters for {@link MiaClient.listPayments}. */
export interface ListPaymentsParams extends PaginationParams {
  /** Filter by payment ID. */
  payId?: string;
  /** RRN code for instant payments. */
  referenceId?: string;
  /** Filter by QR code ID. */
  qrId?: string;
  /** Filter by QR extension ID. */
  extensionId?: string;
  /** Filter by merchant order ID. */
  orderId?: string;
  /** Minimum payment amount (inclusive). */
  amountFrom?: number;
  /** Maximum payment amount (inclusive). */
  amountTo?: number;
  /** Filter by description. */
  description?: string;
  /** Filter by payer name. */
  payerName?: string;
  /** Filter by payer IBAN. */
  payerIban?: string;
  /** Payment status. See {@link PaymentStatus} (MIA emits `Executed`/`Refunded`). */
  status?: PaymentStatus | (string & {});
  /** Execution date — from (ISO 8601). */
  executedAtFrom?: string;
  /** Execution date — to (ISO 8601). */
  executedAtTo?: string;
  /** Filter by terminal ID. */
  terminalId?: string;
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

/** Result of {@link MiaClient.createQr}. */
export interface CreateQrResult {
  /** Unique identifier of the QR code. */
  qrId: string;
  /** QR extension identifier. */
  extensionId?: string;
  /** Merchant's order ID. */
  orderId?: string;
  /** QR type. See {@link QrType} for known values. */
  type: QrType | (string & {});
  /** Generated QR URL (HTTPS). */
  url: string;
  /** QR expiration timestamp (ISO 8601), for Dynamic/Hybrid. */
  expiresAt?: string;
}

/** Result of {@link MiaClient.createHybridQr}. */
export interface CreateHybridQrResult {
  /** Unique identifier of the created Hybrid QR. */
  qrId: string;
  /** Identifier of the initial extension, if one was provided. */
  extensionId?: string;
  /** Generated QR URL (HTTPS). */
  url: string;
}

/** Result of {@link MiaClient.createExtension}. */
export interface CreateExtensionResult {
  /** Identifier of the created extension. */
  extensionId: string;
}

/** Aggregated QR details returned by `GET /v2/mia/qr/{qrId}` and `GET /v2/mia/qr`. */
export interface QrDetails {
  /** Unique QR code identifier. */
  qrId: string;
  /** QR extension identifier (for Hybrid). */
  extensionId?: string;
  /** Merchant-side order identifier. */
  orderId?: string;
  /** QR status. See {@link QrStatus} for known values. */
  status: QrStatus | (string & {});
  /** QR type. See {@link QrType} for known values. */
  type: QrType | (string & {});
  /** QR URL (HTTPS). */
  url: string;
  /** Amount type. See {@link AmountType} for known values. */
  amountType: AmountType | (string & {});
  /** Fixed amount (for `Fixed`). */
  amount?: number;
  /** Minimum amount (for `Controlled`). */
  amountMin?: number;
  /** Maximum amount (for `Controlled`). */
  amountMax?: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Order description. */
  description?: string;
  /** Merchant callback URL for payment notifications. */
  callbackUrl?: string;
  /** Redirect URL after payment (for web integration). */
  redirectUrl?: string;
  /** QR creation timestamp (ISO 8601). */
  createdAt: string;
  /** Last status update timestamp (ISO 8601). */
  updatedAt: string;
  /** Expiry timestamp (for Dynamic/Hybrid). */
  expiresAt?: string;
  /** Terminal ID provided by the bank. */
  terminalId?: string;
}

/** Result of {@link MiaClient.cancelQr}. */
export interface CancelQrResult {
  /** Unique identifier of the cancelled QR. */
  qrId: string;
  /** Final status (always `Cancelled`). See {@link QrStatus}. */
  status: QrStatus | (string & {});
}

/** Result of {@link MiaClient.cancelExtension}. */
export interface CancelExtensionResult {
  /** Identifier of the cancelled extension. */
  extensionId: string;
}

/** Payment details returned by `GET /v2/mia/payments/{payId}` and `GET /v2/mia/payments`. */
export interface MiaPaymentDetails {
  /** Unique ID of the payment. */
  payId: string;
  /** RRN code from the instant payments service (max 15 chars). */
  referenceId?: string;
  /** ID of the QR code associated with the payment. */
  qrId: string;
  /** ID of the QR code extension associated with the payment. */
  extensionId?: string;
  /** Merchant-side order identifier. */
  orderId?: string;
  /** Payment amount. */
  amount: number;
  /** Commission applied to the payment. */
  commission: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Order description. */
  description?: string;
  /** Abbreviated name of the payer. */
  payerName?: string;
  /** Payer's IBAN. */
  payerIban?: string;
  /** Payment status. See {@link PaymentStatus} (MIA emits `Executed`/`Refunded`). */
  status: PaymentStatus | (string & {});
  /** Payment execution timestamp (ISO 8601). */
  executedAt: string;
  /** Refund timestamp (ISO 8601), if refunded. */
  refundedAt?: string;
  /** Terminal ID provided by the bank. */
  terminalId?: string;
}

/** Result of {@link MiaClient.refund}. */
export interface MiaRefundResult {
  /** Unique identifier of the created refund. */
  refundId: string;
  /** Initial status of the refund (always `Created`). See {@link RefundStatus}. */
  status: RefundStatus | (string & {});
}

/** Result of {@link MiaClient.testPay} (sandbox only). */
export interface TestPayResult {
  /** Unique identifier of the QR code. */
  qrId: string;
  /** Status of the QR code. See {@link QrStatus} for known values. */
  qrStatus: QrStatus | (string & {});
  /** Merchant-side order identifier. */
  orderId?: string;
  /** Unique identifier of the simulated payment. */
  payId: string;
  /** Payment amount. */
  amount: number;
  /** Commission for the payment. */
  commission: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Abbreviated name of the payer. */
  payerName: string;
  /** IBAN of the payer. */
  payerIban: string;
  /** Payment execution timestamp (ISO 8601). */
  executedAt: string;
  /**
   * Signature key for validating the simulated callback.
   * Must be verified according to the callback signature algorithm.
   */
  signatureKey: string;
}

/** Callback notification envelope delivered to the merchant's callback URL. */
export interface MiaCallbackPayload {
  /** Transaction result object. */
  result: MiaCallbackResult;
  /** Notification validation signature. */
  signature: string;
}

/** Transaction data embedded in a {@link MiaCallbackPayload}. */
export interface MiaCallbackResult {
  /** QR unique identifier. */
  qrId: string;
  /** QR extension identifier (for Hybrid). */
  extensionId?: string;
  /** QR status. See {@link QrStatus} (callbacks emit `Active` or `Paid`). */
  qrStatus: QrStatus | (string & {});
  /** Payment unique identifier. */
  payId: string;
  /** RRN code from the instant payments service. */
  referenceId?: string;
  /** Merchant-side order identifier. */
  orderId?: string;
  /** Payment amount. */
  amount: number;
  /** Payment commission. */
  commission: number;
  /** Payment currency (`MDL`). */
  currency: Currency | (string & {});
  /** Abbreviated name of the payer. */
  payerName: string;
  /** Payer's IBAN. */
  payerIban: string;
  /** Payment execution timestamp (ISO 8601). */
  executedAt: string;
  /** Terminal ID provided by the bank. */
  terminalId?: string;
}
