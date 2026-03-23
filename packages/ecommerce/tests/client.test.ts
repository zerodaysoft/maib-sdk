import { Currency, Language, MaibError, MaibNetworkError, SDK_VERSION } from "@maib/core";
import { beforeEach, describe, expect, it, type Mock } from "vitest";
import { EcommerceClient } from "../src/client.js";
import {
  COMPLETE_RESPONSE,
  DELETE_CARD_RESPONSE,
  ERROR_RESPONSE_INVALID_AMOUNT,
  PAY_INFO_RESPONSE,
  PAY_RESPONSE,
  REFUND_RESPONSE,
  SIGNATURE_KEY,
  TOKEN_RESPONSE,
  VALID_CALLBACK_PAYLOAD,
} from "./fixtures/index.js";
import { createMockFetch, createTestClientConfig } from "./helpers/index.js";

describe("EcommerceClient", () => {
  let mockFetch: Mock;
  let client: EcommerceClient;

  beforeEach(() => {
    mockFetch = createMockFetch([TOKEN_RESPONSE, PAY_RESPONSE]);
    client = new EcommerceClient({
      ...createTestClientConfig(mockFetch),
      signatureKey: "sig-key",
    });
  });

  describe("versioning", () => {
    it("exposes the SDK version as a static property", () => {
      expect(EcommerceClient.version).toBe(SDK_VERSION);
      expect(typeof EcommerceClient.version).toBe("string");
      expect(EcommerceClient.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("sends User-Agent header with SDK version", async () => {
      await client.pay({
        amount: 10,
        currency: Currency.MDL,
        clientIp: "127.0.0.1",
        language: Language.EN,
      });

      const payCall = mockFetch.mock.calls[1];
      expect(payCall[1].headers["User-Agent"]).toBe(`@maib/ecommerce/${SDK_VERSION}`);
    });

    it("defaults to API version v1", () => {
      const defaultClient = new EcommerceClient(createTestClientConfig(mockFetch));
      expect(defaultClient.apiVersion).toBe("v1");
    });
  });

  describe("authentication", () => {
    it("automatically generates a token before the first API call", async () => {
      await client.pay({
        amount: 10,
        currency: Currency.MDL,
        clientIp: "127.0.0.1",
        language: Language.EN,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall[0]).toBe("https://api.test.local/v1/generate-token");
      expect(JSON.parse(tokenCall[1].body)).toEqual({
        projectId: "proj-id",
        projectSecret: "proj-secret",
      });
    });

    it("reuses token for subsequent calls within expiry window", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, PAY_RESPONSE, PAY_RESPONSE]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      await client.pay({
        amount: 10,
        currency: Currency.MDL,
        clientIp: "127.0.0.1",
        language: Language.EN,
      });
      await client.pay({
        amount: 20,
        currency: Currency.MDL,
        clientIp: "127.0.0.1",
        language: Language.EN,
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("sends Bearer token in Authorization header", async () => {
      await client.pay({
        amount: 10,
        currency: Currency.MDL,
        clientIp: "127.0.0.1",
        language: Language.EN,
      });

      const payCall = mockFetch.mock.calls[1];
      expect(payCall[1].headers.Authorization).toBe("Bearer test-access-token");
    });
  });

  describe("pay", () => {
    it("sends correct request and returns payment init result", async () => {
      const result = await client.pay({
        amount: 10,
        currency: Currency.MDL,
        clientIp: "127.0.0.1",
        language: Language.EN,
        orderId: "order-1",
      });

      expect(result).toEqual({
        payId: "abc-123",
        orderId: "order-1",
        payUrl: "https://checkout.example.com/pay",
      });

      const payCall = mockFetch.mock.calls[1];
      expect(payCall[0]).toBe("https://api.test.local/v1/pay");
      expect(payCall[1].method).toBe("POST");
    });
  });

  describe("hold", () => {
    it("calls /hold endpoint", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, PAY_RESPONSE]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      await client.hold({
        amount: 50,
        currency: Currency.MDL,
        clientIp: "10.0.0.1",
        language: Language.RO,
      });

      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v1/hold");
    });
  });

  describe("complete", () => {
    it("calls /complete endpoint", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, COMPLETE_RESPONSE]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      const result = await client.complete({ payId: "abc-123", confirmAmount: 50 });

      expect(result.confirmAmount).toBe(50);
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v1/complete");
    });
  });

  describe("refund", () => {
    it("calls /refund endpoint", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, REFUND_RESPONSE]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      const result = await client.refund({ payId: "abc-123", refundAmount: 10 });

      expect(result.refundAmount).toBe(10);
    });
  });

  describe("getPayInfo", () => {
    it("calls GET /pay-info/{payId}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, PAY_INFO_RESPONSE]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      const result = await client.getPayInfo("abc-123");

      expect(result.payId).toBe("abc-123");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v1/pay-info/abc-123");
      expect(mockFetch.mock.calls[1][1].method).toBe("GET");
    });
  });

  describe("deleteCard", () => {
    it("calls DELETE /delete-card/{billerId}", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, DELETE_CARD_RESPONSE]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      await client.deleteCard("biller-xyz");

      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.local/v1/delete-card/biller-xyz");
      expect(mockFetch.mock.calls[1][1].method).toBe("DELETE");
    });
  });

  describe("error handling", () => {
    it("throws MaibError on API error response", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, ERROR_RESPONSE_INVALID_AMOUNT]);
      client = new EcommerceClient(createTestClientConfig(mockFetch));

      await expect(
        client.pay({
          amount: -1,
          currency: Currency.MDL,
          clientIp: "127.0.0.1",
          language: Language.EN,
        }),
      ).rejects.toThrow(MaibError);
    });

    it("throws MaibNetworkError on fetch failure", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE]);
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
      const failClient = new EcommerceClient(createTestClientConfig(mockFetch));

      await expect(
        failClient.pay({
          amount: 10,
          currency: Currency.MDL,
          clientIp: "127.0.0.1",
          language: Language.EN,
        }),
      ).rejects.toThrow(MaibNetworkError);
    });
  });

  describe("verifyCallback", () => {
    it("verifies a valid callback signature", () => {
      const verifyClient = new EcommerceClient(
        createTestClientConfig(mockFetch, { signatureKey: SIGNATURE_KEY }),
      );

      expect(verifyClient.verifyCallback(VALID_CALLBACK_PAYLOAD)).toBe(true);
    });

    it("throws if no signatureKey is configured", () => {
      const noKeyClient = new EcommerceClient(createTestClientConfig(mockFetch));

      expect(() => noKeyClient.verifyCallback({ result: {} as never, signature: "test" })).toThrow(
        "no signatureKey",
      );
    });
  });
});
