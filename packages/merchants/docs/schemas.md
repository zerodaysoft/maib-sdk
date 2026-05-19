---
package: "@maib/merchants"
description: How to validate any @maib payload at runtime from the umbrella package.
---

# Validating @maib/merchants payloads at runtime

`@maib/merchants` re-exports every type and class from the four merchant APIs (`@maib/checkout`,
`@maib/ecommerce`, `@maib/rtp`, `@maib/mia`) plus shared `@maib/core` infrastructure. The runtime
schemas follow the same aggregation: one bundle, every package's schemas in it.

| Subpath                                         | Resolves to                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `@maib/merchants/schemas`                       | Validator-agnostic helpers (`buildSchema`, `buildSchemasBundle`, types)    |
| `@maib/merchants/schemas/bundle.json`           | Combined JSON Schema bundle across checkout + ecommerce + rtp + mia + core |
| `@maib/merchants/schemas/<ShortName>.json`      | Self-contained file per schema when the trailing id segment is unique      |
| `@maib/merchants/schemas/<Pkg><ShortName>.json` | PascalCase-prefixed file for short names shared by multiple packages       |

`@maib/merchants/schemas` re-exports the same helpers and types as every per-package
`@maib/<pkg>/schemas` barrel: `buildSchema`, `buildSchemasBundle`, `JSONSchema`, `_JSONSchema`,
`JSONSchemaDef` (backwards-compat alias for `JSONSchema`), `TypedSchemaDef`, `ParsingValidator`,
`SchemaBundle`, `CollisionStrategy`, `BuildSchemasBundleOptions`.

The shipped artifacts are plain JSON Schema (`draft-2020-12`). Convert them with Zod, Valibot,
ArkType, or any Standard-Schema-compatible validator. The SDK itself does not validate API responses
at runtime – that is your choice.

## No typed-wrapper subpath here

The per-package SDKs ship a typed-wrapper subpath at `@maib/<pkg>/schemas/<ShortName>` (no `.json`)
whose default export carries a phantom `__maibType: T` marker so `buildSchema(convert, def)` infers
`ParsingValidator<T>` without an explicit generic. **`@maib/merchants` does not ship those**: only
`*.json` files exist under `@maib/merchants/schemas/`.

For the typed-wrapper pattern from this package, import the wrapper from the underlying SDK and keep
using `@maib/merchants/schemas` for the helpers:

```ts
import { z } from "zod";
import { buildSchema } from "@maib/merchants/schemas";
import CheckoutRefundRequestDef from "@maib/checkout/schemas/RefundRequest";
import EcommerceRefundRequestDef from "@maib/ecommerce/schemas/RefundRequest";

// ParsingValidator<RefundRequest> inferred from the wrapper's __maibType marker.
export const CheckoutRefundRequestSchema = buildSchema(z.fromJSONSchema, CheckoutRefundRequestDef);
export const EcommerceRefundRequestSchema = buildSchema(
  z.fromJSONSchema,
  EcommerceRefundRequestDef,
);
```

## Quick start – Zod, per-schema (raw JSON)

For most code, importing a single schema by short name reads cleanest:

```ts
import { z } from "zod";
import type { CreateSessionRequest, MiaPaymentDetails } from "@maib/merchants";
import { buildSchema } from "@maib/merchants/schemas";
import CreateSessionRequestDef from "@maib/merchants/schemas/CreateSessionRequest.json" with { type: "json" };
import MiaPaymentDetailsDef from "@maib/merchants/schemas/MiaPaymentDetails.json" with { type: "json" };

export const CreateSessionRequestSchema = buildSchema<CreateSessionRequest>(
  z.fromJSONSchema,
  CreateSessionRequestDef,
);
export const MiaPaymentDetailsSchema = buildSchema<MiaPaymentDetails>(
  z.fromJSONSchema,
  MiaPaymentDetailsDef,
);
```

## Disambiguating collisions

A handful of short names exist in more than one merchant API. Per-schema files for those use the
PascalCase-prefixed form so each filename matches the type alias exported from `@maib/merchants`:

| Aggregate filename                                        | Original id                        | Type alias                   |
| --------------------------------------------------------- | ---------------------------------- | ---------------------------- |
| `@maib/merchants/schemas/CheckoutRefundRequest.json`      | `maib.checkout.RefundRequest`      | `CheckoutRefundRequest`      |
| `@maib/merchants/schemas/EcommerceRefundRequest.json`     | `maib.ecommerce.RefundRequest`     | `EcommerceRefundRequest`     |
| `@maib/merchants/schemas/CheckoutRefundResult.json`       | `maib.checkout.RefundResult`       | `CheckoutRefundResult`       |
| `@maib/merchants/schemas/EcommerceRefundResult.json`      | `maib.ecommerce.RefundResult`      | `EcommerceRefundResult`      |
| `@maib/merchants/schemas/CheckoutListPaymentsParams.json` | `maib.checkout.ListPaymentsParams` | `CheckoutListPaymentsParams` |
| `@maib/merchants/schemas/MiaListPaymentsParams.json`      | `maib.mia.ListPaymentsParams`      | `MiaListPaymentsParams`      |

Schema and type stay paired by name:

```ts
import type { CheckoutRefundRequest, EcommerceRefundRequest } from "@maib/merchants";
import { buildSchema } from "@maib/merchants/schemas";
import CheckoutRefundRequestDef from "@maib/merchants/schemas/CheckoutRefundRequest.json" with { type: "json" };
import EcommerceRefundRequestDef from "@maib/merchants/schemas/EcommerceRefundRequest.json" with { type: "json" };

export const CheckoutRefundRequestSchema = buildSchema<CheckoutRefundRequest>(
  z.fromJSONSchema,
  CheckoutRefundRequestDef,
);
export const EcommerceRefundRequestSchema = buildSchema<EcommerceRefundRequest>(
  z.fromJSONSchema,
  EcommerceRefundRequestDef,
);
```

## Bulk import – every schema at once

The whole-bundle path works too, but you must opt in to a collision strategy so the short-name
collisions described above don't trip the helper. Two strategies are available:

| `onCollision`        | Colliding key example      | Use when                                                                              |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `"namespace-prefix"` | `CheckoutRefundRequest`    | You want keys that match the per-schema filenames and the type aliases (recommended). |
| `"namespace"`        | `"checkout.RefundRequest"` | You want dotted keys instead of PascalCase.                                           |

### `namespace-prefix` (recommended)

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/merchants/schemas";
import bundle from "@maib/merchants/schemas/bundle.json" with { type: "json" };

export const Schemas = buildSchemasBundle(z.fromJSONSchema, bundle, {
  onCollision: "namespace-prefix",
});

// Unique short names stay under their short-name key.
Schemas.CreateSessionRequest.parse(createSessionBody);
Schemas.MaibApiError.parse(errorBody);

// Colliding short names move under `<Pkg><ShortName>` keys – the same casing as
// the type aliases exported from `@maib/merchants`.
Schemas.CheckoutRefundRequest.parse(checkoutRefund);
Schemas.EcommerceRefundRequest.parse(ecommerceRefund);
Schemas.MiaListPaymentsParams.parse(miaListParams);
```

### `namespace` (dotted keys)

```ts
const Schemas = buildSchemasBundle(z.fromJSONSchema, bundle, {
  onCollision: "namespace",
});
Schemas["checkout.RefundRequest"].parse(checkoutRefund);
Schemas["ecommerce.RefundRequest"].parse(ecommerceRefund);
Schemas["mia.ListPaymentsParams"].parse(miaListParams);
```

Without an `onCollision` option, `buildSchemasBundle` throws on the first collision (the same
guardrail per-package bundles rely on). Use the option only when you have an aggregated bundle in
hand – for per-package bundles, the default is what you want.

## Reference

Full reference (`buildSchema` / `buildSchemasBundle` API, `ParsingValidator` contract, Standard
Schema compatibility, Ajv and Valibot patterns, strictness, what ships) lives in
[`@maib/core/docs/schemas.md`](../../core/docs/schemas.md).
