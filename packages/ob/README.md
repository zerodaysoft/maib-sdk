# @maib/ob

TypeScript SDK for the [maib Open Banking API](https://ob-sandbox.maib.md) (OBP) — accounts, transactions, payments, and consents.

## Install

```bash
npm install @maib/ob
```

## Usage

```typescript
import { ObClient } from "@maib/ob";

const client = new ObClient({
  username: process.env.OBP_USERNAME!,
  password: process.env.OBP_PASSWORD!,
  consumerKey: process.env.OBP_CONSUMER_KEY!,
});
```

Authentication uses [DirectLogin](https://github.com/OpenBankProject/OBP-API/wiki/Direct-Login) — credentials are exchanged for a token that is automatically cached and refreshed.

### Banks

```typescript
const banks = await client.listBanks();
const bank = await client.getBank("maib.md");
```

### Accounts

```typescript
const accounts = await client.listAccounts("maib.md");

const account = await client.getAccount("maib.md", "account-id");

const { funds_available } = await client.checkFunds(
  "maib.md",
  "account-id",
  "owner",
  "100.00",
  "MDL",
);
```

### Transactions

```typescript
const transactions = await client.listTransactions(
  "maib.md",
  "account-id",
  "owner",
  {
    limit: 50,
    sort_direction: "DESC",
  },
);

const txn = await client.getTransaction(
  "maib.md",
  "account-id",
  "owner",
  "txn-id",
);
```

### Payments

```typescript
// Check which payment types the bank supports
const types = await client.getTransactionRequestTypes("maib.md");

// Create a payment (SANDBOX_TAN example)
const payment = await client.createPayment(
  "maib.md",
  "account-id",
  "owner",
  "SANDBOX_TAN",
  {
    to: { bank_id: "maib.md", account_id: "recipient-id" },
    value: { currency: "MDL", amount: "100.00" },
    description: "Test payment",
  },
);
```

### Consents

```typescript
// Create a consent (IMPLICIT SCA for sandbox)
const consent = await client.createConsent("maib.md", "IMPLICIT", {
  everything: true,
  views: [],
  entitlements: [],
});

// Answer a consent challenge
await client.answerConsentChallenge("maib.md", consent.consent_id, {
  answer: "123456",
});

// List and revoke
const consents = await client.listMyConsents("maib.md");
await client.revokeConsent("maib.md", consent.consent_id);
```

### Meta

```typescript
const info = await client.getApiInfo();
const versions = await client.getApiVersions();
```

## Error handling

```typescript
import { ObError } from "@maib/ob";
import { NetworkError } from "@maib/http";

try {
  await client.listAccounts("maib.md");
} catch (error) {
  if (error instanceof ObError) {
    console.log(error.statusCode); // HTTP status code
    console.log(error.obpCode); // e.g. "OBP-20001"
    console.log(error.message); // "OBP-20001: User not logged in."
  }
  if (error instanceof NetworkError) {
    console.log(error.cause);
  }
}
```

## Enums

```typescript
import { ConsentStatus, TransactionRequestStatus } from "@maib/ob";

ConsentStatus.INITIATED; // "INITIATED"
ConsentStatus.ACCEPTED; // "ACCEPTED"
ConsentStatus.REVOKED; // "REVOKED"
ConsentStatus.AUTHORISED; // "AUTHORISED"

TransactionRequestStatus.COMPLETED; // "COMPLETED"
TransactionRequestStatus.PENDING; // "PENDING"
```

## Exports

| Export                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `ObClient`                 | Open Banking API client (DirectLogin auth) |
| `ObError`                  | Error class for OBP API error responses    |
| `ConsentStatus`            | Consent lifecycle statuses                 |
| `TransactionRequestStatus` | Payment request statuses                   |
| `OB_DEFAULT_HOST`          | `https://ob-sandbox.maib.md`               |

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods, types, params)
- [`api-reference.md`](./docs/api-reference.md) — Upstream REST API reference from [ob-sandbox.maib.md](https://ob-sandbox.maib.md)

## License

[MIT](../../LICENSE)
