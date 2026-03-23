import type { Currency, MaibClientConfig, PaginationParams } from "@maib/core";

export type MiaClientConfig = MaibClientConfig;

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

export interface CreateQrRequest {
  type: string;
  amountType: string;
  currency: Currency | (string & {});
  description: string;
  expiresAt?: string;
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  orderId?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  terminalId?: string;
}

export interface CreateHybridQrRequest {
  amountType: string;
  currency: Currency | (string & {});
  terminalId?: string;
  extension?: HybridExtension;
}

export interface HybridExtension {
  expiresAt?: string;
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  description: string;
  orderId?: string;
  callbackUrl?: string;
  redirectUrl?: string;
}

export interface CreateExtensionRequest {
  expiresAt: string;
  description: string;
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  orderId?: string;
  callbackUrl?: string;
  redirectUrl?: string;
}

export interface CancelQrRequest {
  reason: string;
}

export interface CancelExtensionRequest {
  reason?: string;
}

export interface RefundPaymentRequest {
  reason: string;
  amount?: number;
  callbackUrl?: string;
}

export interface TestPayRequest {
  qrId: string;
  amount: number;
  iban: string;
  currency: Currency | (string & {});
  payerName: string;
}

export interface ListQrParams extends PaginationParams {
  qrId?: string;
  extensionId?: string;
  orderId?: string;
  type?: string;
  amountType?: string;
  amountFrom?: number;
  amountTo?: number;
  description?: string;
  status?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  expiresAtFrom?: string;
  expiresAtTo?: string;
  terminalId?: string;
}

export interface ListExtensionsParams extends PaginationParams {
  qrId?: string;
  extensionId?: string;
  orderId?: string;
  status?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  expiresAtFrom?: string;
  expiresAtTo?: string;
}

export interface ListPaymentsParams extends PaginationParams {
  payId?: string;
  referenceId?: string;
  qrId?: string;
  extensionId?: string;
  orderId?: string;
  amountFrom?: number;
  amountTo?: number;
  description?: string;
  payerName?: string;
  payerIban?: string;
  status?: string;
  executedAtFrom?: string;
  executedAtTo?: string;
  terminalId?: string;
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

export interface CreateQrResult {
  qrId: string;
  extensionId?: string;
  orderId?: string;
  type: string;
  url: string;
  expiresAt?: string;
}

export interface CreateHybridQrResult {
  qrId: string;
  extensionId?: string;
  url: string;
}

export interface CreateExtensionResult {
  extensionId: string;
}

export interface QrDetails {
  qrId: string;
  extensionId?: string;
  orderId?: string;
  status: string;
  type: string;
  url: string;
  amountType: string;
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  currency: Currency | (string & {});
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  terminalId?: string;
}

export interface CancelQrResult {
  qrId: string;
  status: string;
}

export interface CancelExtensionResult {
  extensionId: string;
}

export interface MiaPaymentDetails {
  payId: string;
  referenceId?: string;
  qrId: string;
  extensionId?: string;
  orderId?: string;
  amount: number;
  commission: number;
  currency: Currency | (string & {});
  description?: string;
  payerName?: string;
  payerIban?: string;
  status: string;
  executedAt: string;
  refundedAt?: string;
  terminalId?: string;
}

export interface MiaRefundResult {
  refundId: string;
  status: string;
}

export interface TestPayResult {
  qrId: string;
  qrStatus: string;
  orderId?: string;
  payId: string;
  amount: number;
  commission: number;
  currency: Currency | (string & {});
  payerName: string;
  payerIban: string;
  executedAt: string;
  signature: string;
}

export interface MiaCallbackPayload {
  result: MiaCallbackResult;
  signature: string;
}

export interface MiaCallbackResult {
  qrId: string;
  qrStatus: string;
  orderId?: string;
  payId: string;
  amount: number;
  commission: number;
  currency: Currency | (string & {});
  payerName: string;
  payerIban: string;
  executedAt: string;
}
