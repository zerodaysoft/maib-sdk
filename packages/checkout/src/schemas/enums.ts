import { z } from "zod";

import { CheckoutStatus } from "#constants";

export {
  CurrencyEnum,
  LanguageEnum,
  PaginationParamsSchema,
  PaymentEntryPointEnum,
  PaymentStatusEnum,
  RefundStatusEnum,
  RefundTypeEnum,
  SortOrderEnum,
} from "@maib/internal-schemas";

/** Status of a hosted checkout session. */
export const CheckoutStatusEnum = z.enum(CheckoutStatus).meta({
  id: "maib.checkout.CheckoutStatus",
  description: "Status of a hosted checkout session.",
});
