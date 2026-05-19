---
package: "@maib/checkout"
description: How to validate @maib/checkout payloads at runtime.
---

# Validating @maib/checkout payloads at runtime

`@maib/checkout` ships four subpaths for runtime validation:

| Subpath                                  | Resolves to                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@maib/checkout/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`) plus `JSONSchema` / `_JSONSchema` types. |
| `@maib/checkout/schemas/<TypeName>`      | Typed wrapper (no `.json` suffix). Default export is `TypedSchemaDef<T>` – type is inferred.             |
| `@maib/checkout/schemas/<TypeName>.json` | Raw JSON Schema file. Self-contained, with `$defs` embedded.                                             |
| `@maib/checkout/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas).                         |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other. The `convert` parameter is typed
`(schema: _JSONSchema) => unknown` – it matches `z.fromJSONSchema` directly.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod (typed wrapper, preferred)

Import from `@maib/checkout/schemas/<TypeName>` (no `.json` suffix). The default export carries a
phantom `TypedSchemaDef<T>` marker so `buildSchema` infers `ParsingValidator<T>` with no explicit
generic argument.

```ts
import { z } from "zod";
import { buildSchema } from "@maib/checkout/schemas";
import RefundRequestDef from "@maib/checkout/schemas/RefundRequest";
import CancelSessionResultDef from "@maib/checkout/schemas/CancelSessionResult";

export const RefundRequestSchema = buildSchema(z.fromJSONSchema, RefundRequestDef);
// → ParsingValidator<RefundRequest>
export const CancelSessionResultSchema = buildSchema(z.fromJSONSchema, CancelSessionResultDef);
// → ParsingValidator<CancelSessionResult>

// Validate before sending
const body = RefundRequestSchema.parse({ amount: 5.5, reason: "duplicate charge" });
await client.refund(checkoutId, body);

// Validate what comes back
const result = CancelSessionResultSchema.safeParse(await client.cancelSession(id));
if (!result.success) console.warn("CancelSessionResult drifted:", result.error);
```

## Raw JSON import (legacy, still supported)

For environments that prefer `import ... with { type: "json" }`, pass the SDK's TypeScript type as
an explicit generic:

```ts
import { z } from "zod";
import type { RefundRequest } from "@maib/checkout";
import { buildSchema } from "@maib/checkout/schemas";
import RefundRequestDef from "@maib/checkout/schemas/RefundRequest.json" with { type: "json" };

export const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
```

## Bulk import – every schema at once

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/checkout/schemas";
import bundleDef from "@maib/checkout/schemas/bundle.json" with { type: "json" };

export const Schemas = buildSchemasBundle(z.fromJSONSchema, bundleDef);

// Cross-`$ref` shapes (CreateSessionRequest → OrderInfo → OrderItem) resolve
// transparently against the embedded $defs.
Schemas.CreateSessionRequest.parse({
  amount: 100,
  currency: "MDL",
  orderInfo: { id: "X1", description: "test" },
});
Schemas.CheckoutCallbackPayload.parse(callbackBody);
```

## Reference

Full reference (`buildSchema` / `buildSchemasBundle` API, `ParsingValidator` contract, Standard
Schema compatibility, Ajv and Valibot patterns, strictness, what ships) lives in
[`@maib/core/docs/schemas.md`](../../core/docs/schemas.md).
