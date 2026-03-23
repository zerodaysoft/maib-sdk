import type { Currency, MaibClientConfig, PaginationParams } from "@maib/core";

// -----------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------

export type CheckoutClientConfig = MaibClientConfig;

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

export interface OrderItem {
  externalId?: string;
  title?: string;
  amount?: number;
  currency?: Currency | (string & {});
  quantity?: number;
  displayOrder?: number;
}

export interface OrderInfo {
  id?: string;
  description?: string;
  date?: string;
  orderAmount?: number;
  orderCurrency?: Currency | (string & {});
  deliveryAmount?: number;
  deliveryCurrency?: Currency | (string & {});
  items?: OrderItem[];
}

export interface PayerInfo {
  name?: string;
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
}

export interface CreateSessionRequest {
  amount: number;
  currency: Currency | (string & {});
  orderInfo?: OrderInfo;
  payerInfo?: PayerInfo;
  language?: string;
  callbackUrl?: string;
  successUrl?: string;
  failUrl?: string;
}

export interface ListSessionsParams extends PaginationParams {
  id?: string;
  orderId?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: Currency | (string & {});
  language?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  payerIp?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  expiresAtFrom?: string;
  expiresAtTo?: string;
  cancelledAtFrom?: string;
  cancelledAtTo?: string;
  failedAtFrom?: string;
  failedAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
}

export interface ListPaymentsParams extends PaginationParams {
  paymentId?: string;
  paymentIntentId?: string;
  terminalId?: string;
  amountFrom?: number;
  amountTo?: number;
  currency?: Currency | (string & {});
  orderId?: string;
  note?: string;
  status?: string;
  executedAtFrom?: string;
  executedAtTo?: string;
  recipientIban?: string;
  referenceNumber?: string;
  senderIban?: string;
  senderName?: string;
  providerType?: string;
  mcc?: string;
  type?: string;
}

export interface RefundRequest {
  amount: number;
  reason: string;
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

export interface CreateSessionResult {
  checkoutId: string;
  checkoutUrl: string;
}

export interface CancelSessionResult {
  checkoutId: string;
  status: string;
}

export interface SessionOrderItem {
  externalId?: string | null;
  title?: string | null;
  amount?: number | null;
  currency?: Currency | (string & {}) | null;
  quantity?: number | null;
  displayOrder?: number | null;
}

export interface SessionOrder {
  id?: string | null;
  description?: string | null;
  amount?: number | null;
  currency?: Currency | (string & {}) | null;
  deliveryAmount?: number | null;
  deliveryCurrency?: Currency | (string & {}) | null;
  date?: string | null;
  orderItems?: SessionOrderItem[] | null;
}

export interface SessionPayer {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface SessionPayment {
  paymentId: string;
  executedAt: string;
  status: string;
  amount: number;
  currency: Currency | (string & {});
  type: string;
  providerType: string;
  senderName?: string | null;
  senderIban?: string | null;
  recipientIban?: string | null;
  referenceNumber: string;
  mcc: string;
  orderId?: string | null;
  terminalId?: string | null;
  refundedAmount: number;
  paymentMethod?: string | null;
  approvalCode?: string | null;
  requestedRefundAmount: number;
  firstRefundedAt?: string | null;
  lastRefundedAt?: string | null;
  note?: string | null;
}

export interface SessionDetails {
  id: string;
  createdAt: string;
  status: string;
  amount: number;
  currency: Currency | (string & {});
  callbackUrl: string;
  successUrl: string;
  failUrl: string;
  language: string;
  url: string;
  expiresAt: string;
  completedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  order?: SessionOrder | null;
  payer?: SessionPayer | null;
  payment?: SessionPayment | null;
}

export interface PaymentDetails {
  paymentId: string;
  paymentIntentId?: string | null;
  executedAt: string;
  status: string;
  amount: number;
  currency: Currency | (string & {});
  type: string;
  providerType: string;
  senderName?: string | null;
  senderIban?: string | null;
  recipientIban?: string | null;
  referenceNumber: string;
  mcc: string;
  orderId: string;
  terminalId: string;
  refundedAmount: number;
  paymentMethod?: string | null;
  approvalCode?: string | null;
  requestedRefundAmount: number;
  firstRefundedAt?: string | null;
  lastRefundedAt?: string | null;
  note?: string | null;
  isRefundable?: boolean;
  partialRefundAvailable?: boolean;
  paymentEntryPoint?: string;
  refundableAmount?: number;
}

export interface RefundResult {
  refundId: string;
  status: string;
}

export interface RefundDetails {
  id: string;
  paymentId: string;
  refundType: string;
  amount: number;
  currency: Currency | (string & {});
  refundReason: string;
  executedAt: string;
  status: string;
}

/** Callback payload fields sent to callbackUrl. */
export interface CheckoutCallbackPayload {
  checkoutId: string;
  terminalId?: string | null;
  amount: number;
  currency: Currency | (string & {});
  completedAt: string;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  payerIp?: string | null;
  orderId?: string | null;
  orderDescription?: string | null;
  orderDeliveryAmount?: number | null;
  orderDeliveryCurrency?: Currency | (string & {}) | null;
  paymentId: string;
  paymentAmount: number;
  paymentCurrency: Currency | (string & {});
  paymentStatus: string;
  paymentExecutedAt: string;
  senderIban?: string | null;
  senderName: string;
  senderCardNumber?: string | null;
  retrievalReferenceNumber: string;
  processingStatus?: string | null;
  processingStatusCode?: string | null;
  approvalCode?: string | null;
  threeDsResult?: string | null;
  threeDsReason?: string | null;
  paymentMethod?: string | null;
}
