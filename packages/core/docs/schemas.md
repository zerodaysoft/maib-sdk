---
package: "@maib/core"
description:
  How to consume the JSON Schema files and `schemas` helper shipped with every maib SDK package.
---

# Validating maib SDK payloads at runtime

Every `@maib/*` SDK package ships three things for runtime validation:

- `@maib/<pkg>/schemas/bundle.json` — the full JSON Schema bundle (`draft-2020-12`) for every
  wire-format type in the package.
- `@maib/<pkg>/schemas/<TypeName>.json` — one JSON Schema file per type, self-contained (with
  `$defs` embedded) so it parses standalone.
- `@maib/<pkg>/schemas` — a tiny validator-agnostic helper exposing `buildSchema` and
  `buildSchemasBundle`. Zero validator dependency: you pass your validator's conversion function in.

The shipped artifact is plain JSON Schema. Convert it with Zod, Valibot, ArkType, Effect Schema, or
any validator with a JSON-Schema-to-validator path, and you get a parser. Because Zod, Valibot,
ArkType and friends implement [Standard Schema](https://standardschema.dev/), the resulting parser
plugs directly into anything that accepts a Standard Schema – TanStack Form, tRPC, hono's
`*Validator` middleware, the AI SDK's structured-output APIs, and so on. The SDK itself imposes no
validator and depends on none.

The SDK does **not** validate responses at runtime. You decide whether to validate, what to
validate, and how strict to be – runtime validation is opt-in by your application.

## Why ship schemas

- The maib backend has historically changed payloads without changing docs. With the schemas, you
  can detect drift on your own terms.
- Strictness is your call. The shipped schemas describe what the docs promise. You decide whether
  deviations should throw, log, or pass through.
- No validator is forced on you. The artifact is plain JSON Schema; the helper just hands a JSON
  Schema to whatever conversion function you supply (`z.fromJSONSchema`, `ajv.compile`, anything).
- Standard Schema, for free. Once converted via a Standard-Schema-conformant validator (Zod,
  Valibot, ArkType, Effect Schema, …), the parser drops into any framework that speaks Standard
  Schema – form libraries, RPC routers, AI SDKs – without an adapter.

## Bundle shape

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "maib.core.MaibApiError": {
      /* ... */
    },
    "maib.ecommerce.RefundRequest": {
      /* ... */
    },
    // ...
  },
}
```

- Each schema lives under `$defs` keyed by a stable id of the form `maib.<package>.<TypeName>`.
- The TypeScript interface name is the trailing segment of the id (`MaibApiError`, `RefundRequest`,
  etc.) — which is also the per-schema file name (`<TypeName>.json`).
- Cross-schema references use internal JSON pointers
  (`{ "$ref": "#/$defs/maib.<package>.<TypeName>" }`).
- Merchant packages (`@maib/ecommerce`, `@maib/checkout`, `@maib/mia`, `@maib/rtp`) merge
  `@maib/core`'s `$defs` into their own bundle at build time. You only need one bundle per merchant
  package.
- Each per-schema `<TypeName>.json` carries the full bundle's `$defs` alongside the definition, so
  cross-refs resolve when you import a single type without the bundle.

## Subpath exports

Every package exposes the same three subpaths:

| Subpath                               | Resolves to                              |
| ------------------------------------- | ---------------------------------------- |
| `@maib/<pkg>/schemas`                 | The helper (ESM/CJS, with type defs).    |
| `@maib/<pkg>/schemas/bundle.json`     | Full JSON Schema bundle for the package. |
| `@maib/<pkg>/schemas/<TypeName>.json` | One self-contained schema file per type. |

Packages: `@maib/core`, `@maib/ecommerce`, `@maib/checkout`, `@maib/mia`, `@maib/ob`, `@maib/rtp`.

## The helper

```ts
import {
  buildSchema,
  buildSchemasBundle,
  type JSONSchemaDef,
  type ParsingValidator,
  type SchemaBundle,
} from "@maib/checkout/schemas";
```

### `buildSchema`

```ts
// Convert one definition into a validator. Pass the SDK's TS interface
// as the type argument so `.parse(...)` is typed against your data shape.
function buildSchema<TData = unknown>(
  convert: (schema: JSONSchemaDef) => unknown,
  def: JSONSchemaDef,
  refs?: Record<string, JSONSchemaDef>,
): ParsingValidator<TData>;
```

`refs` is optional – per-schema JSON files already embed `$defs` so you usually don't need to pass
it. The returned shape is the structural `ParsingValidator<TData>` interface that Zod, Valibot,
ArkType and other `parse`/`safeParse` validators satisfy; the runtime object is exactly what
`convert` returned, so it also keeps any validator-specific surface (e.g. the `~standard` property
used by Standard Schema consumers).

### `buildSchemasBundle` — bulk

```ts
// Convert every $defs entry in a bundle, keyed by short name
// (`maib.checkout.RefundRequest` → `RefundRequest`). Throws on
// collisions.
function buildSchemasBundle<TSchema>(
  convert: (schema: JSONSchemaDef) => TSchema,
  bundle: SchemaBundle,
): Record<string, TSchema>;
```

### `ParsingValidator<TData>`

Minimal structural contract that Zod, Valibot, ArkType, and any other `parse`/`safeParse`-shaped
validator satisfies:

```ts
interface ParsingValidator<TData> {
  parse(input: unknown): TData;
  safeParse(input: unknown): { success: true; data: TData } | { success: false; error: unknown };
}
```

## Example: Zod 4 – per-schema imports

Zod is the default illustrative example throughout these docs: it has the lightest from-JSON-Schema
path (`z.fromJSONSchema`) and is what the SDK is tested against. Any other
Standard-Schema-conformant validator (Valibot, ArkType, Effect Schema, …) works the same way once
you swap the `convert` callback.

`z.fromJSONSchema` is experimental in Zod 4 but works for our bundles.

```ts
import { z } from "zod";
import type { RefundRequest, PaymentDetails } from "@maib/checkout";
import { buildSchema } from "@maib/checkout/schemas";
import RefundRequestDef from "@maib/checkout/schemas/RefundRequest.json" with { type: "json" };
import PaymentDetailsDef from "@maib/checkout/schemas/PaymentDetails.json" with { type: "json" };

// Typed return — `.parse()` is typed as the SDK's TS interface.
export const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
export const PaymentDetailsSchema = buildSchema<PaymentDetails>(
  z.fromJSONSchema,
  PaymentDetailsDef,
);

const req: RefundRequest = RefundRequestSchema.parse({
  amount: 5.5,
  reason: "duplicate charge",
});

const info = PaymentDetailsSchema.safeParse(await client.getPayment(id));
if (info.success) {
  const payment: PaymentDetails = info.data; // fully typed
} else {
  console.warn("PaymentDetails drifted:", info.error);
}
```

Drop the `<…>` generic and `.parse()` returns `unknown` — pick the typed form whenever you can since
the SDK already exports a matching TS interface.

Tree-shake-friendly: only the types you import are bundled.

## Example: Zod 4 – full bundle import

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/checkout/schemas";
import SchemasBundleDef from "@maib/checkout/schemas/bundle.json" with { type: "json" };

export const SchemasBundle = buildSchemasBundle(z.fromJSONSchema, SchemasBundleDef);

SchemasBundle.RefundRequest.parse({ amount: 5.5, reason: "duplicate charge" });
SchemasBundle.CreateSessionRequest.parse({
  amount: 100,
  currency: "MDL",
  orderInfo: { id: "X1", description: "test" },
});
```

Pick this form when you want every schema available by name; pick the per-schema form when you only
need a handful and want tighter bundles.

## Example: Ajv

Ajv consumes JSON Schema natively – call `ajv.compile` on the per-schema file directly.
`buildSchema` is tuned for `parse`/`safeParse`-shaped validators (Zod, Valibot, ArkType, …); for
Ajv's predicate-function shape, skip it. Ajv does not implement Standard Schema, so the resulting
validator will not plug into Standard-Schema-aware frameworks.

```ts
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { PaymentDetails } from "@maib/checkout";
import RefundRequestDef from "@maib/checkout/schemas/RefundRequest.json" with { type: "json" };
import PaymentDetailsDef from "@maib/checkout/schemas/PaymentDetails.json" with { type: "json" };

const ajv = new Ajv({ strict: false });
addFormats(ajv);

export const validateRefundRequest = ajv.compile(RefundRequestDef);
export const validatePaymentDetails: ValidateFunction<PaymentDetails> =
  ajv.compile(PaymentDetailsDef);

if (!validatePaymentDetails(value)) {
  console.warn("PaymentDetails drifted:", validatePaymentDetails.errors);
}
```

## Example: Valibot

Valibot does not currently ship an official JSON-Schema-to-Valibot converter (only the inverse,
`@valibot/to-json-schema`). The community
[`json-schema-to-valibot`](https://www.npmjs.com/package/json-schema-to-valibot) package generates
Valibot source at build time. For runtime conversion, plug any function with the signature
`(JSONSchemaDef) => YourValidator` into the helper. The resulting Valibot schema is Standard Schema
compatible like any other.

## Strictness — your call, not the SDK's

Response and callback shapes are emitted with `additionalProperties: {}` (unknown allowed) so
additive backend changes do not fail validation. If you want strict rejection of unknown fields,
copy the relevant `$defs` entry, change `additionalProperties` to `false`, and pass the modified
copy to `buildSchema`. Request shapes are emitted with `additionalProperties: false` so typos in
your own code fail fast.

## What ships, what does not

| Artifact                              | Shipped at runtime? | Notes                                                           |
| ------------------------------------- | ------------------- | --------------------------------------------------------------- |
| `@maib/<pkg>/schemas/bundle.json`     | Yes                 | Full JSON Schema bundle.                                        |
| `@maib/<pkg>/schemas/<TypeName>.json` | Yes                 | One self-contained file per type (tree-shake friendly).         |
| `@maib/<pkg>/schemas`                 | Yes                 | Validator-agnostic helper. ~20 LOC, no deps.                    |
| Generated TS interfaces               | Yes                 | In `dist/index.d.ts`, with JSDoc descriptions from the schemas. |
| Zod / Valibot / ArkType / Ajv         | No                  | Zero runtime dependency on any validator or on Standard Schema. |

The schema bundle and per-schema files are stable artifacts: changes follow normal SemVer rules for
the package (additive fields → minor; renames / removals → major).
