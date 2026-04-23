import { Currency, SDK_VERSION } from "@maib/core";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { MiaClient } from "../src/client.js";
import { AmountType, MiaPaymentStatus, QrStatus, QrType } from "../src/constants.js";

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

const CREATE_QR_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      qrId: "123e4567-e89b-12d3-a456-426614174000",
      extensionId: "40e6ba44-7dff-48cc-91ec-386a38318c68",
      orderId: "ORD-123",
      type: QrType.DYNAMIC,
      url: "https://qr.maib.md/123e4567",
      expiresAt: "2029-10-22T10:32:28+03:00",
    },
  },
};

const CREATE_HYBRID_QR_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      qrId: "789e0123-f456-7890-a123-456789012345",
      extensionId: "40e6ba44-7dff-48cc-91ec-386a38318c68",
      url: "https://qr.maib.md/789e0123",
    },
  },
};

const CREATE_EXTENSION_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      extensionId: "40e6ba44-7dff-48cc-91ec-386a38318c68",
    },
  },
};

const GET_QR_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      qrId: "123e4567-e89b-12d3-a456-426614174000",
      status: QrStatus.ACTIVE,
      type: QrType.DYNAMIC,
      url: "https://qr.maib.md/123e4567",
      amountType: AmountType.FIXED,
      amount: 50.0,
      currency: Currency.MDL,
      description: "Order #123",
      createdAt: "2029-10-22T10:32:28+03:00",
      updatedAt: "2029-10-22T10:32:28+03:00",
    },
  },
};

const CANCEL_QR_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      qrId: "123e4567-e89b-12d3-a456-426614174000",
      status: QrStatus.CANCELLED,
    },
  },
};

const CANCEL_EXTENSION_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      extensionId: "40e6ba44-7dff-48cc-91ec-386a38318c68",
    },
  },
};

const GET_PAYMENT_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      payId: "123e4567-e89b-12d3-a456-426614174000",
      referenceId: "QR000123456789",
      qrId: "789e0123-f456-7890-a123-456789012345",
      amount: 50.0,
      commission: 0.5,
      currency: Currency.MDL,
      description: "Payment for order #123",
      payerName: "John D.",
      payerIban: "MD24AG00225100013104168",
      status: MiaPaymentStatus.EXECUTED,
      executedAt: "2024-08-05T10:32:28+03:00",
    },
  },
};

const LIST_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      totalCount: 0,
      items: [],
    },
  },
};

const REFUND_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      refundId: "8ce09e40-2948-4225-a9c4-f277dbd587ea",
      status: "Created",
    },
  },
};

const TEST_PAY_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      qrId: "123e4567-e89b-12d3-a456-426614174000",
      qrStatus: QrStatus.PAID,
      payId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
      amount: 10.0,
      commission: 0.1,
      currency: Currency.MDL,
      payerName: "John D.",
      payerIban: "MD88AG000000011621810140",
      executedAt: "2029-10-22T10:32:28+03:00",
      signatureKey: "abc123==",
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

describe("MiaClient", () => {
  let mockFetch: Mock;
  let client: MiaClient;

  beforeEach(() => {
    mockFetch = createMockFetch([TOKEN_RESPONSE, CREATE_QR_RESPONSE]);
    client = new MiaClient(createTestConfig(mockFetch));
  });

  describe("versioning", () => {
    it("exposes the SDK version", () => {
      expect(MiaClient.version).toBe(SDK_VERSION);
    });

    it("uses API version v2", () => {
      expect(client.apiVersion).toBe("v2");
    });

    it("sends correct User-Agent", async () => {
      await client.createQr({
        type: QrType.DYNAMIC,
        amountType: AmountType.FIXED,
        amount: 50,
        currency: Currency.MDL,
        description: "Order #123",
        expiresAt: "2029-10-22T10:32:28+03:00",
      });
      const call = mockFetch.mock.calls[1];
      expect(call[1].headers.get("User-Agent")).toBe(`@maib/mia/${SDK_VERSION}`);
    });
  });

  describe("authentication", () => {
    it("uses clientId/clientSecret for token", async () => {
      await client.createQr({
        type: QrType.DYNAMIC,
        amountType: AmountType.FIXED,
        amount: 50,
        currency: Currency.MDL,
        description: "Order #123",
        expiresAt: "2029-10-22T10:32:28+03:00",
      });

      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall[0]).toBe("https://api.test.local/v2/auth/token");
      expect(JSON.parse(tokenCall[1].body)).toEqual({
        clientId: "client-id",
        clientSecret: "client-secret",
      });
    });
  });

  describe("createQr", () => {
    it("posts to /v2/mia/qr", async () => {
      const result = await client.createQr({
        type: QrType.DYNAMIC,
        amountType: AmountType.FIXED,
        amount: 50,
        currency: Currency.MDL,
        description: "Order #123",
        expiresAt: "2029-10-22T10:32:28+03:00",
      });

      expect(result.qrId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.type).toBe("Dynamic");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v2/mia/qr");
    });
  });

  describe("createHybridQr", () => {
    it("posts to /v2/mia/qr/hybrid", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, CREATE_HYBRID_QR_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.createHybridQr({
        amountType: AmountType.FIXED,
        currency: Currency.MDL,
        extension: {
          amount: 50,
          description: "Order #123",
          expiresAt: "2029-10-22T10:32:28+03:00",
        },
      });

      expect(result.qrId).toBe("789e0123-f456-7890-a123-456789012345");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v2/mia/qr/hybrid");
    });
  });

  describe("createExtension", () => {
    it("posts to /v2/mia/qr/{qrId}/extension", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, CREATE_EXTENSION_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.createExtension("qr-123", {
        expiresAt: "2029-10-22T10:32:28+03:00",
        description: "Updated order",
        amount: 75,
      });

      expect(result.extensionId).toBe("40e6ba44-7dff-48cc-91ec-386a38318c68");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v2/mia/qr/qr-123/extension");
    });
  });

  describe("getQr", () => {
    it("gets /v2/mia/qr/{qrId}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, GET_QR_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.getQr("123e4567-e89b-12d3-a456-426614174000");

      expect(result.qrId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.status).toBe("Active");
    });
  });

  describe("listQrs", () => {
    it("gets /v2/mia/qr with query params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, LIST_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.listQrs({ count: 10, offset: 0, type: QrType.DYNAMIC });

      expect(result.totalCount).toBe(0);
      const url = mockFetch.mock.calls[1][0];
      expect(url).toContain("/v2/mia/qr?");
      expect(url).toContain("count=10");
      expect(url).toContain("type=Dynamic");
    });
  });

  describe("listExtensions", () => {
    it("gets /v2/mia/qr/extension with query params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, LIST_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.listExtensions({ count: 5, offset: 0 });

      expect(result.totalCount).toBe(0);
      expect(mockFetch.mock.calls[1][0]).toContain("/v2/mia/qr/extension?");
    });
  });

  describe("cancelQr", () => {
    it("posts to /v2/mia/qr/{qrId}/cancel", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, CANCEL_QR_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.cancelQr("123e4567-e89b-12d3-a456-426614174000", {
        reason: "Order cancelled",
      });

      expect(result.status).toBe("Cancelled");
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://api.test.local/v2/mia/qr/123e4567-e89b-12d3-a456-426614174000/cancel",
      );
    });
  });

  describe("cancelExtension", () => {
    it("posts to /v2/mia/qr/{qrId}/extension/cancel", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, CANCEL_EXTENSION_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.cancelExtension("qr-123", { reason: "No longer needed" });

      expect(result.extensionId).toBe("40e6ba44-7dff-48cc-91ec-386a38318c68");
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://api.test.local/v2/mia/qr/qr-123/extension/cancel",
      );
    });
  });

  describe("getPayment", () => {
    it("gets /v2/mia/payments/{payId}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, GET_PAYMENT_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.getPayment("123e4567-e89b-12d3-a456-426614174000");

      expect(result.payId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.status).toBe("Executed");
    });
  });

  describe("listPayments", () => {
    it("gets /v2/mia/payments with query params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, LIST_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.listPayments({ count: 10, offset: 0 });

      expect(result.totalCount).toBe(0);
      expect(mockFetch.mock.calls[1][0]).toContain("/v2/mia/payments?");
    });
  });

  describe("refund", () => {
    it("posts to /v2/payments/{payId}/refund", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, REFUND_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.refund("pay-123", {
        reason: "Refund requested",
        amount: 50.61,
      });

      expect(mockFetch.mock.calls[1][0]).toContain("/v2/payments/pay-123/refund");
      expect(result.refundId).toBe("8ce09e40-2948-4225-a9c4-f277dbd587ea");
      expect(result.status).toBe("Created");
    });
  });

  describe("testPay", () => {
    it("posts to /v2/mia/test-pay", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, TEST_PAY_RESPONSE]);
      client = new MiaClient(createTestConfig(mockFetch));

      const result = await client.testPay({
        qrId: "123e4567-e89b-12d3-a456-426614174000",
        amount: 10,
        iban: "MD88AG000000011621810140",
        currency: Currency.MDL,
        payerName: "John D.",
      });

      expect(result.qrStatus).toBe("Paid");
      expect(result.payId).toBe("c56a4180-65aa-42ec-a945-5fd21dec0538");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v2/mia/test-pay");
    });
  });

  describe("verifyCallback", () => {
    it("throws if no signatureKey is configured", () => {
      expect(() => client.verifyCallback({ result: {} as never, signature: "test" })).toThrow(
        "no signatureKey",
      );
    });
  });
});
