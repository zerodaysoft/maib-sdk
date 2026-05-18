import { z } from "zod";

import { Currency } from "@maib/core";

import { RtpStatusEnum } from "./enums";

export const RtpCallbackResultSchema = z
  .looseObject({
    rtpId: z.string().meta({ description: "RTP unique identifier." }),
    rtpStatus: RtpStatusEnum.meta({
      description: "Notification status. Upstream callbacks deliver `Accepted`.",
    }),
    orderId: z.string().optional().meta({
      description: "Merchant order identifier (if provided at create).",
    }),
    payId: z.string().meta({ description: "Unique payment identifier." }),
    amount: z.number().nonnegative().meta({ description: "Payment amount." }),
    commission: z.number().nonnegative().meta({ description: "Payment commission." }),
    currency: z.literal(Currency.MDL).meta({
      description: "Payment currency. Possible values: `MDL` (ISO 4217).",
    }),
    payerName: z.string().meta({ description: 'Payer abbreviated name (e.g., `"John D."`).' }),
    payerIban: z.string().meta({ description: "Payer IBAN." }),
    executedAt: z.iso.datetime().meta({
      description: "Payment execution timestamp (ISO 8601).",
    }),
  })
  .meta({
    id: "maib.rtp.RtpCallbackResult",
    description: "Transaction data embedded in an `RtpCallbackPayload`.",
  });

export const RtpCallbackPayloadSchema = z
  .looseObject({
    result: RtpCallbackResultSchema,
    signature: z.string().meta({
      description:
        "Validation signature (Base64) for integrity and authenticity: SHA256 over alphabetically sorted non-empty `result` fields joined by `:`, with the merchant `signatureKey` appended.",
    }),
  })
  .meta({
    id: "maib.rtp.RtpCallbackPayload",
    description: "Callback notification envelope delivered to the merchant's callback URL.",
  });
