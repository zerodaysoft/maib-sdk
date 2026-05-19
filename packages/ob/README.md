# @maib/ob

TypeScript SDK for the [maib Open Banking API](https://ob-sandbox.maib.md) (OBP) — accounts,
transactions, payments, and consents.

## Install

```bash
npm install @maib/ob
```

## Usage

```typescript
import { ObClient } from "@maib/ob";

const client = new ObClient({
  username: process.env.OBP_USERNAME,
  password: process.env.OBP_PASSWORD,
  consumerKey: process.env.OBP_CONSUMER_KEY,
});
```

Authentication uses [DirectLogin](https://github.com/OpenBankProject/OBP-API/wiki/Direct-Login) —
credentials are exchanged for a token that is automatically cached and refreshed.

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
const transactions = await client.listTransactions("maib.md", "account-id", "owner", {
  limit: 50,
  sort_direction: "DESC",
});

const txn = await client.getTransaction("maib.md", "account-id", "owner", "txn-id");
```

### Payments

```typescript
// Check which payment types the bank supports
const types = await client.getTransactionRequestTypes("maib.md");

// Create a payment (SANDBOX_TAN example)
const payment = await client.createPayment("maib.md", "account-id", "owner", "SANDBOX_TAN", {
  to: { bank_id: "maib.md", account_id: "recipient-id" },
  value: { currency: "MDL", amount: "100.00" },
  description: "Test payment",
});
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

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods,
  types, params)
- [`api-reference.md`](./docs/api-reference.md) — Upstream REST API reference from
  [ob-sandbox.maib.md](https://ob-sandbox.maib.md)
- [`schemas.md`](./docs/schemas.md) — How to consume the shipped JSON Schema files at runtime with
  Zod, Valibot, ArkType, or any Standard-Schema-compatible validator

## Runtime validation (optional)

`@maib/ob` ships JSON Schema files for every wire-format type plus a tiny validator-agnostic helper.
Use Zod, Valibot, ArkType, or any other Standard-Schema-compatible validator – once converted, the
parser plugs into TanStack Form, tRPC, hono validators, the AI SDK, and the rest of the Standard
Schema ecosystem. Zod is the runnable example.

**Typed wrapper (preferred)** – import the generated wrapper at `@maib/ob/schemas/<TypeName>` (no
`.json` suffix); `TData` is inferred from the SDK interface, no generic needed:

```ts
import { z } from "zod";
import { buildSchema } from "@maib/ob/schemas";
import ObAccountDef from "@maib/ob/schemas/ObAccount";

export const ObAccountSchema = buildSchema(z.fromJSONSchema, ObAccountDef);
// → ParsingValidator<ObAccount> (inferred)

ObAccountSchema.parse(await client.getAccount(bankId, accountId));
```

**Raw JSON (explicit generic)** – the original pattern still works for `with { type: "json" }`
imports:

```ts
import { z } from "zod";
import type { ObAccount } from "@maib/ob";
import { buildSchema } from "@maib/ob/schemas";
import ObAccountDef from "@maib/ob/schemas/ObAccount.json" with { type: "json" };

export const ObAccountSchema = buildSchema<ObAccount>(z.fromJSONSchema, ObAccountDef);
```

See [`docs/schemas.md`](./docs/schemas.md) for the full guide and bulk import pattern.

## AI / agent coding

- Canonical references for code generation: [`./docs/sdk-reference.md`](./docs/sdk-reference.md)
  (TypeScript surface), [`./docs/schemas.md`](./docs/schemas.md) (runtime validation),
  [`./docs/api-reference.md`](./docs/api-reference.md) (upstream REST).
- **`@maib/ob` is standalone** – it does not depend on `@maib/core`. It has its own `ObClient`,
  `ObError`, enums (`ConsentStatus`, `TransactionRequestStatus`), and `Ob*` type surface. Do not
  pull symbols from `@maib/core` into ob code or examples.
- Auth: `ObClient` uses OBP DirectLogin under the hood (`username` + `password` + `consumerKey`
  exchanged for a JWT, cached and refreshed automatically). The PSD2/Berlin Group consent flow on
  top is `createConsent` → `answerConsentChallenge` (SCA) → use the consent JWT; revoke via
  `revokeConsent`, inspect via `listMyConsents`.
- Prefer the typed-wrapper runtime-validation pattern: `import Def from "@maib/ob/schemas/<Name>"`
  - `buildSchema(z.fromJSONSchema, Def)`. No explicit generic; `ParsingValidator<T>` is inferred.
- Raw-JSON pattern still works for `with { type: "json" }` imports and needs the explicit generic:
  `buildSchema<ObAccount>(z.fromJSONSchema, ObAccountDef)`.
- JSON Schema artifacts: per-type files at `@maib/ob/schemas/<TypeName>.json` and the package bundle
  at `@maib/ob/schemas/bundle.json`. The bundle only contains `maib.ob.*` ids – no core, checkout,
  ecommerce, mia, or rtp schemas leak in.
- Prefer the documented public types (`ObAccount`, `ObTransaction`, `ObConsent`, `ObConsentInfo`,
  `CreateConsentBody`, `CreatePaymentBody`, `ObAmountOfMoney`, …) over inferring shapes from
  responses. The full list lives in [`./docs/sdk-reference.md`](./docs/sdk-reference.md).
- `NetworkError` is not re-exported – import from `@maib/http` directly. `ObError` carries
  `statusCode` and a parsed `obpCode` (e.g. `"OBP-20001"`) for matching specific upstream errors.

## License

[MIT](../../LICENSE)
