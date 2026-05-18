---
package: "@maib/ob"
description: How to validate @maib/ob payloads at runtime.
---

# Validating @maib/ob payloads at runtime

`@maib/ob` ships three subpaths for runtime validation:

| Subpath                            | Resolves to                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `@maib/ob/schemas`                 | Validator-agnostic helper (`buildSchema`, `buildSchemasBundle`). |
| `@maib/ob/schemas/bundle.json`     | Full JSON Schema bundle for the package.                         |
| `@maib/ob/schemas/<TypeName>.json` | One self-contained file per type, with `$defs` embedded.         |

`@maib/ob` is standalone (no `@maib/core` runtime dep), so its bundle does not merge core's `$defs`.

The shipped artifact is plain JSON Schema (`draft-2020-12`). Convert it with Zod, Valibot, ArkType,
or any Standard-Schema-compatible validator and the resulting parser plugs into TanStack Form, tRPC,
hono validators, the AI SDK, and anything else that accepts a Standard Schema. Zod is the runnable
example below; swap the `convert` callback for any other.

The SDK does not validate responses at runtime – that is your choice.

## Quick start – Zod

```ts
import { z } from "zod";
import type { ObAccount, ObTransaction } from "@maib/ob";
import { buildSchema } from "@maib/ob/schemas";
import ObAccountDef from "@maib/ob/schemas/ObAccount.json" with { type: "json" };
import ObTransactionDef from "@maib/ob/schemas/ObTransaction.json" with { type: "json" };

export const ObAccountSchema = buildSchema<ObAccount>(z.fromJSONSchema, ObAccountDef);
export const ObTransactionSchema = buildSchema<ObTransaction>(z.fromJSONSchema, ObTransactionDef);

const accounts = await client.listAccounts(bankId);
for (const account of accounts) {
  const result = ObAccountSchema.safeParse(account);
  if (!result.success) console.warn("ObAccount drifted:", result.error);
}

// `ObTransactionSchema` resolves nested $refs
// (this_account, other_account, details → ObAmountOfMoney).
const tx = ObTransactionSchema.parse(await client.getTransaction(bankId, accountId, txId));
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
