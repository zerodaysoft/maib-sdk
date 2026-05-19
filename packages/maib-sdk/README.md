# maib-sdk

> **Deprecated** — this package has been replaced by
> [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants).

## Migrate

```bash
npm uninstall maib-sdk && npm install @maib/merchants
```

Update your imports:

```typescript
import { ... } from "@maib/merchants";
```

Individual merchant-API packages are also available:
[`@maib/checkout`](https://www.npmjs.com/package/@maib/checkout),
[`@maib/ecommerce`](https://www.npmjs.com/package/@maib/ecommerce),
[`@maib/rtp`](https://www.npmjs.com/package/@maib/rtp),
[`@maib/mia`](https://www.npmjs.com/package/@maib/mia) – `@maib/merchants` re-exports all four.

> **`@maib/ob` (Open Banking / PSD2) is a separate, standalone package.** It is **not** part of
> `@maib/merchants` and was never part of `maib-sdk`. Install it independently if you need account,
> transaction, consent, or open-banking payment APIs: `npm install @maib/ob`.

## AI / agent coding

This package is a **deprecated shim** – no new code should be written against it.

- Migrate to [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants) (umbrella over
  checkout, ecommerce, rtp, mia) or the single-product packages listed above. The public TypeScript
  API is the same.
- [`@maib/ob`](https://www.npmjs.com/package/@maib/ob) is a **separate** standalone package outside
  the `@maib/merchants` umbrella – PSD2 / Open Banking has its own auth, client, and schemas.
  Install it directly when you need account/transaction/consent APIs.
- Canonical references live in the replacement packages, not here. Each ships
  `docs/sdk-reference.md` (full TS surface) and `docs/schemas.md` (runtime validation guide).
- **JSON Schemas live in the replacement packages, not in `maib-sdk`.** Each `@maib/<pkg>` exposes
  `@maib/<pkg>/schemas/bundle.json`, `@maib/<pkg>/schemas/<TypeName>.json`, and a typed `.ts`
  wrapper at `@maib/<pkg>/schemas/<TypeName>` (no `.json` suffix). The wrapper carries a phantom
  `__maibType` so `buildSchema(z.fromJSONSchema, Def)` infers `ParsingValidator<T>` without an
  explicit generic – preferred over the raw-JSON pattern.
- If you find yourself wanting to add a feature here, add it to the corresponding `@maib/*` package
  instead and update its README/docs.
