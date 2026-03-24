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

  public async pay(params: PayRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/pay`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async hold(params: HoldRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/hold`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async complete(params: CompleteRequest): Promise<CompleteResult> {
    return this._postRequest(
      `/${this._apiVersion}/complete`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async refund(params: RefundRequest): Promise<RefundResult> {
    return this._postRequest(
      `/${this._apiVersion}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async getPayInfo(payId: string): Promise<PayInfoResult> {
    return this._getRequest(`/${this._apiVersion}/pay-info/${encodeURIComponent(payId)}`);
  }

  // -----------------------------------------------------------------------
  // Recurring payments
  // -----------------------------------------------------------------------

  public async savecardRecurring(params: SavecardRecurringRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/savecard-recurring`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async executeRecurring(params: ExecuteRecurringRequest): Promise<ExecuteRecurringResult> {
    return this._postRequest(
      `/${this._apiVersion}/execute-recurring`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // One-click payments
  // -----------------------------------------------------------------------

  public async savecardOneclick(params: SavecardOneclickRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/savecard-oneclick`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async executeOneclick(params: ExecuteOneclickRequest): Promise<PaymentInitResult> {
    return this._postRequest(
      `/${this._apiVersion}/execute-oneclick`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Saved card management
  // -----------------------------------------------------------------------

  public async deleteCard(billerId: string): Promise<void> {
    await this._deleteRequest(`/${this._apiVersion}/delete-card/${encodeURIComponent(billerId)}`);
  }

  // -----------------------------------------------------------------------
  // Callback signature verification
  // -----------------------------------------------------------------------

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

  public computeCallbackSignature(result: Record<string, unknown>): string {
    if (!this._config.signatureKey) {
      throw new Error(
        "Cannot compute signature: no signatureKey was provided in EcommerceClient config",
      );
    }
    return computeSignature(result, this._config.signatureKey);
  }
}
