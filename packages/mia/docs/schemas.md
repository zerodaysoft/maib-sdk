---
package: "@maib/mia"
description: How to validate @maib/mia payloads at runtime.
---

# Validating @maib/mia payloads at runtime

`@maib/mia` ships three subpaths for runtime validation:

| Subpath                             | Resolves to                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `@maib/mia/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`).                 |
| `@maib/mia/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas). |
| `@maib/mia/schemas/<TypeName>.json` | One self-contained file per type, with `$defs` embedded.                         |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod

```ts
import { z } from "zod";
import type { CreateQrRequest, MiaCallbackResult } from "@maib/mia";
import { buildSchema } from "@maib/mia/schemas";
import CreateQrRequestDef from "@maib/mia/schemas/CreateQrRequest.json" with { type: "json" };
import MiaCallbackResultDef from "@maib/mia/schemas/MiaCallbackResult.json" with { type: "json" };

export const CreateQrRequestSchema = buildSchema<CreateQrRequest>(
  z.fromJSONSchema,
  CreateQrRequestDef,
);
export const MiaCallbackResultSchema = buildSchema<MiaCallbackResult>(
  z.fromJSONSchema,
  MiaCallbackResultDef,
);

// Validate before sending
const body = CreateQrRequestSchema.parse({
  type: "Dynamic",
  amountType: "Fixed",
  currency: "MDL",
  description: "Coffee",
  expiresAt: "2029-01-01T00:00:00Z",
  amount: 50,
});
await client.createQr(body);

// Validate an incoming callback
const result = MiaCallbackResultSchema.safeParse(callbackResult);
if (!result.success) console.warn("MIA callback drifted:", result.error);
```

## Bulk import – every schema at once

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/mia/schemas";
import bundleDef from "@maib/mia/schemas/bundle.json" with { type: "json" };

export const Schemas = buildSchemasBundle(z.fromJSONSchema, bundleDef);

Schemas.CreateHybridQrRequest.parse(hybridRequest);
Schemas.QrDetails.parse(await client.getQr(qrId));
```

## Reference

Full reference (`buildSchema` / `buildSchemasBundle` API, `ParsingValidator` contract, Standard
Schema compatibility, Ajv and Valibot patterns, strictness, what ships) lives in
[`@maib/core/docs/schemas.md`](../../core/docs/schemas.md).
