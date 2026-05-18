import type { MaibApiError } from "./generated/types";

export type { BaseClientConfig } from "@maib/http";
export type * from "./generated/types";

/** Wrapper for successful API responses. */
export interface MaibSuccessResponse<T> {
  result: T;
  ok: true;
}

/** Wrapper for failed API responses. */
export interface MaibErrorResponse {
  errors: MaibApiError[];
  ok: false;
}

/** Union of all possible API responses. */
export type MaibResponse<T> = MaibSuccessResponse<T> | MaibErrorResponse;

/** Base configuration for all maib merchant API clients. */
export interface MaibClientConfig {
  /** Client ID / Project ID from the maibmerchants portal. */
  clientId: string;
  /** Client secret / Project secret from the maibmerchants portal. */
  clientSecret: string;
  /** Signature key for validating callback notifications. */
  signatureKey?: string;
  /**
   * Target environment. When set, determines the API host automatically.
   * Ignored if `baseUrl` is provided.
   * @default "production"
   */
  environment?: import("./constants").Environment;
  /**
   * API host (without version prefix). Overrides `environment` when set.
   * @default "https://api.maibmerchants.md"
   */
  baseUrl?: string;
  /**
   * Custom `fetch` implementation (e.g. for testing or Node < 18 polyfills).
   * @default globalThis.fetch
   */
  fetch?: typeof globalThis.fetch;
}

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  totalCount: number;
  items: T[];
}
