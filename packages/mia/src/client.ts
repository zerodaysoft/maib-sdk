import type { PaginatedResult } from "@maib/core";
import { BaseClient, computeSignature, verifySignature } from "@maib/core";
import type {
  CancelExtensionRequest,
  CancelExtensionResult,
  CancelQrRequest,
  CancelQrResult,
  CreateExtensionRequest,
  CreateExtensionResult,
  CreateHybridQrRequest,
  CreateHybridQrResult,
  CreateQrRequest,
  CreateQrResult,
  ListExtensionsParams,
  ListPaymentsParams,
  ListQrParams,
  MiaCallbackPayload,
  MiaPaymentDetails,
  MiaRefundResult,
  QrDetails,
  RefundPaymentRequest,
  TestPayRequest,
  TestPayResult,
} from "./types.js";

/**
 * Client for the maib MIA QR payment API (v2).
 *
 * Handles QR code management (static, dynamic, hybrid), payments,
 * refunds, and callback signature verification.
 */
export class MiaClient extends BaseClient {
  protected readonly _apiVersion = "v2";
  protected readonly _tokenEndpoint = "/v2/auth/token";
  protected readonly _userAgent = `@maib/mia/${BaseClient.version}`;

  protected _getTokenBody(): Record<string, string> {
    return {
      clientId: this._config.clientId,
      clientSecret: this._config.clientSecret,
    };
  }

  // -----------------------------------------------------------------------
  // QR code operations
  // -----------------------------------------------------------------------

  public async createQr(params: CreateQrRequest): Promise<CreateQrResult> {
    return this._postRequest("/v2/mia/qr", params as unknown as Record<string, unknown>);
  }

  public async createHybridQr(params: CreateHybridQrRequest): Promise<CreateHybridQrResult> {
    return this._postRequest(
      "/v2/mia/qr/hybrid",
      params as unknown as Record<string, unknown>,
    );
  }

  public async createExtension(
    qrId: string,
    params: CreateExtensionRequest,
  ): Promise<CreateExtensionResult> {
    return this._postRequest(
      `/v2/mia/qr/${encodeURIComponent(qrId)}/extension`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async getQr(qrId: string): Promise<QrDetails> {
    return this._getRequest(`/v2/mia/qr/${encodeURIComponent(qrId)}`);
  }

  public async listQrs(params: ListQrParams): Promise<PaginatedResult<QrDetails>> {
    return this._getRequest("/v2/mia/qr", params as unknown as Record<string, unknown>);
  }

  public async listExtensions(params: ListExtensionsParams): Promise<PaginatedResult<QrDetails>> {
    return this._getRequest("/v2/mia/qr/extension", params as unknown as Record<string, unknown>);
  }

  public async cancelQr(qrId: string, params: CancelQrRequest): Promise<CancelQrResult> {
    return this._postRequest(
      `/v2/mia/qr/${encodeURIComponent(qrId)}/cancel`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async cancelExtension(
    qrId: string,
    params?: CancelExtensionRequest,
  ): Promise<CancelExtensionResult> {
    return this._postRequest(
      `/v2/mia/qr/${encodeURIComponent(qrId)}/extension/cancel`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Payment operations
  // -----------------------------------------------------------------------

  public async getPayment(payId: string): Promise<MiaPaymentDetails> {
    return this._getRequest(`/v2/mia/payments/${encodeURIComponent(payId)}`);
  }

  public async listPayments(
    params: ListPaymentsParams,
  ): Promise<PaginatedResult<MiaPaymentDetails>> {
    return this._getRequest("/v2/mia/payments", params as unknown as Record<string, unknown>);
  }

  public async refund(payId: string, params: RefundPaymentRequest): Promise<MiaRefundResult> {
    return this._postRequest(
      `/v2/mia/payments/${encodeURIComponent(payId)}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Sandbox simulation
  // -----------------------------------------------------------------------

  public async testPay(params: TestPayRequest): Promise<TestPayResult> {
    return this._postRequest(
      "/v2/mia/test-pay",
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Callback signature verification
  // -----------------------------------------------------------------------

  public verifyCallback(payload: MiaCallbackPayload): boolean {
    if (!this._config.signatureKey) {
      throw new Error(
        "Cannot verify callback signature: no signatureKey was provided in MiaClient config",
      );
    }
    return verifySignature(
      payload.result as unknown as Record<string, unknown>,
      payload.signature,
      this._config.signatureKey,
    );
  }

  public computeCallbackSignature(result: Record<string, unknown>): string {
    if (!this._config.signatureKey) {
      throw new Error("Cannot compute signature: no signatureKey was provided in MiaClient config");
    }
    return computeSignature(result, this._config.signatureKey);
  }
}
