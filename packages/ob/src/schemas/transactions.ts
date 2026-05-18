import { z } from "zod";

import { SortDirectionEnum } from "./enums";
import { ObAmountOfMoneySchema, ObBankRoutingSchema } from "./primitives";

export const ObTransactionDetailsSchema = z
  .looseObject({
    type: z.string().meta({ description: "Transaction kind label (e.g. `SANDBOX_TAN`)." }),
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

export const ObTransactionAccountSchema = z
  .looseObject({
    id: z.string().meta({ description: "Identifier of the participating account." }),
    holders: z
      .array(
        z.looseObject({
          name: z.string().meta({ description: "Account holder name." }),
        }),
      )
      .meta({
        description: "Holders associated with the account at the time of the transaction.",
      }),
    bank_routing: ObBankRoutingSchema,
    account_routings: z.array(ObBankRoutingSchema).meta({
      description: "Routing entries that identify the account.",
    }),
  })
  .meta({
    id: "maib.ob.ObTransactionAccount",
    description: "Account participating on either side of a transaction.",
  });

export const ObTransactionSchema = z
  .looseObject({
    id: z.string().meta({ description: "Unique transaction identifier." }),
    this_account: ObTransactionAccountSchema,
    other_account: ObTransactionAccountSchema,
    details: ObTransactionDetailsSchema,
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
