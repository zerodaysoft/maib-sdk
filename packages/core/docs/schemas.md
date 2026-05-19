---
package: "@maib/core"
description:
  How to consume the JSON Schema files and `schemas` helper shipped with every maib SDK package.
---

# Validating maib SDK payloads at runtime

Every `@maib/*` SDK package ships four things for runtime validation:

- `@maib/<pkg>/schemas/bundle.json` — the full JSON Schema bundle (`draft-2020-12`) for every
  wire-format type in the package.
- `@maib/<pkg>/schemas/<TypeName>.json` — one JSON Schema file per type, self-contained (with
  `$defs` embedded) so it parses standalone.
- `@maib/<pkg>/schemas/<TypeName>` — a typed wrapper around the same JSON file (no `.json` suffix).
  Its default export is a `TypedSchemaDef<T>` that carries the matching SDK interface as a phantom
  type, so `buildSchema(convert, def)` infers `ParsingValidator<T>` without a manual generic.
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

Every package exposes the same four subpaths:

| Subpath                               | Resolves to                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@maib/<pkg>/schemas`                 | The helper (ESM/CJS, with type defs).                                                                    |
| `@maib/<pkg>/schemas/bundle.json`     | Full JSON Schema bundle for the package.                                                                 |
| `@maib/<pkg>/schemas/<TypeName>.json` | One self-contained schema file per type.                                                                 |
| `@maib/<pkg>/schemas/<TypeName>`      | Typed wrapper (default export is `TypedSchemaDef<T>`); enables generic-free `buildSchema(convert, def)`. |

Packages: `@maib/core`, `@maib/ecommerce`, `@maib/checkout`, `@maib/mia`, `@maib/ob`, `@maib/rtp`.

## The helper

```ts
import {
  buildSchema,
  buildSchemasBundle,
  type JSONSchema,
  type _JSONSchema,
  type ParsingValidator,
  type SchemaBundle,
  type TypedSchemaDef,
} from "@maib/core/schemas";
```

`JSONSchema` is the Draft 2020-12 structural type carried by every `dist/schemas/*.json` file.
`_JSONSchema` is the slightly wider `boolean | JSONSchema` union – it mirrors the input shape that
`z.fromJSONSchema` accepts, which is why a Zod schema converter slots straight in. `JSONSchemaDef`
is kept as a backwards-compatible alias of `JSONSchema`; prefer `JSONSchema` in new code.

### `buildSchema`

```ts
// 1. Typed wrapper — preferred. TData is inferred from the wrapper.
function buildSchema<T>(
  convert: (schema: _JSONSchema) => unknown,
  def: TypedSchemaDef<T>,
  refs?: Record<string, JSONSchema>,
): ParsingValidator<T>;

// 2. Raw JSON — pass the SDK's TS interface as the type argument.
function buildSchema<TData = unknown>(
  convert: (schema: _JSONSchema) => unknown,
  def: JSONSchema,
  refs?: Record<string, JSONSchema>,
): ParsingValidator<TData>;
```

The `convert` callback signature – `(schema: _JSONSchema) => unknown` – is structurally identical to
`z.fromJSONSchema`, so Zod's converter is a direct fit; converters for other validators that accept
a `JSONSchema` object work the same way. `refs` is optional – per-schema JSON files already embed
`$defs` so you usually don't need to pass it. The returned shape is the structural
`ParsingValidator<TData>` interface that Zod, Valibot, ArkType and other `parse`/`safeParse`
validators satisfy; the runtime object is exactly what `convert` returned, so it also keeps any
validator-specific surface (e.g. the `~standard` property used by Standard Schema consumers).

### `buildSchemasBundle` — bulk

```ts
// Convert every $defs entry in a bundle, keyed by short name
// (`maib.checkout.RefundRequest` → `RefundRequest`). Throws on
// collisions by default; aggregator bundles can opt in to
// `"namespace"` or `"namespace-prefix"` keying.
function buildSchemasBundle<TSchema>(
  convert: (schema: _JSONSchema) => TSchema,
  bundle: SchemaBundle,
  options?: { onCollision?: "throw" | "namespace" | "namespace-prefix" },
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

## Example: Zod 4 – per-schema imports (typed wrapper, preferred)

Zod is the default illustrative example throughout these docs: it has the lightest from-JSON-Schema
path (`z.fromJSONSchema`) and is what the SDK is tested against. Any other
Standard-Schema-conformant validator (Valibot, ArkType, Effect Schema, …) works the same way once
you swap the `convert` callback.

`z.fromJSONSchema` is experimental in Zod 4 but works for our bundles.

```ts
import { z } from "zod";
import { buildSchema } from "@maib/core/schemas";
import PaginationParamsDef from "@maib/core/schemas/PaginationParams";
import TokenResultDef from "@maib/core/schemas/TokenResult";

// `.parse()` is typed as the SDK's TS interface — no generic needed.
export const PaginationParamsSchema = buildSchema(z.fromJSONSchema, PaginationParamsDef);
// → ParsingValidator<PaginationParams>
export const TokenResultSchema = buildSchema(z.fromJSONSchema, TokenResultDef);
// → ParsingValidator<TokenResult>

const params = PaginationParamsSchema.parse({ count: 10, offset: 0 });
// params: PaginationParams

const info = TokenResultSchema.safeParse(rawTokenResponse);
if (info.success) {
  const token = info.data; // typed as TokenResult
} else {
  console.warn("TokenResult drifted:", info.error);
}
```

Tree-shake-friendly: only the types you import are bundled.

## Example: Zod 4 – per-schema imports (raw JSON, explicit generic)

For build setups where `import … with { type: "json" }` is preferred (or where the typed wrapper
subpath isn't yet supported by your bundler), import the JSON file directly and pass the SDK's TS
interface as the generic argument:

```ts
import { z } from "zod";
import type { PaginationParams, TokenResult } from "@maib/core";
import { buildSchema } from "@maib/core/schemas";
import PaginationParamsDef from "@maib/core/schemas/PaginationParams.json" with { type: "json" };
import TokenResultDef from "@maib/core/schemas/TokenResult.json" with { type: "json" };

export const PaginationParamsSchema = buildSchema<PaginationParams>(
  z.fromJSONSchema,
  PaginationParamsDef,
);
export const TokenResultSchema = buildSchema<TokenResult>(z.fromJSONSchema, TokenResultDef);
```

Drop the `<…>` generic and `.parse()` returns `unknown` — always pass the SDK interface so callers
keep their types.

## Example: Zod 4 – full bundle import

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/core/schemas";
import SchemasBundleDef from "@maib/core/schemas/bundle.json" with { type: "json" };

export const SchemasBundle = buildSchemasBundle(z.fromJSONSchema, SchemasBundleDef);

SchemasBundle.PaginationParams.parse({ count: 10, offset: 0 });
SchemasBundle.MaibApiError.parse({
  errorCode: "INVALID_REQUEST",
  errorMessage: "Bad input",
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
import type { PaginationParams, TokenResult } from "@maib/core";
import PaginationParamsDef from "@maib/core/schemas/PaginationParams.json" with { type: "json" };
import TokenResultDef from "@maib/core/schemas/TokenResult.json" with { type: "json" };

const ajv = new Ajv({ strict: false });
addFormats(ajv);

export const validatePaginationParams: ValidateFunction<PaginationParams> =
  ajv.compile(PaginationParamsDef);
export const validateTokenResult: ValidateFunction<TokenResult> = ajv.compile(TokenResultDef);

if (!validateTokenResult(value)) {
  console.warn("TokenResult drifted:", validateTokenResult.errors);
}
```

## Example: Valibot

Valibot does not currently ship an official JSON-Schema-to-Valibot converter (only the inverse,
`@valibot/to-json-schema`). The community
[`json-schema-to-valibot`](https://www.npmjs.com/package/json-schema-to-valibot) package generates
Valibot source at build time. For runtime conversion, plug any function with the signature
`(schema: _JSONSchema) => YourValidator` into the helper. The resulting Valibot schema is Standard
Schema compatible like any other.

## Strictness — your call, not the SDK's

Response and callback shapes are emitted with `additionalProperties: {}` (unknown allowed) so
additive backend changes do not fail validation. If you want strict rejection of unknown fields,
copy the relevant `$defs` entry, change `additionalProperties` to `false`, and pass the modified
copy to `buildSchema`. Request shapes are emitted with `additionalProperties: false` so typos in
your own code fail fast.

## What ships, what does not

| Artifact                              | Shipped at runtime? | Notes                                                                  |
| ------------------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `@maib/<pkg>/schemas/bundle.json`     | Yes                 | Full JSON Schema bundle.                                               |
| `@maib/<pkg>/schemas/<TypeName>.json` | Yes                 | One self-contained file per type (tree-shake friendly).                |
| `@maib/<pkg>/schemas/<TypeName>`      | Yes                 | Typed wrapper around the JSON file; powers generic-free `buildSchema`. |
| `@maib/<pkg>/schemas`                 | Yes                 | Validator-agnostic helper. ~20 LOC, no deps.                           |
| Generated TS interfaces               | Yes                 | In `dist/index.d.ts`, with JSDoc descriptions from the schemas.        |
| Zod / Valibot / ArkType / Ajv         | No                  | Zero runtime dependency on any validator or on Standard Schema.        |

The schema bundle and per-schema files are stable artifacts: changes follow normal SemVer rules for
the package (additive fields → minor; renames / removals → major).
