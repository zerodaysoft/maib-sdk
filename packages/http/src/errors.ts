/**
 * Error thrown when the HTTP request itself fails (network error, timeout, etc.)
 * before receiving an API response.
 */
export class NetworkError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}
