import type { BaseClientConfig } from "@maib/http";

// -----------------------------------------------------------------------
// Client configuration
// -----------------------------------------------------------------------

/** Configuration for the OBP client (DirectLogin auth). */
export interface ObClientConfig extends BaseClientConfig {
  /** OBP user name. */
  username: string;
  /** OBP user password. */
  password: string;
  /** OAuth consumer key registered with the OBP instance. */
  consumerKey: string;
  /**
   * OBP API host.
   * @default "https://ob-sandbox.maib.md"
   */
  baseUrl?: string;
}

// -----------------------------------------------------------------------
// Banks
// -----------------------------------------------------------------------

export interface ObBankRouting {
  scheme: string;
  address: string;
}

export interface ObBank {
  id: string;
  short_name: string;
  full_name: string;
  logo: string;
  website: string;
  bank_routings: ObBankRouting[];
}

// -----------------------------------------------------------------------
// Accounts
// -----------------------------------------------------------------------

export interface ObAccountView {
  id: string;
  short_name: string;
  is_public: boolean;
}

export interface ObAccount {
  id: string;
  label: string;
  bank_id: string;
  views_available: ObAccountView[];
}

export interface ObAmountOfMoney {
  currency: string;
  amount: string;
}

export interface ObAccountOwner {
  id: string;
  provider: string;
  display_name: string;
}

export interface ObAccountDetails {
  bank_id: string;
  id: string;
  label: string;
  number: string;
  owners: ObAccountOwner[];
  type: string;
  balance: ObAmountOfMoney;
  IBAN: string;
  views_available: ObAccountView[];
}

// -----------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------

export interface ObTransactionDetails {
  type: string;
  description: string;
  posted: string;
  completed: string;
  new_balance: ObAmountOfMoney;
  value: ObAmountOfMoney;
}

export interface ObTransactionAccount {
  id: string;
  holders: Array<{ name: string }>;
  bank_routing: ObBankRouting;
  account_routings: ObBankRouting[];
}

export interface ObTransaction {
  id: string;
  this_account: ObTransactionAccount;
  other_account: ObTransactionAccount;
  details: ObTransactionDetails;
  metadata: Record<string, unknown>;
}

export interface ListTransactionsParams {
  limit?: number;
  offset?: number;
  sort_direction?: "ASC" | "DESC";
  from_date?: string;
  to_date?: string;
}

// -----------------------------------------------------------------------
// Transaction Requests (Payments)
// -----------------------------------------------------------------------

export interface ObChallenge {
  id: string;
  allowed_attempts: number;
  challenge_type: string;
}

export interface ObTransactionRequestType {
  value: string;
  charge: {
    summary: string;
    value: ObAmountOfMoney;
  };
}

export interface ObTransactionRequest {
  id: string;
  type: string;
  status: string;
  from: { bank_id: string; account_id: string };
  details: Record<string, unknown>;
  charge: {
    summary: string;
    value: ObAmountOfMoney;
  };
  challenge: ObChallenge;
  start_date: string;
  end_date: string;
  transaction_ids: string[];
}

export interface CreatePaymentBody {
  to: Record<string, unknown>;
  value: ObAmountOfMoney;
  description: string;
}

// -----------------------------------------------------------------------
// Consents
// -----------------------------------------------------------------------

export interface ObConsent {
  consent_id: string;
  jwt: string;
  status: string;
}

export interface CreateConsentBody {
  everything: boolean;
  views: Array<{
    bank_id: string;
    account_id: string;
    view_id: string;
  }>;
  entitlements: Array<{
    bank_id: string;
    role_name: string;
  }>;
}

export interface AnswerConsentChallengeBody {
  answer: string;
}

// -----------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------

export interface ObUser {
  user_id: string;
  email: string;
  provider_id: string;
  provider: string;
  username: string;
  entitlements: {
    list: Array<{
      entitlement_id: string;
      role_name: string;
      bank_id: string;
    }>;
  };
}

// -----------------------------------------------------------------------
// Meta
// -----------------------------------------------------------------------

export interface ObApiInfo {
  version: string;
  version_status: string;
  git_commit: string;
  connector: string;
  hostname: string;
  local_identity_provider: string;
  hosted_by: { organisation: string; email: string; phone: string; organisation_website: string };
  hosted_at: { organisation: string; organisation_website: string };
  energy_source: { organisation: string; organisation_website: string };
}

export interface ObApiVersion {
  urlPrefix: string;
  apiStandard: string;
  apiShortVersion: string;
  API_VERSION: string;
}
