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

// Second test data set from official callback notifications documentation
const HMAC_SECRET_2 = "67be8e54-ac28-485d-9369-27f6d3c55a27";
const HMAC_TIMESTAMP_2 = "1761032516817";
const HMAC_EXPECTED_SIGNATURE_2 = "mtFkCMxfwj9t2wvY/7JASHLw+K/du4mY8azf1lV0ttg=";
const HMAC_RAW_BODY_2 =
  '{"checkoutId": "5a4d27a4-79f5-426b-9403-cccdeee81747","terminalId": "T1234567","amount": 1234.56,"currency": "MDL","completedAt": "2024-11-23T19:35:00.6772285+02:00","payerName": "John","payerEmail": "Smith","payerPhone": "37368473653","payerIp": "192.175.12.22","orderId": "ORDER-2025-0001","orderDescription": "Online purchase of electronics","orderDeliveryAmount": 50.00,"orderDeliveryCurrency": "MDL","paymentId": "379b31a3-8283-43d4-8a7b-eef8c0736a32","paymentAmount": 1234.56,"paymentCurrency": "MDL","paymentStatus": "Executed","paymentExecutedAt": "2025-05-05T23:38:07.2760698+03:00","senderIban": "NL43RABO1438227787","senderName": "Steven","senderCardNumber": "444433******1111","retrievalReferenceNumber": "ABC324353245","processingStatus": "OK","processingStatusCode": "00","approvalCode": "123456","threeDsResult": "Y","threeDsReason": null,"paymentMethod": "Card"}';

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
    expect(
      verifyHmacSignature(rawBody, duplicatedSignature, duplicatedTimestamp, HMAC_SECRET),
    ).toBe(true);
  });
});

describe("verifyHmacSignature (official callback example)", () => {
  const xSignature = `sha256=${HMAC_EXPECTED_SIGNATURE_2}`;

  it("computes correct HMAC from official callback notification example", () => {
    const sig = computeHmacSignature(HMAC_RAW_BODY_2, HMAC_TIMESTAMP_2, HMAC_SECRET_2);
    expect(sig).toBe(HMAC_EXPECTED_SIGNATURE_2);
  });

  it("verifies the official callback notification signature", () => {
    expect(verifyHmacSignature(HMAC_RAW_BODY_2, xSignature, HMAC_TIMESTAMP_2, HMAC_SECRET_2)).toBe(
      true,
    );
  });
});
