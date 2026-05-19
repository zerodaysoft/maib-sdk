# @maib/merchants

Umbrella SDK for all [maib](https://www.maib.md) merchant APIs. Installs and re-exports everything
from the individual packages in a single import.

## Install

```bash
npm install @maib/merchants
```

## Usage

```typescript
import {
  CheckoutClient,
  EcommerceClient,
  RtpClient,
  MiaClient,
  Currency,
  MaibError,
} from "@maib/merchants";
```

Everything from the individual packages is available:

| Package                                                            | What you get                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`@maib/checkout`](https://www.npmjs.com/package/@maib/checkout)   | `CheckoutClient`, `CheckoutStatus`, `PaymentStatus`, `RefundStatus`          |
| [`@maib/ecommerce`](https://www.npmjs.com/package/@maib/ecommerce) | `EcommerceClient`, `Currency`, `TransactionStatus`, `ThreeDsStatus`          |
| [`@maib/rtp`](https://www.npmjs.com/package/@maib/rtp)             | `RtpClient`, `RtpStatus`                                                     |
| [`@maib/mia`](https://www.npmjs.com/package/@maib/mia)             | `MiaClient`, `QrType`, `AmountType`, `QrStatus`, `MiaPaymentStatus`          |
| [`@maib/core`](https://www.npmjs.com/package/@maib/core)           | `BaseClient`, `MaibError`, `MaibNetworkError`, `Language`, signature helpers |

Where type names collide between packages, they are aliased with a prefix:

```typescript
import type {
  CheckoutRefundRequest, // from @maib/checkout
  EcommerceRefundRequest, // from @maib/ecommerce
  CheckoutListPaymentsParams,
  MiaListPaymentsParams,
} from "@maib/merchants";
```

If you only need one API, install the individual package instead for a smaller dependency footprint.

> Looking for Open Banking? See [`@maib/ob`](https://www.npmjs.com/package/@maib/ob).

## Runtime schemas

`@maib/merchants` is an aggregator – it ships an aggregate JSON Schema bundle covering every type
from `@maib/checkout`, `@maib/ecommerce`, `@maib/rtp`, `@maib/mia`, and `@maib/core` in a single
artifact. It does **not** emit per-schema typed `.ts` wrappers of its own; those live in the
underlying packages.

| Subpath                                         | Resolves to                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `@maib/merchants/schemas`                       | Validator-agnostic helpers (`buildSchema`, `buildSchemasBundle`, `JSONSchema`, …) |
| `@maib/merchants/schemas/bundle.json`           | Combined JSON Schema bundle across all 5 packages                                 |
| `@maib/merchants/schemas/<ShortName>.json`      | Self-contained file per schema where the short name is unique across the bundle   |
| `@maib/merchants/schemas/<Pkg><ShortName>.json` | Disambiguated PascalCase file for short names shared by multiple packages         |

Note: `@maib/merchants/schemas/<Name>` (no `.json`, the typed-wrapper subpath) does **not** exist
here. For the typed-wrapper pattern, import from the underlying package:

```typescript
import { buildSchema } from "@maib/merchants/schemas";
import CheckoutRefundRequestDef from "@maib/checkout/schemas/RefundRequest";
import EcommerceRefundRequestDef from "@maib/ecommerce/schemas/RefundRequest";
import { z } from "zod";

// Type is inferred from the phantom __maibType marker on the wrapper – no generic needed.
const CheckoutRefundSchema = buildSchema(z.fromJSONSchema, CheckoutRefundRequestDef);
const EcommerceRefundSchema = buildSchema(z.fromJSONSchema, EcommerceRefundRequestDef);
```

The raw-JSON pattern works directly off `@maib/merchants/schemas/<Name>.json` with an explicit
generic:

```typescript
import type { CheckoutRefundRequest } from "@maib/merchants";
import { buildSchema } from "@maib/merchants/schemas";
import CheckoutRefundDef from "@maib/merchants/schemas/CheckoutRefundRequest.json" with { type: "json" };
import { z } from "zod";

const CheckoutRefundSchema = buildSchema<CheckoutRefundRequest>(
  z.fromJSONSchema,
  CheckoutRefundDef,
);
CheckoutRefundSchema.parse({ amount: 5.5, reason: "duplicate" });
```

For whole-bundle access across products, pass `onCollision: "namespace-prefix"`. PascalCase keys
match the per-schema filenames and the type aliases re-exported from `@maib/merchants`:

```typescript
import { buildSchemasBundle } from "@maib/merchants/schemas";
import bundle from "@maib/merchants/schemas/bundle.json" with { type: "json" };
import { z } from "zod";

const Schemas = buildSchemasBundle(z.fromJSONSchema, bundle, { onCollision: "namespace-prefix" });
Schemas.CheckoutRefundRequest.parse(checkoutRefund);
Schemas.EcommerceRefundRequest.parse(ecommerceRefund);
Schemas.MaibApiError.parse(errorBody); // unique short name kept
```

Pass `onCollision: "namespace"` instead for dotted keys like `"checkout.RefundRequest"`. Without an
option, `buildSchemasBundle` throws on the first collision.

See [`docs/schemas.md`](docs/schemas.md) for the full guide.

## AI / agent coding

- Canonical references: [`./docs/sdk-reference.md`](docs/sdk-reference.md) (full export map, aliased
  types) and [`./docs/schemas.md`](docs/schemas.md) (runtime validation patterns).
- `@maib/merchants` is an aggregator – for the typed-wrapper schema pattern, import from the
  underlying package (e.g. `@maib/checkout/schemas/RefundRequest`,
  `@maib/ecommerce/schemas/RefundRequest`); `@maib/merchants/schemas/RefundRequest` does **not**
  exist.
- For cross-product code, prefer the typed re-exports from `@maib/merchants` root (`CheckoutClient`,
  `EcommerceClient`, `RtpClient`, `MiaClient`, `MaibError`, the aliased `CheckoutRefundRequest` /
  `EcommerceRefundRequest` types, etc.).
- For runtime validation across products, use `buildSchemasBundle` with
  `onCollision: "namespace-prefix"` against `@maib/merchants/schemas/bundle.json`. The resulting
  keys (`CheckoutRefundRequest`, `EcommerceRefundRequest`, `MiaListPaymentsParams`, …) match the
  type aliases.
- JSON Schema artifacts shipped: `@maib/merchants/schemas/bundle.json` (full aggregator bundle) and
  per-prefix files `@maib/merchants/schemas/<PrefixedName>.json` – e.g.
  `CheckoutRefundRequest.json`, `EcommerceRefundRequest.json`, `MiaListPaymentsParams.json`.
- Unique short names (no cross-package collision) keep their bare-name file and bundle key – e.g.
  `MaibApiError.json`, `CreateSessionRequest.json`.
- `@maib/merchants/schemas` re-exports `buildSchema`, `buildSchemasBundle`, the `JSONSchema` /
  `_JSONSchema` structural types, the backwards-compat `JSONSchemaDef` alias, `TypedSchemaDef`,
  `ParsingValidator`, `SchemaBundle`, `CollisionStrategy`, `BuildSchemasBundleOptions`.
- The SDK does not validate responses at runtime – wire validation in yourself with Zod, Valibot,
  Ajv, or any Standard-Schema-compatible converter passed as `convert` to `buildSchema`.
- The Open Banking client (`@maib/ob`) is intentionally **not** re-exported here – install it
  separately if you need it.
- Bundled docs ship to `node_modules/@maib/merchants/dist/docs/`. Point your agents at them via an
  `AGENTS.md` (or Claude Code's `CLAUDE.md` `@AGENTS.md` reference) – training-data drift makes the
  shipped docs the source of truth.

```md
<!-- BEGIN:maib-sdk-agent-rules -->

# maib SDK: ALWAYS read docs before coding

Before any maib SDK work, find and read the relevant doc in the installed package:

- `node_modules/@maib/<package>/dist/docs/README.md` – quick start
- `node_modules/@maib/<package>/dist/docs/sdk-reference.md` – complete API surface

Your training data may be outdated – the bundled docs are the source of truth.

<!-- END:maib-sdk-agent-rules -->
```

## License

[MIT](../../LICENSE)
