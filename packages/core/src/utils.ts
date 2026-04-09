import type { MaibResponse } from "./types.js";

/**
 * Type guard that checks whether a parsed JSON value is a maib API envelope
 * (i.e. contains an `ok` boolean discriminator).
 */
export function isMaibResponse<T = unknown>(value: unknown): value is MaibResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof value.ok === "boolean" &&
    ((value.ok && "result" in value) || (!value.ok && "errors" in value))
  );
}
