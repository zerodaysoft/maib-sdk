import { z } from "zod";

import { AmountType, QrStatus, QrType } from "../constants";

export {
  PaginationParamsSchema,
  PaymentStatusEnum,
  SortOrderEnum,
} from "@maib/internal-schemas";

/** QR code type. */
export const QrTypeEnum = z.enum(QrType).meta({
  id: "maib.mia.QrType",
  description: "QR code type.",
});

/** QR code amount type. */
export const AmountTypeEnum = z.enum(AmountType).meta({
  id: "maib.mia.AmountType",
  description: "QR code amount type.",
});

/** QR code lifecycle status. */
export const QrStatusEnum = z.enum(QrStatus).meta({
  id: "maib.mia.QrStatus",
  description: "QR code lifecycle status.",
});
