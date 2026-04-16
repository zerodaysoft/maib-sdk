---
package: "@maib/ob"
version: 0.2.2
description: TypeScript SDK for the maib Open Banking API (OBP) — accounts, transactions, payments, consents.
platform: Open Bank Project (OBP) v5.1.0
upstream_docs: https://ob-sandbox.maib.md
upstream_updated: 2025-11-10
---

# @maib/ob SDK Reference

TypeScript SDK for the maib Open Banking API built on the Open Bank Project (OBP) v5.1.0 platform. Provides typed methods for bank accounts, transactions, payments, and consent management.

## Architecture

`ObClient` is a standalone client. It does **not** extend `BaseClient` from `@maib/core` -- it has its own HTTP and authentication implementation.

- **Authentication**: DirectLogin flow (username + password + consumerKey exchanged for a JWT token via `POST /my/logins/direct`).
- **Token caching**: Tokens are cached internally by `TokenManager` from `@maib/http`. The default TTL is 1 hour (3,600,000 ms). The token refreshes automatically before expiry.
- **Environment**: Only the sandbox environment is available (`https://ob-sandbox.maib.md`).
- **No response envelope**: Unlike the merchant APIs, OBP returns raw JSON -- there is no `{ ok, result }` wrapper.

## Installation

```bash
npm install @maib/ob
```

## Quick Start

```typescript
import { ObClient } from "@maib/ob";

const client = new ObClient({
  username: "your-obp-username",
  password: "your-obp-password",
  consumerKey: "your-consumer-key",
});

const banks = await client.listBanks();
console.log(banks);
```

## Configuration

### `ObClientConfig`

Create an `ObClient` by passing an `ObClientConfig` object to the constructor.

```typescript
interface ObClientConfig {
  username: string;
  password: string;
  consumerKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}
```

| Property      | Type                      | Required | Default                        | Description                                                            |
| ------------- | ------------------------- | -------- | ------------------------------ | ---------------------------------------------------------------------- |
| `username`    | `string`                  | Yes      | --                             | OBP user name.                                                         |
| `password`    | `string`                  | Yes      | --                             | OBP user password.                                                     |
| `consumerKey` | `string`                  | Yes      | --                             | OAuth consumer key registered with the OBP instance.                   |
| `baseUrl`     | `string`                  | No       | `"https://ob-sandbox.maib.md"` | OBP API host. Override only for custom deployments.                    |
| `fetch`       | `typeof globalThis.fetch` | No       | `globalThis.fetch`             | Custom fetch implementation (e.g. for testing or Node < 18 polyfills). |

### Constructor

```typescript
const client = new ObClient(config: ObClientConfig);
```

### Static Properties

| Property           | Type     | Description                     |
| ------------------ | -------- | ------------------------------- |
| `ObClient.version` | `string` | SDK version string (read-only). |

## API Methods

### Auth

| Method           | Signature                           | Returns  | Description                                                                  |
| ---------------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `getCurrentUser` | `getCurrentUser(): Promise<ObUser>` | `ObUser` | Get the currently authenticated user. Calls `GET /obp/v5.1.0/users/current`. |

#### `ObUser`

```typescript
interface ObUser {
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
```

### Banks

| Method      | Signature                                  | Returns    | Description                                                              |
| ----------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------ |
| `listBanks` | `listBanks(): Promise<ObBank[]>`           | `ObBank[]` | List all available banks. Calls `GET /obp/v4.0.0/banks`.                 |
| `getBank`   | `getBank(bankId: string): Promise<ObBank>` | `ObBank`   | Get details for a specific bank. Calls `GET /obp/v5.0.0/banks/{bankId}`. |

#### `ObBank`

```typescript
interface ObBank {
  id: string;
  short_name: string;
  full_name: string;
  logo: string;
  website: string;
  bank_routings: ObBankRouting[];
}

interface ObBankRouting {
  scheme: string;
  address: string;
}
```

### Accounts

| Method         | Signature                                                                                                                                | Returns                        | Description                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listAccounts` | `listAccounts(bankId: string): Promise<ObAccount[]>`                                                                                     | `ObAccount[]`                  | List accounts the current user has access to at a bank. Calls `GET /obp/v4.0.0/banks/{bankId}/accounts`.                                                                    |
| `getAccount`   | `getAccount(bankId: string, accountId: string, viewId?: string): Promise<ObAccountDetails>`                                              | `ObAccountDetails`             | Get full account details including balance, IBAN, and owners. `viewId` defaults to `"owner"`. Calls `GET /obp/v4.0.0/banks/{bankId}/accounts/{accountId}/{viewId}/account`. |
| `checkFunds`   | `checkFunds(bankId: string, accountId: string, viewId: string, amount: string, currency: string): Promise<{ funds_available: boolean }>` | `{ funds_available: boolean }` | Check if an account has sufficient funds (PSD2 PIIS). Calls `GET /obp/v4.0.0/banks/{bankId}/accounts/{accountId}/{viewId}/funds-available`.                                 |

#### `ObAccount`

```typescript
interface ObAccount {
  id: string;
  label: string;
  bank_id: string;
  views_available: ObAccountView[];
}

interface ObAccountView {
  id: string;
  short_name: string;
  is_public: boolean;
}
```

#### `ObAccountDetails`

```typescript
interface ObAccountDetails {
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

interface ObAccountOwner {
  id: string;
  provider: string;
  display_name: string;
}

interface ObAmountOfMoney {
  currency: string;
  amount: string;
}
```

### Transactions

| Method             | Signature                                                                                                                         | Returns           | Description                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listTransactions` | `listTransactions(bankId: string, accountId: string, viewId?: string, params?: ListTransactionsParams): Promise<ObTransaction[]>` | `ObTransaction[]` | List transactions for an account. `viewId` defaults to `"owner"`. Calls `GET /obp/v4.0.0/banks/{bankId}/accounts/{accountId}/{viewId}/transactions`. |
| `getTransaction`   | `getTransaction(bankId: string, accountId: string, viewId: string, transactionId: string): Promise<ObTransaction>`                | `ObTransaction`   | Get a single transaction by ID. Calls `GET /obp/v4.0.0/banks/{bankId}/accounts/{accountId}/{viewId}/transactions/{transactionId}/transaction`.       |

#### `ListTransactionsParams`

```typescript
interface ListTransactionsParams {
  limit?: number;
  offset?: number;
  sort_direction?: "ASC" | "DESC";
  from_date?: string;
  to_date?: string;
}
```

| Parameter        | Type              | Required | Description                               |
| ---------------- | ----------------- | -------- | ----------------------------------------- |
| `limit`          | `number`          | No       | Maximum number of transactions to return. |
| `offset`         | `number`          | No       | Pagination offset.                        |
| `sort_direction` | `"ASC" \| "DESC"` | No       | Sort order by date.                       |
| `from_date`      | `string`          | No       | Start date filter (ISO 8601 format).      |
| `to_date`        | `string`          | No       | End date filter (ISO 8601 format).        |

#### `ObTransaction`

```typescript
interface ObTransaction {
  id: string;
  this_account: ObTransactionAccount;
  other_account: ObTransactionAccount;
  details: ObTransactionDetails;
  metadata: Record<string, unknown>;
}

interface ObTransactionAccount {
  id: string;
  holders: Array<{ name: string }>;
  bank_routing: ObBankRouting;
  account_routings: ObBankRouting[];
}

interface ObTransactionDetails {
  type: string;
  description: string;
  posted: string;
  completed: string;
  new_balance: ObAmountOfMoney;
  value: ObAmountOfMoney;
}
```

### Payments

| Method                       | Signature                                                                                                                                | Returns                      | Description                                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTransactionRequestTypes` | `getTransactionRequestTypes(bankId: string): Promise<ObTransactionRequestType[]>`                                                        | `ObTransactionRequestType[]` | List supported payment types for a bank. Calls `GET /obp/v4.0.0/banks/{bankId}/transaction-request-types`.                                                                                                                                          |
| `createPayment`              | `createPayment(bankId: string, accountId: string, viewId: string, type: string, body: CreatePaymentBody): Promise<ObTransactionRequest>` | `ObTransactionRequest`       | Create a payment (transaction request). `type` is the payment type (e.g. `"SANDBOX_TAN"`, `"SEPA"`, `"COUNTERPARTY"`). Calls `POST /obp/v5.1.0/banks/{bankId}/accounts/{accountId}/{viewId}/transaction-request-types/{type}/transaction-requests`. |

#### `CreatePaymentBody`

```typescript
interface CreatePaymentBody {
  to: Record<string, unknown>;
  value: ObAmountOfMoney;
  description: string;
}
```

| Property      | Type                      | Required | Description                                                                                                             |
| ------------- | ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `to`          | `Record<string, unknown>` | Yes      | Destination account. Shape depends on the payment `type`. For `SANDBOX_TAN`: `{ bank_id: string, account_id: string }`. |
| `value`       | `ObAmountOfMoney`         | Yes      | Payment amount: `{ currency: string, amount: string }`.                                                                 |
| `description` | `string`                  | Yes      | Payment description / reference text.                                                                                   |

**Example: create a SANDBOX_TAN payment**

```typescript
const payment = await client.createPayment(
  "maib.md.sandbox",
  "my-account-id",
  "owner",
  "SANDBOX_TAN",
  {
    to: { bank_id: "maib.md.sandbox", account_id: "recipient-account-id" },
    value: { currency: "MDL", amount: "100.00" },
    description: "Test payment",
  },
);
```

#### `ObTransactionRequestType`

```typescript
interface ObTransactionRequestType {
  value: string;
  charge: {
    summary: string;
    value: ObAmountOfMoney;
  };
}
```

#### `ObTransactionRequest`

```typescript
interface ObTransactionRequest {
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

interface ObChallenge {
  id: string;
  allowed_attempts: number;
  challenge_type: string;
}
```

### Consents

| Method                   | Signature                                                                                                         | Returns       | Description                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createConsent`          | `createConsent(bankId: string, scaMethod: string, body: CreateConsentBody): Promise<ObConsent>`                   | `ObConsent`   | Create a consent for account access. `scaMethod` is the SCA delivery method: `"SMS"`, `"EMAIL"`, or `"IMPLICIT"`. Calls `POST /obp/v4.0.0/banks/{bankId}/my/consents/{scaMethod}`.         |
| `answerConsentChallenge` | `answerConsentChallenge(bankId: string, consentId: string, body: AnswerConsentChallengeBody): Promise<ObConsent>` | `ObConsent`   | Answer a consent challenge (SCA verification). Calls `POST /obp/v4.0.0/banks/{bankId}/consents/{consentId}/challenge`.                                                                     |
| `listMyConsents`         | `listMyConsents(bankId?: string): Promise<ObConsent[]>`                                                           | `ObConsent[]` | List all consents for the current user. When `bankId` is provided, lists consents for that bank only. Calls `GET /obp/v5.1.0/banks/{bankId}/my/consents` or `GET /obp/v5.1.0/my/consents`. |
| `revokeConsent`          | `revokeConsent(bankId: string, consentId: string): Promise<void>`                                                 | `void`        | Revoke a consent. Calls `DELETE /obp/v5.1.0/banks/{bankId}/consents/{consentId}`. Returns `void` on success (HTTP 204).                                                                    |

#### `CreateConsentBody`

```typescript
interface CreateConsentBody {
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
```

| Property       | Type                                      | Required | Description                                                               |
| -------------- | ----------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `everything`   | `boolean`                                 | Yes      | If `true`, grants access to all accounts and views.                       |
| `views`        | `Array<{ bank_id, account_id, view_id }>` | Yes      | Specific views to grant access to. Pass `[]` when `everything` is `true`. |
| `entitlements` | `Array<{ bank_id, role_name }>`           | Yes      | Specific roles to grant. Pass `[]` if not needed.                         |

#### `AnswerConsentChallengeBody`

```typescript
interface AnswerConsentChallengeBody {
  answer: string;
}
```

#### `ObConsent`

```typescript
interface ObConsent {
  consent_id: string;
  jwt: string;
  status: string;
}
```

**Example: create and authorize a consent**

```typescript
// Step 1: Create consent
const consent = await client.createConsent("maib.md.sandbox", "SMS", {
  everything: true,
  views: [],
  entitlements: [],
});
// consent.status === "INITIATED"

// Step 2: Answer the SCA challenge
const authorized = await client.answerConsentChallenge(
  "maib.md.sandbox",
  consent.consent_id,
  { answer: "123456" },
);
// authorized.status === "AUTHORISED"
```

### Meta

| Method           | Signature                                   | Returns          | Description                                                                        |
| ---------------- | ------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `getApiInfo`     | `getApiInfo(): Promise<ObApiInfo>`          | `ObApiInfo`      | Get API info (version, host, connector, git commit). Calls `GET /obp/v5.1.0/root`. |
| `getApiVersions` | `getApiVersions(): Promise<ObApiVersion[]>` | `ObApiVersion[]` | Get all available API versions. Calls `GET /obp/v4.0.0/api/versions`.              |

#### `ObApiInfo`

```typescript
interface ObApiInfo {
  version: string;
  version_status: string;
  git_commit: string;
  connector: string;
  hostname: string;
  local_identity_provider: string;
  hosted_by: {
    organisation: string;
    email: string;
    phone: string;
    organisation_website: string;
  };
  hosted_at: {
    organisation: string;
    organisation_website: string;
  };
  energy_source: {
    organisation: string;
    organisation_website: string;
  };
}
```

#### `ObApiVersion`

```typescript
interface ObApiVersion {
  urlPrefix: string;
  apiStandard: string;
  apiShortVersion: string;
  API_VERSION: string;
}
```

## Enums

### `ConsentStatus`

```typescript
const ConsentStatus = {
  INITIATED: "INITIATED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
  AUTHORISED: "AUTHORISED",
} as const;

type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];
```

| Key          | Value          | Description                                     |
| ------------ | -------------- | ----------------------------------------------- |
| `INITIATED`  | `"INITIATED"`  | Consent created, awaiting SCA challenge answer. |
| `ACCEPTED`   | `"ACCEPTED"`   | Consent accepted by the bank.                   |
| `REJECTED`   | `"REJECTED"`   | Consent rejected.                               |
| `REVOKED`    | `"REVOKED"`    | Consent revoked by the user.                    |
| `EXPIRED`    | `"EXPIRED"`    | Consent expired.                                |
| `AUTHORISED` | `"AUTHORISED"` | Consent fully authorized after SCA.             |

### `TransactionRequestStatus`

```typescript
const TransactionRequestStatus = {
  INITIATED: "INITIATED",
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

type TransactionRequestStatus =
  (typeof TransactionRequestStatus)[keyof typeof TransactionRequestStatus];
```

| Key         | Value         | Description                     |
| ----------- | ------------- | ------------------------------- |
| `INITIATED` | `"INITIATED"` | Payment request created.        |
| `PENDING`   | `"PENDING"`   | Payment processing.             |
| `COMPLETED` | `"COMPLETED"` | Payment completed successfully. |
| `FAILED`    | `"FAILED"`    | Payment failed.                 |

## Error Handling

### `ObError`

Thrown when the OBP API returns a non-2xx HTTP response.

```typescript
class ObError extends Error {
  readonly statusCode: number;
  readonly obpCode?: string;
  readonly message: string;
  readonly name: "ObError";
}
```

| Property     | Type                  | Description                                                                                                                        |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | `number`              | HTTP status code (e.g. `400`, `401`, `404`).                                                                                       |
| `obpCode`    | `string \| undefined` | OBP error code parsed from the message prefix (e.g. `"OBP-20001"`). Present only when the message starts with an OBP code pattern. |
| `message`    | `string`              | Full error message from the API.                                                                                                   |

The `obpCode` is extracted automatically when the error message begins with a pattern like `OBP-20001:`. This allows you to match specific OBP error codes programmatically:

```typescript
try {
  await client.getAccount("maib.md.sandbox", "nonexistent", "owner");
} catch (error) {
  if (error instanceof ObError) {
    console.log(error.statusCode); // 404
    console.log(error.obpCode); // "OBP-30018" (or similar)
    console.log(error.message); // "OBP-30018: Bank Account not found ..."
  }
}
```

### `NetworkError`

Re-exported from `@maib/http`. Thrown when the HTTP request itself fails before receiving an API response (DNS failure, timeout, connection refused).

```typescript
class NetworkError extends Error {
  readonly cause: unknown;
  readonly name: "NetworkError";
}
```

```typescript
try {
  await client.listBanks();
} catch (error) {
  if (error instanceof NetworkError) {
    console.log(error.message); // "Network request to GET /obp/v4.0.0/banks failed"
    console.log(error.cause); // Original fetch error
  }
}
```

## Constants

| Constant                  | Value                          | Description                                                                                                           |
| ------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `OB_DEFAULT_HOST`         | `"https://ob-sandbox.maib.md"` | Default API host for the maib OBP sandbox.                                                                            |
| `OB_DEFAULT_TOKEN_TTL_MS` | `3600000`                      | Default token TTL in milliseconds (1 hour). OBP does not return an expiry, so the SDK uses this conservative default. |

## Exports

Everything below is exported from the `@maib/ob` package entry point:

**Classes**: `ObClient`, `ObError`

**Constants**: `OB_DEFAULT_HOST`, `ConsentStatus`, `TransactionRequestStatus`

**Types** (type-only exports): `AnswerConsentChallengeBody`, `CreateConsentBody`, `CreatePaymentBody`, `ListTransactionsParams`, `ObAccount`, `ObAccountDetails`, `ObAccountOwner`, `ObAccountView`, `ObAmountOfMoney`, `ObApiInfo`, `ObApiVersion`, `ObBank`, `ObBankRouting`, `ObChallenge`, `ObClientConfig`, `ObConsent`, `ObTransaction`, `ObTransactionAccount`, `ObTransactionDetails`, `ObTransactionRequest`, `ObTransactionRequestType`, `ObUser`

`NetworkError` is not re-exported from `@maib/ob`. Import it from `@maib/http` directly:

```typescript
import { NetworkError } from "@maib/http";
```
