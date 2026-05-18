---
package: "@maib/ecommerce"
description: How to validate @maib/ecommerce payloads at runtime.
---

# Validating @maib/ecommerce payloads at runtime

`@maib/ecommerce` ships three subpaths for runtime validation:

| Subpath                                   | Resolves to                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `@maib/ecommerce/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`).                 |
| `@maib/ecommerce/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas). |
| `@maib/ecommerce/schemas/<TypeName>.json` | One self-contained file per type, with `$defs` embedded.                         |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod

```ts
import { z } from "zod";
import type { RefundRequest, RefundResult } from "@maib/ecommerce";
import { buildSchema } from "@maib/ecommerce/schemas";
import RefundRequestDef from "@maib/ecommerce/schemas/RefundRequest.json" with { type: "json" };
import RefundResultDef from "@maib/ecommerce/schemas/RefundResult.json" with { type: "json" };

export const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
export const RefundResultSchema = buildSchema<RefundResult>(z.fromJSONSchema, RefundResultDef);

// Validate before sending
const body = RefundRequestSchema.parse({ payId: "tx-1", refundAmount: 5.5 });
await client.refund(body);

// Validate what comes back
const result = RefundResultSchema.safeParse(await client.refund(body));
if (!result.success) console.warn("RefundResult drifted:", result.error);
```

## Bulk import – every schema at once

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/ecommerce/schemas";
import bundleDef from "@maib/ecommerce/schemas/bundle.json" with { type: "json" };

export const Schemas = buildSchemasBundle(z.fromJSONSchema, bundleDef);

Schemas.PayRequest.parse(payRequest);
Schemas.CallbackPayload.parse(callbackBody);
```

## Reference

Full reference (`buildSchema` / `buildSchemasBundle` API, `ParsingValidator` contract, Standard
Schema compatibility, Ajv and Valibot patterns, strictness, what ships) lives in
[`@maib/core/docs/schemas.md`](../../core/docs/schemas.md).
