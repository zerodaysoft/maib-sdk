import { z } from "zod";

import {
  Language,
  PaymentEntryPoint,
  PaymentStatus,
  RefundStatus,
  RefundType,
  SortOrder,
} from "./constants";
import { Currency } from "./iso-4217";

/** ISO 4217 alphabetic currency code. */
export const CurrencyEnum = z.enum(Currency).meta({
  id: "maib.core.Currency",
  description: "ISO 4217 alphabetic currency code.",
});

/** Checkout / hosted-page language code. */
export const LanguageEnum = z.enum(Language).meta({
  id: "maib.core.Language",
  description: "Checkout page language. Allowed values: `ro`, `en`, `ru`.",
});

/** Sort direction for list endpoints. */
export const SortOrderEnum = z.enum(SortOrder).meta({
  id: "maib.core.SortOrder",
  description: "Sort direction. `asc` for ascending, `desc` for descending.",
});

/** Status of a payment processed through the maib platform. */
export const PaymentStatusEnum = z.enum(PaymentStatus).meta({
  id: "maib.core.PaymentStatus",
  description: "Status of a payment processed through the maib platform.",
});

/** Status of a refund processed through the shared refund endpoint. */
export const RefundStatusEnum = z.enum(RefundStatus).meta({
  id: "maib.core.RefundStatus",
  description: "Status of a refund processed through the shared refund endpoint.",
});

/** Refund coverage – full transaction or partial amount. */
export const RefundTypeEnum = z.enum(RefundType).meta({
  id: "maib.core.RefundType",
  description: "Refund coverage – full transaction or partial amount.",
});

/** Entry point through which a payment was initiated. */
export const PaymentEntryPointEnum = z.enum(PaymentEntryPoint).meta({
  id: "maib.core.PaymentEntryPoint",
  description: "Entry point through which a payment was initiated.",
});
