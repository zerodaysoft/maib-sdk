# @maib/ecommerce

TypeScript SDK for the [maib e-Commerce payment gateway](https://docs.maibmerchants.md/e-commerce) —
direct payments, two-step (hold/complete), recurring, and one-click card payments.

## Install

```bash
npm install @maib/ecommerce
```

Or use the umbrella package [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants):

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { EcommerceClient, Currency, Language } from "@maib/ecommerce";

const client = new EcommerceClient({
  projectId: process.env.MAIB_PROJECT_ID!,
  projectSecret: process.env.MAIB_PROJECT_SECRET!,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!, // for callback verification
});
```

> **Note:** The e-commerce API uses `projectId`/`projectSecret` instead of
> `clientId`/`clientSecret`.

### Direct payment

```typescript
const result = await client.pay({
  amount: 100,
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
  description: "Order #123",
  callbackUrl: "https://example.com/callback",
  okUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
});

// Redirect the user to result.payUrl
```

### Two-step payment (hold & complete)

```typescript
// Step 1: Hold funds
const hold = await client.hold({
  amount: 200,
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});

// Step 2: Complete (capture) — optionally with a lower amount
const completed = await client.complete({
  payId: hold.payId,
  confirmAmount: 150,
});
```

### Refund

```typescript
const refund = await client.refund({
  payId: "pay-123",
  refundAmount: 50,
});
```

### Get payment info

```typescript
const info = await client.getPayInfo("pay-123");
```

### Recurring payments

```typescript
// Step 1: Save card for recurring
const savecard = await client.savecardRecurring({
  billerExpiry: "2027-12-31",
  email: "customer@example.com",
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});
// Redirect user to savecard.payUrl to enter card details

// Step 2: Execute recurring charge (no user interaction)
const recurring = await client.executeRecurring({
  billerId: "biller-123",
  amount: 50,
  currency: Currency.MDL,
});
```

### One-click payments

```typescript
// Step 1: Save card for one-click
const savecard = await client.savecardOneclick({
  billerExpiry: "2027-12-31",
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});

// Step 2: Execute one-click payment (user confirms)
const oneclick = await client.executeOneclick({
  billerId: "biller-123",
  amount: 75,
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});

// Delete saved card
await client.deleteCard("biller-123");
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(callbackPayload);
// callbackPayload = { result: { ... }, signature: "..." }
```

## Enums

```typescript
import { Currency, TransactionStatus, ThreeDsStatus } from "@maib/ecommerce";

Currency.MDL; // "MDL"
Currency.EUR; // "EUR"
Currency.USD; // "USD"

TransactionStatus.OK; // "OK"
TransactionStatus.FAILED; // "FAILED"
TransactionStatus.PENDING; // "PENDING"

ThreeDsStatus.AUTHENTICATED; // "AUTHENTICATED"
ThreeDsStatus.NOT_AUTHENTICATED; // "NOT_AUTHENTICATED"
```

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods,
  types, params)
- [`schemas.md`](./docs/schemas.md) — How to consume the shipped JSON Schema files at runtime with
  Zod, Valibot, ArkType, or any Standard-Schema-compatible validator

> **Note:** The legacy E-Commerce API docs are available at
> [docs.maibmerchants.md/e-commerce](https://docs.maibmerchants.md/e-commerce).

## Runtime validation (optional)

`@maib/ecommerce` ships JSON Schema files for every wire-format type plus a tiny validator-agnostic
helper. Use Zod, Valibot, ArkType, or any other Standard-Schema-compatible validator – once
converted, the parser plugs into TanStack Form, tRPC, hono validators, the AI SDK, and the rest of
the Standard Schema ecosystem. Zod is the runnable example.

**Typed wrapper (preferred)** – import from `@maib/ecommerce/schemas/<TypeName>` (no `.json`
suffix). The wrapper carries the SDK type through a phantom marker, so `buildSchema` infers
`ParsingValidator<T>` without an explicit generic:

```ts
import { z } from "zod";
import { buildSchema } from "@maib/ecommerce/schemas";
import RefundRequestDef from "@maib/ecommerce/schemas/RefundRequest";

export const RefundRequestSchema = buildSchema(z.fromJSONSchema, RefundRequestDef);
// → ParsingValidator<RefundRequest>, inferred

RefundRequestSchema.parse({ payId: "tx-1", refundAmount: 5.5 });
```

**Raw JSON (still supported)** – the original `with { type: "json" }` import requires an explicit
type argument:

```ts
import { z } from "zod";
import type { RefundRequest } from "@maib/ecommerce";
import { buildSchema } from "@maib/ecommerce/schemas";
import RefundRequestDef from "@maib/ecommerce/schemas/RefundRequest.json" with { type: "json" };

export const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
```

See [`docs/schemas.md`](./docs/schemas.md) for the full guide and bulk import pattern.

## AI / agent coding

Notes for LLM coding agents wiring `@maib/ecommerce` into an application:

- Canonical references ship inside the package: [`./docs/sdk-reference.md`](./docs/sdk-reference.md)
  (full TypeScript API surface) and [`./docs/schemas.md`](./docs/schemas.md) (runtime-validation
  subpaths). Read those before guessing shapes.
- Prefer the typed-wrapper runtime-validation pattern shown above
  (`import Def from "@maib/ecommerce/schemas/<TypeName>"`, no generic on `buildSchema`). Fall back
  to the raw `.json` import only when you need an asserted JSON import for tooling reasons.
- JSON Schema artifacts are at `@maib/ecommerce/schemas/bundle.json` (full bundle, includes merged
  `@maib/core` defs) and `@maib/ecommerce/schemas/<TypeName>.json` (one self-contained file per
  type, `$defs` embedded). All schemas are `draft-2020-12`.
- `EcommerceClient` methods – `pay`, `hold`, `complete`, `refund`, `getPayInfo`, `executeRecurring`,
  `executeOneclick`, `savecardRecurring`, `savecardOneclick`, `deleteCard`, `verifyCallback`,
  `computeCallbackSignature` – take and return the shapes documented in the schemas and exported TS
  types. Prefer importing those types (`PayRequest`, `RefundRequest`, `CallbackPayload`, etc.) over
  inferring shapes from examples.
- Enums (`Currency`, `Language`, `TransactionStatus`, `ThreeDsStatus`) are `as const` objects, not
  TypeScript `enum`s. Use the constant or the string literal interchangeably.
- The SDK does not validate responses at runtime by default – wire up `buildSchema` on the result
  types (`PayInfoResult`, `RefundResult`, etc.) yourself if you need that guard.
- Callback verification uses SHA-256 sorted-values on the parsed `CallbackPayload` object, not the
  raw body. This differs from `@maib/checkout`, which uses HMAC-SHA256 on the raw body string.
- No sandbox environment exists for v1 e-Commerce. Override `baseUrl` for tests; do not pass
  `environment`.

## License

[MIT](../../LICENSE)
