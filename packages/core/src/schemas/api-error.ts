import { z } from "zod";

export const MaibApiErrorSchema = z
  .looseObject({
    errorCode: z.string().meta({
      description: "Machine-readable error code (e.g. `invalid_request`, `unauthorized`).",
    }),
    errorMessage: z.string().meta({
      description: "Human-readable description of what went wrong.",
    }),
    errorArgs: z.record(z.string(), z.string()).optional().meta({
      description:
        "Optional key/value context tied to the error (e.g. the field that failed validation).",
    }),
  })
  .meta({
    id: "maib.core.MaibApiError",
    description: "A single structured error returned by the maib API when `ok` is `false`.",
  });
