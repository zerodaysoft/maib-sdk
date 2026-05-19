---
package: "@maib/mia"
description: How to validate @maib/mia payloads at runtime.
---

# Validating @maib/mia payloads at runtime

`@maib/mia` ships four subpaths for runtime validation:

| Subpath                             | Resolves to                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `@maib/mia/schemas`                 | Validator-agnostic helpers (`buildSchema`, `buildSchemasBundle`) plus `JSONSchema` / `_JSONSchema` types.                   |
| `@maib/mia/schemas/<ShortName>`     | Typed `.ts` wrapper – default export is `TypedSchemaDef<T>`, so `buildSchema` infers the validator type. No `.json` suffix. |
| `@maib/mia/schemas/<TypeName>.json` | One self-contained JSON Schema file per type, with `$defs` embedded.                                                        |
| `@maib/mia/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas).                                            |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod (typed wrapper, preferred)

Import the `.ts` wrapper (no `.json` suffix). `buildSchema` infers `ParsingValidator<T>` from the
wrapper's phantom `TypedSchemaDef<T>` marker, so you do **not** pass an explicit type argument:

```ts
import { z } from "zod";
import { buildSchema } from "@maib/mia/schemas";
import CreateQrRequestDef from "@maib/mia/schemas/CreateQrRequest";
import MiaCallbackPayloadDef from "@maib/mia/schemas/MiaCallbackPayload";

export const CreateQrRequestSchema = buildSchema(z.fromJSONSchema, CreateQrRequestDef);
// → ParsingValidator<CreateQrRequest> (inferred)

export const MiaCallbackPayloadSchema = buildSchema(z.fromJSONSchema, MiaCallbackPayloadDef);
// → ParsingValidator<MiaCallbackPayload> (inferred)

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
const result = MiaCallbackPayloadSchema.safeParse(req.body);
if (!result.success) console.warn("MIA callback drifted:", result.error);
```

## Raw JSON – explicit generic

Still supported. Use this when you want the raw JSON value (e.g. forwarding to a non-TS tool) or
when your bundler does not support TS subpath imports:

```ts
import { z } from "zod";
import type { CreateQrRequest } from "@maib/mia";
import { buildSchema } from "@maib/mia/schemas";
import CreateQrRequestDef from "@maib/mia/schemas/CreateQrRequest.json" with { type: "json" };

export const CreateQrRequestSchema = buildSchema<CreateQrRequest>(
  z.fromJSONSchema,
  CreateQrRequestDef,
);
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
