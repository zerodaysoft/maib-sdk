# @maib/core

Shared infrastructure for [maib](https://www.maib.md) merchant API SDKs — HTTP client,
authentication, error handling, and signature verification.

> You probably want [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants) or one of the
> API-specific packages instead. This package is used internally by the merchant SDKs.

## Install

```bash
npm install @maib/core
```

## Signature verification

Verify callback signatures from maib APIs:

```typescript
import { verifySignature, verifyHmacSignature } from "@maib/core";

// E-Commerce, MIA QR, RTP — SHA-256 sorted-values signature
const isValid = verifySignature(callbackResult, signature, signatureKey);

// Checkout — HMAC-SHA256 signature
const isValid = verifyHmacSignature(rawBody, xSignature, xTimestamp, signatureKey);
```

## Error handling

```typescript
import { MaibError, MaibNetworkError } from "@maib/core";

try {
  await client.someMethod();
} catch (error) {
  if (error instanceof MaibError) {
    // API returned an error response
    console.log(error.statusCode); // HTTP status code
    console.log(error.errors); // Array of { errorCode, errorMessage }
  }
  if (error instanceof MaibNetworkError) {
    // Network/fetch failure
    console.log(error.cause);
  }
}
```

## Exports

| Export                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `BaseClient`           | Abstract HTTP client with token management |
| `MaibError`            | Error class for API error responses        |
| `MaibNetworkError`     | Error class for network failures           |
| `computeSignature`     | Compute SHA-256 callback signature         |
| `verifySignature`      | Verify SHA-256 callback signature          |
| `computeHmacSignature` | Compute HMAC-SHA256 callback signature     |
| `verifyHmacSignature`  | Verify HMAC-SHA256 callback signature      |
| `Currency`             | Enum: `MDL`, `EUR`, `USD`                  |
| `Language`             | Enum: `RO`, `EN`, `RU`                     |
| `BaseClientConfig`     | Base config type (`baseUrl?`, `fetch?`)    |
| `DEFAULT_API_HOST`     | `https://api.maibmerchants.md`             |
| `SDK_VERSION`          | Current SDK version                        |

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all classes,
  types, signature functions)
- [`schemas.md`](./docs/schemas.md) — How to consume the shipped JSON Schema files for runtime
  validation with Zod, Valibot, ArkType, or any Standard-Schema-compatible validator (plus Ajv)

## Runtime validation (optional)

Every `@maib/*` package ships JSON Schema files plus a tiny validator-agnostic helper. Import a
single type or the whole bundle, hand it to your validator's conversion function
(`z.fromJSONSchema`, `ajv.compile`, …), and parse. The artifact is plain JSON Schema, so it works
with Zod, Valibot, ArkType, Effect Schema, or any other validator – and once converted via a
Standard-Schema-conformant validator the parser plugs straight into TanStack Form, tRPC, hono
validators, the AI SDK, and the wider Standard Schema ecosystem. The snippet below uses Zod
(lightest setup, what the SDK is tested against).

**Preferred: typed wrapper (no generic).** Import the wrapper from `@maib/<pkg>/schemas/<ShortName>`
(no `.json` suffix); `buildSchema` infers the SDK type from the wrapper, so `.parse()` is already
typed against the matching interface:

```ts
import { z } from "zod";
import { buildSchema, buildSchemasBundle } from "@maib/core/schemas";
import PaginationParamsDef from "@maib/core/schemas/PaginationParams";
import SchemasBundleDef from "@maib/core/schemas/bundle.json" with { type: "json" };

export const PaginationParamsSchema = buildSchema(z.fromJSONSchema, PaginationParamsDef);
// → ParsingValidator<PaginationParams> (inferred)
export const SchemasBundle = buildSchemasBundle(z.fromJSONSchema, SchemasBundleDef);

PaginationParamsSchema.parse({ count: 10, offset: 0 });
SchemasBundle.PaginationParams.parse({ count: 10, offset: 0 });
```

**Alternative: raw JSON import (explicit generic).** For build setups that can't yet do
`with { type: "json" }` import attributes, or when you prefer the JSON-only path:

```ts
import { z } from "zod";
import type { PaginationParams } from "@maib/core";
import { buildSchema } from "@maib/core/schemas";
import PaginationParamsDef from "@maib/core/schemas/PaginationParams.json" with { type: "json" };

export const PaginationParamsSchema = buildSchema<PaginationParams>(
  z.fromJSONSchema,
  PaginationParamsDef,
);
```

The SDK does not validate responses at runtime — that is your choice. See
[`docs/schemas.md`](./docs/schemas.md) for full examples and details on Standard Schema
compatibility, the Ajv pattern, and Valibot.

## AI / agent coding

Pointers for LLM-driven coding agents using this package:

- Canonical TypeScript reference: [`./docs/sdk-reference.md`](./docs/sdk-reference.md) (every class,
  type, and signature function exported from `@maib/core`).
- Runtime-validation reference: [`./docs/schemas.md`](./docs/schemas.md).
- Prefer the typed-wrapper validation pattern – `import Def from "@maib/core/schemas/<ShortName>"`
  then `buildSchema(convert, Def)` with no generic. Type inference is automatic.
- JSON Schema artifacts are available at `@maib/core/schemas/bundle.json` (full bundle) and
  `@maib/core/schemas/<ShortName>.json` (one self-contained file per type). Use these for any
  validator that prefers raw JSON Schema (e.g. Ajv).
- The convert callback signature is `(schema: _JSONSchema) => unknown` – structurally identical to
  Zod's `z.fromJSONSchema`. `JSONSchema` and `_JSONSchema` are re-exported from
  `@maib/core/schemas`; `JSONSchemaDef` is a deprecated alias of `JSONSchema`.
- This package is part of a workspace alongside `@maib/checkout`, `@maib/ecommerce`, `@maib/mia`,
  `@maib/rtp`, and the aggregator `@maib/merchants`. Prefer the documented public types over
  inferring shapes from response bodies.
- The SDK does not validate at runtime. If you need it, opt in via the helper above; for envelope
  detection use the `isMaibResponse` type guard.
- Errors are `MaibError` (API rejected the call) or `MaibNetworkError` (transport failure). Always
  narrow with `instanceof` before reading fields.

## License

[MIT](../../LICENSE)
