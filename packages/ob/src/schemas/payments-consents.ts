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
      description: "Channel used to deliver the challenge (e.g. `SMS_OTP`).",
    }),
  })
  .meta({
    id: "maib.ob.ObChallenge",
    description: "Strong customer authentication challenge attached to a request.",
  });

export const ObTransactionRequestTypeSchema = z
  .looseObject({
    value: z.string().meta({
      description: "Transaction request kind (e.g. `SANDBOX_TAN`, `SEPA`).",
    }),
    charge: z
      .looseObject({
        summary: z.string().meta({ description: "Human-readable charge summary." }),
        value: ObAmountOfMoneySchema,
      })
      .meta({
        description: "Charge applied to the transaction request.",
      }),
  })
  .meta({
    id: "maib.ob.ObTransactionRequestType",
    description: "Available transaction request type and its associated charge.",
  });

export const ObTransactionRequestSchema = z
  .looseObject({
    id: z.string().meta({ description: "Unique transaction request identifier." }),
    type: z.string().meta({ description: "Type of the transaction request." }),
    status: TransactionRequestStatusEnum.meta({
      description: "Current status (`INITIATED`, `COMPLETED`, `FAILED`, ...).",
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
      description: "Consent status (e.g. `INITIATED`, `ACCEPTED`, `REJECTED`).",
    }),
  })
  .meta({
    id: "maib.ob.ObConsent",
    description: "Consent record granting an application access to user resources.",
  });

export const CreateConsentBodySchema = z
  .object({
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
  })
  .meta({
    id: "maib.ob.CreateConsentBody",
    description: "Body accepted by `ObClient.createConsent`.",
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
