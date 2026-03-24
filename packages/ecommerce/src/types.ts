import type { Currency, MaibClientConfig } from "@maib/core";

/**
 * Configuration for the e-Commerce client.
 *
 * The `environment` option is excluded because the v1 E-Commerce API
 * is only available in the production environment.
 */
export interface EcommerceClientConfig
  extends Omit<MaibClientConfig, "clientId" | "clientSecret" | "environment"> {
  /** Project ID from the maibmerchants portal. */
  projectId: string;
  /** Project secret from the maibmerchants portal. */
  projectSecret: string;
}

/** A line item included in a payment request. */
export interface PaymentItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

/** Shared optional fields for customer-facing payment requests. */
export interface BasePaymentParams {
  description?: string;
  clientName?: string;
  email?: string;
  phone?: string;
  orderId?: string;
  delivery?: number;
  items?: PaymentItem[];
  callbackUrl?: string;
  okUrl?: string;
  failUrl?: string;
}

/** Common fields present in customer-facing payment init requests. */
export interface CustomerFacingParams {
  clientIp: string;
  language: string;
  currency: Currency;
}

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

export interface PayRequest extends BasePaymentParams, CustomerFacingParams {
  amount: number;
}

export interface HoldRequest extends BasePaymentParams, CustomerFacingParams {
  amount: number;
}

export interface CompleteRequest {
  payId: string;
  confirmAmount?: number;
}

export interface RefundRequest {
  payId: string;
  refundAmount?: number;
}

export interface SavecardRecurringRequest extends BasePaymentParams, CustomerFacingParams {
  billerExpiry: string;
  email: string;
  amount?: number;
}

export interface ExecuteRecurringRequest {
  billerId: string;
  amount: number;
  currency: Currency;
  description?: string;
  orderId?: string;
  delivery?: number;
  items?: PaymentItem[];
}

export interface SavecardOneclickRequest extends BasePaymentParams, CustomerFacingParams {
  billerExpiry: string;
  amount?: number;
}

export interface ExecuteOneclickRequest extends BasePaymentParams, CustomerFacingParams {
  billerId: string;
  amount: number;
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

export interface PaymentInitResult {
  payId: string;
  orderId?: string;
  payUrl: string;
}

export interface CompleteResult {
  payId: string;
  orderId?: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  rrn?: string;
  approval?: string;
  cardNumber?: string;
  confirmAmount: number;
}

export interface RefundResult {
  payId: string;
  orderId?: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  refundAmount: number;
}

export interface PayInfoResult {
  payId: string;
  orderId?: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  amount: number;
  currency: Currency | (string & {});
  cardNumber?: string;
  rrn?: string;
  approval?: string;
}

export interface ExecuteRecurringResult {
  payId: string;
  billerId: string;
  orderId?: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  rrn?: string;
  approval?: string;
  cardNumber?: string;
  amount: number;
  currency: Currency | (string & {});
}

export interface CallbackPayload {
  result: CallbackResult;
  signature: string;
}

export interface CallbackResult {
  payId: string;
  orderId?: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  threeDs?: string;
  rrn?: string;
  approval?: string;
  cardNumber?: string;
  amount?: number;
  currency?: Currency | (string & {});
  billerId?: string;
  billerExpiry?: string;
}
