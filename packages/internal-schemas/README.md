# @maib/internal-schemas

> **Workspace-internal package.** Marked `"private": true` and never published to npm. Consumed only
> by other `@maib/*` packages in this monorepo. End users should not depend on it directly.

A tiny, validator-agnostic toolbelt that powers schema-driven type generation across the maib SDK:

- **Shared source-of-truth Zod schemas and enums** (`Language`, `Currency`, `PaymentStatus`,
  `PaginationParamsSchema`, …) that several SDK packages reuse instead of re-declaring.
- **`schemas-builder`** — the runtime helpers (`buildSchema`, `buildSchemasBundle`) that consumer
  apps reach via each published package's `@maib/<pkg>/schemas` entry point.
- **`test-helpers`** — utilities for tests that need to materialize bundles from `z.globalRegistry`
  in the same shape `scripts/build-schemas.mjs` emits to `dist/schemas/`.

## Why it's separate

Every published `@maib/*` package needs the same `buildSchema` / `buildSchemasBundle` runtime, but
none of them should ship a copy of it. Splitting these helpers into a private workspace package
keeps a single implementation, a single set of tests, and a stable surface that downstream packages
re-export under their own `./schemas` subpath (via `tsup`'s dts resolution + `package.json#exports`
mapping).

## Subpath exports

| Subpath                                  | What you get                                                          |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `@maib/internal-schemas`                 | Shared enums + `PaginationParamsSchema`                               |
| `@maib/internal-schemas/schemas-builder` | `buildSchema`, `buildSchemasBundle`, `TypedSchemaDef`, types          |
| `@maib/internal-schemas/test-helpers`    | `buildBundleFromRegistry`, `extractSchema` for in-memory bundle tests |

These subpaths are wired so downstream packages can use them transparently:

- Each SDK package re-exports `buildSchema` / `buildSchemasBundle` from its own
  `src/schemas/index.ts`, so end users import from `@maib/checkout/schemas` (etc.), never from this
  package.
- `tsup.base.ts` at the repo root contains `dts: { resolve: [/^@maib\/internal-schemas(\/.+)?$/] }`
  so the legacy `resolve` lib used by tsup's `.d.ts` pipeline can find subpath types when consumer
  packages build.
- `tsup.config.ts` here copies the built `schemas-builder.{js,cjs,d.ts,d.cts}` and
  `test-helpers.{…}` files from `dist/` to the package root after each build for the same legacy
  resolver — those copies are listed in `.gitignore`.

## Collision strategies

`buildSchemasBundle` keys validators by the trailing segment of each schema id
(`maib.checkout.RefundRequest` → `RefundRequest`). When two schemas share a trailing segment (e.g.
`RefundRequest` lives in both checkout and ecommerce, and `@maib/merchants` aggregates them), pick a
strategy via the `onCollision` option:

| Strategy              | Effect                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"throw"` _(default)_ | Hard error. Use for per-package bundles where collisions indicate a developer mistake.                                                                  |
| `"namespace"`         | Dotted key, e.g. `"checkout.RefundRequest"`. Unique short names keep the short-name key.                                                                |
| `"namespace-prefix"`  | PascalCase concatenation, e.g. `"CheckoutRefundRequest"`. Matches the type aliases that `@maib/merchants` already exports for cross-package collisions. |

`scripts/build-schemas.mjs` exposes the same set via `--on-collision=<strategy>` so the on-disk file
names line up with the in-memory keys consumers will see at runtime.

## Source layout

```
src/
  constants.ts          # Plain-object enums (Language, PaymentStatus, RefundStatus, …)
  enums.ts              # Zod schemas for the same enums
  iso-4217.ts           # Currency code enum (ISO 4217)
  pagination-params.ts  # Shared PaginationParamsSchema
  schemas-builder.ts    # buildSchema, buildSchemasBundle, TypedSchemaDef
  test-helpers.ts       # buildBundleFromRegistry, extractSchema
  json-schema.d.ts      # JSONSchema / _JSONSchema structural types
  index.ts              # Root export — shared enums + pagination
```

## Scripts

```bash
pnpm -F @maib/internal-schemas build      # tsup + post-build root copies
pnpm -F @maib/internal-schemas dev        # tsup --watch
pnpm -F @maib/internal-schemas lint       # biome check src
pnpm -F @maib/internal-schemas lint:fix   # biome check --write src
pnpm -F @maib/internal-schemas typecheck  # tsc --noEmit
```

There is no `test` script — coverage lives in the consumer packages that exercise the helpers
through their own build outputs and `__tests__/` suites.
