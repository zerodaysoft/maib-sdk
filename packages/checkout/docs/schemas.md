---
package: "@maib/checkout"
description: How to validate @maib/checkout payloads at runtime.
---

# Validating @maib/checkout payloads at runtime

`@maib/checkout` ships three subpaths for runtime validation:

| Subpath                                  | Resolves to                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `@maib/checkout/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`).                 |
| `@maib/checkout/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas). |
| `@maib/checkout/schemas/<TypeName>.json` | One self-contained file per type, with `$defs` embedded.                         |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod

```ts
import { z } from "zod";
import type { CancelSessionResult, RefundRequest } from "@maib/checkout";
import { buildSchema } from "@maib/checkout/schemas";
import RefundRequestDef from "@maib/checkout/schemas/RefundRequest.json" with { type: "json" };
import CancelSessionResultDef from "@maib/checkout/schemas/CancelSessionResult.json" with { type: "json" };

export const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
export const CancelSessionResultSchema = buildSchema<CancelSessionResult>(
  z.fromJSONSchema,
  CancelSessionResultDef,
);

// Validate before sending
const body = RefundRequestSchema.parse({ amount: 5.5, reason: "duplicate charge" });
await client.refund(checkoutId, body);

// Validate what comes back
const result = CancelSessionResultSchema.safeParse(await client.cancelSession(id));
if (!result.success) console.warn("CancelSessionResult drifted:", result.error);
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
