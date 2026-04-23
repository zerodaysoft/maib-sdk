import { Currency, SDK_VERSION } from "@maib/core";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { RtpClient } from "../src/client.js";
import { RtpStatus } from "../src/constants.js";

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

const CREATE_RTP_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      rtpId: "123e4567-e89b-12d3-a456-426614174000",
      orderId: "INV123",
      expiresAt: "2029-10-22T10:32:28+03:00",
    },
  },
};

const GET_STATUS_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      rtpId: "123e4567-e89b-12d3-a456-426614174000",
      status: RtpStatus.CREATED,
      amount: 50.0,
      currency: Currency.MDL,
      description: "Order description",
      createdAt: "2029-10-22T10:32:28+03:00",
      updatedAt: "2029-10-22T10:32:58+03:00",
      expiresAt: "2029-10-22T10:33:28+03:00",
    },
  },
};

const CANCEL_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      rtpId: "123e4567-e89b-12d3-a456-426614174000",
      status: RtpStatus.CANCELLED,
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
      refundId: "123e4567-e89b-12d3-a456-426614174000",
      status: RtpStatus.CREATED,
    },
  },
};

const TEST_ACCEPT_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      rtpId: "123e4567-e89b-12d3-a456-426614174000",
      rtpStatus: RtpStatus.ACCEPTED,
      payId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
      amount: 100.0,
      commission: 1.0,
      currency: Currency.MDL,
      payerName: "John D.",
      payerIban: "MD24AG000225100014156789",
      executedAt: "2029-10-22T10:32:28+03:00",
      signature: "r4KwwIUXQGHhcEM7C4um8o9rSrGEriTRcYQuBbmjEec=",
    },
  },
};

const TEST_REJECT_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      rtpId: "123e4567-e89b-12d3-a456-426614174000",
      rtpStatus: RtpStatus.REJECTED,
      payId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
      amount: 100.0,
      commission: 1.0,
      currency: Currency.MDL,
      payerName: "John D.",
      payerIban: "MD24AG000225100014156789",
      executedAt: "2029-10-22T10:32:28+03:00",
      signature: "abc123==",
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

describe("RtpClient", () => {
  let mockFetch: Mock;
  let client: RtpClient;

  beforeEach(() => {
    mockFetch = createMockFetch([TOKEN_RESPONSE, CREATE_RTP_RESPONSE]);
    client = new RtpClient(createTestConfig(mockFetch));
  });

  describe("versioning", () => {
    it("exposes the SDK version", () => {
      expect(RtpClient.version).toBe(SDK_VERSION);
    });

    it("uses API version v2", () => {
      expect(client.apiVersion).toBe("v2");
    });

    it("sends correct User-Agent", async () => {
      await client.create({
        alias: "37369112221",
        amount: 150,
        expiresAt: "2029-10-22T10:32:28+03:00",
        currency: Currency.MDL,
        description: "Invoice #123",
      });
      const call = mockFetch.mock.calls[1];
      expect(call[1].headers.get("User-Agent")).toBe(`@maib/rtp/${SDK_VERSION}`);
    });
  });

  describe("authentication", () => {
    it("uses clientId/clientSecret for token", async () => {
      await client.create({
        alias: "37369112221",
        amount: 150,
        expiresAt: "2029-10-22T10:32:28+03:00",
        currency: Currency.MDL,
        description: "Invoice #123",
      });

      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall[0]).toBe("https://api.test.local/v2/auth/token");
      expect(JSON.parse(tokenCall[1].body)).toEqual({
        clientId: "client-id",
        clientSecret: "client-secret",
      });
    });
  });

  describe("create", () => {
    it("posts to /v2/rtp", async () => {
      const result = await client.create({
        alias: "37369112221",
        amount: 150,
        expiresAt: "2029-10-22T10:32:28+03:00",
        currency: Currency.MDL,
        description: "Invoice #123",
        orderId: "INV123",
      });

      expect(result.rtpId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.orderId).toBe("INV123");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v2/rtp");
      expect(mockFetch.mock.calls[1][1].method).toBe("POST");
    });
  });

  describe("getStatus", () => {
    it("gets /v2/rtp/{id}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, GET_STATUS_RESPONSE]);
      client = new RtpClient(createTestConfig(mockFetch));

      const result = await client.getStatus("123e4567-e89b-12d3-a456-426614174000");

      expect(result.rtpId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.status).toBe("Created");
      expect(mockFetch.mock.calls[1][1].method).toBe("GET");
    });
  });

  describe("cancel", () => {
    it("posts to /v2/rtp/{id}/cancel", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, CANCEL_RESPONSE]);
      client = new RtpClient(createTestConfig(mockFetch));

      const result = await client.cancel("123e4567-e89b-12d3-a456-426614174000", {
        reason: "Order cancelled",
      });

      expect(result.status).toBe("Cancelled");
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://api.test.local/v2/rtp/123e4567-e89b-12d3-a456-426614174000/cancel",
      );
    });
  });

  describe("list", () => {
    it("gets /v2/rtp with query params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, LIST_RESPONSE]);
      client = new RtpClient(createTestConfig(mockFetch));

      const result = await client.list({ count: 10, offset: 0, status: RtpStatus.CREATED });

      expect(result.totalCount).toBe(0);
      const url = mockFetch.mock.calls[1][0];
      expect(url).toContain("/v2/rtp?");
      expect(url).toContain("count=10");
    });
  });

  describe("refund", () => {
    it("posts to /v2/rtp/{payId}/refund", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, REFUND_RESPONSE]);
      client = new RtpClient(createTestConfig(mockFetch));

      const result = await client.refund("pay-123", { reason: "Refund requested" });

      expect(result.refundId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.status).toBe("Created");
    });
  });

  describe("testAccept", () => {
    it("posts to /v2/rtp/{id}/test-accept", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, TEST_ACCEPT_RESPONSE]);
      client = new RtpClient(createTestConfig(mockFetch));

      const result = await client.testAccept("123e4567-e89b-12d3-a456-426614174000", {
        amount: 100,
        currency: Currency.MDL,
      });

      expect(result.rtpStatus).toBe("Accepted");
      expect(result.payId).toBe("c56a4180-65aa-42ec-a945-5fd21dec0538");
    });
  });

  describe("testReject", () => {
    it("posts to /v2/rtp/{id}/test-reject", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, TEST_REJECT_RESPONSE]);
      client = new RtpClient(createTestConfig(mockFetch));

      const result = await client.testReject("123e4567-e89b-12d3-a456-426614174000");

      expect(result.rtpStatus).toBe("Rejected");
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
