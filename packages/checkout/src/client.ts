import type { PaginatedResult } from "@maib/core";
import { BaseClient, computeHmacSignature, verifyHmacSignature } from "@maib/core";
import type {
  CancelSessionResult,
  CreateSessionRequest,
  CreateSessionResult,
  ListPaymentsParams,
  ListSessionsParams,
  PaymentDetails,
  RefundDetails,
  RefundRequest,
  RefundResult,
  SessionDetails,
} from "./types.js";

/**
 * Client for the maib hosted Checkout API (v2).
 *
 * Handles session management, payments, refunds, and callback signature verification.
 */
export class CheckoutClient extends BaseClient {
  protected readonly _apiVersion = "v2";
  protected readonly _tokenEndpoint = "/v2/auth/token";
  protected readonly _userAgent = `@maib/checkout/${BaseClient.version}`;

  protected _getTokenBody(): Record<string, string> {
    return {
      clientId: this._config.clientId,
      clientSecret: this._config.clientSecret,
    };
  }

  // -----------------------------------------------------------------------
  // Checkout sessions
  // -----------------------------------------------------------------------

  public async createSession(params: CreateSessionRequest): Promise<CreateSessionResult> {
    return this._rawRequest("POST", "/v2/checkouts", params as unknown as Record<string, unknown>);
  }

  public async cancelSession(checkoutId: string): Promise<CancelSessionResult> {
    return this._rawRequest("POST", `/v2/checkouts/${encodeURIComponent(checkoutId)}/cancel`);
  }

  public async getSession(checkoutId: string): Promise<SessionDetails> {
    return this._rawRequest("GET", `/v2/checkouts/${encodeURIComponent(checkoutId)}`);
  }

  public async listSessions(params: ListSessionsParams): Promise<PaginatedResult<SessionDetails>> {
    return this._getRequest("/v2/checkouts", params as unknown as Record<string, unknown>);
  }

  // -----------------------------------------------------------------------
  // Payments
  // -----------------------------------------------------------------------

  public async getPayment(paymentId: string): Promise<PaymentDetails> {
    return this._rawRequest("GET", `/v2/payments/${encodeURIComponent(paymentId)}`);
  }

  public async listPayments(params: ListPaymentsParams): Promise<PaginatedResult<PaymentDetails>> {
    return this._getRequest("/v2/payments", params as unknown as Record<string, unknown>);
  }

  // -----------------------------------------------------------------------
  // Refunds
  // -----------------------------------------------------------------------

  public async refund(payId: string, params: RefundRequest): Promise<RefundResult> {
    return this._rawRequest(
      "POST",
      `/v2/payments/${encodeURIComponent(payId)}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async getRefund(refundId: string): Promise<RefundDetails> {
    return this._rawRequest("GET", `/v2/payments/refunds/${encodeURIComponent(refundId)}`);
  }

  // -----------------------------------------------------------------------
  // Callback signature verification (HMAC-SHA256)
  // -----------------------------------------------------------------------

  /**
   * Verify the HMAC-SHA256 signature of a checkout callback.
   *
   * @param rawBody - The raw JSON body as received (string, not parsed).
   * @param xSignature - The `X-Signature` header value (e.g. "sha256=...").
   * @param xTimestamp - The `X-Signature-Timestamp` header value.
   * @returns `true` if the signature is valid.
   */
  public verifyCallback(rawBody: string, xSignature: string, xTimestamp: string): boolean {
    if (!this._config.signatureKey) {
      throw new Error(
        "Cannot verify callback signature: no signatureKey was provided in CheckoutClient config",
      );
    }
    return verifyHmacSignature(rawBody, xSignature, xTimestamp, this._config.signatureKey);
  }

  /**
   * Compute the expected HMAC-SHA256 signature for a checkout callback.
   */
  public computeCallbackSignature(rawBody: string, timestamp: string): string {
    if (!this._config.signatureKey) {
      throw new Error(
        "Cannot compute signature: no signatureKey was provided in CheckoutClient config",
      );
    }
    return computeHmacSignature(rawBody, timestamp, this._config.signatureKey);
  }
}
