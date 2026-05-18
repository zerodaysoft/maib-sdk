import { z } from "zod";

import {
  ObAccountOwnerSchema,
  ObAccountViewSchema,
  ObAmountOfMoneySchema,
  ObBankRoutingSchema,
} from "./primitives";

export const ObBankSchema = z
  .looseObject({
    id: z.string().meta({ description: "Unique bank identifier." }),
    short_name: z.string().meta({ description: "Short bank name." }),
    full_name: z.string().meta({ description: "Full legal bank name." }),
    logo: z.url().meta({ description: "URL of the bank logo." }),
    website: z.url().meta({ description: "Public website URL of the bank." }),
    bank_routings: z.array(ObBankRoutingSchema).meta({
      description: "Routing entries used to identify the bank in payment networks.",
    }),
  })
  .meta({
    id: "maib.ob.ObBank",
    description: "Bank entity exposed by the OBP `/banks` endpoints.",
  });

export const ObAccountSchema = z
  .looseObject({
    id: z.string().meta({ description: "Account identifier within the bank." }),
    label: z.string().meta({ description: "User-defined label or display name." }),
    bank_id: z.string().meta({ description: "Identifier of the bank that holds the account." }),
    views_available: z.array(ObAccountViewSchema).meta({
      description: "Views the caller can use against this account.",
    }),
  })
  .meta({
    id: "maib.ob.ObAccount",
    description: "Account summary returned by the OBP `/accounts` endpoints.",
  });

export const ObAccountDetailsSchema = z
  .looseObject({
    bank_id: z.string().meta({ description: "Identifier of the bank that holds the account." }),
    id: z.string().meta({ description: "Account identifier within the bank." }),
    label: z.string().meta({ description: "User-defined label or display name." }),
    number: z.string().meta({ description: "Internal account number." }),
    owners: z.array(ObAccountOwnerSchema).meta({
      description: "Principals that own the account.",
    }),
    type: z.string().meta({ description: "Account type (e.g. `Current`, `Savings`)." }),
    balance: ObAmountOfMoneySchema,
    IBAN: z.string().meta({ description: "IBAN of the account." }),
    views_available: z.array(ObAccountViewSchema).meta({
      description: "Views the caller can use against this account.",
    }),
  })
  .meta({
    id: "maib.ob.ObAccountDetails",
    description: "Full account record returned for an authenticated view.",
  });
