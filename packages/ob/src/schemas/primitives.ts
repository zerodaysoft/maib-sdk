import { z } from "zod";

export const ObAmountOfMoneySchema = z
  .looseObject({
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .meta({
        description: "ISO 4217 currency code (e.g. `MDL`, `EUR`).",
      }),
    amount: z.string().meta({
      description: "Decimal amount expressed as a string to preserve precision.",
    }),
  })
  .meta({
    id: "maib.ob.ObAmountOfMoney",
    description: "Currency and amount pair used across OBP balances and transactions.",
  });

export const ObBankRoutingSchema = z
  .looseObject({
    scheme: z.string().meta({
      description: "Routing scheme name (e.g. `BIC`, `IBAN`).",
    }),
    address: z.string().meta({
      description: "Routing address value matching the declared scheme.",
    }),
  })
  .meta({
    id: "maib.ob.ObBankRouting",
    description: "Pair of routing scheme and address used to identify a bank or account.",
  });

export const ObAccountViewSchema = z
  .looseObject({
    id: z.string().meta({ description: "Stable view identifier (e.g. `owner`, `public`)." }),
    short_name: z.string().meta({ description: "Short, display-friendly view name." }),
    is_public: z.boolean().meta({
      description: "Whether the view is publicly accessible without an explicit consent.",
    }),
  })
  .meta({
    id: "maib.ob.ObAccountView",
    description: "A named projection of an account exposed to a consumer.",
  });

export const ObAccountOwnerSchema = z
  .looseObject({
    id: z.string().meta({ description: "Identifier of the account owner (user or entity)." }),
    provider: z.string().meta({
      description: "Identity provider that issued the owner identifier.",
    }),
    display_name: z.string().meta({ description: "Human-readable owner name." }),
  })
  .meta({
    id: "maib.ob.ObAccountOwner",
    description: "Owner principal attached to an account.",
  });
