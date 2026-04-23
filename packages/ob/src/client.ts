import type { TokenState } from "@maib/http";
import { buildQueryString, NetworkError, SDK_VERSION, TokenManager } from "@maib/http";
import { OB_DEFAULT_HOST, OB_DEFAULT_TOKEN_TTL_MS } from "./constants.js";
import { ObError } from "./errors.js";
import type {
  AnswerConsentChallengeBody,
  CreateConsentBody,
  CreatePaymentBody,
  ListTransactionsParams,
  ObAccount,
  ObAccountDetails,
  ObApiInfo,
  ObApiVersion,
  ObBank,
  ObClientConfig,
  ObConsent,
  ObTransaction,
  ObTransactionRequest,
  ObTransactionRequestType,
  ObUser,
} from "./types.js";

function e(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Client for the maib Open Banking API (OBP).
 *
 * Handles DirectLogin authentication, token caching, and provides
 * typed methods for accounts, transactions, payments, and consents.
 */
export class ObClient {
  /** SDK version string. */
  static readonly version = SDK_VERSION;

  private readonly _config: ObClientConfig;
  private readonly _baseUrl: string;
  private readonly _fetch: typeof globalThis.fetch;
  private readonly _tokenManager: TokenManager;
  private readonly _userAgent = `@maib/ob/${SDK_VERSION}`;

  constructor(config: ObClientConfig) {
    this._config = config;
    this._baseUrl = (config.baseUrl ?? OB_DEFAULT_HOST).replace(/\/$/, "");
    this._fetch = config.fetch ?? globalThis.fetch;
    this._tokenManager = new TokenManager(() => this._acquireToken());
  }

  // -----------------------------------------------------------------------
  // Token management (DirectLogin)
  // -----------------------------------------------------------------------

  private async _acquireToken(): Promise<TokenState> {
    const url = `${this._baseUrl}/my/logins/direct`;
    const { username, password, consumerKey } = this._config;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": this._userAgent,
      Authorization: `DirectLogin username="${username}", password="${password}", consumer_key="${consumerKey}"`,
    };

    let response: Response;
    try {
      response = await this._fetch(url, { method: "POST", headers });
    } catch (error) {
      throw new NetworkError("Network request to POST /my/logins/direct failed", error);
    }

    let json: { token?: string; message?: string };
    try {
      json = (await response.json()) as { token?: string; message?: string };
    } catch {
      throw new NetworkError(`Invalid JSON in token response (HTTP ${response.status})`);
    }

    if (!response.ok || !json.token) {
      throw new ObError(response.status, json.message ?? "DirectLogin token request failed");
    }

    return {
      accessToken: json.token,
      accessExpiresAt: Date.now() + OB_DEFAULT_TOKEN_TTL_MS,
    };
  }

  // -----------------------------------------------------------------------
  // HTTP layer
  // -----------------------------------------------------------------------

  private async _request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    authenticated = true,
  ): Promise<T> {
    const url = `${this._baseUrl}${path}`;
    const headers = new Headers();
    headers.set("User-Agent", this._userAgent);

    if (body) {
      headers.set("Content-Type", "application/json");
    }

    if (authenticated) {
      const token = await this._tokenManager.getToken();
      headers.set("Authorization", `DirectLogin token="${token}"`);
    }

    let response: Response;
    try {
      response = await this._fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new NetworkError(`Network request to ${method} ${path} failed`, error);
    }

    if (method === "DELETE" && response.status === 204) {
      return undefined as T;
    }

    let json: Record<string, unknown>;
    try {
      json = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new NetworkError(
        `Invalid JSON in ${method} ${path} response (HTTP ${response.status})`,
      );
    }

    if (!response.ok) {
      throw new ObError(
        response.status,
        (json.message as string) ?? `Request failed with HTTP ${response.status}`,
      );
    }

    return json as T;
  }

  private async _get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const qs = params ? buildQueryString(params) : "";
    const fullPath = qs ? `${path}?${qs}` : path;
    return this._request<T>("GET", fullPath);
  }

  private async _post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this._request<T>("POST", path, body);
  }

  private async _delete<T>(path: string): Promise<T> {
    return this._request<T>("DELETE", path);
  }

  // -----------------------------------------------------------------------
  // Auth
  // -----------------------------------------------------------------------

  /** Get the currently authenticated user. */
  public async getCurrentUser(): Promise<ObUser> {
    return this._get("/obp/v5.1.0/users/current");
  }

  // -----------------------------------------------------------------------
  // Banks
  // -----------------------------------------------------------------------

  /** List all available banks. */
  public async listBanks(): Promise<ObBank[]> {
    const result = await this._get<{ banks: ObBank[] }>("/obp/v4.0.0/banks");
    return result.banks;
  }

  /** Get details for a specific bank. */
  public async getBank(bankId: string): Promise<ObBank> {
    return this._get(`/obp/v5.0.0/banks/${e(bankId)}`);
  }

  // -----------------------------------------------------------------------
  // Accounts
  // -----------------------------------------------------------------------

  /** List accounts the current user has access to at a bank. */
  public async listAccounts(bankId: string): Promise<ObAccount[]> {
    return this._get(`/obp/v4.0.0/banks/${e(bankId)}/accounts`);
  }

  /** Get full account details including balance, IBAN, and owners. */
  public async getAccount(
    bankId: string,
    accountId: string,
    viewId = "owner",
  ): Promise<ObAccountDetails> {
    return this._get(
      `/obp/v4.0.0/banks/${e(bankId)}/accounts/${e(accountId)}/${e(viewId)}/account`,
    );
  }

  /** Check if an account has sufficient funds (PSD2 PIIS). */
  public async checkFunds(
    bankId: string,
    accountId: string,
    viewId: string,
    amount: string,
    currency: string,
  ): Promise<{ funds_available: boolean }> {
    return this._get(
      `/obp/v4.0.0/banks/${e(bankId)}/accounts/${e(accountId)}/${e(viewId)}/funds-available`,
      { amount, currency },
    );
  }

  // -----------------------------------------------------------------------
  // Transactions
  // -----------------------------------------------------------------------

  /** List transactions for an account. */
  public async listTransactions(
    bankId: string,
    accountId: string,
    viewId = "owner",
    params?: ListTransactionsParams,
  ): Promise<ObTransaction[]> {
    const result = await this._get<{ transactions: ObTransaction[] }>(
      `/obp/v4.0.0/banks/${e(bankId)}/accounts/${e(accountId)}/${e(viewId)}/transactions`,
      params as unknown as Record<string, unknown>,
    );
    return result.transactions;
  }

  /** Get a single transaction by ID. */
  public async getTransaction(
    bankId: string,
    accountId: string,
    viewId: string,
    transactionId: string,
  ): Promise<ObTransaction> {
    return this._get(
      `/obp/v4.0.0/banks/${e(bankId)}/accounts/${e(accountId)}/${e(viewId)}/transactions/${e(transactionId)}/transaction`,
    );
  }

  // -----------------------------------------------------------------------
  // Payments (Transaction Requests)
  // -----------------------------------------------------------------------

  /** Get supported transaction request types for a bank. */
  public async getTransactionRequestTypes(bankId: string): Promise<ObTransactionRequestType[]> {
    const result = await this._get<{ transaction_request_types: ObTransactionRequestType[] }>(
      `/obp/v4.0.0/banks/${e(bankId)}/transaction-request-types`,
    );
    return result.transaction_request_types;
  }

  /**
   * Create a payment (transaction request).
   *
   * @param type - Payment type: "SANDBOX_TAN", "SEPA", "COUNTERPARTY", etc.
   * @param body - Payment details (to, value, description).
   */
  public async createPayment(
    bankId: string,
    accountId: string,
    viewId: string,
    type: string,
    body: CreatePaymentBody,
  ): Promise<ObTransactionRequest> {
    return this._post(
      `/obp/v5.1.0/banks/${e(bankId)}/accounts/${e(accountId)}/${e(viewId)}/transaction-request-types/${e(type)}/transaction-requests`,
      body as unknown as Record<string, unknown>,
    );
  }

  // -----------------------------------------------------------------------
  // Consents
  // -----------------------------------------------------------------------

  /**
   * Create a consent for account access.
   *
   * @param scaMethod - SCA delivery method: "SMS", "EMAIL", or "IMPLICIT".
   */
  public async createConsent(
    bankId: string,
    scaMethod: string,
    body: CreateConsentBody,
  ): Promise<ObConsent> {
    return this._post(
      `/obp/v4.0.0/banks/${e(bankId)}/my/consents/${e(scaMethod)}`,
      body as unknown as Record<string, unknown>,
    );
  }

  /** Answer a consent challenge (SCA verification). */
  public async answerConsentChallenge(
    bankId: string,
    consentId: string,
    body: AnswerConsentChallengeBody,
  ): Promise<ObConsent> {
    return this._post(
      `/obp/v4.0.0/banks/${e(bankId)}/consents/${e(consentId)}/challenge`,
      body as unknown as Record<string, unknown>,
    );
  }

  /** List all consents for the current user. */
  public async listMyConsents(bankId?: string): Promise<ObConsent[]> {
    if (bankId) {
      return this._get(`/obp/v5.1.0/banks/${e(bankId)}/my/consents`);
    }
    return this._get("/obp/v5.1.0/my/consents");
  }

  /** Revoke a consent at a bank. */
  public async revokeConsent(bankId: string, consentId: string): Promise<void> {
    await this._delete(`/obp/v5.1.0/banks/${e(bankId)}/consents/${e(consentId)}`);
  }

  // -----------------------------------------------------------------------
  // Meta
  // -----------------------------------------------------------------------

  /** Get API info (version, host, connector, git commit). */
  public async getApiInfo(): Promise<ObApiInfo> {
    return this._get("/obp/v5.1.0/root");
  }

  /** Get all available API versions. */
  public async getApiVersions(): Promise<ObApiVersion[]> {
    const result = await this._get<{ scanned_api_versions: ObApiVersion[] }>(
      "/obp/v4.0.0/api/versions",
    );
    return result.scanned_api_versions;
  }
}
