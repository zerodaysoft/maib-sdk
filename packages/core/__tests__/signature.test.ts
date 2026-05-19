import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { Currency } from "../src/constants";
import {
  computeHmacSignature,
  computeSignature,
  computeSignatureModern,
  verifyHmacSignature,
  verifySignature,
  verifySignatureModern,
} from "../src/signature";

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
    // HMAC_SHA256(secret, body + "." + timestamp). `[CALLBACK MESSAGE]` is the
    // literal placeholder body the upstream docs sign against HMAC_EXPECTED_SIGNATURE.
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

// -----------------------------------------------------------------------
// Modern SHA-256 signature (MIA QR / RTP)
// -----------------------------------------------------------------------

const MODERN_KEY = "8508706b-3454-4733-8295-56e617c4abcf";

// Canonical RTP callback example from upstream docs:
// https://docs.maibmerchants.md/request-to-pay/api-reference/callback-notifications
const RTP_CALLBACK_RESULT = {
  rtpId: "123e4567-e89b-12d3-a456-426614174000",
  rtpStatus: "Accepted",
  orderId: "123",
  payId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
  amount: 100.0,
  commission: 1.0,
  currency: "MDL",
  payerName: "John D.",
  payerIban: "MD24AG000225100014156789",
  executedAt: "2029-10-22T10:32:28+03:00",
};

function sha256Base64(input: string): string {
  return createHash("sha256").update(input).digest("base64");
}

describe("computeSignatureModern", () => {
  it("formats amount and commission with two decimals", () => {
    // Hand-computed canonical string per upstream algorithm:
    // sort keys alpha case-insensitive -> amount, commission, currency, executedAt,
    // orderId, payerIban, payerName, payId, rtpId, rtpStatus.
    const expectedString = [
      "100.00",
      "1.00",
      "MDL",
      "2029-10-22T10:32:28+03:00",
      "123",
      "MD24AG000225100014156789",
      "John D.",
      "c56a4180-65aa-42ec-a945-5fd21dec0538",
      "123e4567-e89b-12d3-a456-426614174000",
      "Accepted",
      MODERN_KEY,
    ].join(":");
    const expected = sha256Base64(expectedString);
    expect(computeSignatureModern(RTP_CALLBACK_RESULT, MODERN_KEY)).toBe(expected);
  });

  it("excludes null and empty-string fields", () => {
    const withNulls = {
      ...RTP_CALLBACK_RESULT,
      extra: null,
      empty: "",
    } as Record<string, unknown>;
    expect(computeSignatureModern(withNulls, MODERN_KEY)).toBe(
      computeSignatureModern(RTP_CALLBACK_RESULT, MODERN_KEY),
    );
  });

  it("is insensitive to input key order (sorts case-insensitively)", () => {
    const reordered = {
      rtpStatus: RTP_CALLBACK_RESULT.rtpStatus,
      amount: RTP_CALLBACK_RESULT.amount,
      orderId: RTP_CALLBACK_RESULT.orderId,
      currency: RTP_CALLBACK_RESULT.currency,
      commission: RTP_CALLBACK_RESULT.commission,
      executedAt: RTP_CALLBACK_RESULT.executedAt,
      rtpId: RTP_CALLBACK_RESULT.rtpId,
      payerIban: RTP_CALLBACK_RESULT.payerIban,
      payId: RTP_CALLBACK_RESULT.payId,
      payerName: RTP_CALLBACK_RESULT.payerName,
    };
    expect(computeSignatureModern(reordered, MODERN_KEY)).toBe(
      computeSignatureModern(RTP_CALLBACK_RESULT, MODERN_KEY),
    );
  });

  it("formats whole-number amount as `X.00`", () => {
    // Regression: legacy computeSignature would emit "100" instead of "100.00".
    const sig = computeSignatureModern({ amount: 100, commission: 0, currency: "MDL" }, MODERN_KEY);
    expect(sig).toBe(sha256Base64(`100.00:0.00:MDL:${MODERN_KEY}`));
  });
});

describe("verifySignatureModern", () => {
  it("returns true for a self-computed signature (round-trip)", () => {
    const sig = computeSignatureModern(RTP_CALLBACK_RESULT, MODERN_KEY);
    expect(verifySignatureModern(RTP_CALLBACK_RESULT, sig, MODERN_KEY)).toBe(true);
  });

  it("returns false for a tampered payload", () => {
    const sig = computeSignatureModern(RTP_CALLBACK_RESULT, MODERN_KEY);
    const tampered = { ...RTP_CALLBACK_RESULT, amount: 999 };
    expect(verifySignatureModern(tampered, sig, MODERN_KEY)).toBe(false);
  });

  it("returns false for an invalid signature", () => {
    expect(verifySignatureModern(RTP_CALLBACK_RESULT, "not-a-signature==", MODERN_KEY)).toBe(false);
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
