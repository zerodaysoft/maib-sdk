import { z } from "zod";

import { RefundStatus } from "@maib/core";

import { CheckoutStatus } from "#constants";

import {
  CheckoutStatusEnum,
  CurrencyEnum,
  LanguageEnum,
  PaymentEntryPointEnum,
  PaymentStatusEnum,
  RefundStatusEnum,
  RefundTypeEnum,
} from "./enums";

export const CreateSessionResultSchema = z
  .looseObject({
    checkoutId: z.string().meta({
      description: "Unique identifier of the created checkout session.",
    }),
    checkoutUrl: z.url().meta({
      description: "URL to redirect the payer to the hosted checkout page.",
    }),
  })
  .meta({
    id: "maib.checkout.CreateSessionResult",
    description: "Result of `CheckoutClient.createSession`.",
  });

export const CancelSessionResultSchema = z
  .looseObject({
    checkoutId: z.string().meta({
      description: "Identifier of the cancelled checkout session.",
    }),
    status: z.literal(CheckoutStatus.CANCELLED).meta({
      description: "Final status of the checkout — always `Cancelled`.",
    }),
  })
  .meta({
    id: "maib.checkout.CancelSessionResult",
    description: "Result of `CheckoutClient.cancelSession`.",
  });

export const SessionOrderItemSchema = z
  .looseObject({
    externalId: z.string().nullable().optional().meta({
      description: "External product identifier (SKU).",
    }),
    title: z.string().nullable().optional().meta({
      description: "Product name or title.",
    }),
    amount: z.number().nonnegative().nullish().meta({
      description: "Item price, in major currency units.",
    }),
    currency: CurrencyEnum.nullable().optional().meta({
      description: "ISO 4217 code of the item currency.",
    }),
    quantity: z.int().nullable().optional().meta({
      description: "Number of items ordered.",
    }),
    displayOrder: z.int().nullable().optional().meta({
      description: "Optional display order index.",
    }),
  })
  .meta({
    id: "maib.checkout.SessionOrderItem",
    description: "Order item attached to a retrieved checkout session.",
  });

export const SessionOrderSchema = z
  .looseObject({
    id: z.string().nullable().optional().meta({
      description: "Merchant's order identifier.",
    }),
    description: z.string().nullable().optional().meta({
      description: "Order description.",
    }),
    amount: z.number().nonnegative().nullish().meta({
      description: "Order amount (major units).",
    }),
    currency: CurrencyEnum.nullable().optional().meta({
      description: "ISO 4217 currency code (e.g. `MDL`).",
    }),
    deliveryAmount: z.number().nonnegative().nullish().meta({
      description: "Delivery amount.",
    }),
    deliveryCurrency: CurrencyEnum.nullable().optional().meta({
      description: "ISO 4217 currency code of the delivery amount.",
    }),
    date: z.iso.datetime().nullable().optional().meta({
      description: "Order date (ISO 8601).",
    }),
    orderItems: z.array(SessionOrderItemSchema).nullable().optional().meta({
      description: "List of order items.",
    }),
  })
  .meta({
    id: "maib.checkout.SessionOrder",
    description: "Order summary embedded in a retrieved checkout session.",
  });

export const SessionPayerSchema = z
  .looseObject({
    name: z.string().nullable().optional().meta({ description: "Payer full name." }),
    email: z.email().nullable().optional().meta({ description: "Payer email address." }),
    phone: z.string().nullable().optional().meta({
      description: "Payer phone number (E.164 format).",
    }),
    ip: z.ipv4().nullable().optional().meta({ description: "IPv4 address of the payer." }),
    userAgent: z.string().nullable().optional().meta({
      description: "User agent string of the payer's device.",
    }),
  })
  .meta({
    id: "maib.checkout.SessionPayer",
    description: "Payer summary embedded in a retrieved checkout session.",
  });

export const SessionPaymentSchema = z
  .looseObject({
    paymentId: z.string().meta({ description: "Payment identifier." }),
    executedAt: z.iso.datetime().meta({ description: "Execution timestamp (ISO 8601)." }),
    status: PaymentStatusEnum.meta({ description: "Payment status." }),
    amount: z.number().nonnegative().meta({ description: "Payment amount (major units)." }),
    currency: CurrencyEnum.meta({ description: "ISO 4217 currency code." }),
    type: z.string().meta({ description: "Payment type (e.g. `MIA`)." }),
    providerType: z.string().meta({ description: "Provider type." }),
    senderName: z.string().nullable().optional().meta({ description: "Sender name." }),
    senderIban: z.string().nullable().optional().meta({ description: "Sender IBAN." }),
    recipientIban: z.string().nullable().optional().meta({ description: "Recipient IBAN." }),
    referenceNumber: z.string().meta({ description: "Payment reference number." }),
    mcc: z.string().meta({ description: "Merchant Category Code." }),
    orderId: z.string().nullable().optional().meta({
      description: "Merchant order identifier.",
    }),
    terminalId: z.string().nullable().optional().meta({
      description: "Terminal identifier.",
    }),
    refundedAmount: z.number().nonnegative().meta({
      description: "Total amount already refunded.",
    }),
    paymentMethod: z.string().nullable().optional().meta({
      description: "Payment method used (e.g. `Card`, `MiaQr`).",
    }),
    approvalCode: z.string().nullable().optional().meta({
      description: "Provider approval code.",
    }),
    requestedRefundAmount: z.number().nonnegative().meta({
      description: "Requested refund amount.",
    }),
    firstRefundedAt: z.iso.datetime().nullable().optional().meta({
      description: "First refund timestamp (ISO 8601).",
    }),
    lastRefundedAt: z.iso.datetime().nullable().optional().meta({
      description: "Last refund timestamp (ISO 8601).",
    }),
    note: z.string().nullable().optional().meta({ description: "Free-form note." }),
  })
  .meta({
    id: "maib.checkout.SessionPayment",
    description: "Payment summary embedded in a retrieved checkout session.",
  });

export const SessionDetailsSchema = z
  .looseObject({
    id: z.string().meta({ description: "Checkout identifier." }),
    createdAt: z.iso.datetime().meta({ description: "Creation timestamp (ISO 8601)." }),
    status: CheckoutStatusEnum.meta({ description: "Checkout status." }),
    amount: z.number().nonnegative().meta({ description: "Checkout amount (major units)." }),
    currency: CurrencyEnum.meta({ description: "ISO 4217 currency code (e.g. `MDL`)." }),
    callbackUrl: z.url().meta({ description: "Callback URL for this checkout." }),
    successUrl: z.url().meta({ description: "Success URL for this checkout." }),
    failUrl: z.url().meta({ description: "Fail URL for this checkout." }),
    language: LanguageEnum.meta({
      description: "Language of this checkout (`ro`, `ru`, `en`).",
    }),
    url: z.url().meta({ description: "URL of the checkout session." }),
    expiresAt: z.iso.datetime().meta({ description: "Expiration timestamp (ISO 8601)." }),
    completedAt: z.iso.datetime().nullable().optional().meta({
      description: "Completion timestamp (ISO 8601).",
    }),
    failedAt: z.iso.datetime().nullable().optional().meta({
      description: "Failure timestamp (ISO 8601).",
    }),
    cancelledAt: z.iso.datetime().nullable().optional().meta({
      description: "Cancellation timestamp (ISO 8601).",
    }),
    order: SessionOrderSchema.nullable().optional().meta({
      description: "Order summary.",
    }),
    payer: SessionPayerSchema.nullable().optional().meta({
      description: "Payer summary.",
    }),
    payment: SessionPaymentSchema.nullable().optional().meta({
      description: "Payment summary.",
    }),
  })
  .meta({
    id: "maib.checkout.SessionDetails",
    description:
      "Aggregated checkout session details returned by `GET /v2/checkouts/{id}` and `GET /v2/checkouts`.",
  });

export const PaymentDetailsSchema = z
  .looseObject({
    paymentId: z.string().meta({
      description: "Unique identifier of the executed payment.",
    }),
    paymentIntentId: z.string().nullable().optional().meta({
      description: "Identifier of the related payment intent, if applicable.",
    }),
    executedAt: z.iso.datetime().meta({
      description: "Date and time when the payment was executed (ISO 8601).",
    }),
    status: PaymentStatusEnum.meta({ description: "Current status of the payment." }),
    amount: z.number().nonnegative().meta({ description: "Amount of the payment (major units)." }),
    currency: CurrencyEnum.meta({
      description: "Currency code of the payment (ISO 4217).",
    }),
    type: z.string().meta({ description: "Payment type (e.g. `MIA`)." }),
    providerType: z.string().meta({
      description: "Provider channel used for the payment (e.g. `QR`).",
    }),
    senderName: z.string().nullable().optional().meta({
      description: "Name of the payment sender.",
    }),
    senderIban: z.string().nullable().optional().meta({
      description: "IBAN of the payment sender.",
    }),
    recipientIban: z.string().nullable().optional().meta({
      description: "IBAN of the payment recipient.",
    }),
    referenceNumber: z.string().meta({
      description: "Reference number assigned to the payment.",
    }),
    mcc: z.string().meta({
      description: "Merchant Category Code associated with the payment.",
    }),
    orderId: z.string().meta({
      description: "Merchant order identifier linked to the payment.",
    }),
    terminalId: z.string().meta({
      description: "Identifier of the terminal that initiated the payment.",
    }),
    refundedAmount: z.number().nonnegative().meta({
      description: "Total amount already refunded for this payment.",
    }),
    paymentMethod: z.string().nullable().optional().meta({
      description: "Payment method used (e.g. `Card`, `MiaQr`).",
    }),
    approvalCode: z.string().nullable().optional().meta({
      description: "Approval code for the transaction.",
    }),
    requestedRefundAmount: z.number().nonnegative().meta({
      description: "Total refund amount currently requested.",
    }),
    firstRefundedAt: z.iso.datetime().nullable().optional().meta({
      description: "Date and time of the first refund operation, if any.",
    }),
    lastRefundedAt: z.iso.datetime().nullable().optional().meta({
      description: "Date and time of the most recent refund operation, if any.",
    }),
    note: z.string().nullable().optional().meta({
      description: "Optional note attached to the payment.",
    }),
    isRefundable: z.boolean().optional().meta({
      description: "Whether the payment can be refunded.",
    }),
    partialRefundAvailable: z.boolean().optional().meta({
      description: "Whether a partial refund is available for this payment.",
    }),
    paymentEntryPoint: PaymentEntryPointEnum.optional().meta({
      description: "Payment entry point (`Checkout`, `API`, `PayByLink`, `Pos`).",
    }),
    refundableAmount: z.number().nonnegative().optional().meta({
      description: "Amount currently available for refund.",
    }),
  })
  .meta({
    id: "maib.checkout.PaymentDetails",
    description: "Payment details returned by `GET /v2/payments/{id}` and `GET /v2/payments`.",
  });

export const RefundResultSchema = z
  .looseObject({
    refundId: z.string().meta({ description: "Unique identifier of the created refund." }),
    status: z.literal(RefundStatus.CREATED).meta({
      description: "Initial status of the refund (always `Created`).",
    }),
  })
  .meta({
    id: "maib.checkout.RefundResult",
    description: "Result of `CheckoutClient.refund`.",
  });

export const RefundDetailsSchema = z
  .looseObject({
    id: z.string().meta({ description: "Unique refund identifier." }),
    paymentId: z.string().meta({
      description: "Identifier of the payment for which the refund was initiated.",
    }),
    refundType: RefundTypeEnum.meta({ description: "Refund type (`Full` or `Partial`)." }),
    amount: z.number().nonnegative().meta({ description: "Refund amount." }),
    currency: CurrencyEnum.meta({ description: "Refund currency (ISO 4217)." }),
    refundReason: z.string().meta({ description: "Refund reason." }),
    executedAt: z.iso.datetime().meta({
      description: "Date and time when the refund was created or processed (ISO 8601).",
    }),
    status: RefundStatusEnum.meta({ description: "Current refund status." }),
  })
  .meta({
    id: "maib.checkout.RefundDetails",
    description: "Refund details returned by `GET /v2/payments/refunds/{id}`.",
  });
