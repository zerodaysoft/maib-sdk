import { z } from "zod";

import { Currency, RefundStatus } from "@maib/core";

import { RtpStatus } from "../constants";
import { RtpStatusEnum } from "./enums";

export const CreateRtpResultSchema = z
  .looseObject({
    rtpId: z.string().meta({ description: "Unique identifier of the created RTP." }),
    orderId: z.string().optional().meta({ description: "Merchant's order identifier." }),
    expiresAt: z.iso.datetime().meta({
      description: "Timestamp when the RTP expires (ISO 8601).",
    }),
  })
  .meta({
    id: "maib.rtp.CreateRtpResult",
    description: "Result of `RtpClient.create`.",
  });

export const RtpStatusResultSchema = z
  .looseObject({
    rtpId: z.string().meta({ description: "RTP unique identifier." }),
    orderId: z.string().optional().meta({
      description: "Merchant-side order identifier.",
    }),
    status: RtpStatusEnum.meta({ description: "RTP status." }),
    amount: z.number().nonnegative().meta({ description: "RTP amount." }),
    currency: z.literal(Currency.MDL).meta({ description: "Payment currency (`MDL`)." }),
    description: z.string().meta({ description: "Order description." }),
    url: z
      .url()
      .regex(/^https:\/\/.+/)
      .optional()
      .meta({
        description: "RTP URL (HTTPS). Returned on list items only.",
      }),
    callbackUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .optional()
      .meta({
        description: "HTTPS callback URL.",
      }),
    redirectUrl: z
      .url()
      .regex(/^https:\/\/.+/)
      .optional()
      .meta({
        description: "HTTPS redirect URL.",
      }),
    createdAt: z.iso.datetime().meta({ description: "Creation timestamp (ISO 8601)." }),
    updatedAt: z.iso.datetime().meta({
      description: "Last status update timestamp (ISO 8601).",
    }),
    expiresAt: z.iso.datetime().meta({
      description: "Expiration timestamp (ISO 8601).",
    }),
    terminalId: z.string().optional().meta({
      description: "Terminal ID provided by the bank.",
    }),
  })
  .meta({
    id: "maib.rtp.RtpStatusResult",
    description:
      "Aggregated RTP details returned by `GET /v2/rtp/{id}` and list items from `GET /v2/rtp`.",
  });

export const CancelRtpResultSchema = z
  .looseObject({
    rtpId: z.string().meta({ description: "RTP unique identifier." }),
    status: z.literal(RtpStatus.CANCELLED).meta({
      description: "Final RTP status (always `Cancelled`).",
    }),
  })
  .meta({
    id: "maib.rtp.CancelRtpResult",
    description: "Result of `RtpClient.cancel`.",
  });

export const RefundRtpResultSchema = z
  .looseObject({
    refundId: z.string().meta({ description: "Refund unique identifier." }),
    status: z.literal(RefundStatus.CREATED).meta({
      description: "Initial refund status (always `Created`).",
    }),
  })
  .meta({
    id: "maib.rtp.RefundRtpResult",
    description: "Result of `RtpClient.refund`.",
  });

const testResultShape = {
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
  signature: z.string().meta({ description: "Notification validation signature." }),
} as const;

export const TestAcceptResultSchema = z.looseObject(testResultShape).meta({
  id: "maib.rtp.TestAcceptResult",
  description: "Result of `RtpClient.testAccept` (sandbox only).",
});

export const TestRejectResultSchema = z.looseObject(testResultShape).meta({
  id: "maib.rtp.TestRejectResult",
  description: "Result of `RtpClient.testReject` (sandbox only).",
});
