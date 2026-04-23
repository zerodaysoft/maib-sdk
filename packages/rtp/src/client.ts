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

  /**
   * Create a new Request to Pay addressed to a customer alias (phone number).
   *
   * Created in `Pending` status. If not accepted or rejected before
   * `expiresAt`, the RTP automatically moves to `Expired`.
   *
   * `POST /v2/rtp`
   */
  public async create(params: CreateRtpRequest): Promise<CreateRtpResult> {
    return this._postRequest("/v2/rtp", params as unknown as Record<string, unknown>);
  }

  /**
   * Retrieve the current status and details of a specific RTP request.
   *
   * `GET /v2/rtp/{id}`
   */
  public async getStatus(rtpId: string): Promise<RtpStatusResult> {
    return this._getRequest(`/v2/rtp/${encodeURIComponent(rtpId)}`);
  }

  /**
   * Cancel an RTP that is still in `Pending` state.
   * Cancellation is idempotent on the server.
   *
   * `POST /v2/rtp/{id}/cancel`
   */
  public async cancel(rtpId: string, params: CancelRtpRequest): Promise<CancelRtpResult> {
    return this._postRequest(
      `/v2/rtp/${encodeURIComponent(rtpId)}/cancel`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * List RTP requests created by the merchant, with filtering,
   * sorting, and pagination.
   *
   * `GET /v2/rtp`
   */
  public async list(params: ListRtpParams): Promise<PaginatedResult<RtpStatusResult>> {
    return this._getRequest("/v2/rtp", params as unknown as Record<string, unknown>);
  }

  /**
   * Refund a completed RTP payment.
   *
   * Path parameter is the **payment** identifier (`payId`) — not the
   * RTP identifier. Store both after a successful payment.
   *
   * `POST /v2/rtp/{payId}/refund`
   */
  public async refund(payId: string, params: RefundRtpRequest): Promise<RefundRtpResult> {
    return this._postRequest(
      `/v2/rtp/${encodeURIComponent(payId)}/refund`,
      params as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Sandbox simulation
  // -----------------------------------------------------------------------

  /**
   * Simulate customer acceptance of an RTP (sandbox only).
   * Triggers a callback and exercises the full success flow.
   *
   * `POST /v2/rtp/{id}/test-accept`
   */
  public async testAccept(rtpId: string, params: TestAcceptRequest): Promise<TestAcceptResult> {
    return this._postRequest(
      `/v2/rtp/${encodeURIComponent(rtpId)}/test-accept`,
      params as unknown as Record<string, unknown>,
    );
  }

  /**
   * Simulate customer rejection of an RTP (sandbox only).
   * Useful for exercising decline flows and error handling.
   *
   * `POST /v2/rtp/{id}/test-reject`
   */
  public async testReject(rtpId: string): Promise<TestRejectResult> {
    return this._postRequest(`/v2/rtp/${encodeURIComponent(rtpId)}/test-reject`);
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

  /**
   * Compute the expected signature for a callback result object.
   * Throws if `signatureKey` was not provided in the client config.
   */
  public computeCallbackSignature(result: Record<string, unknown>): string {
    if (!this._config.signatureKey) {
      throw new Error("Cannot compute signature: no signatureKey was provided in RtpClient config");
    }
    return computeSignature(result, this._config.signatureKey);
  }
}
