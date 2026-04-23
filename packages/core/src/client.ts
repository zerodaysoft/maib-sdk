import {
  buildQueryString,
  NetworkError,
  SDK_VERSION,
  TokenManager,
  type TokenState,
} from "@maib/http";
import {
  Environment,
  PRODUCTION_API_HOST,
  SANDBOX_API_HOST,
  TOKEN_REFRESH_BUFFER_S,
} from "./constants.js";
import { MaibError } from "./errors.js";
import type { MaibClientConfig, TokenResult } from "./types.js";
import { isMaibResponse } from "./utils.js";

/**
 * Abstract base client for all maib merchant API SDKs.
 *
 * Handles authentication (with automatic token refresh), HTTP layer,
 * and provides hooks for subclasses to customize auth and endpoint behavior.
 */
export abstract class BaseClient {
  /** SDK version string, shared by all maib client packages. */
  static readonly version = SDK_VERSION;

  protected readonly _config: MaibClientConfig;
  protected readonly _baseUrl: string;
  protected readonly _fetch: typeof globalThis.fetch;

  private readonly _tokenManager: TokenManager;

  /** API version prefix (e.g. "v1", "v2"). Subclasses must define this. */
  protected abstract readonly _apiVersion: string;

  /** Full token endpoint path (e.g. "/v1/generate-token", "/v2/auth/token"). */
  protected abstract readonly _tokenEndpoint: string;

  /** User-Agent string for HTTP requests. */
  protected abstract readonly _userAgent: string;

  /** Returns the request body for the token endpoint. */
  protected abstract _getTokenBody(): Record<string, string>;

  /**
   * Process raw token result. Subclasses can override to handle refresh tokens.
   * Default implementation handles v2-style tokens (no refresh).
   */
  protected _processTokenResult(result: TokenResult): TokenState {
    const now = Date.now();
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      refreshToken: result.refreshToken,
      accessExpiresAt: now + result.expiresIn * 1000,
      refreshExpiresAt: result.refreshExpiresIn ? now + result.refreshExpiresIn * 1000 : undefined,
    };
  }

  constructor(config: MaibClientConfig) {
    this._config = config;
    const host =
      config.baseUrl ??
      (config.environment === Environment.SANDBOX ? SANDBOX_API_HOST : PRODUCTION_API_HOST);
    this._baseUrl = host.replace(/\/$/, "");
    this._fetch = config.fetch ?? globalThis.fetch;
    this._tokenManager = new TokenManager(() => this._acquireToken(), TOKEN_REFRESH_BUFFER_S);
  }

  /** The API version this client targets. */
  public get apiVersion(): string {
    return this._apiVersion;
  }

  // -----------------------------------------------------------------------
  // Token management
  // -----------------------------------------------------------------------

  private async _acquireToken(): Promise<TokenState> {
    const currentState = this._tokenManager.state;
    const canRefresh =
      currentState?.refreshToken &&
      currentState.refreshExpiresAt &&
      Date.now() < currentState.refreshExpiresAt - TOKEN_REFRESH_BUFFER_S * 1000;
    const body = canRefresh ? { refreshToken: currentState.refreshToken } : this._getTokenBody();
    const result = await this._rawRequest<TokenResult>("POST", this._tokenEndpoint, body, false);
    return this._processTokenResult(result);
  }

  // -----------------------------------------------------------------------
  // HTTP layer
  // -----------------------------------------------------------------------

  private async _rawRequest<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    authenticated = true,
    isRetry = false,
  ): Promise<T> {
    const url = `${this._baseUrl}${path}`;
    const headers = new Headers();
    headers.set("User-Agent", this._userAgent);

    if (body) {
      headers.set("Content-Type", "application/json");
    }

    if (authenticated) {
      const token = await this._tokenManager.getToken();
      const tokenType = this._tokenManager.state?.tokenType ?? "Bearer";
      headers.set("Authorization", `${tokenType} ${token}`);
    }

    let response: Response;
    try {
      response = await this._fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new NetworkError(`Network request to ${method} ${path} failed`, error);
    }

    // 401 on an authenticated request: reset token and retry once
    if (authenticated && response.status === 401 && !isRetry) {
      this._tokenManager.reset();
      return this._rawRequest<T>(method, path, body, true, true);
    }

    // DELETE with 200/204 and no body is a success
    if (method === "DELETE" && (response.status === 200 || response.status === 204)) {
      const text = await response.text();
      if (!text) return undefined as T;
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new NetworkError(
          `Invalid JSON in ${method} ${path} response (HTTP ${response.status})`,
        );
      }
      return this._unwrapResponse<T>(json, response.status);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new NetworkError(
        `Invalid JSON in ${method} ${path} response (HTTP ${response.status})`,
      );
    }
    return this._unwrapResponse<T>(json, response.status);
  }

  /**
   * Unwrap a maib API response envelope.
   *
   * Standard responses arrive as `{ result: T, ok: true }` (success) or
   * `{ errors: [...], ok: false }` (failure).  If the payload is not wrapped
   * in the envelope it is returned as-is so the SDK stays resilient.
   */
  private _unwrapResponse<T>(json: unknown, statusCode: number): T {
    if (isMaibResponse<T>(json)) {
      if (!json.ok) throw new MaibError(statusCode, json.errors);
      return json.result;
    }
    // Reject unknown response shapes on error status codes
    if (statusCode >= 400) {
      throw new MaibError(statusCode, [
        {
          errorCode: "UNKNOWN_RESPONSE",
          errorMessage: JSON.stringify(json),
        },
      ]);
    }
    return json as T;
  }

  /**
   * Make a GET request with optional query parameters.
   * Undefined/null values are omitted from the query string.
   */
  protected async _getRequest<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const qs = params ? buildQueryString(params) : "";
    const fullPath = qs ? `${path}?${qs}` : path;
    return this._rawRequest<T>("GET", fullPath);
  }

  protected async _postRequest<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this._rawRequest<T>("POST", path, body);
  }

  protected async _deleteRequest<T>(path: string): Promise<T> {
    return this._rawRequest<T>("DELETE", path);
  }
}
