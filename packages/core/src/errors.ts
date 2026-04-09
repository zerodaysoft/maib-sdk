import type { MaibApiError } from "./types.js";

export { NetworkError as MaibNetworkError } from "@maib/http";

/**
 * Error thrown when the maib API returns a response with `ok: false`.
 */
export class MaibError extends Error {
  readonly statusCode: number;
  readonly errors: MaibApiError[];

  constructor(statusCode: number, errors: MaibApiError[] = []) {
    const message =
      errors.length > 0
        ? errors.map((e) => `[${e.errorCode}] ${e.errorMessage}`).join("; ")
        : `API error (HTTP ${statusCode})`;
    super(message);
    this.name = "MaibError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
