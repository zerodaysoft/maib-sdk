import { z } from "zod";

import { Currency } from "@maib/core";

import { RtpStatusEnum } from "./enums";

export const RtpCallbackResultSchema = z
  .looseObject({
    rtpId: z.string().meta({ description: "RTP unique identifier." }),
    rtpStatus: RtpStatusEnum.meta({ description: "RTP status." }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    payId: z.string().meta({ description: "Payment unique identifier." }),
    amount: z.number().nonnegative().meta({ description: "Payment amount." }),
    commission: z.number().nonnegative().meta({ description: "Payment commission." }),
    currency: z.literal(Currency.MDL).meta({ description: "Payment currency (`MDL`)." }),
    payerName: z.string().meta({ description: "Payer abbreviated name." }),
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
        "Notification validation signature (Base64 SHA256 over sorted `result` fields + signatureKey).",
    }),
  })
  .meta({
    id: "maib.rtp.RtpCallbackPayload",
    description: "Callback notification envelope delivered to the merchant's callback URL.",
  });
