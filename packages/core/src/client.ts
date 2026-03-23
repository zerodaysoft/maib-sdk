import { DEFAULT_API_HOST, TOKEN_REFRESH_BUFFER_S } from "./constants.js";
import { MaibError, MaibNetworkError } from "./errors.js";
import type { MaibClientConfig, MaibResponse, TokenResult } from "./types.js";
import { SDK_VERSION } from "./version.js";

interface TokenState {
  accessToken: string;
  refreshToken?: string;
  accessExpiresAt: number;
  refreshExpiresAt?: number;
}

/**
 * Abstract base client for all maib API SDKs.
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

  private _tokenState: TokenState | null = null;
  private _tokenPromise: Promise<void> | null = null;

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
      refreshToken: result.refreshToken,
      accessExpiresAt: now + result.expiresIn * 1000,
      refreshExpiresAt: result.refreshExpiresIn ? now + result.refreshExpiresIn * 1000 : undefined,
    };
  }

  constructor(config: MaibClientConfig) {
    this._config = config;
    this._baseUrl = (config.baseUrl ?? DEFAULT_API_HOST).replace(/\/$/, "");
    this._fetch = config.fetch ?? globalThis.fetch;
  }

  /** The API version this client targets. */
  public get apiVersion(): string {
    return this._apiVersion;
  }

  // -----------------------------------------------------------------------
  // Token management
  // -----------------------------------------------------------------------

  private async _ensureToken(): Promise<string> {
    const now = Date.now();

    if (
      this._tokenState &&
      now < this._tokenState.accessExpiresAt - TOKEN_REFRESH_BUFFER_S * 1000
    ) {
      return this._tokenState.accessToken;
    }

    if (this._tokenPromise) {
      await this._tokenPromise;
      // biome-ignore lint/style/noNonNullAssertion: tokenPromise ensures tokenState is set
      return this._tokenState!.accessToken;
    }

    this._tokenPromise = this._refreshOrGenerateToken();
    try {
      await this._tokenPromise;
      // biome-ignore lint/style/noNonNullAssertion: tokenPromise ensures tokenState is set
      return this._tokenState!.accessToken;
    } finally {
      this._tokenPromise = null;
    }
  }

  private async _refreshOrGenerateToken(): Promise<void> {
    const now = Date.now();
    let body: Record<string, string>;

    // Try refresh token if available and not expired (v1 ecomm flow)
    if (
      this._tokenState?.refreshToken &&
      this._tokenState.refreshExpiresAt &&
      now < this._tokenState.refreshExpiresAt - TOKEN_REFRESH_BUFFER_S * 1000
    ) {
      body = { refreshToken: this._tokenState.refreshToken };
    } else {
      body = this._getTokenBody();
    }

    const result = await this._rawRequest<TokenResult>("POST", this._tokenEndpoint, body, false);
    this._tokenState = this._processTokenResult(result);
  }

  // -----------------------------------------------------------------------
  // HTTP layer
  // -----------------------------------------------------------------------

  protected async _rawRequest<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    authenticated = true,
  ): Promise<T> {
    const url = `${this._baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": this._userAgent,
    };

    if (authenticated) {
      const token = await this._ensureToken();
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await this._fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new MaibNetworkError(`Network request to ${method} ${path} failed`, error);
    }

    // DELETE with 200/204 and no body is a success
    if (method === "DELETE" && (response.status === 200 || response.status === 204)) {
      const text = await response.text();
      if (!text) return { ok: true } as T;
      let json: MaibResponse<T>;
      try {
        json = JSON.parse(text);
      } catch {
        throw new MaibNetworkError(
          `Invalid JSON in ${method} ${path} response (HTTP ${response.status})`,
        );
      }
      if (!json.ok) throw new MaibError(response.status, json.errors);
      return json.result;
    }

    let json: MaibResponse<T>;
    try {
      json = await response.json();
    } catch {
      throw new MaibNetworkError(
        `Invalid JSON in ${method} ${path} response (HTTP ${response.status})`,
      );
    }
    if (!json.ok) {
      throw new MaibError(response.status, json.errors);
    }
    return json.result;
  }

  /**
   * Make a GET request with query parameters.
   * Undefined/null values are omitted from the query string.
   */
  protected async _getRequest<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const queryString = params ? this._buildQueryString(params) : "";
    const fullPath = queryString ? `${path}?${queryString}` : path;
    return this._rawRequest<T>("GET", fullPath);
  }

  protected _buildQueryString(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.join("&");
  }
}
