---
package: "@maib/ob"
description: How to validate @maib/ob payloads at runtime.
---

# Validating @maib/ob payloads at runtime

`@maib/ob` ships four subpaths for runtime validation:

| Subpath                            | Resolves to                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@maib/ob/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`) plus `JSONSchema` / `_JSONSchema` types. |
| `@maib/ob/schemas/<TypeName>`      | Typed wrapper – default export carries `TypedSchemaDef<T>` so `buildSchema` infers the SDK type.         |
| `@maib/ob/schemas/<TypeName>.json` | Raw JSON Schema, one self-contained file per type with `$defs` embedded.                                 |
| `@maib/ob/schemas/bundle.json`     | Full JSON Schema bundle for the package.                                                                 |

`@maib/ob` is standalone (no `@maib/core` runtime dep), so its bundle only contains `maib.ob.*` ids
– core, checkout, ecommerce, mia, and rtp schemas never leak in.

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – typed wrapper (preferred)

Import the typed wrapper (no `.json` suffix). The default export carries a `TypedSchemaDef<T>` so
`buildSchema` infers `ParsingValidator<T>` automatically – no generic argument needed:

```ts
import { z } from "zod";
import { buildSchema } from "@maib/ob/schemas";
import ObAccountDef from "@maib/ob/schemas/ObAccount";
import ObTransactionDef from "@maib/ob/schemas/ObTransaction";

export const ObAccountSchema = buildSchema(z.fromJSONSchema, ObAccountDef);
// → ParsingValidator<ObAccount> (inferred)
export const ObTransactionSchema = buildSchema(z.fromJSONSchema, ObTransactionDef);
// → ParsingValidator<ObTransaction> (inferred)

const accounts = await client.listAccounts(bankId);
for (const account of accounts) {
  const result = ObAccountSchema.safeParse(account);
  if (!result.success) console.warn("ObAccount drifted:", result.error);
}

// `ObTransactionSchema` resolves nested $refs
// (this_account, other_account, details → ObAmountOfMoney).
const tx = ObTransactionSchema.parse(await client.getTransaction(bankId, accountId, txId));
```

## Raw JSON (explicit generic)

The original `with { type: "json" }` import style still works and is unchanged. Pass the SDK
interface as the explicit generic since the raw JSON does not carry the phantom type marker:

```ts
import { z } from "zod";
import type { ObAccount, CreateConsentBody } from "@maib/ob";
import { buildSchema } from "@maib/ob/schemas";
import ObAccountDef from "@maib/ob/schemas/ObAccount.json" with { type: "json" };
import CreateConsentBodyDef from "@maib/ob/schemas/CreateConsentBody.json" with { type: "json" };

export const ObAccountSchema = buildSchema<ObAccount>(z.fromJSONSchema, ObAccountDef);
export const CreateConsentBodySchema = buildSchema<CreateConsentBody>(
  z.fromJSONSchema,
  CreateConsentBodyDef,
);
```

## Bulk import – every schema at once

```ts
import { z } from "zod";
import { buildSchemasBundle } from "@maib/ob/schemas";
import bundleDef from "@maib/ob/schemas/bundle.json" with { type: "json" };

export const Schemas = buildSchemasBundle(z.fromJSONSchema, bundleDef);

Schemas.ObBank.parse(await client.getBank(bankId));
Schemas.ObAccountDetails.parse(await client.getAccount(bankId, accountId));
```

## Reference

Full reference (`buildSchema` / `buildSchemasBundle` API, `ParsingValidator` contract, Standard
Schema compatibility, Ajv and Valibot patterns, strictness, what ships) lives in
[`@maib/core/docs/schemas.md`](../../core/docs/schemas.md).
