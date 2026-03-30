/**
 * Error thrown when the OBP API returns a non-2xx response.
 */
export class ObError extends Error {
  readonly statusCode: number;
  /** OBP error code parsed from the message prefix (e.g. "OBP-20001"). */
  readonly obpCode?: string;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ObError";
    this.statusCode = statusCode;
    const match = message.match(/^(OBP-\d+):/);
    this.obpCode = match?.[1];
  }
}
