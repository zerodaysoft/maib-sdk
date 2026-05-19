# @maib/rtp

TypeScript SDK for the [maib Request to Pay (RTP) API](https://docs.maibmerchants.md/request-to-pay)
— bank-initiated payment requests.

## Install

```bash
npm install @maib/rtp
```

Or use the umbrella package [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants):

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { RtpClient, Currency } from "@maib/rtp";

const client = new RtpClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY, // for callback verification
});
```

### Create a payment request

```typescript
const rtp = await client.create({
  alias: "+37360123456",
  amount: 100,
  currency: Currency.MDL,
  description: "Invoice #456",
  expiresAt: "2026-12-31T23:59:59Z",
  callbackUrl: "https://example.com/callback",
  redirectUrl: "https://example.com/redirect",
});

console.log(rtp.rtpId);
```

### Get status

```typescript
const status = await client.getStatus(rtp.rtpId);
```

### List payment requests

```typescript
const { items, totalCount } = await client.list({
  count: 20,
  offset: 0,
  status: RtpStatus.ACTIVE,
});
```

### Cancel a payment request

```typescript
await client.cancel(rtp.rtpId, { reason: "No longer needed" });
```

### Refund a completed payment

```typescript
const refund = await client.refund(payId, { reason: "Customer request" });
```

### Sandbox testing

```typescript
import { RtpClient, Environment } from "@maib/rtp";

const client = new RtpClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  environment: Environment.SANDBOX,
});

// Simulate customer accepting the payment
const accepted = await client.testAccept(rtp.rtpId, {
  amount: 100,
  currency: Currency.MDL,
});

// Simulate customer rejecting the payment
const rejected = await client.testReject(rtp.rtpId);
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(callbackPayload);
// callbackPayload = { result: { ... }, signature: "..." }
```

## Enums

```typescript
import { RtpStatus } from "@maib/rtp";

RtpStatus.CREATED; // "Created"
RtpStatus.ACTIVE; // "Active"
RtpStatus.ACCEPTED; // "Accepted"
RtpStatus.REJECTED; // "Rejected"
RtpStatus.CANCELLED; // "Cancelled"
RtpStatus.EXPIRED; // "Expired"
```

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods,
  types, params)
- [`api-reference.md`](./docs/api-reference.md) — Upstream REST API reference from
  [docs.maibmerchants.md](https://docs.maibmerchants.md/request-to-pay)
- [`schemas.md`](./docs/schemas.md) — How to consume the shipped JSON Schema files at runtime with
  Zod, Valibot, ArkType, or any Standard-Schema-compatible validator

## Runtime validation (optional)

`@maib/rtp` ships JSON Schema files for every wire-format type plus a tiny validator-agnostic
helper. Use Zod, Valibot, ArkType, or any other Standard-Schema-compatible validator – once
converted, the parser plugs into TanStack Form, tRPC, hono validators, the AI SDK, and the rest of
the Standard Schema ecosystem. Zod is the runnable example.

### Typed wrapper (preferred)

Import from `@maib/rtp/schemas/<TypeName>` (no `.json` suffix) – the wrapper carries the SDK type,
so `buildSchema` infers `ParsingValidator<T>` without an explicit generic.

```ts
import { z } from "zod";
import { buildSchema } from "@maib/rtp/schemas";
import CreateRtpRequestDef from "@maib/rtp/schemas/CreateRtpRequest";

export const CreateRtpRequestSchema = buildSchema(z.fromJSONSchema, CreateRtpRequestDef);
// → ParsingValidator<CreateRtpRequest> (inferred)

CreateRtpRequestSchema.parse({
  alias: "37360000000",
  amount: 25,
  expiresAt: "2029-01-01T00:00:00Z",
  currency: "MDL",
  description: "Loan repayment",
});
```

### Raw JSON (explicit generic)

Backwards-compatible pattern for the `with { type: "json" }` import style:

```ts
import { z } from "zod";
import type { RtpCallbackPayload } from "@maib/rtp";
import { buildSchema } from "@maib/rtp/schemas";
import RtpCallbackPayloadDef from "@maib/rtp/schemas/RtpCallbackPayload.json" with { type: "json" };

export const RtpCallbackPayloadSchema = buildSchema<RtpCallbackPayload>(
  z.fromJSONSchema,
  RtpCallbackPayloadDef,
);
```

See [`docs/schemas.md`](./docs/schemas.md) for the full guide and bulk import pattern.

## AI / agent coding

- Canonical references: [`./docs/sdk-reference.md`](./docs/sdk-reference.md) (TypeScript surface)
  and [`./docs/schemas.md`](./docs/schemas.md) (runtime validation). Read these before generating
  code against this package.
- Prefer the typed-wrapper pattern – `import Def from "@maib/rtp/schemas/<TypeName>"` plus
  `buildSchema(z.fromJSONSchema, Def)`. No explicit generic, no separate `import type`.
- The convert callback signature is `(schema: _JSONSchema) => unknown`, matching `z.fromJSONSchema`.
- JSON Schema artifacts are shipped at `@maib/rtp/schemas/bundle.json` and
  `@maib/rtp/schemas/<TypeName>.json` (`draft-2020-12`). `@maib/rtp/schemas` re-exports
  `JSONSchema`, `_JSONSchema`, and the back-compat alias `JSONSchemaDef`.
- Client methods live on `RtpClient` (see `src/index.ts`): `create`, `getStatus`, `list`, `cancel`,
  `refund`, `testAccept`, `testReject`, `verifyCallback`, `computeCallbackSignature`. RTP stands for
  "Request to Pay".
- `@maib/rtp` depends on `@maib/core` for `Currency`, `Environment`, `MaibError`,
  `MaibNetworkError`, and signature verification helpers. Callback signatures here use SHA-256 over
  sorted leaf values joined with `:` plus `signatureKey` – not HMAC (that's `@maib/checkout`).
- Prefer the documented public types (`CreateRtpRequest`, `RtpCallbackPayload`, `RtpStatusResult`,
  etc.) over inferring shapes from runtime payloads.
- For sandbox flows use `testAccept` / `testReject`; the returned `payId` (not `rtpId`) is what
  `refund` consumes.

## License

[MIT](../../LICENSE)
