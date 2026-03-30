import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { ObClient } from "../src/client.js";
import { ObError } from "../src/errors.js";
import type { ObClientConfig } from "../src/types.js";

interface MockHttpResponse {
  status: number;
  ok?: boolean;
  body: unknown;
}

function createMockFetch(responses: MockHttpResponse[]): Mock {
  const queue = [...responses];
  return vi.fn(async () => {
    const resp = queue.shift();
    if (!resp) throw new Error("No more mock responses");
    return {
      status: resp.status,
      ok: resp.ok ?? (resp.status >= 200 && resp.status < 300),
      json: async () => resp.body,
      text: async () => JSON.stringify(resp.body),
    } as Response;
  });
}

const TOKEN_RESPONSE: MockHttpResponse = {
  status: 200,
  body: { token: "test-direct-login-jwt" },
};

function createTestConfig(mockFetch: Mock): ObClientConfig {
  return {
    username: "testuser",
    password: "testpass",
    consumerKey: "test-consumer-key",
    baseUrl: "https://ob-test.local",
    fetch: mockFetch as unknown as typeof globalThis.fetch,
  };
}

describe("ObClient", () => {
  let mockFetch: Mock;
  let client: ObClient;

  beforeEach(() => {
    mockFetch = createMockFetch([TOKEN_RESPONSE, { status: 200, body: {} }]);
    client = new ObClient(createTestConfig(mockFetch));
  });

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  describe("authentication", () => {
    it("sends DirectLogin credentials in Authorization header for token", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, { status: 200, body: { banks: [] } }]);
      client = new ObClient(createTestConfig(mockFetch));

      await client.listBanks();

      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall[0]).toBe("https://ob-test.local/my/logins/direct");
      expect(tokenCall[1].method).toBe("POST");
      expect(tokenCall[1].headers.Authorization).toBe(
        'DirectLogin username="testuser", password="testpass", consumer_key="test-consumer-key"',
      );
    });

    it("uses DirectLogin token header for subsequent requests", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, { status: 200, body: { banks: [] } }]);
      client = new ObClient(createTestConfig(mockFetch));

      await client.listBanks();

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[1].headers.Authorization).toBe('DirectLogin token="test-direct-login-jwt"');
    });

    it("caches the token across multiple requests", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        { status: 200, body: { banks: [] } },
        { status: 200, body: { banks: [] } },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      await client.listBanks();
      await client.listBanks();

      // Only 1 token call + 2 API calls = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[0][0]).toBe("https://ob-test.local/my/logins/direct");
      expect(mockFetch.mock.calls[1][0]).toContain("/banks");
      expect(mockFetch.mock.calls[2][0]).toContain("/banks");
    });

    it("throws ObError when token request fails", async () => {
      mockFetch = createMockFetch([
        { status: 401, ok: false, body: { message: "OBP-20001: User not logged in." } },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      await expect(client.listBanks()).rejects.toThrow(ObError);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    it("throws ObError with parsed obpCode on API error", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        { status: 403, ok: false, body: { message: "OBP-20017: Insufficient role." } },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      try {
        await client.listBanks();
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ObError);
        const obErr = err as ObError;
        expect(obErr.statusCode).toBe(403);
        expect(obErr.obpCode).toBe("OBP-20017");
        expect(obErr.message).toBe("OBP-20017: Insufficient role.");
      }
    });

    it("throws NetworkError on fetch failure", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE]);
      client = new ObClient(createTestConfig(mockFetch));

      // Override to simulate network failure on API call
      let calls = 0;
      const failingFetch = vi.fn(async () => {
        calls++;
        if (calls === 1) {
          // Token request succeeds
          return {
            status: 200,
            ok: true,
            json: async () => ({ token: "jwt" }),
          } as Response;
        }
        throw new TypeError("Network failure");
      });
      client = new ObClient({
        ...createTestConfig(mockFetch),
        fetch: failingFetch as unknown as typeof globalThis.fetch,
      });

      await expect(client.listBanks()).rejects.toThrow("Network request to GET");
    });
  });

  // -----------------------------------------------------------------------
  // Banks
  // -----------------------------------------------------------------------

  describe("listBanks", () => {
    it("returns unwrapped banks array", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 200,
          body: {
            banks: [
              {
                id: "maib.md",
                short_name: "maib",
                full_name: "maib SA",
                logo: "",
                website: "",
                bank_routings: [],
              },
            ],
          },
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const banks = await client.listBanks();
      expect(banks).toHaveLength(1);
      expect(banks[0].id).toBe("maib.md");
    });
  });

  describe("getBank", () => {
    it("fetches bank by ID", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 200,
          body: {
            id: "maib.md",
            short_name: "maib",
            full_name: "maib SA",
            logo: "",
            website: "",
            bank_routings: [],
          },
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const bank = await client.getBank("maib.md");
      expect(bank.id).toBe("maib.md");
      expect(mockFetch.mock.calls[1][0]).toBe("https://ob-test.local/obp/v5.0.0/banks/maib.md");
    });
  });

  // -----------------------------------------------------------------------
  // Accounts
  // -----------------------------------------------------------------------

  describe("listAccounts", () => {
    it("fetches accounts for a bank", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 200,
          body: [{ id: "acc-1", label: "My Account", bank_id: "maib.md", views_available: [] }],
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const accounts = await client.listAccounts("maib.md");
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://ob-test.local/obp/v4.0.0/banks/maib.md/accounts",
      );
      expect(accounts).toBeDefined();
    });
  });

  describe("getAccount", () => {
    it("fetches account details with default view", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 200,
          body: {
            bank_id: "maib.md",
            id: "acc-1",
            label: "My Account",
            number: "123",
            owners: [],
            type: "CURRENT",
            balance: { currency: "MDL", amount: "1000.00" },
            IBAN: "MD24MAIB0000000000123456",
            views_available: [],
          },
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const account = await client.getAccount("maib.md", "acc-1");
      expect(account.IBAN).toBe("MD24MAIB0000000000123456");
      expect(mockFetch.mock.calls[1][0]).toContain("/owner/account");
    });
  });

  // -----------------------------------------------------------------------
  // Transactions
  // -----------------------------------------------------------------------

  describe("listTransactions", () => {
    it("fetches transactions with params", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, { status: 200, body: { transactions: [] } }]);
      client = new ObClient(createTestConfig(mockFetch));

      const txns = await client.listTransactions("maib.md", "acc-1", "owner", {
        limit: 10,
        sort_direction: "DESC",
      });
      expect(txns).toEqual([]);
      const url = mockFetch.mock.calls[1][0] as string;
      expect(url).toContain("limit=10");
      expect(url).toContain("sort_direction=DESC");
    });
  });

  // -----------------------------------------------------------------------
  // Payments
  // -----------------------------------------------------------------------

  describe("createPayment", () => {
    it("posts to transaction-request-types endpoint", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 201,
          body: {
            id: "tr-1",
            type: "SANDBOX_TAN",
            status: "COMPLETED",
            from: { bank_id: "maib.md", account_id: "acc-1" },
            details: {},
            charge: { summary: "No charge", value: { currency: "EUR", amount: "0.00" } },
            challenge: {
              id: "c-1",
              allowed_attempts: 3,
              challenge_type: "OBP_TRANSACTION_REQUEST_CHALLENGE",
            },
            start_date: "2026-03-30",
            end_date: "2026-03-30",
            transaction_ids: ["txn-1"],
          },
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const result = await client.createPayment("maib.md", "acc-1", "owner", "SANDBOX_TAN", {
        to: { bank_id: "maib.md", account_id: "acc-2" },
        value: { currency: "EUR", amount: "10.00" },
        description: "Test payment",
      });

      expect(result.id).toBe("tr-1");
      expect(result.status).toBe("COMPLETED");
      expect(mockFetch.mock.calls[1][0]).toContain("/SANDBOX_TAN/transaction-requests");
      expect(mockFetch.mock.calls[1][1].method).toBe("POST");
    });
  });

  // -----------------------------------------------------------------------
  // Consents
  // -----------------------------------------------------------------------

  describe("createConsent", () => {
    it("posts to consent endpoint with SCA method", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        { status: 201, body: { consent_id: "consent-1", jwt: "jwt-token", status: "INITIATED" } },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const consent = await client.createConsent("maib.md", "IMPLICIT", {
        everything: true,
        views: [],
        entitlements: [],
      });

      expect(consent.consent_id).toBe("consent-1");
      expect(mockFetch.mock.calls[1][0]).toContain("/my/consents/IMPLICIT");
    });
  });

  describe("revokeConsent", () => {
    it("sends DELETE request", async () => {
      mockFetch = createMockFetch([TOKEN_RESPONSE, { status: 204, body: {} }]);
      // Need to override ok for 204
      const originalFn = mockFetch;
      let callCount = 0;
      const customFetch = vi.fn(async (...args: unknown[]) => {
        callCount++;
        if (callCount === 2) {
          return {
            status: 204,
            ok: true,
            json: async () => ({}),
            text: async () => "",
          } as Response;
        }
        return originalFn(...args);
      });
      client = new ObClient({
        ...createTestConfig(mockFetch),
        fetch: customFetch as unknown as typeof globalThis.fetch,
      });

      await client.revokeConsent("maib.md", "consent-1");
      expect(customFetch.mock.calls[1][1].method).toBe("DELETE");
    });
  });

  // -----------------------------------------------------------------------
  // Meta
  // -----------------------------------------------------------------------

  describe("getApiInfo", () => {
    it("fetches API root info", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 200,
          body: {
            version: "v5.1.0",
            version_status: "STABLE",
            git_commit: "abc123",
            connector: "mapped",
            hostname: "ob-sandbox.maib.md",
            local_identity_provider: "",
            hosted_by: { organisation: "maib", email: "", phone: "", organisation_website: "" },
            hosted_at: { organisation: "", organisation_website: "" },
            energy_source: { organisation: "", organisation_website: "" },
          },
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const info = await client.getApiInfo();
      expect(info.version).toBe("v5.1.0");
      expect(mockFetch.mock.calls[1][0]).toBe("https://ob-test.local/obp/v5.1.0/root");
    });
  });

  describe("getApiVersions", () => {
    it("returns unwrapped versions array", async () => {
      mockFetch = createMockFetch([
        TOKEN_RESPONSE,
        {
          status: 200,
          body: {
            scanned_api_versions: [
              {
                urlPrefix: "/obp/v4.0.0",
                apiStandard: "obp",
                apiShortVersion: "v4.0.0",
                API_VERSION: "OBPv4.0.0",
              },
            ],
          },
        },
      ]);
      client = new ObClient(createTestConfig(mockFetch));

      const versions = await client.getApiVersions();
      expect(versions).toHaveLength(1);
      expect(versions[0].API_VERSION).toBe("OBPv4.0.0");
    });
  });
});
