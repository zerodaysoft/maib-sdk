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

  /**
   * Create a Static or Dynamic QR code.
   *
   * `POST /v2/mia/qr`
   */
  public async createQr(params: CreateQrRequest): Promise<CreateQrResult> {
    return this._postRequest("/v2/mia/qr", params as unknown as Record<string, unknown>);
  }

  /**
   * Create a Hybrid QR code — reusable QR whose amount and expiry
   * can later be changed via {@link createExtension}.
   *
   * `POST /v2/mia/qr/hybrid`
   */
  public async createHybridQr(params: CreateHybridQrRequest): Promise<CreateHybridQrResult> {
    return this._postRequest("/v2/mia/qr/hybrid", params as unknown as Record<string, unknown>);
  }

  /**
   * Attach a new extension to an existing Hybrid QR code, updating
   * its amount and/or validity.
   *
   * `POST /v2/mia/qr/{qrId}/extension`
   */
  public async createExtension(
    qrId: string,
    params: CreateExtensionRequest,
  ): Promise<CreateExtensionResult> {
    return this._postRequest(
      `/v2/mia/qr/${encodeURIComponent(qrId)}/extension`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Retrieve aggregated details of a specific QR code.
   *
   * `GET /v2/mia/qr/{qrId}`
   */
  public async getQr(qrId: string): Promise<QrDetails> {
    return this._getRequest(`/v2/mia/qr/${encodeURIComponent(qrId)}`);
  }

  /**
   * List QR codes, with filtering, sorting, and pagination.
   *
   * `GET /v2/mia/qr`
   */
  public async listQrs(params: ListQrParams): Promise<PaginatedResult<QrDetails>> {
    return this._getRequest("/v2/mia/qr", params as unknown as Record<string, unknown>);
  }

  /**
   * List QR code extensions, with filtering and pagination.
   *
   * `GET /v2/mia/qr/extension`
   */
  public async listExtensions(params: ListExtensionsParams): Promise<PaginatedResult<QrDetails>> {
    return this._getRequest("/v2/mia/qr/extension", params as unknown as Record<string, unknown>);
  }

  /**
   * Cancel an active Static or Dynamic QR code.
   *
   * `POST /v2/mia/qr/{qrId}/cancel`
   */
  public async cancelQr(qrId: string, params: CancelQrRequest): Promise<CancelQrResult> {
    return this._postRequest(
      `/v2/mia/qr/${encodeURIComponent(qrId)}/cancel`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Cancel an active extension on a Hybrid QR code, without
   * cancelling the underlying QR.
   *
   * `POST /v2/mia/qr/{qrId}/extension/cancel`
   */
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

  /**
   * Retrieve details for a specific payment.
   *
   * `GET /v2/mia/payments/{payId}`
   */
  public async getPayment(payId: string): Promise<MiaPaymentDetails> {
    return this._getRequest(`/v2/mia/payments/${encodeURIComponent(payId)}`);
  }

  /**
   * List payments associated with the authenticated merchant,
   * with filtering, sorting, and pagination.
   *
   * `GET /v2/mia/payments`
   */
  public async listPayments(
    params: ListPaymentsParams,
  ): Promise<PaginatedResult<MiaPaymentDetails>> {
    return this._getRequest("/v2/mia/payments", params as unknown as Record<string, unknown>);
  }

  /**
   * Refund a completed payment, fully or partially.
   *
   * Note: the refund endpoint lives at `/v2/payments/{payId}/refund`
   * (no `/mia/` prefix) — it is shared with other maib payment APIs.
   *
   * `POST /v2/payments/{payId}/refund`
   */
  public async refund(payId: string, params: RefundPaymentRequest): Promise<MiaRefundResult> {
    return this._postRequest(
      `/v2/payments/${encodeURIComponent(payId)}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Sandbox simulation
  // -----------------------------------------------------------------------

  /**
   * Simulate a payment in the sandbox environment.
   * Not available in production.
   *
   * `POST /v2/mia/test-pay`
   */
  public async testPay(params: TestPayRequest): Promise<TestPayResult> {
    return this._postRequest("/v2/mia/test-pay", params as unknown as Record<string, unknown>);
  }

  // -----------------------------------------------------------------------
  // Callback signature verification
  // -----------------------------------------------------------------------

  /**
   * Verify the signature of a callback notification. Throws if
   * `signatureKey` was not provided in the client config.
   *
   * @param payload - The full callback body including the `signature` field.
   * @returns `true` if the signature is valid.
   */
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

  /**
   * Compute the expected signature for a callback result object.
   * Throws if `signatureKey` was not provided in the client config.
   */
  public computeCallbackSignature(result: Record<string, unknown>): string {
    if (!this._config.signatureKey) {
      throw new Error("Cannot compute signature: no signatureKey was provided in MiaClient config");
    }
    return computeSignature(result, this._config.signatureKey);
  }
}
