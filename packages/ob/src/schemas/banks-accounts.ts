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
    logo: z.string().meta({
      description:
        "URL of the bank logo. Plain string — OBP examples are not always URL-valid, so the SDK does not enforce URL parsing.",
    }),
    website: z.string().meta({
      description: "Public website URL of the bank. Plain string for the same reason as `logo`.",
    }),
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
    product_code: z.string().optional().meta({
      description:
        "Product code of the account (e.g. `CURRENT`, `SAVINGS`). Replaces the legacy `type` field.",
    }),
    balance: ObAmountOfMoneySchema,
    account_routings: z.array(ObBankRoutingSchema).meta({
      description:
        'Routing entries identifying the account in payment networks. The IBAN is exposed here with `scheme: "IBAN"`.',
    }),
    account_attributes: z.array(z.record(z.string(), z.unknown())).optional().meta({
      description: "Free-form key/value attributes attached to the account.",
    }),
    tags: z.array(z.record(z.string(), z.unknown())).optional().meta({
      description: "Tag objects attached to the account.",
    }),
    views_available: z.array(ObAccountViewSchema).meta({
      description: "Views the caller can use against this account.",
    }),
  })
  .meta({
    id: "maib.ob.ObAccountDetails",
    description: "Full account record returned for an authenticated view.",
  });

export const ObCheckFundsResultSchema = z
  .looseObject({
    answer: z.enum(["yes", "no"]).meta({
      description: "Funds-available answer: `yes` if the funds can be reserved, otherwise `no`.",
    }),
    date: z.iso.datetime().meta({
      description: "Server time at which the check was performed (ISO 8601).",
    }),
    available_funds_request_id: z.string().meta({
      description:
        "Server-issued correlation id for this funds-available check. Quote it in support tickets.",
    }),
  })
  .meta({
    id: "maib.ob.ObCheckFundsResult",
    description:
      "Result returned by `GET /banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/funds-available`.",
  });
