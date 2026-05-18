---
package: "@maib/rtp"
description: How to validate @maib/rtp payloads at runtime.
---

# Validating @maib/rtp payloads at runtime

`@maib/rtp` ships three subpaths for runtime validation:

| Subpath                             | Resolves to                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `@maib/rtp/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`).                 |
| `@maib/rtp/schemas/bundle.json`     | Full JSON Schema bundle for the package (including merged `@maib/core` schemas). |
| `@maib/rtp/schemas/<TypeName>.json` | One self-contained file per type, with `$defs` embedded.                         |

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod

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
