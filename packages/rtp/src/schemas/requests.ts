import { z } from "zod";

import { Currency } from "@maib/core";

import { PaginationParamsSchema, RtpStatusEnum } from "./enums";

export const CreateRtpRequestSchema = z
  .object({
    alias: z
      .string()
      .regex(/^373\d{8}$/)
      .meta({
        description: "Customer identification (phone number). Format: `373xxxxxxxx`.",
      }),
    amount: z.number().positive().meta({
      description: "RTP amount in major currency units.",
    }),
    expiresAt: z.iso.datetime().meta({
      description:
        'Expiration timestamp (ISO 8601). Min 1 minute, max 60 days. Example: `"2029-10-22T10:32:28+03:00"`.',
    }),
    currency: z.literal(Currency.MDL).meta({
      description: "Payment currency. Allowed value: `MDL`.",
    }),
    description: z.string().max(500).meta({
      description: "Order description (max 500 chars).",
    }),
    orderId: z.string().max(100).optional().meta({
      description: "Merchant's internal order identifier (max 100 chars).",
    }),
    terminalId: z.string().max(100).optional().meta({
      description: "Terminal ID provided by the bank (max 100 chars).",
    }),
    callbackUrl: z
      .url({ protocol: /^https$/ })
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description:
          "HTTPS URL where the merchant receives payment data after a successful payment (max 1000 chars).",
      }),
    redirectUrl: z
      .url({ protocol: /^https$/ })
      .regex(/^https:\/\/.+/)
      .max(1000)
      .optional()
      .meta({
        description:
          "HTTPS URL where the customer is redirected after successful payment (for website integration; max 1000 chars).",
      }),
  })
  .meta({
    id: "maib.rtp.CreateRtpRequest",
    description: "Request body for `RtpClient.create`.",
  });

export const CancelRtpRequestSchema = z
  .object({
    reason: z.string().max(500).meta({
      description: "Reason for initiating the cancellation (max 500 chars).",
    }),
  })
  .meta({
    id: "maib.rtp.CancelRtpRequest",
    description: "Request body for `RtpClient.cancel`.",
  });

export const RefundRtpRequestSchema = z
  .object({
    reason: z.string().max(500).meta({
      description: "Reason for initiating the refund (max 500 chars).",
    }),
  })
  .meta({
    id: "maib.rtp.RefundRtpRequest",
    description: "Request body for `RtpClient.refund`.",
  });

export const ListRtpParamsSchema = z
  .intersection(
    PaginationParamsSchema,
    z.object({
      rtpId: z.string().optional().meta({ description: "Filter by RTP unique identifier." }),
      orderId: z.string().optional().meta({
        description: "Filter by merchant-side order identifier.",
      }),
      amount: z.string().optional().meta({
        description: 'Filter by amount (upstream docs type: `string(enum)`, e.g. `"10.00"`).',
      }),
      description: z.string().optional().meta({ description: "Filter by description." }),
      status: RtpStatusEnum.optional(),
      createdAtFrom: z.iso.datetime().optional().meta({
        description: "Filter by RTP creation date (from, inclusive). ISO 8601.",
      }),
      createdAtTo: z.iso.datetime().optional().meta({
        description: "Filter by RTP creation date (to, inclusive). ISO 8601.",
      }),
      expiresAtFrom: z.iso.datetime().optional().meta({
        description: "Filter by RTP expiration date (from, inclusive). ISO 8601.",
      }),
      expiresAtTo: z.iso.datetime().optional().meta({
        description: "Filter by RTP expiration date (to, inclusive). ISO 8601.",
      }),
      terminalId: z.string().optional().meta({
        description: "Filter by terminal ID (provided by the bank).",
      }),
    }),
  )
  .meta({
    id: "maib.rtp.ListRtpParams",
    description: "Query parameters for `RtpClient.list`.",
  });

export const TestAcceptRequestSchema = z
  .object({
    amount: z.number().positive().meta({
      description: "Payment amount.",
    }),
    currency: z.literal(Currency.MDL).meta({
      description: "Payment currency. Allowed value: `MDL`.",
    }),
  })
  .meta({
    id: "maib.rtp.TestAcceptRequest",
    description: "Request body for `RtpClient.testAccept` (sandbox only).",
  });
