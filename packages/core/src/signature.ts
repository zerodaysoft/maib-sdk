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
 * Compute SHA-256 signature for ecomm/rtp/mia callbacks.
 *
 * Algorithm: sort keys alphabetically, collect leaf values, join with ":",
 * append signatureKey, SHA-256 hash, base64 encode.
 */
export function computeSignature(result: Record<string, unknown>, signatureKey: string): string {
  const sorted = sortByKeyRecursive(result);
  const values = collectValues(sorted);
  values.push(signatureKey);
  const signString = values.join(":");
  return createHash("sha256").update(signString).digest("base64");
}

/**
 * Verify a SHA-256 callback signature (ecomm/rtp/mia).
 */
export function verifySignature(
  result: Record<string, unknown>,
  signature: string,
  signatureKey: string,
): boolean {
  const computed = computeSignature(result, signatureKey);
  if (computed.length !== signature.length) return false;
  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
  if (computed.length !== signature.length) return false;
  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
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
