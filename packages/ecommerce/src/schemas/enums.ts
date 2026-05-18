import { z } from "zod";

import { Currency } from "@maib/core";

import { ThreeDsStatus, TransactionStatus } from "../constants";

export { LanguageEnum } from "@maib/internal-schemas";

/** Transaction status returned by the maib e-commerce API. */
export const TransactionStatusEnum = z.enum(TransactionStatus).meta({
  id: "maib.ecommerce.TransactionStatus",
  description: "Transaction status returned by the maib e-commerce API.",
});

/** 3D Secure authentication status. */
export const ThreeDsStatusEnum = z.enum(ThreeDsStatus).meta({
  id: "maib.ecommerce.ThreeDsStatus",
  description: "3D Secure authentication status.",
});

/** Currencies accepted by the maib e-commerce API. */
export const SupportedCurrencyEnum = z.enum([Currency.MDL, Currency.EUR, Currency.USD]).meta({
  id: "maib.ecommerce.SupportedCurrency",
  description: "ISO 4217 currency accepted by the maib e-commerce API (`MDL`, `EUR`, `USD`).",
});
