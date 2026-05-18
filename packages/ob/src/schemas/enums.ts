import { z } from "zod";

import { ConsentStatus, TransactionRequestStatus } from "../constants";

/** Consent lifecycle status. */
export const ConsentStatusEnum = z.enum(ConsentStatus).meta({
  id: "maib.ob.ConsentStatus",
  description: "Consent lifecycle status.",
});

/** Transaction request status. */
export const TransactionRequestStatusEnum = z.enum(TransactionRequestStatus).meta({
  id: "maib.ob.TransactionRequestStatus",
  description: "Transaction request status.",
});

/** Sort direction by posting date. */
export const SortDirectionEnum = z.enum(["ASC", "DESC"]).meta({
  id: "maib.ob.SortDirection",
  description: "Sort direction by posting date.",
});
