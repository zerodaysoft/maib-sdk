import { BaseClient, computeSignature, verifySignature } from "@maib/core";
import type {
  CallbackPayload,
  CompleteRequest,
  CompleteResult,
  EcommerceClientConfig,
  ExecuteOneclickRequest,
  ExecuteRecurringRequest,
  ExecuteRecurringResult,
  HoldRequest,
  PayInfoResult,
  PaymentInitResult,
  PayRequest,
  RefundRequest,
  RefundResult,
  SavecardOneclickRequest,
  SavecardRecurringRequest,
} from "./types.js";

/**
 * Client for the maib e-Commerce payment gateway (v1 API).
 *
 * Handles authentication (with automatic token refresh), all payment operations,
 * and callback signature verification.
 */
export class EcommerceClient extends BaseClient {
  protected readonly _apiVersion = "v1";
  protected readonly _tokenEndpoint = "/v1/generate-token";
  protected readonly _userAgent = `@maib/ecommerce/${BaseClient.version}`;

  private readonly _ecommConfig: EcommerceClientConfig;

  constructor(config: EcommerceClientConfig) {
    super({
      clientId: config.projectId,
      clientSecret: config.projectSecret,
      signatureKey: config.signatureKey,
      baseUrl: config.baseUrl,
      fetch: config.fetch,
    });
    this._ecommConfig = config;
  }

  protected _getTokenBody(): Record<string, string> {
    return {
      projectId: this._ecommConfig.projectId,
      projectSecret: this._ecommConfig.projectSecret,
    };
  }

  // -----------------------------------------------------------------------
  // Payment operations
  // -----------------------------------------------------------------------

  /**
   * Initiate a direct (single-step) payment.
   *
   * Returns an intermediate result with a `payUrl` to which the customer
   * must be redirected to enter card details on the maib ecomm checkout page.
   *
   * `POST /v1/pay`
   */
  public async pay(params: PayRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/pay`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Authorize (hold) funds on the customer's account without debiting.
   *
   * First step of a two-step payment — use {@link complete} to capture
   * the held amount, or let it expire to release.
   *
   * `POST /v1/hold`
   */
  public async hold(params: HoldRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/hold`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Capture a previously held amount (second step of a two-step payment).
   *
   * If `confirmAmount` is omitted, the entire held amount is debited.
   *
   * `POST /v1/complete`
   */
  public async complete(params: CompleteRequest): Promise<CompleteResult> {
    return this._postRequest(
      `/${this._apiVersion}/complete`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Refund a completed payment, fully or partially.
   *
   * If `refundAmount` is omitted, the full transaction amount is refunded.
   *
   * `POST /v1/refund`
   */
  public async refund(params: RefundRequest): Promise<RefundResult> {
    return this._postRequest(
      `/${this._apiVersion}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Retrieve details of a previously created payment, including
   * status, 3-D Secure result, order and customer metadata.
   *
   * `GET /v1/pay-info/{payId}`
   */
  public async getPayInfo(payId: string): Promise<PayInfoResult> {
    return this._getRequest(`/${this._apiVersion}/pay-info/${encodeURIComponent(payId)}`);
  }

  // -----------------------------------------------------------------------
  // Recurring payments
  // -----------------------------------------------------------------------

  /**
   * Register a card for recurring payments.
   *
   * If `amount` is provided, the amount is debited and the card is stored.
   * If `amount` is omitted, only the card is stored (no debit).
   *
   * `POST /v1/savecard-recurring`
   */
  public async savecardRecurring(params: SavecardRecurringRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/savecard-recurring`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Charge a previously stored card (recurring payment, server-to-server).
   *
   * No customer redirect — this runs without 3-D Secure since the card
   * was authenticated at registration time.
   *
   * `POST /v1/execute-recurring`
   */
  public async executeRecurring(params: ExecuteRecurringRequest): Promise<ExecuteRecurringResult> {
    return this._postRequest(
      `/${this._apiVersion}/execute-recurring`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // One-click payments
  // -----------------------------------------------------------------------

  /**
   * Register a card for one-click payments.
   *
   * If `amount` is provided, the amount is debited and the card is stored.
   * If `amount` is omitted, only the card is stored (no debit).
   *
   * `POST /v1/savecard-oneclick`
   */
  public async savecardOneclick(params: SavecardOneclickRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/savecard-oneclick`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Charge a previously stored card (one-click payment).
   *
   * Returns an intermediate `payUrl` for customer redirect (3-D Secure).
   *
   * `POST /v1/execute-oneclick`
   */
  public async executeOneclick(params: ExecuteOneclickRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/execute-oneclick`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Saved card management
  // -----------------------------------------------------------------------

  /**
   * Delete a previously stored card from the maib ecomm system.
   *
   * Applies to both recurring and one-click stored cards.
   *
   * `DELETE /v1/delete-card/{billerId}`
   */
  public async deleteCard(billerId: string): Promise<void> {
    await this._deleteRequest(`/${this._apiVersion}/delete-card/${encodeURIComponent(billerId)}`);
  }

  // -----------------------------------------------------------------------
  // Callback signature verification
  // -----------------------------------------------------------------------

  /**
   * Verify the signature of a callback notification received on the
   * merchant's callback URL. Throws if `signatureKey` was not provided
   * in the client config.
   *
   * @param payload - The full callback body including the `signature` field.
   * @returns `true` if the signature is valid.
   */
  public verifyCallback(payload: CallbackPayload): boolean {
    if (!this._config.signatureKey) {
      throw new Error(
        "Cannot verify callback signature: no signatureKey was provided in EcommerceClient config",
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
      throw new Error(
        "Cannot compute signature: no signatureKey was provided in EcommerceClient config",
      );
    }
    return computeSignature(result, this._config.signatureKey);
  }
}
