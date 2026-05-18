import { z } from "zod";

import { SortDirectionEnum } from "./enums";
import { ObAmountOfMoneySchema, ObBankRoutingSchema } from "./primitives";

export const ObTransactionDetailsSchema = z
  .looseObject({
    type: z.string().meta({ description: "Transaction kind label (e.g. `AC`, `SANDBOX_TAN`)." }),
    description: z.string().meta({ description: "Free-form transaction description." }),
    posted: z.iso.datetime().meta({
      description: "Posting timestamp at which the transaction was registered (ISO 8601).",
    }),
    completed: z.iso.datetime().meta({
      description: "Completion timestamp at which the transaction settled (ISO 8601).",
    }),
    new_balance: ObAmountOfMoneySchema,
    value: ObAmountOfMoneySchema,
  })
  .meta({
    id: "maib.ob.ObTransactionDetails",
    description: "Posting and settlement details of an account transaction.",
  });

const AccountHolderShape = z.looseObject({
  name: z.string().meta({ description: "Account holder name." }),
  is_alias: z.boolean().meta({
    description: "True if `name` is an alias rather than the legal holder name.",
  }),
});

export const ObTransactionThisAccountSchema = z
  .looseObject({
    id: z.string().meta({ description: "Identifier of the participating account." }),
    holders: z.array(AccountHolderShape).meta({
      description: "Holders associated with the account at the time of the transaction.",
    }),
    bank_routing: ObBankRoutingSchema,
    account_routings: z.array(ObBankRoutingSchema).meta({
      description: "Routing entries that identify the account.",
    }),
  })
  .meta({
    id: "maib.ob.ObTransactionThisAccount",
    description: "Local side of a transaction (`this_account`). Holders are exposed as an array.",
  });

export const ObTransactionOtherAccountSchema = z
  .looseObject({
    id: z.string().meta({ description: "Identifier of the counterparty account." }),
    holder: AccountHolderShape.meta({
      description: "Counterparty holder. Singular on the other-account side (`other_account`).",
    }),
    bank_routing: ObBankRoutingSchema,
    account_routings: z.array(ObBankRoutingSchema).meta({
      description: "Routing entries that identify the counterparty account.",
    }),
  })
  .meta({
    id: "maib.ob.ObTransactionOtherAccount",
    description: "Counterparty side of a transaction (`other_account`).",
  });

/**
 * @deprecated Use {@link ObTransactionThisAccountSchema} for `this_account` or
 *   {@link ObTransactionOtherAccountSchema} for `other_account`. Kept for
 *   backward compatibility with older callers; the two sides have different
 *   holder shapes upstream (`holders[]` vs single `holder`).
 */
export const ObTransactionAccountSchema = ObTransactionThisAccountSchema;

export const ObTransactionSchema = z
  .looseObject({
    id: z.string().meta({ description: "Unique transaction identifier." }),
    this_account: ObTransactionThisAccountSchema,
    other_account: ObTransactionOtherAccountSchema,
    details: ObTransactionDetailsSchema,
    transaction_attributes: z.array(z.record(z.string(), z.unknown())).optional().meta({
      description:
        "Free-form attribute objects attached to the transaction. Required by upstream `TransactionJsonV300` but tolerated as optional here for forward-compat.",
    }),
    metadata: z.record(z.string(), z.unknown()).meta({
      description: "Provider-defined metadata attached to the transaction.",
    }),
  })
  .meta({
    id: "maib.ob.ObTransaction",
    description: "Single transaction record returned by the OBP transactions endpoints.",
  });

export const ListTransactionsParamsSchema = z
  .object({
    limit: z.int().positive().optional().meta({
      description: "Maximum number of transactions to return.",
    }),
    offset: z.int().nonnegative().optional().meta({
      description: "Number of transactions to skip before collecting results.",
    }),
    sort_direction: SortDirectionEnum.optional(),
    from_date: z.iso.datetime().optional().meta({
      description: "Lower bound (inclusive) for posting date (ISO 8601).",
    }),
    to_date: z.iso.datetime().optional().meta({
      description: "Upper bound (inclusive) for posting date (ISO 8601).",
    }),
  })
  .meta({
    id: "maib.ob.ListTransactionsParams",
    description: "Query parameters accepted by `ObClient.listTransactions`.",
  });
