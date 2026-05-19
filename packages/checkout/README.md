# @maib/checkout

TypeScript SDK for the [maib Checkout API](https://docs.maibmerchants.md/checkout) — hosted checkout
sessions, payments, and refunds.

## Install

```bash
npm install @maib/checkout
```

Or use the umbrella package [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants):

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { CheckoutClient, Currency } from "@maib/checkout";

const client = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY, // for callback verification
});
```

### Create a checkout session

```typescript
const session = await client.createSession({
  amount: 100,
  currency: Currency.MDL,
  callbackUrl: "https://example.com/callback",
  successUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
  orderInfo: {
    id: "order-123",
    description: "Test order",
  },
  payerInfo: {
    name: "John Doe",
    email: "john@example.com",
  },
});

// Redirect the user to session.checkoutUrl
```

### Get session details

```typescript
const details = await client.getSession(session.checkoutId);
```

### List sessions

```typescript
const { items, totalCount } = await client.listSessions({
  count: 20,
  offset: 0,
  status: CheckoutStatus.COMPLETED,
});
```

### Cancel a session

```typescript
await client.cancelSession(session.checkoutId);
```

### Payments

```typescript
// Get a single payment
const payment = await client.getPayment(paymentId);

// List payments with filters
const { items } = await client.listPayments({
  count: 20,
  offset: 0,
  currency: Currency.MDL,
});
```

### Refund a payment

```typescript
const refund = await client.refund(paymentId, {
  amount: 50,
  reason: "Customer request",
});

// Get refund details
const refundDetails = await client.getRefund(refund.refundId);
```

### Sandbox testing

```typescript
import { CheckoutClient, Environment } from "@maib/checkout";

const client = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  environment: Environment.SANDBOX,
});
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(rawBody, xSignatureHeader, xTimestampHeader);
```

## Enums

```typescript
import { CheckoutStatus, PaymentStatus, RefundStatus } from "@maib/checkout";

CheckoutStatus.COMPLETED; // "Completed"
CheckoutStatus.EXPIRED; // "Expired"
CheckoutStatus.CANCELLED; // "Cancelled"

PaymentStatus.EXECUTED; // "Executed"
PaymentStatus.REFUNDED; // "Refunded"

RefundStatus.ACCEPTED; // "Accepted"
RefundStatus.REJECTED; // "Rejected"
```

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods,
  types, params)
- [`api-reference.md`](./docs/api-reference.md) — Upstream REST API reference from
  [docs.maibmerchants.md](https://docs.maibmerchants.md/checkout)
- [`schemas.md`](./docs/schemas.md) — How to consume the shipped JSON Schema files at runtime with
  Zod, Valibot, ArkType, or any Standard-Schema-compatible validator

## Runtime validation (optional)

`@maib/checkout` ships JSON Schema files for every wire-format type plus a tiny validator-agnostic
helper. Use Zod, Valibot, ArkType, or any other Standard-Schema-compatible validator – once
converted, the parser plugs into TanStack Form, tRPC, hono validators, the AI SDK, and the rest of
the Standard Schema ecosystem. Zod is the runnable example.

**Preferred – typed wrapper (no generic argument needed):**

```ts
import { z } from "zod";
import { buildSchema } from "@maib/checkout/schemas";
import CancelSessionResultDef from "@maib/checkout/schemas/CancelSessionResult";

export const CancelSessionResultSchema = buildSchema(z.fromJSONSchema, CancelSessionResultDef);
// → ParsingValidator<CancelSessionResult>, inferred from the typed-wrapper phantom

CancelSessionResultSchema.parse({ checkoutId: "c1", status: "Cancelled" });
```

**Legacy – raw JSON import with explicit generic (still supported):**

```ts
import { z } from "zod";
import type { CancelSessionResult } from "@maib/checkout";
import { buildSchema } from "@maib/checkout/schemas";
import CancelSessionResultDef from "@maib/checkout/schemas/CancelSessionResult.json" with { type: "json" };

export const CancelSessionResultSchema = buildSchema<CancelSessionResult>(
  z.fromJSONSchema,
  CancelSessionResultDef,
);
```

See [`docs/schemas.md`](./docs/schemas.md) for the full guide and bulk import pattern.

## AI / agent coding

Notes for LLM coding agents working against this package.

- Canonical references shipped in `dist/docs/`: [`./docs/sdk-reference.md`](./docs/sdk-reference.md)
  (full TypeScript API surface) and [`./docs/schemas.md`](./docs/schemas.md) (runtime validation).
  Read these before guessing.
- Prefer the documented public types exported from `@maib/checkout` (e.g. `CreateSessionRequest`,
  `RefundRequest`, `CancelSessionResult`, `CheckoutCallbackPayload`) over inferring shapes from
  example payloads.
- For runtime validation, use the typed-wrapper pattern: import from
  `@maib/checkout/schemas/<TypeName>` (no `.json` suffix) and call `buildSchema(convert, def)` with
  no generic argument – the result is `ParsingValidator<T>` with `T` inferred.
- JSON Schema artifacts: per-type files at `@maib/checkout/schemas/<TypeName>.json` (each is
  self-contained with embedded `$defs`) and a full package bundle at
  `@maib/checkout/schemas/bundle.json` (use `buildSchemasBundle` for bulk import).
- The `convert` callback signature is `(schema: _JSONSchema) => unknown` – matches
  `z.fromJSONSchema` exactly. `JSONSchema`, `_JSONSchema`, and the backwards-compat alias
  `JSONSchemaDef` are re-exported from `@maib/checkout/schemas`.
- Callback signature verification uses **HMAC-SHA256** (this differs from `@maib/ecommerce`, which
  uses SHA-256 over sorted values). Use `client.verifyCallback(rawBody, xSignature, xTimestamp)`;
  underlying primitive is `verifyHmacSignature` from `@maib/core`. Always pass the **raw** request
  body string – do not parse and re-serialize.
- OAuth2 token management is automatic. Never set the `Authorization` header yourself; just call the
  client methods.
- Enums are `as const` objects, not TypeScript `enum`s. Both the constant
  (`CheckoutStatus.COMPLETED`) and the string literal (`"Completed"`) are accepted.
- Errors: `MaibError` (API returned `ok: false`) and `MaibNetworkError` (transport failure). Both
  imported from `@maib/core`.

## License

[MIT](../../LICENSE)
