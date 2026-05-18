# @maib/mia

TypeScript SDK for the [maib MIA QR payment API](https://docs.maibmerchants.md/mia-qr-api/en) —
static, dynamic, and hybrid QR code payments.

## Install

```bash
npm install @maib/mia
```

Or use the umbrella package [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants):

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { MiaClient, Currency, QrType, AmountType } from "@maib/mia";

const client = new MiaClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!, // for callback verification
});
```

### Create a QR code

```typescript
// Dynamic QR with fixed amount
const qr = await client.createQr({
  type: QrType.DYNAMIC,
  amountType: AmountType.FIXED,
  amount: 100,
  currency: Currency.MDL,
  description: "Order #789",
  callbackUrl: "https://example.com/callback",
  redirectUrl: "https://example.com/redirect",
});

// Static QR with free amount
const staticQr = await client.createQr({
  type: QrType.STATIC,
  amountType: AmountType.FREE,
  currency: Currency.MDL,
  description: "Donations",
});

// Hybrid QR
const hybrid = await client.createHybridQr({
  amountType: AmountType.FIXED,
  currency: Currency.MDL,
  extension: {
    amount: 100,
    description: "First payment",
    expiresAt: "2026-12-31T23:59:59Z",
  },
});
```

### QR extensions (hybrid)

```typescript
// Create an extension on a hybrid QR
const ext = await client.createExtension(qrId, {
  amount: 200,
  description: "Second payment",
  expiresAt: "2026-12-31T23:59:59Z",
});

// List extensions
const { items } = await client.listExtensions({
  count: 20,
  offset: 0,
  qrId: qrId,
});

// Cancel an extension
await client.cancelExtension(qrId, { reason: "Changed" });
```

### Get QR details

```typescript
const details = await client.getQr(qrId);
```

### List QR codes

```typescript
const { items, totalCount } = await client.listQrs({
  count: 20,
  offset: 0,
  type: QrType.DYNAMIC,
  status: QrStatus.ACTIVE,
});
```

### Cancel a QR code

```typescript
await client.cancelQr(qrId, { reason: "No longer needed" });
```

### Payments

```typescript
// Get payment details
const payment = await client.getPayment(payId);

// List payments
const { items } = await client.listPayments({
  count: 20,
  offset: 0,
  qrId: qrId,
});

// Refund a payment
const refund = await client.refund(payId, {
  reason: "Customer request",
  amount: 50,
});
```

### Sandbox testing

```typescript
import { MiaClient, Environment } from "@maib/mia";

const client = new MiaClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  environment: Environment.SANDBOX,
});

const result = await client.testPay({
  qrId: qrId,
  amount: 100,
  currency: Currency.MDL,
  iban: "MD00AG000000000000000000",
  payerName: "Test Payer",
});
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(callbackPayload);
// callbackPayload = { result: { ... }, signature: "..." }
```

## Enums

```typescript
import { QrType, AmountType, QrStatus, MiaPaymentStatus } from "@maib/mia";

QrType.STATIC; // "Static"
QrType.DYNAMIC; // "Dynamic"
QrType.HYBRID; // "Hybrid"

AmountType.FIXED; // "Fixed"
AmountType.CONTROLLED; // "Controlled"
AmountType.FREE; // "Free"

QrStatus.ACTIVE; // "Active"
QrStatus.PAID; // "Paid"
QrStatus.EXPIRED; // "Expired"
QrStatus.CANCELLED; // "Cancelled"

MiaPaymentStatus.EXECUTED; // "Executed"
MiaPaymentStatus.REFUNDED; // "Refunded"
```

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods,
  types, params)
- [`api-reference.md`](./docs/api-reference.md) — Upstream REST API reference from
  [docs.maibmerchants.md](https://docs.maibmerchants.md/mia-qr-api/en)
- [`schemas.md`](./docs/schemas.md) — How to consume the shipped JSON Schema files at runtime with
  Zod, Valibot, ArkType, or any Standard-Schema-compatible validator

## Runtime validation (optional)

`@maib/mia` ships JSON Schema files for every wire-format type plus a tiny validator-agnostic
helper. Use Zod, Valibot, ArkType, or any other Standard-Schema-compatible validator – once
converted, the parser plugs into TanStack Form, tRPC, hono validators, the AI SDK, and the rest of
the Standard Schema ecosystem. Zod is the runnable example:

```ts
import { z } from "zod";
import type { CreateQrRequest } from "@maib/mia";
import { buildSchema } from "@maib/mia/schemas";
import CreateQrRequestDef from "@maib/mia/schemas/CreateQrRequest.json" with { type: "json" };

export const CreateQrRequestSchema = buildSchema<CreateQrRequest>(
  z.fromJSONSchema,
  CreateQrRequestDef,
);

CreateQrRequestSchema.parse({
  type: "Static",
  amountType: "Free",
  currency: "MDL",
  description: "Tip jar",
});
```

See [`docs/schemas.md`](./docs/schemas.md) for the full guide and bulk import pattern.

## License

[MIT](../../LICENSE)
