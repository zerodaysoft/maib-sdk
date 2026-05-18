import { z } from "zod";

import { CurrencyEnum, PaymentStatusEnum } from "./enums";

export const CheckoutCallbackPayloadSchema = z
  .looseObject({
    checkoutId: z.string().meta({ description: "Unique identifier of the checkout." }),
    terminalId: z.string().nullish().meta({
      description: "Merchant terminal identifier.",
    }),
    amount: z.number().nonnegative().meta({ description: "Total checkout amount." }),
    currency: CurrencyEnum.meta({ description: "Checkout currency (ISO 4217)." }),
    completedAt: z.iso.datetime().meta({
      description: "Timestamp when the checkout was completed (ISO 8601-1:2019).",
    }),
    payerName: z.string().nullish().meta({ description: "Payer's name." }),
    payerEmail: z.email().nullish().meta({
      description: "Payer's email address.",
    }),
    payerPhone: z.string().nullish().meta({
      description: "Payer's phone number (MSISDN).",
    }),
    payerIp: z.ipv4().nullish().meta({
      description: "Payer's IPv4 address.",
    }),
    orderId: z.string().nullish().meta({
      description: "Merchant's order identifier.",
    }),
    orderDescription: z.string().nullish().meta({
      description: "Description of the purchased goods or services.",
    }),
    orderDeliveryAmount: z.number().nonnegative().nullish().meta({
      description: "Delivery amount, if specified.",
    }),
    orderDeliveryCurrency: CurrencyEnum.nullish().meta({
      description: "Delivery currency (ISO 4217).",
    }),
    paymentId: z.string().meta({ description: "Unique identifier of the payment." }),
    paymentAmount: z.number().nonnegative().meta({ description: "Payment amount." }),
    paymentCurrency: CurrencyEnum.meta({ description: "Payment currency (ISO 4217)." }),
    paymentStatus: PaymentStatusEnum.meta({ description: "Payment status." }),
    paymentExecutedAt: z.iso.datetime().meta({
      description: "Timestamp when the payment was executed (ISO 8601-1:2019).",
    }),
    senderIban: z.string().nullish().meta({
      description: "Sender's IBAN (for A2A payments).",
    }),
    senderName: z.string().meta({
      description: "Name of the sender (cardholder/account holder).",
    }),
    senderCardNumber: z.string().nullish().meta({
      description: "Masked card number used in the transaction.",
    }),
    retrievalReferenceNumber: z.string().meta({
      description: "Retrieval Reference Number (RRN/ARN).",
    }),
    processingStatus: z.string().nullish().meta({
      description: "Internal payment processing status.",
    }),
    processingStatusCode: z.string().nullish().meta({
      description: 'Provider/internal status code (e.g. `"00"`).',
    }),
    approvalCode: z.string().nullish().meta({
      description: "Provider approval code.",
    }),
    threeDsResult: z.string().nullish().meta({
      description: "3-D Secure authentication result (`Y`, `N`, `U`, etc.).",
    }),
    threeDsReason: z.string().nullish().meta({
      description: "Additional information on the 3DS result, if available.",
    }),
    paymentMethod: z.string().nullish().meta({
      description: "Payment method used (e.g. `Card`, `MiaQr`).",
    }),
  })
  .meta({
    id: "maib.checkout.CheckoutCallbackPayload",
    description:
      "Payload delivered to the merchant's configured `callbackUrl` after a checkout session finishes.",
  });
