import { z } from "zod";

import { Currency } from "@maib/core";

import { QrType } from "../constants";
import {
  AmountTypeEnum,
  PaginationParamsSchema,
  PaymentStatusEnum,
  QrStatusEnum,
  QrTypeEnum,
} from "./enums";

export const CreateQrRequestSchema = z
  .object({
    type: z.enum([QrType.STATIC, QrType.DYNAMIC]).meta({
      description: "QR code type. Known values: `Static`, `Dynamic`.",
    }),
    amountType: AmountTypeEnum.meta({
      description: "Amount type. Known values: `Fixed`, `Controlled`, `Free`.",
    }),
    currency: z.literal(Currency.MDL).meta({
      description: "Payment currency. Allowed value: `MDL` (ISO 4217).",
    }),
    description: z.string().max(500).meta({
      description: "Order description (max 500 chars).",
    }),
    expiresAt: z.iso.datetime().optional().meta({
      description:
        "Expiration timestamp (ISO 8601). Required for `Dynamic`. Min 1 minute, max 60 days. Not used for `Static`.",
    }),
    amount: z.number().positive().max(100000).optional().meta({
      description:
        "Paid amount (major units). Required for `Fixed` and `Controlled`. Constraint: `amountMin ≤ amount ≤ amountMax`. Range: > 0 to 100000.",
    }),
    amountMin: z.number().positive().optional().meta({
      description: "Minimum allowed amount (for `Controlled`). Must be > 0 and < `amountMax`.",
    }),
    amountMax: z.number().positive().max(100000).optional().meta({
      description: "Maximum allowed amount (for `Controlled`). Must be > `amountMin` and ≤ 100000.",
    }),
    orderId: z.string().max(100).optional().meta({
      description: "Merchant-side order identifier (max 100 chars).",
    }),
    callbackUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description: "HTTPS URL where the merchant receives payment result data (max 1000 chars).",
      }),
    redirectUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description:
          "HTTPS URL where the customer is redirected after a successful payment (max 1000 chars).",
      }),
    terminalId: z.string().max(100).optional().meta({
      description: "Terminal ID provided by the bank (max 100 chars).",
    }),
  })
  .meta({
    id: "maib.mia.CreateQrRequest",
    description: "Request body for `MiaClient.createQr`.",
  });

export const HybridExtensionSchema = z
  .object({
    expiresAt: z.iso.datetime().meta({
      description: "Expiration timestamp of the Hybrid QR (ISO 8601). Min 1 minute, max 60 days.",
    }),
    description: z.string().max(500).meta({
      description: "Order description (max 500 chars).",
    }),
    amount: z.number().positive().max(100000).optional().meta({
      description: "Fixed amount (required for `Fixed` and `Controlled`). Range: > 0 to 100000.",
    }),
    amountMin: z.number().positive().optional().meta({
      description: "Minimum allowed amount (for `Controlled`).",
    }),
    amountMax: z.number().positive().optional().meta({
      description: "Maximum allowed amount (for `Controlled`).",
    }),
    orderId: z.string().max(100).optional().meta({
      description: "Merchant-side order identifier (max 100 chars).",
    }),
    callbackUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description: "HTTPS URL where the merchant receives payment result data (max 1000 chars).",
      }),
    redirectUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description:
          "HTTPS URL where the customer is redirected after successful payment (max 1000 chars).",
      }),
  })
  .meta({
    id: "maib.mia.HybridExtension",
    description: "Extension embedded in a `CreateHybridQrRequest`.",
  });

export const CreateHybridQrRequestSchema = z
  .object({
    amountType: AmountTypeEnum.meta({
      description: "Amount type. Known values: `Fixed`, `Controlled`, `Free`.",
    }),
    currency: z.literal(Currency.MDL).meta({
      description: "Payment currency. Allowed value: `MDL` (ISO 4217).",
    }),
    terminalId: z.string().max(100).optional().meta({
      description: "Terminal ID provided by the bank (max 100 chars).",
    }),
    extension: HybridExtensionSchema.optional(),
  })
  .meta({
    id: "maib.mia.CreateHybridQrRequest",
    description: "Request body for `MiaClient.createHybridQr`.",
  });

export const CreateExtensionRequestSchema = z
  .object({
    expiresAt: z.iso.datetime().meta({
      description: "New expiration timestamp (ISO 8601). Min 1 minute, max 60 days.",
    }),
    description: z.string().max(500).meta({
      description: "Order description (max 500 chars).",
    }),
    amount: z.number().positive().optional().meta({
      description: "Fixed amount for the extension (required for `Fixed` and `Controlled`).",
    }),
    amountMin: z.number().positive().optional().meta({
      description: "Minimum allowed amount (for `Controlled`).",
    }),
    amountMax: z.number().positive().optional().meta({
      description: "Maximum allowed amount (for `Controlled`).",
    }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    callbackUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description: "HTTPS URL for payment result callback (max 1000 chars).",
      }),
    redirectUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description: "HTTPS URL for post-payment customer redirect (max 1000 chars).",
      }),
  })
  .meta({
    id: "maib.mia.CreateExtensionRequest",
    description: "Request body for `MiaClient.createExtension`.",
  });

export const CancelQrRequestSchema = z
  .object({
    reason: z.string().max(500).meta({
      description: "Reason for the cancellation request (max 500 chars).",
    }),
  })
  .meta({
    id: "maib.mia.CancelQrRequest",
    description: "Request body for `MiaClient.cancelQr`.",
  });

export const CancelExtensionRequestSchema = z
  .object({
    reason: z.string().max(500).optional().meta({
      description: "Optional reason for cancelling the extension (max 500 chars).",
    }),
  })
  .meta({
    id: "maib.mia.CancelExtensionRequest",
    description: "Request body for `MiaClient.cancelExtension`.",
  });

export const RefundPaymentRequestSchema = z
  .object({
    reason: z.string().meta({
      description: "Reason for initiating the refund (recommended max 500 chars).",
    }),
    amount: z.number().positive().optional().meta({
      description:
        "Refund amount. If provided, a partial refund is initiated. If omitted, a full refund is initiated.",
    }),
    callbackUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description:
          "HTTPS URL the system will call when the refund is accepted/processed (max 1000 chars).",
      }),
  })
  .meta({
    id: "maib.mia.RefundPaymentRequest",
    description: "Request body for `MiaClient.refund`.",
  });

export const TestPayRequestSchema = z
  .object({
    qrId: z.string().meta({
      description: "Unique identifier of the QR code.",
    }),
    amount: z.number().positive().meta({
      description: "Payment amount.",
    }),
    iban: z.string().meta({
      description: "Payer's IBAN.",
    }),
    currency: z.literal(Currency.MDL).meta({
      description: "Payment currency. Allowed value: `MDL`.",
    }),
    payerName: z.string().max(200).meta({
      description: "Short name of the payer (max 200 chars).",
    }),
  })
  .meta({
    id: "maib.mia.TestPayRequest",
    description: "Request body for `MiaClient.testPay` (sandbox only).",
  });

export const ListQrParamsSchema = z
  .intersection(
    PaginationParamsSchema,
    z.object({
      qrId: z.string().optional().meta({ description: "Filter by QR ID." }),
      extensionId: z.string().optional().meta({ description: "Filter by QR extension ID." }),
      orderId: z.string().optional().meta({ description: "Filter by merchant order ID." }),
      type: QrTypeEnum.optional().meta({
        description: "QR type (`Static`, `Dynamic`, `Hybrid`).",
      }),
      amountType: AmountTypeEnum.optional().meta({
        description: "Amount type (`Fixed`, `Controlled`, `Free`).",
      }),
      amountFrom: z.number().optional().meta({ description: "Minimum amount value (inclusive)." }),
      amountTo: z.number().optional().meta({ description: "Maximum amount value (inclusive)." }),
      description: z.string().optional().meta({ description: "Filter by description." }),
      status: QrStatusEnum.optional().meta({ description: "QR status." }),
      createdAtFrom: z.iso.datetime().optional().meta({
        description: "Creation date — from (ISO 8601).",
      }),
      createdAtTo: z.iso.datetime().optional().meta({
        description: "Creation date — to (ISO 8601).",
      }),
      expiresAtFrom: z.iso.datetime().optional().meta({
        description: "Expiration date — from (ISO 8601).",
      }),
      expiresAtTo: z.iso.datetime().optional().meta({
        description: "Expiration date — to (ISO 8601).",
      }),
      terminalId: z.string().optional().meta({ description: "Filter by terminal ID." }),
    }),
  )
  .meta({
    id: "maib.mia.ListQrParams",
    description: "Query parameters for `MiaClient.listQrs`.",
  });

export const ListExtensionsParamsSchema = z
  .intersection(
    PaginationParamsSchema,
    z.object({
      qrId: z.string().optional().meta({ description: "Filter by QR ID." }),
      extensionId: z.string().optional().meta({ description: "Filter by extension ID." }),
      orderId: z.string().optional().meta({ description: "Filter by merchant order ID." }),
      status: z.string().optional().meta({ description: "Extension status." }),
      createdAtFrom: z.iso.datetime().optional().meta({
        description: "Creation date — from (ISO 8601).",
      }),
      createdAtTo: z.iso.datetime().optional().meta({
        description: "Creation date — to (ISO 8601).",
      }),
      expiresAtFrom: z.iso.datetime().optional().meta({
        description: "Expiration date — from (ISO 8601).",
      }),
      expiresAtTo: z.iso.datetime().optional().meta({
        description: "Expiration date — to (ISO 8601).",
      }),
    }),
  )
  .meta({
    id: "maib.mia.ListExtensionsParams",
    description: "Query parameters for `MiaClient.listExtensions`.",
  });

export const ListPaymentsParamsSchema = z
  .intersection(
    PaginationParamsSchema,
    z.object({
      payId: z.string().optional().meta({ description: "Filter by payment ID." }),
      referenceId: z.string().optional().meta({
        description: "RRN code for instant payments.",
      }),
      qrId: z.string().optional().meta({ description: "Filter by QR code ID." }),
      extensionId: z.string().optional().meta({ description: "Filter by QR extension ID." }),
      orderId: z.string().optional().meta({ description: "Filter by merchant order ID." }),
      amountFrom: z.number().optional().meta({
        description: "Minimum payment amount (inclusive).",
      }),
      amountTo: z.number().optional().meta({
        description: "Maximum payment amount (inclusive).",
      }),
      description: z.string().optional().meta({ description: "Filter by description." }),
      payerName: z.string().optional().meta({ description: "Filter by payer name." }),
      payerIban: z.string().optional().meta({ description: "Filter by payer IBAN." }),
      status: PaymentStatusEnum.optional().meta({
        description: "Payment status (MIA emits `Executed` / `Refunded`).",
      }),
      executedAtFrom: z.iso.datetime().optional().meta({
        description: "Execution date — from (ISO 8601).",
      }),
      executedAtTo: z.iso.datetime().optional().meta({
        description: "Execution date — to (ISO 8601).",
      }),
      terminalId: z.string().optional().meta({ description: "Filter by terminal ID." }),
    }),
  )
  .meta({
    id: "maib.mia.ListPaymentsParams",
    description: "Query parameters for `MiaClient.listPayments`.",
  });
