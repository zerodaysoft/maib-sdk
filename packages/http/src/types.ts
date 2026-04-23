/** Base configuration shared by all maib API clients. */
export interface BaseClientConfig {
  /**
   * API host (without version prefix or trailing slash).
   */
  baseUrl?: string;
  /**
   * Custom `fetch` implementation (e.g. for testing or Node < 18 polyfills).
   * @default globalThis.fetch
   */
  fetch?: typeof globalThis.fetch;
}

/** Internal state for a cached access/refresh token pair. */
export interface TokenState {
  accessToken: string;
  /** Authorization scheme (e.g. "Bearer"). Optional; callers fall back to "Bearer". */
  tokenType?: string;
  refreshToken?: string;
  accessExpiresAt: number;
  refreshExpiresAt?: number;
}
