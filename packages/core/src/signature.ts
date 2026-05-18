import { createHash, createHmac } from "node:crypto";

/**
 * Sort an object's entries alphabetically by key, recursing into nested objects.
 */
function sortByKeyRecursive(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    sorted[key] =
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? sortByKeyRecursive(value as Record<string, unknown>)
        : value;
  }
  return sorted;
}

/**
 * Recursively collect all leaf values from a (possibly nested) object.
 */
function collectValues(obj: Record<string, unknown>): string[] {
  const values: string[] = [];
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      values.push(...collectValues(value as Record<string, unknown>));
    } else {
      values.push(String(value));
    }
  }
  return values;
}

/**
 * Compute SHA-256 signature for **legacy e-Commerce v1** callbacks only.
 *
 * Algorithm: sort keys alphabetically (case-sensitive), collect leaf values,
 * join with ":", append signatureKey, SHA-256, Base64. Null/empty values are
 * preserved and amount fields are not reformatted.
 *
 * @deprecated For MIA QR and RTP callbacks use {@link computeSignatureModern}
 *   instead — those products use a different algorithm (case-insensitive sort,
 *   skip null/empty, `.toFixed(2)` for `amount`/`commission`). This function
 *   remains the correct implementation for the legacy e-Commerce v1 API and is
 *   not slated for removal; the deprecation tag is a guard against accidental
 *   reuse on other products.
 */
export function computeSignature(result: Record<string, unknown>, signatureKey: string): string {
  const sorted = sortByKeyRecursive(result);
  const values = collectValues(sorted);
  values.push(signatureKey);
  const signString = values.join(":");
  return createHash("sha256").update(signString).digest("base64");
}

/**
 * Verify a SHA-256 callback signature using the **legacy e-Commerce v1**
 * algorithm.
 *
 * @deprecated For MIA QR and RTP callbacks use {@link verifySignatureModern}
 *   instead. See {@link computeSignature} for the full rationale.
 */
export function verifySignature(
  result: Record<string, unknown>,
  signature: string,
  signatureKey: string,
): boolean {
  const computed = computeSignature(result, signatureKey);
  return timingSafeEqualStrings(computed, signature);
}

/**
 * Format a numeric leaf for the modern signature: amount-like fields are
 * stringified with exactly two decimals, everything else uses `String(value)`.
 */
function formatModernValue(
  key: string,
  value: unknown,
  decimalFields: ReadonlySet<string>,
): string {
  if (decimalFields.has(key) && typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  return String(value);
}

/**
 * Compute SHA-256 signature using the modern MIA QR / RTP algorithm.
 *
 * Differences from {@link computeSignature}:
 *  - keys in the top-level `result` object are sorted **case-insensitively**;
 *  - fields whose value is `null` or empty string `""` are **excluded**;
 *  - the fields named `amount` and `commission` are formatted with exactly
 *    two decimal places (e.g. `100` -> `"100.00"`);
 *  - only the top level is iterated (no recursion into nested objects/arrays
 *    – upstream does not nest values inside `result`).
 *
 * @see https://docs.maibmerchants.md/mia-qr-api/en/notifications-on-callback-url
 * @see https://docs.maibmerchants.md/request-to-pay/api-reference/callback-notifications
 */
export function computeSignatureModern(
  result: Record<string, unknown>,
  signatureKey: string,
  decimalFields: ReadonlySet<string> = MODERN_DECIMAL_FIELDS,
): string {
  const keys = Object.keys(result).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const parts: string[] = [];
  for (const key of keys) {
    const value = result[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value === "") continue;
    parts.push(formatModernValue(key, value, decimalFields));
  }
  parts.push(signatureKey);
  const signString = parts.join(":");
  return createHash("sha256").update(signString).digest("base64");
}

/**
 * Verify a modern SHA-256 callback signature (MIA QR / RTP).
 */
export function verifySignatureModern(
  result: Record<string, unknown>,
  signature: string,
  signatureKey: string,
  decimalFields: ReadonlySet<string> = MODERN_DECIMAL_FIELDS,
): boolean {
  const computed = computeSignatureModern(result, signatureKey, decimalFields);
  return timingSafeEqualStrings(computed, signature);
}

const MODERN_DECIMAL_FIELDS: ReadonlySet<string> = new Set(["amount", "commission"]);

/**
 * Compute HMAC-SHA256 signature for checkout callbacks.
 *
 * Algorithm: HMAC_SHA256(signatureKey, rawBody + "." + timestamp), base64 encode.
 */
export function computeHmacSignature(
  rawBody: string,
  timestamp: string,
  signatureKey: string,
): string {
  const message = `${rawBody}.${timestamp}`;
  return createHmac("sha256", signatureKey).update(message, "utf8").digest("base64");
}

/**
 * Verify an HMAC-SHA256 callback signature (checkout).
 *
 * @param rawBody - The raw JSON body as received.
 * @param xSignature - The X-Signature header value (with "sha256=" prefix).
 * @param xTimestamp - The X-Signature-Timestamp header value.
 * @param signatureKey - The shared secret key.
 */
export function verifyHmacSignature(
  rawBody: string,
  xSignature: string,
  xTimestamp: string,
  signatureKey: string,
): boolean {
  // Reverse proxies (e.g. Cloudflare) may duplicate headers and join them
  // with ", " per RFC 2616 §4.2. Use only the first value.
  const cleanSignature = firstHeaderValue(xSignature);
  const cleanTimestamp = firstHeaderValue(xTimestamp);

  const signature = cleanSignature.startsWith("sha256=") ? cleanSignature.slice(7) : cleanSignature;
  const computed = computeHmacSignature(rawBody, cleanTimestamp, signatureKey);
  return timingSafeEqualStrings(computed, signature);
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Extract the first value from a potentially comma-joined HTTP header.
 * Reverse proxies may duplicate single-value headers, producing e.g.
 * "value, value" instead of "value".
 */
function firstHeaderValue(header: string): string {
  const idx = header.indexOf(",");
  return idx === -1 ? header : header.slice(0, idx).trim();
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a[i] as number) ^ (b[i] as number);
  }
  return result === 0;
}
