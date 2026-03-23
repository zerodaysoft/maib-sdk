import type { PaginatedResult } from "@maib/core";
import { BaseClient, computeSignature, verifySignature } from "@maib/core";
import type {
  CancelRtpRequest,
  CancelRtpResult,
  CreateRtpRequest,
  CreateRtpResult,
  ListRtpParams,
  RefundRtpRequest,
  RefundRtpResult,
  RtpCallbackPayload,
  RtpStatusResult,
  TestAcceptRequest,
  TestAcceptResult,
  TestRejectResult,
} from "./types.js";

/**
 * Client for the maib Request to Pay (RTP) API (v2).
 *
 * Handles bank-initiated payment requests, status tracking, cancellation,
 * refunds, and callback signature verification.
 */
export class RtpClient extends BaseClient {
  protected readonly _apiVersion = "v2";
  protected readonly _tokenEndpoint = "/v2/auth/token";
  protected readonly _userAgent = `@maib/rtp/${BaseClient.version}`;

  protected _getTokenBody(): Record<string, string> {
    return {
      clientId: this._config.clientId,
      clientSecret: this._config.clientSecret,
    };
  }

  // -----------------------------------------------------------------------
  // RTP operations
  // -----------------------------------------------------------------------

  public async create(params: CreateRtpRequest): Promise<CreateRtpResult> {
    return this._postRequest("/v2/rtp", params as unknown as Record<string, unknown>);
  }

  public async getStatus(rtpId: string): Promise<RtpStatusResult> {
    return this._getRequest(`/v2/rtp/${encodeURIComponent(rtpId)}`);
  }

  public async cancel(rtpId: string, params: CancelRtpRequest): Promise<CancelRtpResult> {
    return this._postRequest(
      `/v2/rtp/${encodeURIComponent(rtpId)}/cancel`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async list(params: ListRtpParams): Promise<PaginatedResult<RtpStatusResult>> {
    return this._getRequest("/v2/rtp", params as unknown as Record<string, unknown>);
  }

  public async refund(payId: string, params: RefundRtpRequest): Promise<RefundRtpResult> {
    return this._postRequest(
      `/v2/rtp/${encodeURIComponent(payId)}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Sandbox simulation
  // -----------------------------------------------------------------------

  public async testAccept(rtpId: string, params: TestAcceptRequest): Promise<TestAcceptResult> {
    return this._postRequest(
      `/v2/rtp/${encodeURIComponent(rtpId)}/test-accept`,
      params as unknown as Record<string, unknown>,
    );
  }

  public async testReject(rtpId: string): Promise<TestRejectResult> {
    return this._postRequest(`/v2/rtp/${encodeURIComponent(rtpId)}/test-reject`);
  }

  // -----------------------------------------------------------------------
  // Callback signature verification
  // -----------------------------------------------------------------------

  public verifyCallback(payload: RtpCallbackPayload): boolean {
    if (!this._config.signatureKey) {
      throw new Error(
        "Cannot verify callback signature: no signatureKey was provided in RtpClient config",
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
      throw new Error("Cannot compute signature: no signatureKey was provided in RtpClient config");
    }
    return computeSignature(result, this._config.signatureKey);
  }
}
