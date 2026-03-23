import { Currency, Language, SDK_VERSION } from "@maib/core";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { CheckoutClient } from "../src/client.js";
import { CheckoutStatus, PaymentStatus, RefundStatus } from "../src/constants.js";

interface MockHttpResponse {
  status: number;
  body: unknown;
}

function createMockFetch(responses: MockHttpResponse[]): Mock {
  const queue = [...responses];
  return vi.fn(async () => {
    const resp = queue.shift();
    if (!resp) throw new Error("No more mock responses");
    return {
      status: resp.status,
      json: async () => resp.body,
      text: async () => JSON.stringify(resp.body),
    } as Response;
  });
}

const TOKEN_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      accessToken: "test-access-token",
      expiresIn: 300,
      tokenType: "Bearer",
    },
  },
};

const CREATE_SESSION_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      checkoutId: "f6d0812a-50ee-47ec-bb3f-d3b3a4dda40d",
      checkoutUrl: "https://checkout.maib.md/f6d0812a",
    },
  },
};

const CANCEL_SESSION_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      checkoutId: "5d526a22-9354-4721-99da-fa58fb53216e",
      status: CheckoutStatus.CANCELLED,
    },
  },
};

const GET_SESSION_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      id: "37193a81-a24f-4336-9f0e-5a2f544e0e8c",
      createdAt: "2026-02-05T16:47:44.049+00:00",
      status: CheckoutStatus.COMPLETED,
      amount: 3.0,
      currency: Currency.MDL,
      callbackUrl: "https://example.com/callback",
      successUrl: "https://example.com/ok",
      failUrl: "https://example.com/fail",
      language: "ro",
      url: "https://checkout.maib.md/37193a81",
      expiresAt: "2026-02-05T17:12:44.057+00:00",
    },
  },
};

const GET_PAYMENT_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      paymentId: "a975d5c3-9b5c-4497-affa-b615cbbb43f2",
      executedAt: "2026-02-06T17:32:36+00:00",
      status: PaymentStatus.EXECUTED,
      amount: 3.0,
      currency: Currency.MDL,
      type: "MMC",
      providerType: "MMC",
      referenceNumber: "603717100749",
      mcc: "NONE",
      orderId: "some-order-id",
      terminalId: "0149587",
      refundedAmount: 0.0,
      requestedRefundAmount: 0.0,
      isRefundable: true,
      partialRefundAvailable: true,
      paymentEntryPoint: "Checkout",
      refundableAmount: 3.0,
    },
  },
};

const REFUND_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      refundId: "123e4567-e89b-12d3-a456-426614174000",
      status: RefundStatus.CREATED,
    },
  },
};

const GET_REFUND_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      id: "eaed443e-988f-4b59-89da-e76501977fab",
      paymentId: "a975d5c3-9b5c-4497-affa-b615cbbb43f2",
      refundType: "Partial",
      amount: 1.0,
      currency: Currency.MDL,
      refundReason: "Product returned",
      executedAt: "2026-02-06T18:00:00+00:00",
      status: RefundStatus.ACCEPTED,
    },
  },
};

const LIST_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      items: [],
      totalCount: 0,
    },
  },
};

function createTestConfig(mockFetch: Mock, overrides?: Record<string, unknown>) {
  return {
    clientId: "client-id",
    clientSecret: "client-secret",
    baseUrl: "https://api.test.local",
    fetch: mockFetch as unknown as typeof globalThis.fetch,
    ...overrides,
  };
}

describe("CheckoutClient", () => {
  let mockFetch: Mock;
  let client: CheckoutClient;

  beforeEach(() => {
    mockFetch = createMockFetch([TOKEN_RESPONSE, CREATE_SESSION_RESPONSE]);
    client = new CheckoutClient(createTestConfig(mockFetch));
  });

  describe("versioning", () => {
    it("exposes the SDK version", () => {
      expect(CheckoutClient.version).toBe(SDK_VERSION);
    });

    it("uses API version v2", () => {
      expect(client.apiVersion).toBe("v2");
    });

    it("sends correct User-Agent", async () => {
      await client.createSession({ amount: 50, currency: Currency.MDL });
      const call = mockFetch.mock.calls[1];
      expect(call[1].headers["User-Agent"]).toBe(`@maib/checkout/${SDK_VERSION}`);
    });
  });

  describe("authentication", () => {
    it("uses clientId/clientSecret for token", async () => {
      await client.createSession({ amount: 50, currency: Currency.MDL });

      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall[0]).toBe("https://api.test.local/v2/auth/token");
      expect(JSON.parse(tokenCall[1].body)).toEqual({
        clientId: "client-id",
        clientSecret: "client-secret",
      });
    });
  });

  describe("createSession", () => {
    it("posts to /v2/checkouts and returns session result", async () => {
      const result = await client.createSession({
        amount: 50.61,
        currency: Currency.MDL,
        language: "ro",
      });

      expect(result.checkoutId).toBe("f6d0812a-50ee-47ec-bb3f-d3b3a4dda40d");
      expect(result.checkoutUrl).toBe("https://checkout.maib.md/f6d0812a");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v2/checkouts");
      expect(mockFetch.mock.calls[1][1].method).toBe("POST");
    });
  });

  describe("cancelSession", () => {
    it("posts to /v2/checkouts/{id}/cancel", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, CANCEL_SESSION_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.cancelSession("5d526a22-9354-4721-99da-fa58fb53216e");

      expect(result.status).toBe(CheckoutStatus.CANCELLED);
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://api.test.local/v2/checkouts/5d526a22-9354-4721-99da-fa58fb53216e/cancel",
      );
    });
  });

  describe("getSession", () => {
    it("gets /v2/checkouts/{id}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, GET_SESSION_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.getSession("37193a81-a24f-4336-9f0e-5a2f544e0e8c");

      expect(result.id).toBe("37193a81-a24f-4336-9f0e-5a2f544e0e8c");
      expect(result.status).toBe(CheckoutStatus.COMPLETED);
    });
  });

  describe("listSessions", () => {
    it("gets /v2/checkouts with query params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, LIST_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.listSessions({
        count: 10,
        offset: 0,
        status: CheckoutStatus.COMPLETED,
      });

      expect(result.totalCount).toBe(0);
      const url = mockFetch.mock.calls[1][0];
      expect(url).toContain("/v2/checkouts?");
      expect(url).toContain("count=10");
      expect(url).toContain("offset=0");
      expect(url).toContain("status=Completed");
    });
  });

  describe("getPayment", () => {
    it("gets /v2/payments/{id}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, GET_PAYMENT_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.getPayment("a975d5c3-9b5c-4497-affa-b615cbbb43f2");

      expect(result.paymentId).toBe("a975d5c3-9b5c-4497-affa-b615cbbb43f2");
      expect(result.status).toBe(PaymentStatus.EXECUTED);
    });
  });

  describe("listPayments", () => {
    it("gets /v2/payments with query params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, LIST_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.listPayments({ count: 5, offset: 0 });

      expect(result.totalCount).toBe(0);
      const url = mockFetch.mock.calls[1][0];
      expect(url).toContain("/v2/payments?");
    });
  });

  describe("refund", () => {
    it("posts to /v2/payments/{payId}/refund", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, REFUND_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.refund("pay-123", { amount: 50.61, reason: "Product returned" });

      expect(result.refundId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.status).toBe(RefundStatus.CREATED);
    });
  });

  describe("getRefund", () => {
    it("gets /v2/payments/refunds/{id}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, GET_REFUND_RESPONSE]);
      client = new CheckoutClient(createTestConfig(mockFetch));

      const result = await client.getRefund("eaed443e-988f-4b59-89da-e76501977fab");

      expect(result.id).toBe("eaed443e-988f-4b59-89da-e76501977fab");
      expect(result.refundType).toBe("Partial");
    });
  });

  describe("verifyCallback", () => {
    it("verifies a valid HMAC callback signature", () => {
      const sigClient = new CheckoutClient(
        createTestConfig(mockFetch, { signatureKey: "4cde378d-43b6-405f-94aa-55c010d4d42a" }),
      );

      const result = sigClient.verifyCallback(
        "[CALLBACK MESSAGE]",
        "sha256=yu2OvBe3Gyq1Nz/4R6KO8F3KpGCuW7VhH9yUPhYtNRU=",
        "1762181943494",
      );

      expect(result).toBe(true);
    });

    it("throws if no signatureKey is configured", () => {
      expect(() => client.verifyCallback("body", "sha256=sig", "ts")).toThrow("no signatureKey");
    });
  });
});
