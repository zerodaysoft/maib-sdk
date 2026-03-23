import type { Currency, MaibClientConfig, PaginationParams } from "@maib/core";

export type RtpClientConfig = MaibClientConfig;

// -----------------------------------------------------------------------
// Request types
// -----------------------------------------------------------------------

export interface CreateRtpRequest {
  alias: string;
  amount: number;
  expiresAt: string;
  currency: Currency | (string & {});
  description: string;
  orderId?: string;
  terminalId?: string;
  callbackUrl?: string;
  redirectUrl?: string;
}

export interface CancelRtpRequest {
  reason: string;
}

export interface RefundRtpRequest {
  reason: string;
}

export interface ListRtpParams extends PaginationParams {
  rtpId?: string;
  orderId?: string;
  amount?: string;
  description?: string;
  status?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  expiresAtFrom?: string;
  expiresAtTo?: string;
  terminalId?: string;
}

export interface TestAcceptRequest {
  amount: number;
  currency: Currency | (string & {});
}

// -----------------------------------------------------------------------
// Response types
// -----------------------------------------------------------------------

export interface CreateRtpResult {
  rtpId: string;
  orderId?: string;
  expiresAt: string;
}

export interface RtpStatusResult {
  rtpId: string;
  orderId?: string;
  status: string;
  amount: number;
  currency: Currency | (string & {});
  description: string;
  callbackUrl?: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  terminalId?: string;
}

export interface CancelRtpResult {
  rtpId: string;
  status: string;
}

export interface RefundRtpResult {
  refundId: string;
  status: string;
}

export interface TestAcceptResult {
  rtpId: string;
  status: string;
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

export interface TestRejectResult {
  rtpId: string;
  rtpStatus: string;
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

export interface RtpCallbackPayload {
  result: RtpCallbackResult;
  signature: string;
}

export interface RtpCallbackResult {
  rtpId: string;
  rtpStatus: string;
  orderId?: string;
  payId: string;
  amount: number;
  commission: number;
  currency: Currency | (string & {});
  payerName: string;
  payerIban: string;
  executedAt: string;
}
