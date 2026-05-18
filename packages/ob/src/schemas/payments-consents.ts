import { z } from "zod";

import { ConsentStatusEnum, TransactionRequestStatusEnum } from "./enums";
import { ObAmountOfMoneySchema } from "./primitives";

export const ObChallengeSchema = z
  .looseObject({
    id: z.string().meta({ description: "Identifier of the issued challenge." }),
    allowed_attempts: z.int().nonnegative().meta({
      description: "Number of attempts the user has to answer the challenge.",
    }),
    challenge_type: z.string().meta({
      description: "Challenge kind/channel identifier (e.g. `SANDBOX_TAN`, `SMS_OTP`).",
    }),
  })
  .meta({
    id: "maib.ob.ObChallenge",
    description: "Strong customer authentication challenge attached to a request.",
  });

export const ObTransactionRequestTypeSchema = z
  .looseObject({
    transaction_request_type: z.string().meta({
      description:
        "Transaction request kind (e.g. `SandboxTan`/`SANDBOX_TAN`, `SEPA`, `COUNTERPARTY`).",
    }),
  })
  .meta({
    id: "maib.ob.ObTransactionRequestType",
    description:
      "Entry from `GET /banks/{BANK_ID}/transaction-request-types`. Items expose just the type name; the associated charge appears on `ObTransactionRequest` after a request is created.",
  });

export const ObTransactionRequestSchema = z
  .looseObject({
    id: z.string().meta({ description: "Unique transaction request identifier." }),
    type: z.string().meta({ description: "Type of the transaction request." }),
    status: TransactionRequestStatusEnum.meta({
      description:
        "Current status (`INITIATED`, `INITIALISED`, `COMPLETED`, `FAILED`, `FORWARDED`, `REJECTED`, `NEXT_CHALLENGE_PENDING`, ...).",
    }),
    from: z
      .looseObject({
        bank_id: z.string().meta({ description: "Originating bank identifier." }),
        account_id: z.string().meta({ description: "Originating account identifier." }),
      })
      .meta({
        description: "Originating bank and account.",
      }),
    details: z.record(z.string(), z.unknown()).meta({
      description: "Transaction-type-specific payload echoed from the request body.",
    }),
    charge: z
      .looseObject({
        summary: z.string().meta({ description: "Human-readable charge summary." }),
        value: ObAmountOfMoneySchema,
      })
      .meta({
        description: "Charge applied to the transaction request.",
      }),
    challenge: ObChallengeSchema,
    start_date: z.iso.datetime().meta({ description: "Request creation timestamp (ISO 8601)." }),
    end_date: z.iso.datetime().meta({
      description: "Request completion or expiry timestamp (ISO 8601).",
    }),
    transaction_ids: z.array(z.string()).meta({
      description: "Transactions produced by the request (empty until settled).",
    }),
  })
  .meta({
    id: "maib.ob.ObTransactionRequest",
    description: "Pending or completed transaction request returned by the OBP API.",
  });

export const CreatePaymentBodySchema = z
  .object({
    to: z.record(z.string(), z.unknown()).meta({
      description: "Counterparty descriptor — shape depends on the transaction request type.",
    }),
    value: ObAmountOfMoneySchema,
    description: z.string().meta({
      description: "Free-form payment description shown to the payer and payee.",
    }),
  })
  .meta({
    id: "maib.ob.CreatePaymentBody",
    description: "Body accepted by `ObClient.createPayment`.",
  });

export const ObConsentSchema = z
  .looseObject({
    consent_id: z.string().meta({ description: "Unique consent identifier." }),
    jwt: z.string().meta({
      description: "Signed JWT representation of the consent for downstream calls.",
    }),
    status: ConsentStatusEnum.meta({
      description:
        "Consent status (e.g. `INITIATED`, `AWAITINGAUTHORISATION`, `ACCEPTED`, `AUTHORISED`, `REJECTED`).",
    }),
  })
  .meta({
    id: "maib.ob.ObConsent",
    description: "Consent record granting an application access to user resources.",
  });

export const CreateConsentBodySchema = z
  .looseObject({
    everything: z.boolean().meta({
      description: "When true, requests access to every resource of the caller.",
    }),
    views: z
      .array(
        z.object({
          bank_id: z.string().meta({ description: "Bank identifier." }),
          account_id: z.string().meta({ description: "Account identifier." }),
          view_id: z.string().meta({ description: "View identifier." }),
        }),
      )
      .meta({
        description: "Per-account view grants requested by the consent.",
      }),
    entitlements: z
      .array(
        z.object({
          bank_id: z.string().meta({ description: "Bank identifier the role applies to." }),
          role_name: z.string().meta({ description: "Role name being requested." }),
        }),
      )
      .meta({
        description: "Per-bank role grants requested by the consent.",
      }),
    consumer_id: z.string().optional().meta({
      description: "Identifier of the OBP consumer (app) the consent is bound to.",
    }),
    email: z.email().optional().meta({
      description: "Email address used to deliver the SCA challenge.",
    }),
    phone_number: z.string().optional().meta({
      description: "Phone number used to deliver the SCA challenge (E.164).",
    }),
    valid_from: z.iso.datetime().optional().meta({
      description: "Earliest moment from which the consent becomes usable (ISO 8601).",
    }),
    time_to_live: z.int().positive().optional().meta({
      description: "Lifetime of the consent in seconds, counted from `valid_from`.",
    }),
    access: z.record(z.string(), z.unknown()).optional().meta({
      description:
        "Berlin Group access object — granular `accounts`, `balances`, `transactions` arrays as defined by the BG NextGenPSD2 standard.",
    }),
    recurringIndicator: z.boolean().optional().meta({
      description: "Berlin Group flag: true for recurring AIS access, false for one-off.",
    }),
    validUntil: z.iso.date().optional().meta({
      description: "Berlin Group cutoff date (YYYY-MM-DD) for AIS access.",
    }),
    frequencyPerDay: z.int().positive().optional().meta({
      description: "Berlin Group cap on the number of consent uses per day.",
    }),
    combinedServiceIndicator: z.boolean().optional().meta({
      description: "Berlin Group flag declaring AIS+PIS in the same consent session.",
    }),
  })
  .meta({
    id: "maib.ob.CreateConsentBody",
    description: "Body accepted by `ObClient.createConsent`.",
  });

export const ObConsentInfoSchema = z
  .looseObject({
    consent_id: z.string().meta({ description: "Unique consent identifier." }),
    jwt: z.string().meta({ description: "Signed JWT representation of the consent." }),
    jwt_payload: z.record(z.string(), z.unknown()).meta({
      description: "Decoded payload of the consent JWT.",
    }),
    status: ConsentStatusEnum.meta({
      description: "Current consent lifecycle status.",
    }),
    consent_reference_id: z.string().meta({
      description: "Stable reference id for cross-referencing the consent across systems.",
    }),
    api_version: z.string().meta({
      description: "OBP API version under which the consent was issued.",
    }),
    api_standard: z.string().meta({
      description: "API standard family (e.g. `OBP`, `Berlin Group`).",
    }),
    consumer_id: z.string().meta({
      description: "Identifier of the consumer (app) the consent is bound to.",
    }),
    created_by_user_id: z.string().meta({
      description: "Identifier of the user that initiated the consent.",
    }),
    last_usage_date: z.iso.datetime().meta({
      description: "Last moment the consent was successfully used (ISO 8601).",
    }),
    last_action_date: z.iso.datetime().meta({
      description: "Last moment the consent state changed (ISO 8601).",
    }),
    jwt_expires_at: z.iso.datetime().meta({
      description: "Expiry of the underlying JWT (ISO 8601).",
    }),
  })
  .meta({
    id: "maib.ob.ObConsentInfo",
    description:
      "Consent summary returned by `GET /my/consents` and `GET /banks/{BANK_ID}/my/consents`. Richer than `ObConsent` returned at create/challenge time.",
  });

export const AnswerConsentChallengeBodySchema = z
  .object({
    answer: z.string().meta({
      description: "Challenge response value supplied by the user.",
    }),
  })
  .meta({
    id: "maib.ob.AnswerConsentChallengeBody",
    description: "Body accepted by `ObClient.answerConsentChallenge`.",
  });
