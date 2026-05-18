import { z } from "zod";

import { Currency, RefundStatus } from "@maib/core";

import { QrStatus } from "../constants";
import { AmountTypeEnum, PaymentStatusEnum, QrStatusEnum, QrTypeEnum } from "./enums";

export const CreateQrResultSchema = z
  .looseObject({
    qrId: z.string().meta({ description: "Unique identifier of the QR code." }),
    extensionId: z.string().optional().meta({ description: "QR extension identifier." }),
    orderId: z.string().optional().meta({ description: "Merchant's order ID." }),
    type: QrTypeEnum.meta({
      description: "Returned QR type. Known values: `Static`, `Dynamic`, `Hybrid`.",
    }),
    url: z
      .url({ protocol: /^https$/ })
      .regex(/^https:\/\/.+/)
      .meta({ description: "Generated QR URL (HTTPS)." }),
    expiresAt: z.iso.datetime().optional().meta({
      description: "QR expiration timestamp (ISO 8601), for `Dynamic` / `Hybrid`.",
    }),
  })
  .meta({
    id: "maib.mia.CreateQrResult",
    description: "Result of `MiaClient.createQr`.",
  });

export const CreateHybridQrResultSchema = z
  .looseObject({
    qrId: z.string().meta({ description: "Unique identifier of the created Hybrid QR." }),
    extensionId: z.string().optional().meta({
      description: "Identifier of the initial extension, if one was provided.",
    }),
    url: z
      .url({ protocol: /^https$/ })
      .regex(/^https:\/\/.+/)
      .meta({ description: "Generated QR URL (HTTPS)." }),
  })
  .meta({
    id: "maib.mia.CreateHybridQrResult",
    description: "Result of `MiaClient.createHybridQr`.",
  });

export const CreateExtensionResultSchema = z
  .looseObject({
    extensionId: z.string().meta({
      description: "Identifier of the created extension.",
    }),
  })
  .meta({
    id: "maib.mia.CreateExtensionResult",
    description: "Result of `MiaClient.createExtension`.",
  });

export const QrDetailsSchema = z
  .looseObject({
    qrId: z.string().meta({ description: "Unique QR code identifier." }),
    extensionId: z.string().optional().meta({
      description: "QR extension identifier (for `Hybrid`).",
    }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    status: QrStatusEnum.meta({
      description: "QR status. Known values: `Active`, `Inactive`, `Expired`, `Paid`, `Cancelled`.",
    }),
    type: QrTypeEnum.meta({
      description: "QR type. Known values: `Static`, `Dynamic`, `Hybrid`.",
    }),
    url: z
      .url({ protocol: /^https$/ })
      .regex(/^https:\/\/.+/)
      .meta({ description: "QR URL (HTTPS)." }),
    amountType: AmountTypeEnum.meta({
      description: "Amount type. Known values: `Fixed`, `Controlled`, `Free`.",
    }),
    amount: z.number().nonnegative().optional().meta({
      description: "Fixed amount (for `Fixed`).",
    }),
    amountMin: z.number().nonnegative().optional().meta({
      description: "Minimum amount (for `Controlled`).",
    }),
    amountMax: z.number().nonnegative().optional().meta({
      description: "Maximum amount (for `Controlled`).",
    }),
    currency: z.literal(Currency.MDL).meta({ description: "Payment currency (`MDL`)." }),
    description: z.string().optional().meta({ description: "Order description." }),
    callbackUrl: z.url().optional().meta({
      description: "Merchant callback URL for payment notifications.",
    }),
    redirectUrl: z.url().optional().meta({
      description: "Redirect URL after payment (for web integration).",
    }),
    createdAt: z.iso.datetime().meta({ description: "QR creation timestamp (ISO 8601)." }),
    updatedAt: z.iso.datetime().meta({
      description: "Last status update timestamp (ISO 8601).",
    }),
    expiresAt: z.iso.datetime().optional().meta({
      description: "Expiry timestamp (ISO 8601), for `Dynamic` / `Hybrid`.",
    }),
    terminalId: z.string().optional().meta({
      description: "Terminal ID provided by the bank.",
    }),
  })
  .meta({
    id: "maib.mia.QrDetails",
    description: "Aggregated QR details returned by `GET /v2/mia/qr/{qrId}` and `GET /v2/mia/qr`.",
  });

export const CancelQrResultSchema = z
  .looseObject({
    qrId: z.string().meta({ description: "Unique identifier of the cancelled QR." }),
    status: z.literal(QrStatus.CANCELLED).meta({
      description: "Final status (always `Cancelled`).",
    }),
  })
  .meta({
    id: "maib.mia.CancelQrResult",
    description: "Result of `MiaClient.cancelQr`.",
  });

export const CancelExtensionResultSchema = z
  .looseObject({
    extensionId: z.string().meta({
      description: "Identifier of the cancelled extension.",
    }),
  })
  .meta({
    id: "maib.mia.CancelExtensionResult",
    description: "Result of `MiaClient.cancelExtension`.",
  });

export const MiaPaymentDetailsSchema = z
  .looseObject({
    payId: z.string().meta({ description: "Unique ID of the payment." }),
    referenceId: z.string().optional().meta({
      description: "RRN code from the instant payments service (max 15 chars).",
    }),
    qrId: z.string().meta({
      description: "ID of the QR code associated with the payment.",
    }),
    extensionId: z.string().optional().meta({
      description: "ID of the QR code extension associated with the payment.",
    }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    amount: z.number().nonnegative().meta({ description: "Payment amount." }),
    commission: z.number().nonnegative().meta({
      description: "Commission applied to the payment.",
    }),
    currency: z.literal(Currency.MDL).meta({ description: "Payment currency (`MDL`)." }),
    description: z.string().optional().meta({ description: "Order description." }),
    payerName: z.string().optional().meta({
      description: "Abbreviated name of the payer.",
    }),
    payerIban: z.string().optional().meta({ description: "Payer's IBAN." }),
    status: PaymentStatusEnum.meta({
      description: "Payment status. Known values: `Executed`, `Refunded`.",
    }),
    executedAt: z.iso.datetime().meta({
      description: "Payment execution timestamp (ISO 8601).",
    }),
    refundedAt: z.iso.datetime().optional().meta({
      description: "Refund timestamp (ISO 8601), if applicable.",
    }),
    terminalId: z.string().optional().meta({
      description: "Terminal ID provided by the bank.",
    }),
  })
  .meta({
    id: "maib.mia.MiaPaymentDetails",
    description:
      "Payment details returned by `GET /v2/mia/payments/{payId}` and `GET /v2/mia/payments`.",
  });

export const MiaRefundResultSchema = z
  .looseObject({
    refundId: z.string().meta({ description: "Unique identifier of the created refund." }),
    status: z.literal(RefundStatus.CREATED).meta({
      description: "Initial status of the refund (always `Created`).",
    }),
  })
  .meta({
    id: "maib.mia.MiaRefundResult",
    description: "Result of `MiaClient.refund`.",
  });

export const TestPayResultSchema = z
  .looseObject({
    qrId: z.string().meta({ description: "Unique identifier of the QR code." }),
    qrStatus: QrStatusEnum.meta({
      description:
        "QR code status after the simulated payment. Known values: `Active`, `Inactive`, `Expired`, `Paid`, `Cancelled`.",
    }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    payId: z.string().meta({
      description: "Unique identifier of the simulated payment.",
    }),
    amount: z.number().nonnegative().meta({ description: "Payment amount." }),
    commission: z.number().nonnegative().meta({ description: "Commission for the payment." }),
    currency: z.literal(Currency.MDL).meta({ description: "Payment currency (`MDL`)." }),
    payerName: z.string().meta({ description: "Abbreviated name of the payer." }),
    payerIban: z.string().meta({ description: "IBAN of the payer." }),
    executedAt: z.iso.datetime().meta({
      description: "Payment execution timestamp (ISO 8601).",
    }),
    signatureKey: z.string().meta({
      description:
        "Signature key for validating the simulated callback. Must be verified according to the callback signature algorithm.",
    }),
  })
  .meta({
    id: "maib.mia.TestPayResult",
    description: "Result of `MiaClient.testPay` (sandbox only).",
  });
