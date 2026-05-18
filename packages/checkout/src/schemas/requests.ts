import { z } from "zod";

import {
  CheckoutStatusEnum,
  CurrencyEnum,
  LanguageEnum,
  PaginationParamsSchema,
  PaymentStatusEnum,
} from "./enums";

export const OrderItemSchema = z
  .looseObject({
    externalId: z.string().optional().meta({
      description: "External product identifier (SKU).",
    }),
    title: z.string().max(125).optional().meta({
      description: "Product name or title. Maximum 125 characters.",
    }),
    amount: z.number().optional().meta({
      description: "Item price, in major currency units.",
    }),
    currency: CurrencyEnum.optional().meta({
      description: "ISO 4217 code of the item currency.",
    }),
    quantity: z.int().optional().meta({
      description: "Number of items ordered.",
    }),
    displayOrder: z.int().optional().meta({
      description: "Optional display order index.",
    }),
  })
  .meta({
    id: "maib.checkout.OrderItem",
    description: "Single line item inside an `OrderInfo`.",
  });

export const OrderInfoSchema = z
  .looseObject({
    id: z.string().optional().meta({
      description: "Merchant's order identifier.",
    }),
    description: z.string().optional().meta({
      description: "Description or purpose of the order.",
    }),
    date: z.iso.datetime().optional().meta({
      description: "Order creation timestamp (ISO 8601).",
    }),
    orderAmount: z.number().optional().meta({
      description: "Order subtotal (without delivery).",
    }),
    orderCurrency: CurrencyEnum.optional().meta({
      description: "Currency for the order amount.",
    }),
    deliveryAmount: z.number().optional().meta({
      description: "Delivery amount.",
    }),
    deliveryCurrency: CurrencyEnum.optional().meta({
      description: "Currency for the delivery amount.",
    }),
    items: z.array(OrderItemSchema).optional().meta({
      description: "List of order items.",
    }),
  })
  .meta({
    id: "maib.checkout.OrderInfo",
    description: "Order context attached to a checkout session.",
  });

export const PayerInfoSchema = z
  .looseObject({
    name: z.string().optional().meta({ description: "Payer full name." }),
    email: z.email().optional().meta({ description: "Payer email address." }),
    phone: z.string().optional().meta({ description: "Payer phone number (E.164 format)." }),
    ip: z
      .union([z.ipv4(), z.ipv6()])
      .optional()
      .meta({ description: "IP address of the payer (IPv4 or IPv6)." }),
    userAgent: z.string().optional().meta({
      description: "User agent string of the payer's device.",
    }),
  })
  .meta({
    id: "maib.checkout.PayerInfo",
    description: "Payer context attached to a checkout session.",
  });

export const CreateSessionRequestSchema = z
  .object({
    amount: z.number().positive().meta({
      description: "Total amount to be charged, in major currency units.",
    }),
    currency: CurrencyEnum.meta({
      description: "ISO 4217 currency code (e.g. `MDL`).",
    }),
    orderInfo: OrderInfoSchema.optional().meta({
      description: "Order details including ID, description, date, amounts and items.",
    }),
    payerInfo: PayerInfoSchema.optional().meta({
      description: "Information about the payer (name, contact, IP, user agent).",
    }),
    language: LanguageEnum.optional().meta({
      description: "Preferred language for the checkout interface (`ro`, `ru`, `en`).",
    }),
    callbackUrl: z.url().optional().meta({
      description: "URL to which payment status will be sent after processing.",
    }),
    successUrl: z.url().optional().meta({
      description: "Redirect URL after successful payment.",
    }),
    failUrl: z.url().optional().meta({
      description: "Redirect URL after failed or cancelled payment.",
    }),
  })
  .meta({
    id: "maib.checkout.CreateSessionRequest",
    description: "Request body for `CheckoutClient.createSession`.",
  });

export const ListSessionsParamsSchema = z
  .intersection(
    PaginationParamsSchema,
    z.object({
      id: z.string().optional().meta({ description: "Filter by checkout ID." }),
      orderId: z.string().optional().meta({ description: "Filter by merchant order ID." }),
      status: CheckoutStatusEnum.optional().meta({
        description: "Checkout status filter (e.g. `Completed`).",
      }),
      minAmount: z.number().optional().meta({ description: "Minimum checkout amount." }),
      maxAmount: z.number().optional().meta({ description: "Maximum checkout amount." }),
      currency: CurrencyEnum.optional().meta({ description: "Currency code (ISO 4217)." }),
      language: LanguageEnum.optional().meta({ description: "Checkout language." }),
      payerName: z.string().optional().meta({ description: "Payer name." }),
      payerEmail: z.email().optional().meta({ description: "Payer email." }),
      payerPhone: z.string().optional().meta({ description: "Payer phone." }),
      payerIp: z
        .union([z.ipv4(), z.ipv6()])
        .optional()
        .meta({ description: "Payer IP address (IPv4 or IPv6)." }),
      createdAtFrom: z.iso.datetime().optional().meta({
        description: "Return records created after this timestamp (ISO 8601).",
      }),
      createdAtTo: z.iso.datetime().optional().meta({
        description: "Return records created before this timestamp (ISO 8601).",
      }),
      expiresAtFrom: z.iso.datetime().optional().meta({
        description: "Return records expiring after this timestamp (ISO 8601).",
      }),
      expiresAtTo: z.iso.datetime().optional().meta({
        description: "Return records expiring before this timestamp (ISO 8601).",
      }),
      cancelledAtFrom: z.iso.datetime().optional().meta({
        description: "Return records cancelled after this timestamp (ISO 8601).",
      }),
      cancelledAtTo: z.iso.datetime().optional().meta({
        description: "Return records cancelled before this timestamp (ISO 8601).",
      }),
      failedAtFrom: z.iso.datetime().optional().meta({
        description: "Return records failed after this timestamp (ISO 8601).",
      }),
      failedAtTo: z.iso.datetime().optional().meta({
        description: "Return records failed before this timestamp (ISO 8601).",
      }),
      completedAtFrom: z.iso.datetime().optional().meta({
        description: "Return records completed after this timestamp (ISO 8601).",
      }),
      completedAtTo: z.iso.datetime().optional().meta({
        description: "Return records completed before this timestamp (ISO 8601).",
      }),
    }),
  )
  .meta({
    id: "maib.checkout.ListSessionsParams",
    description: "Query parameters for `CheckoutClient.listSessions`.",
  });

export const ListPaymentsParamsSchema = z
  .intersection(
    PaginationParamsSchema,
    z.object({
      paymentId: z.string().optional().meta({
        description: "Filter by a specific payment identifier.",
      }),
      paymentIntentId: z.string().optional().meta({
        description: "Filter payments associated with a specific payment intent.",
      }),
      terminalId: z.string().optional().meta({
        description: "Identifier of the terminal that initiated the payment.",
      }),
      amountFrom: z.number().optional().meta({
        description: "Minimum payment amount (inclusive).",
      }),
      amountTo: z.number().optional().meta({ description: "Maximum payment amount (inclusive)." }),
      currency: CurrencyEnum.optional().meta({
        description: "Currency code of the payment (ISO 4217).",
      }),
      orderId: z.string().optional().meta({
        description: "Merchant order identifier associated with the payment.",
      }),
      note: z.string().optional().meta({ description: "Filter payments by note content." }),
      status: PaymentStatusEnum.optional().meta({
        description: "Payment status filter (e.g. `Executed`).",
      }),
      executedAtFrom: z.iso.datetime().optional().meta({
        description: "Start of execution date interval (inclusive, ISO 8601).",
      }),
      executedAtTo: z.iso.datetime().optional().meta({
        description: "End of execution date interval (inclusive, ISO 8601).",
      }),
      recipientIban: z.string().optional().meta({ description: "IBAN of the payment recipient." }),
      referenceNumber: z.string().optional().meta({
        description: "Reference number assigned to the payment.",
      }),
      senderIban: z.string().optional().meta({ description: "IBAN of the payment sender." }),
      senderName: z.string().optional().meta({ description: "Name of the payment sender." }),
      providerType: z.string().optional().meta({
        description: "Provider channel used for the payment (e.g. `QR`).",
      }),
      mcc: z.string().optional().meta({
        description: "Merchant Category Code associated with the payment.",
      }),
      type: z.string().optional().meta({ description: "Payment type (e.g. `MIA`)." }),
    }),
  )
  .meta({
    id: "maib.checkout.ListPaymentsParams",
    description: "Query parameters for `CheckoutClient.listPayments`.",
  });

export const RefundRequestSchema = z
  .object({
    amount: z.number().positive().meta({
      description: "Total amount to be refunded, in major currency units.",
    }),
    reason: z.string().max(500).meta({
      description: "Reason for initiating the refund (max 500 characters).",
    }),
  })
  .meta({
    id: "maib.checkout.RefundRequest",
    description: "Request body for `CheckoutClient.refund`.",
  });
