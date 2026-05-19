---
package: "@maib/rtp"
description: How to validate @maib/rtp payloads at runtime.
---

# Validating @maib/rtp payloads at runtime

`@maib/rtp` ships four subpaths for runtime validation:

| Subpath                             | Resolves to                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@maib/rtp/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`); also re-exports `JSONSchema` and `_JSONSchema`.  |
| `@maib/rtp/schemas/<TypeName>`      | Typed wrapper – default export is a `TypedSchemaDef<T>` so `buildSchema` infers `ParsingValidator<T>`. Preferred. |
| `@maib/rtp/schemas/<TypeName>.json` | Raw JSON Schema file per type, with `$defs` embedded. Use with `import ... with { type: "json" }`.                |
| `@maib/rtp/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas).                                  |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other. The callback signature is
`(schema: _JSONSchema) => unknown` – matching `z.fromJSONSchema`.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod (typed wrapper, preferred)

Import the typed wrapper from `@maib/rtp/schemas/<TypeName>` (no `.json` suffix). `buildSchema`
infers `ParsingValidator<T>` from the wrapper – no explicit generic and no separate `import type`.

```ts
import { z } from "zod";
import { buildSchema } from "@maib/rtp/schemas";
import CreateRtpRequestDef from "@maib/rtp/schemas/CreateRtpRequest";
import RtpCallbackResultDef from "@maib/rtp/schemas/RtpCallbackResult";

export const CreateRtpRequestSchema = buildSchema(z.fromJSONSchema, CreateRtpRequestDef);
// → ParsingValidator<CreateRtpRequest> (inferred)
export const RtpCallbackResultSchema = buildSchema(z.fromJSONSchema, RtpCallbackResultDef);
// → ParsingValidator<RtpCallbackResult> (inferred)

// Validate before sending — the alias regex `^373\d{8}$` is enforced.
const body = CreateRtpRequestSchema.parse({
  alias: "37360000000",
  amount: 25,
  expiresAt: "2029-01-01T00:00:00Z",
  currency: "MDL",
  description: "Loan repayment",
});
await client.create(body);

// Validate an incoming callback
const result = RtpCallbackResultSchema.safeParse(callbackResult);
if (!result.success) console.warn("RTP callback drifted:", result.error);
```

## Raw JSON (explicit generic)

Backwards-compatible pattern using the `with { type: "json" }` import attribute. The SDK's TS
interface is passed as the explicit generic.

```ts
import { z } from "zod";
import type { CreateRtpRequest, RtpCallbackResult } from "@maib/rtp";
import { buildSchema } from "@maib/rtp/schemas";
import CreateRtpRequestDef from "@maib/rtp/schemas/CreateRtpRequest.json" with { type: "json" };
import RtpCallbackResultDef from "@maib/rtp/schemas/RtpCallbackResult.json" with { type: "json" };

export const CreateRtpRequestSchema = buildSchema<CreateRtpRequest>(
  z.fromJSONSchema,
  CreateRtpRequestDef,
);
export const RtpCallbackResultSchema = buildSchema<RtpCallbackResult>(
  z.fromJSONSchema,
  RtpCallbackResultDef,
);
```

## Bulk import – every schema at once

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/rtp/schemas";
import bundleDef from "@maib/rtp/schemas/bundle.json" with { type: "json" };

export const Schemas = buildSchemasBundle(z.fromJSONSchema, bundleDef);

Schemas.RtpStatusResult.parse(await client.get(rtpId));
Schemas.CancelRtpRequest.parse({ reason: "user cancelled" });
```

## Reference

Full reference (`buildSchema` / `buildSchemasBundle` API, `ParsingValidator` contract, Standard
Schema compatibility, Ajv and Valibot patterns, strictness, what ships) lives in
[`@maib/core/docs/schemas.md`](../../core/docs/schemas.md).
