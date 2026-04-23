import type { Currency, MaibClientConfig, PaginationParams } from "@maib/core";
import type {
  CheckoutStatus,
  PaymentEntryPoint,
  PaymentStatus,
  RefundStatus,
  RefundType,
} from "./constants.js";

// -----------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------

/** Configuration for {@link CheckoutClient}. */
export type CheckoutClientConfig = MaibClientConfig;

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

/** Single line item inside an {@link OrderInfo}. */
export interface OrderItem {
  /** External product identifier (SKU). */
  externalId?: string;
  /** Product name or title. */
  title?: string;
  /** Item price, in major currency units. */
  amount?: number;
  /** ISO 4217 code of the item currency. */
  currency?: Currency | (string & {});
  /** Number of items ordered. */
  quantity?: number;
  /** Optional display order index. */
  displayOrder?: number;
}

/** Order context attached to a checkout session. */
export interface OrderInfo {
  /** Merchant's order identifier. */
  id?: string;
  /** Description or purpose of the order. */
  description?: string;
  /** Order creation timestamp (ISO 8601). */
  date?: string;
  /** Order subtotal (without delivery). */
  orderAmount?: number;
  /** Currency for the order amount. */
  orderCurrency?: Currency | (string & {});
  /** Delivery amount. */
  deliveryAmount?: number;
  /** Currency for the delivery amount. */
  deliveryCurrency?: Currency | (string & {});
  /** List of order items. */
  items?: OrderItem[];
}

/** Payer context attached to a checkout session. */
export interface PayerInfo {
  /** Payer full name. */
  name?: string;
  /** Payer email address. */
  email?: string;
  /** Payer phone number (E.164 format). */
  phone?: string;
  /** IP address of the payer. */
  ip?: string;
  /** User agent string of the payer's device. */
  userAgent?: string;
}

/** Request body for {@link CheckoutClient.createSession}. */
export interface CreateSessionRequest {
  /** Total amount to be charged, in major currency units. */
  amount: number;
  /** ISO 4217 currency code (e.g. `MDL`). */
  currency: Currency | (string & {});
  /** Order details including ID, description, date, amounts and items. */
  orderInfo?: OrderInfo;
  /** Information about the payer (name, contact, IP, user agent). */
  payerInfo?: PayerInfo;
  /** Preferred language for the checkout interface (`ro`, `ru`, `en`). */
  language?: string;
  /** URL to which payment status will be sent after processing. */
  callbackUrl?: string;
  /** Redirect URL after successful payment. */
  successUrl?: string;
  /** Redirect URL after failed or cancelled payment. */
  failUrl?: string;
}

/** Query parameters for {@link CheckoutClient.listSessions}. */
export interface ListSessionsParams extends PaginationParams {
  /** Filter by checkout ID. */
  id?: string;
  /** Filter by merchant order ID. */
  orderId?: string;
  /** Checkout status filter. See {@link CheckoutStatus} for known values. */
  status?: CheckoutStatus | (string & {});
  /** Minimum checkout amount. */
  minAmount?: number;
  /** Maximum checkout amount. */
  maxAmount?: number;
  /** Currency code (ISO 4217). */
  currency?: Currency | (string & {});
  /** Checkout language (e.g. `ro`, `ru`, `en`). */
  language?: string;
  /** Payer name. */
  payerName?: string;
  /** Payer email. */
  payerEmail?: string;
  /** Payer phone. */
  payerPhone?: string;
  /** Payer IP. */
  payerIp?: string;
  /** Return records created after this timestamp (ISO 8601). */
  createdAtFrom?: string;
  /** Return records created before this timestamp (ISO 8601). */
  createdAtTo?: string;
  /** Return records expiring after this timestamp (ISO 8601). */
  expiresAtFrom?: string;
  /** Return records expiring before this timestamp (ISO 8601). */
  expiresAtTo?: string;
  /** Return records cancelled after this timestamp (ISO 8601). */
  cancelledAtFrom?: string;
  /** Return records cancelled before this timestamp (ISO 8601). */
  cancelledAtTo?: string;
  /** Return records failed after this timestamp (ISO 8601). */
  failedAtFrom?: string;
  /** Return records failed before this timestamp (ISO 8601). */
  failedAtTo?: string;
  /** Return records completed after this timestamp (ISO 8601). */
  completedAtFrom?: string;
  /** Return records completed before this timestamp (ISO 8601). */
  completedAtTo?: string;
}

/** Query parameters for {@link CheckoutClient.listPayments}. */
export interface ListPaymentsParams extends PaginationParams {
  /** Filter by a specific payment identifier. */
  paymentId?: string;
  /** Filter payments associated with a specific payment intent. */
  paymentIntentId?: string;
  /** Identifier of the terminal that initiated the payment. */
  terminalId?: string;
  /** Minimum payment amount (inclusive). */
  amountFrom?: number;
  /** Maximum payment amount (inclusive). */
  amountTo?: number;
  /** Currency code of the payment (ISO 4217). */
  currency?: Currency | (string & {});
  /** Merchant order identifier associated with the payment. */
  orderId?: string;
  /** Filter payments by note content. */
  note?: string;
  /** Payment status filter. See {@link PaymentStatus} for known values. */
  status?: PaymentStatus | (string & {});
  /** Start of execution date interval (inclusive, ISO 8601). */
  executedAtFrom?: string;
  /** End of execution date interval (inclusive, ISO 8601). */
  executedAtTo?: string;
  /** IBAN of the payment recipient. */
  recipientIban?: string;
  /** Reference number assigned to the payment. */
  referenceNumber?: string;
  /** IBAN of the payment sender. */
  senderIban?: string;
  /** Name of the payment sender. */
  senderName?: string;
  /** Provider channel used for the payment (e.g. `QR`). */
  providerType?: string;
  /** Merchant Category Code associated with the payment. */
  mcc?: string;
  /** Payment type (e.g. `MIA`). */
  type?: string;
}

/** Request body for {@link CheckoutClient.refund}. */
export interface RefundRequest {
  /** Total amount to be refunded, in major currency units. */
  amount: number;
  /** Reason for initiating the refund (max 500 characters). */
  reason: string;
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

/** Result of {@link CheckoutClient.createSession}. */
export interface CreateSessionResult {
  /** Unique identifier of the created checkout session. */
  checkoutId: string;
  /** URL to redirect the payer to the hosted checkout page. */
  checkoutUrl: string;
}

/** Result of {@link CheckoutClient.cancelSession}. */
export interface CancelSessionResult {
  /** Identifier of the cancelled checkout session. */
  checkoutId: string;
  /** Final status of the checkout — always `Cancelled`. See {@link CheckoutStatus}. */
  status: CheckoutStatus | (string & {});
}

/** Order item attached to a retrieved checkout session. */
export interface SessionOrderItem {
  /** External product identifier (SKU). */
  externalId?: string | null;
  /** Product name or title. */
  title?: string | null;
  /** Item price, in major currency units. */
  amount?: number | null;
  /** ISO 4217 code of the item currency. */
  currency?: Currency | (string & {}) | null;
  /** Number of items ordered. */
  quantity?: number | null;
  /** Optional display order index. */
  displayOrder?: number | null;
}

/** Order summary embedded in a retrieved checkout session. */
export interface SessionOrder {
  /** Merchant's order identifier. */
  id?: string | null;
  /** Order description. */
  description?: string | null;
  /** Order amount (major units). */
  amount?: number | null;
  /** ISO 4217 currency code (e.g. `MDL`). */
  currency?: Currency | (string & {}) | null;
  /** Delivery amount. */
  deliveryAmount?: number | null;
  /** ISO 4217 currency code of the delivery amount. */
  deliveryCurrency?: Currency | (string & {}) | null;
  /** Order date (ISO 8601). */
  date?: string | null;
  /** List of order items. */
  orderItems?: SessionOrderItem[] | null;
}

/** Payer summary embedded in a retrieved checkout session. */
export interface SessionPayer {
  /** Payer full name. */
  name?: string | null;
  /** Payer email address. */
  email?: string | null;
  /** Payer phone number (E.164 format). */
  phone?: string | null;
  /** IP address of the payer. */
  ip?: string | null;
  /** User agent string of the payer's device. */
  userAgent?: string | null;
}

/** Payment summary embedded in a retrieved checkout session. */
export interface SessionPayment {
  /** Payment identifier. */
  paymentId: string;
  /** Execution timestamp (ISO 8601). */
  executedAt: string;
  /** Payment status. See {@link PaymentStatus} for known values. */
  status: PaymentStatus | (string & {});
  /** Payment amount (major units). */
  amount: number;
  /** ISO 4217 currency code. */
  currency: Currency | (string & {});
  /** Payment type (e.g. `MIA`). */
  type: string;
  /** Provider type. */
  providerType: string;
  /** Sender name. */
  senderName?: string | null;
  /** Sender IBAN. */
  senderIban?: string | null;
  /** Recipient IBAN. */
  recipientIban?: string | null;
  /** Payment reference number. */
  referenceNumber: string;
  /** Merchant Category Code. */
  mcc: string;
  /** Merchant order identifier. */
  orderId?: string | null;
  /** Terminal identifier. */
  terminalId?: string | null;
  /** Total amount already refunded. */
  refundedAmount: number;
  /** Payment method used (e.g. `Card`, `MiaQr`). */
  paymentMethod?: string | null;
  /** Provider approval code. */
  approvalCode?: string | null;
  /** Requested refund amount. */
  requestedRefundAmount: number;
  /** First refund timestamp (ISO 8601). */
  firstRefundedAt?: string | null;
  /** Last refund timestamp (ISO 8601). */
  lastRefundedAt?: string | null;
  /** Free-form note. */
  note?: string | null;
}

/** Aggregated checkout session details returned by `GET /v2/checkouts/{id}` and `GET /v2/checkouts`. */
export interface SessionDetails {
  /** Checkout identifier. */
  id: string;
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Checkout status. See {@link CheckoutStatus} for known values. */
  status: CheckoutStatus | (string & {});
  /** Checkout amount (major units). */
  amount: number;
  /** ISO 4217 currency code (e.g. `MDL`). */
  currency: Currency | (string & {});
  /** Callback URL for this checkout. */
  callbackUrl: string;
  /** Success URL for this checkout. */
  successUrl: string;
  /** Fail URL for this checkout. */
  failUrl: string;
  /** Language of this checkout (`ro`, `ru`, `en`). */
  language: string;
  /** URL of the checkout session. */
  url: string;
  /** Expiration timestamp (ISO 8601). */
  expiresAt: string;
  /** Completion timestamp (ISO 8601). */
  completedAt?: string | null;
  /** Failure timestamp (ISO 8601). */
  failedAt?: string | null;
  /** Cancellation timestamp (ISO 8601). */
  cancelledAt?: string | null;
  /** Order summary. */
  order?: SessionOrder | null;
  /** Payer summary. */
  payer?: SessionPayer | null;
  /** Payment summary. */
  payment?: SessionPayment | null;
}

/** Payment details returned by `GET /v2/payments/{id}` and `GET /v2/payments`. */
export interface PaymentDetails {
  /** Unique identifier of the executed payment. */
  paymentId: string;
  /** Identifier of the related payment intent, if applicable. */
  paymentIntentId?: string | null;
  /** Date and time when the payment was executed (ISO 8601). */
  executedAt: string;
  /** Current status of the payment. See {@link PaymentStatus} for known values. */
  status: PaymentStatus | (string & {});
  /** Amount of the payment (major units). */
  amount: number;
  /** Currency code of the payment (ISO 4217). */
  currency: Currency | (string & {});
  /** Payment type (e.g. `MIA`). */
  type: string;
  /** Provider channel used for the payment (e.g. `QR`). */
  providerType: string;
  /** Name of the payment sender. */
  senderName?: string | null;
  /** IBAN of the payment sender. */
  senderIban?: string | null;
  /** IBAN of the payment recipient. */
  recipientIban?: string | null;
  /** Reference number assigned to the payment. */
  referenceNumber: string;
  /** Merchant Category Code associated with the payment. */
  mcc: string;
  /** Merchant order identifier linked to the payment. */
  orderId: string;
  /** Identifier of the terminal that initiated the payment. */
  terminalId: string;
  /** Total amount already refunded for this payment. */
  refundedAmount: number;
  /** Payment method used (e.g. `Card`, `MiaQr`). */
  paymentMethod?: string | null;
  /** Approval code for the transaction. */
  approvalCode?: string | null;
  /** Total refund amount currently requested. */
  requestedRefundAmount: number;
  /** Date and time of the first refund operation, if any. */
  firstRefundedAt?: string | null;
  /** Date and time of the most recent refund operation, if any. */
  lastRefundedAt?: string | null;
  /** Optional note attached to the payment. */
  note?: string | null;
  /** Whether the payment can be refunded. */
  isRefundable?: boolean;
  /** Whether a partial refund is available for this payment. */
  partialRefundAvailable?: boolean;
  /** Payment entry point. See {@link PaymentEntryPoint} for known values. */
  paymentEntryPoint?: PaymentEntryPoint | (string & {});
  /** Amount currently available for refund. */
  refundableAmount?: number;
}

/** Result of {@link CheckoutClient.refund}. */
export interface RefundResult {
  /** Unique identifier of the created refund. */
  refundId: string;
  /** Initial status of the refund (always `Created`). See {@link RefundStatus}. */
  status: RefundStatus | (string & {});
}

/** Refund details returned by `GET /v2/payments/refunds/{id}`. */
export interface RefundDetails {
  /** Unique refund identifier. */
  id: string;
  /** Identifier of the payment for which the refund was initiated. */
  paymentId: string;
  /** Refund type. See {@link RefundType} for known values. */
  refundType: RefundType | (string & {});
  /** Refund amount. */
  amount: number;
  /** Refund currency (ISO 4217). */
  currency: Currency | (string & {});
  /** Refund reason. */
  refundReason: string;
  /** Date and time when the refund was created or processed (ISO 8601). */
  executedAt: string;
  /** Current refund status. See {@link RefundStatus} for known values. */
  status: RefundStatus | (string & {});
}

/**
 * Payload delivered to the merchant's configured `callbackUrl`
 * after a checkout session finishes.
 */
export interface CheckoutCallbackPayload {
  /** Unique identifier of the checkout. */
  checkoutId: string;
  /** Merchant terminal identifier. */
  terminalId?: string | null;
  /** Total checkout amount. */
  amount: number;
  /** Checkout currency (ISO 4217). */
  currency: Currency | (string & {});
  /** Timestamp when the checkout was completed (ISO 8601-1:2019). */
  completedAt: string;
  /** Payer's name. */
  payerName?: string | null;
  /** Payer's email address. */
  payerEmail?: string | null;
  /** Payer's phone number (MSISDN). */
  payerPhone?: string | null;
  /** Payer's IP address (IPv4/IPv6). */
  payerIp?: string | null;
  /** Merchant's order identifier. */
  orderId?: string | null;
  /** Description of the purchased goods or services. */
  orderDescription?: string | null;
  /** Delivery amount, if specified. */
  orderDeliveryAmount?: number | null;
  /** Delivery currency (ISO 4217). */
  orderDeliveryCurrency?: Currency | (string & {}) | null;
  /** Unique identifier of the payment. */
  paymentId: string;
  /** Payment amount. */
  paymentAmount: number;
  /** Payment currency (ISO 4217). */
  paymentCurrency: Currency | (string & {});
  /** Payment status. See {@link PaymentStatus} for known values. */
  paymentStatus: PaymentStatus | (string & {});
  /** Timestamp when the payment was executed (ISO 8601-1:2019). */
  paymentExecutedAt: string;
  /** Sender's IBAN (for A2A payments). */
  senderIban?: string | null;
  /** Name of the sender (cardholder/account holder). */
  senderName: string;
  /** Masked card number used in the transaction. */
  senderCardNumber?: string | null;
  /** Retrieval Reference Number (RRN/ARN). */
  retrievalReferenceNumber: string;
  /** Internal payment processing status. */
  processingStatus?: string | null;
  /** Provider/internal status code (e.g. `"00"`). */
  processingStatusCode?: string | null;
  /** Provider approval code. */
  approvalCode?: string | null;
  /** 3-D Secure authentication result (`Y`, `N`, `U`, etc.). */
  threeDsResult?: string | null;
  /** Additional information on the 3DS result, if available. */
  threeDsReason?: string | null;
  /** Payment method used (e.g. `Card`, `MiaQr`). */
  paymentMethod?: string | null;
}
