import { z } from "zod";

import { Environment } from "../constants";

export {
  CurrencyEnum,
  LanguageEnum,
  PaymentEntryPointEnum,
  PaymentStatusEnum,
  RefundStatusEnum,
  RefundTypeEnum,
  SortOrderEnum,
} from "@maib/internal-schemas";

/** Available maib API environments. */
export const EnvironmentEnum = z.enum(Environment).meta({
  id: "maib.core.Environment",
  description: "Available maib API environments.",
});
