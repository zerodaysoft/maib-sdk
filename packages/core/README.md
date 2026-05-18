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
(lightest setup, what the SDK is tested against):

```ts
import { z } from "zod";
import { buildSchema, buildSchemasBundle } from "@maib/checkout/schemas";
import RefundRequestDef from "@maib/checkout/schemas/RefundRequest.json" with { type: "json" };
import SchemasBundleDef from "@maib/checkout/schemas/bundle.json" with { type: "json" };

export const RefundRequest = buildSchema(z.fromJSONSchema, RefundRequestDef);
export const SchemasBundle = buildSchemasBundle(z.fromJSONSchema, SchemasBundleDef);

RefundRequest.parse(someData);
SchemasBundle.RefundRequest.parse(someData);
```

The SDK does not validate responses at runtime — that is your choice. See
[`docs/schemas.md`](./docs/schemas.md) for full examples and details on Standard Schema
compatibility, the Ajv pattern, and Valibot.

## License

[MIT](../../LICENSE)
