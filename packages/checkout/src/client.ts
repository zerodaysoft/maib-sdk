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

  /**
   * Register a new hosted checkout session.
   *
   * Creates a session in `WaitingForInit` status and returns a `checkoutUrl`
   * to which the customer must be redirected to complete the payment.
   *
   * `POST /v2/checkouts`
   */
  public async createSession(params: CreateSessionRequest): Promise<CreateSessionResult> {
    return this._postRequest("/v2/checkouts", params as unknown as Record<string, unknown>);
  }

  /**
   * Cancel a checkout session that has not yet been completed.
   *
   * Only permitted while the session is not in a terminal state
   * (`Completed`, `Expired`, `Abandoned`, `Failed`, `Cancelled`).
   *
   * `POST /v2/checkouts/{id}/cancel`
   */
  public async cancelSession(checkoutId: string): Promise<CancelSessionResult> {
    return this._postRequest(`/v2/checkouts/${encodeURIComponent(checkoutId)}/cancel`);
  }

  /**
   * Retrieve aggregated details of a specific checkout session,
   * including order, payer, and payment information.
   *
   * `GET /v2/checkouts/{id}`
   */
  public async getSession(checkoutId: string): Promise<SessionDetails> {
    return this._getRequest(`/v2/checkouts/${encodeURIComponent(checkoutId)}`);
  }

  /**
   * List checkout sessions created by the merchant, with filtering and pagination.
   *
   * `GET /v2/checkouts`
   */
  public async listSessions(params: ListSessionsParams): Promise<PaginatedResult<SessionDetails>> {
    return this._getRequest("/v2/checkouts", params as unknown as Record<string, unknown>);
  }

  // -----------------------------------------------------------------------
  // Payments
  // -----------------------------------------------------------------------

  /**
   * Retrieve details for a specific payment.
   *
   * `GET /v2/payments/{id}`
   */
  public async getPayment(paymentId: string): Promise<PaymentDetails> {
    return this._getRequest(`/v2/payments/${encodeURIComponent(paymentId)}`);
  }

  /**
   * List payments associated with the authenticated merchant,
   * with filtering, pagination, and sorting.
   *
   * `GET /v2/payments`
   */
  public async listPayments(params: ListPaymentsParams): Promise<PaginatedResult<PaymentDetails>> {
    return this._getRequest("/v2/payments", params as unknown as Record<string, unknown>);
  }

  // -----------------------------------------------------------------------
  // Refunds
  // -----------------------------------------------------------------------

  /**
   * Initiate a refund for a completed payment.
   *
   * Returns a refund in `Created` status; use {@link getRefund} to poll
   * the final processing result.
   *
   * `POST /v2/payments/{payId}/refund`
   */
  public async refund(payId: string, params: RefundRequest): Promise<RefundResult> {
    return this._postRequest(
      `/v2/payments/${encodeURIComponent(payId)}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Retrieve the details of a previously created refund by its id.
   *
   * Used to check the processing result of a refund, since the refund
   * endpoint only creates the refund and returns its initial `Created` status.
   *
   * `GET /v2/payments/refunds/{id}`
   */
  public async getRefund(refundId: string): Promise<RefundDetails> {
    return this._getRequest(`/v2/payments/refunds/${encodeURIComponent(refundId)}`);
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
