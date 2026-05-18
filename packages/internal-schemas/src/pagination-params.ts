import { z } from "zod";

import { SortOrderEnum } from "./enums";

export const PaginationParamsSchema = z
  .object({
    count: z.int().positive().meta({
      description: "Maximum number of items to return in a single page.",
    }),
    offset: z.int().nonnegative().meta({
      description: "Number of items to skip before starting to collect the result set.",
    }),
    sortBy: z.string().optional().meta({
      description: "Field name to sort the result set by.",
    }),
    order: SortOrderEnum.optional(),
  })
  .meta({
    id: "maib.core.PaginationParams",
    description: "Common pagination and sort parameters accepted by list endpoints.",
  });
