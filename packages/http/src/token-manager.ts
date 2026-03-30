import type { TokenState } from "./types.js";

/** Default buffer in seconds before token expiry to trigger a proactive refresh. */
const DEFAULT_REFRESH_BUFFER_S = 30;

/**
 * Manages token lifecycle: caching, proactive refresh, and concurrent-request deduplication.
 *
 * The actual token acquisition logic is injected via the `acquire` callback,
 * making this usable across different auth flows (OAuth2, DirectLogin, etc.).
 */
export class TokenManager {
  private _state: TokenState | null = null;
  private _promise: Promise<void> | null = null;
  private readonly _refreshBufferMs: number;

  constructor(
    private readonly _acquire: () => Promise<TokenState>,
    refreshBufferS = DEFAULT_REFRESH_BUFFER_S,
  ) {
    this._refreshBufferMs = refreshBufferS * 1000;
  }

  /**
   * Returns a valid access token, refreshing if necessary.
   * Concurrent calls share the same in-flight token request.
   */
  async getToken(): Promise<string> {
    const now = Date.now();

    if (this._state && now < this._state.accessExpiresAt - this._refreshBufferMs) {
      return this._state.accessToken;
    }

    if (this._promise) {
      await this._promise;
      // biome-ignore lint/style/noNonNullAssertion: _promise ensures _state is set
      return this._state!.accessToken;
    }

    this._promise = this._refresh();
    try {
      await this._promise;
      // biome-ignore lint/style/noNonNullAssertion: _promise ensures _state is set
      return this._state!.accessToken;
    } finally {
      this._promise = null;
    }
  }

  /** Current token state (for subclasses that need refresh-token logic). */
  get state(): TokenState | null {
    return this._state;
  }

  /** Directly set token state (e.g. after a refresh-token exchange). */
  set state(s: TokenState | null) {
    this._state = s;
  }

  /** Clear cached token, forcing re-acquisition on next `getToken()`. */
  reset(): void {
    this._state = null;
  }

  private async _refresh(): Promise<void> {
    this._state = await this._acquire();
  }
}
