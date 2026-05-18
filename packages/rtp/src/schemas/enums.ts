import { z } from "zod";

import { RtpStatus } from "../constants";

export { PaginationParamsSchema, SortOrderEnum } from "@maib/internal-schemas";

/** Request-to-pay lifecycle status. */
export const RtpStatusEnum = z.enum(RtpStatus).meta({
  id: "maib.rtp.RtpStatus",
  description: "Request-to-pay lifecycle status.",
});
