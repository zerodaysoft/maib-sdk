import { describe, expect, it } from "vitest";
import { Currency } from "../src/constants.js";
import {
  computeHmacSignature,
  computeSignature,
  verifyHmacSignature,
  verifySignature,
} from "../src/signature.js";

// -----------------------------------------------------------------------
// SHA-256 sorted-values signature (ecomm / rtp / mia)
// -----------------------------------------------------------------------

const SIGNATURE_KEY = "8508706b-3454-4733-8295-56e617c4abcf";

const CALLBACK_RESULT = {
  payId: "f16a9006-128a-46bc-8e2a-77a6ee99df75",
  orderId: "123",
  status: "OK",
  statusCode: "000",
  statusMessage: "Approved",
  threeDs: "AUTHENTICATED",
  rrn: "331711380059",
  approval: "327593",
  cardNumber: "510218******1124",
  amount: 10.25,
  currency: Currency.MDL,
};

const EXPECTED_SIGNATURE = "5wHkZvm9lFeXxSeFF0ui2CnAp7pCEFSNmuHYFYJlC0s=";

const CALLBACK_RESULT_REORDERED = {
  currency: Currency.MDL,
  amount: 10.25,
  payId: "f16a9006-128a-46bc-8e2a-77a6ee99df75",
  status: "OK",
  orderId: "123",
  statusCode: "000",
  statusMessage: "Approved",
  threeDs: "AUTHENTICATED",
  rrn: "331711380059",
  approval: "327593",
  cardNumber: "510218******1124",
};

describe("computeSignature", () => {
  it("computes the correct signature from official documentation example", () => {
    const sig = computeSignature(CALLBACK_RESULT, SIGNATURE_KEY);
    expect(sig).toBe(EXPECTED_SIGNATURE);
  });

  it("produces the same signature regardless of input key order", () => {
    expect(computeSignature(CALLBACK_RESULT_REORDERED, SIGNATURE_KEY)).toBe(EXPECTED_SIGNATURE);
  });

  it("produces different signatures for different data", () => {
    const modified = { ...CALLBACK_RESULT, amount: 20.0 };
    expect(computeSignature(modified, SIGNATURE_KEY)).not.toBe(EXPECTED_SIGNATURE);
  });

  it("produces different signatures for different keys", () => {
    expect(computeSignature(CALLBACK_RESULT, "different-key")).not.toBe(EXPECTED_SIGNATURE);
  });
});

describe("verifySignature", () => {
  it("returns true for a valid signature", () => {
    expect(verifySignature(CALLBACK_RESULT, EXPECTED_SIGNATURE, SIGNATURE_KEY)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    expect(verifySignature(CALLBACK_RESULT, "invalid-signature==", SIGNATURE_KEY)).toBe(false);
  });

  it("returns false for tampered data", () => {
    const tampered = { ...CALLBACK_RESULT, amount: 999 };
    expect(verifySignature(tampered, EXPECTED_SIGNATURE, SIGNATURE_KEY)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// HMAC-SHA256 signature (checkout)
// -----------------------------------------------------------------------

const HMAC_SECRET = "4cde378d-43b6-405f-94aa-55c010d4d42a";
const HMAC_TIMESTAMP = "1762181943494";
const HMAC_EXPECTED_SIGNATURE = "yu2OvBe3Gyq1Nz/4R6KO8F3KpGCuW7VhH9yUPhYtNRU=";

describe("computeHmacSignature", () => {
  it("computes the correct HMAC signature from documentation test data", () => {
    // We need the actual raw JSON body that produces this signature.
    // From the docs, the signature is computed as HMAC_SHA256(key, body + "." + timestamp)
    // We'll test with a known body that produces the expected result.
    const rawBody = "[CALLBACK MESSAGE]";
    const sig = computeHmacSignature(rawBody, HMAC_TIMESTAMP, HMAC_SECRET);
    expect(sig).toBe(HMAC_EXPECTED_SIGNATURE);
  });

  it("produces different signatures for different bodies", () => {
    const sig = computeHmacSignature("different body", HMAC_TIMESTAMP, HMAC_SECRET);
    expect(sig).not.toBe(HMAC_EXPECTED_SIGNATURE);
  });

  it("produces different signatures for different timestamps", () => {
    const sig = computeHmacSignature("[CALLBACK MESSAGE]", "9999999999999", HMAC_SECRET);
    expect(sig).not.toBe(HMAC_EXPECTED_SIGNATURE);
  });
});

describe("verifyHmacSignature", () => {
  const rawBody = "[CALLBACK MESSAGE]";
  const xSignature = `sha256=${HMAC_EXPECTED_SIGNATURE}`;

  it("returns true for a valid HMAC signature", () => {
    expect(verifyHmacSignature(rawBody, xSignature, HMAC_TIMESTAMP, HMAC_SECRET)).toBe(true);
  });

  it("returns true when signature has no sha256= prefix", () => {
    expect(verifyHmacSignature(rawBody, HMAC_EXPECTED_SIGNATURE, HMAC_TIMESTAMP, HMAC_SECRET)).toBe(
      true,
    );
  });

  it("returns false for an invalid signature", () => {
    expect(verifyHmacSignature(rawBody, "sha256=invalid==", HMAC_TIMESTAMP, HMAC_SECRET)).toBe(
      false,
    );
  });

  it("returns false for tampered body", () => {
    expect(verifyHmacSignature("tampered", xSignature, HMAC_TIMESTAMP, HMAC_SECRET)).toBe(false);
  });

  it("handles duplicated timestamp header from reverse proxy (comma-joined)", () => {
    const duplicatedTimestamp = `${HMAC_TIMESTAMP}, ${HMAC_TIMESTAMP}`;
    expect(verifyHmacSignature(rawBody, xSignature, duplicatedTimestamp, HMAC_SECRET)).toBe(true);
  });

  it("handles duplicated signature header from reverse proxy (comma-joined)", () => {
    const duplicatedSignature = `${xSignature}, ${xSignature}`;
    expect(verifyHmacSignature(rawBody, duplicatedSignature, HMAC_TIMESTAMP, HMAC_SECRET)).toBe(
      true,
    );
  });

  it("handles both headers duplicated from reverse proxy", () => {
    const duplicatedSignature = `${xSignature}, ${xSignature}`;
    const duplicatedTimestamp = `${HMAC_TIMESTAMP}, ${HMAC_TIMESTAMP}`;
    expect(verifyHmacSignature(rawBody, duplicatedSignature, duplicatedTimestamp, HMAC_SECRET)).toBe(
      true,
    );
  });
});
