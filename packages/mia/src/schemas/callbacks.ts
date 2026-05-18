import { z } from "zod";

import { Currency } from "@maib/core";

import { QrStatus } from "../constants";

export const MiaCallbackResultSchema = z
  .looseObject({
    qrId: z.string().meta({ description: "QR unique identifier." }),
    extensionId: z.string().optional().meta({
      description: "QR extension identifier (for Hybrid).",
    }),
    qrStatus: z.enum([QrStatus.ACTIVE, QrStatus.PAID]).meta({
      description: "QR status in the notification. Known values: `Active`, `Paid`.",
    }),
    payId: z.string().meta({ description: "Payment unique identifier." }),
    referenceId: z.string().optional().meta({
      description: "RRN code from the instant payments service (max 15 chars).",
    }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    amount: z.number().nonnegative().meta({ description: "Payment amount." }),
    commission: z.number().nonnegative().meta({ description: "Payment commission." }),
    currency: z.literal(Currency.MDL).meta({ description: "Payment currency (`MDL`)." }),
    payerName: z.string().meta({ description: "Abbreviated name of the payer." }),
    payerIban: z.string().meta({ description: "Payer's IBAN." }),
    executedAt: z.iso.datetime().meta({
      description: "Payment execution timestamp (ISO 8601).",
    }),
    terminalId: z.string().optional().meta({
      description: "Terminal ID provided by the bank.",
    }),
  })
  .meta({
    id: "maib.mia.MiaCallbackResult",
    description: "Transaction data embedded in a `MiaCallbackPayload`.",
  });

export const MiaCallbackPayloadSchema = z
  .looseObject({
    result: MiaCallbackResultSchema,
    signature: z.string().meta({
      description: "Notification validation signature.",
    }),
  })
  .meta({
    id: "maib.mia.MiaCallbackPayload",
    description: "Callback notification envelope delivered to the merchant's callback URL.",
  });
