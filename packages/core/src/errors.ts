import type { MaibApiError } from "./types.js";

/**
 * Error thrown when the maib API returns a response with `ok: false`.
 */
export class MaibError extends Error {
  readonly statusCode: number;
  readonly errors: MaibApiError[];

  constructor(statusCode: number, errors: MaibApiError[]) {
    const message = errors.map((e) => `[${e.errorCode}] ${e.errorMessage}`).join("; ");
    super(message);
    this.name = "MaibError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Error thrown when the HTTP request itself fails (network error, timeout, etc.)
 * before receiving an API response.
 */
export class MaibNetworkError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MaibNetworkError";
    this.cause = cause;
  }
}
