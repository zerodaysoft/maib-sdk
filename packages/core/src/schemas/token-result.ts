import { z } from "zod";

export const TokenResultSchema = z
  .looseObject({
    accessToken: z.string().meta({
      description: "Bearer access token to authorize subsequent API requests.",
    }),
    expiresIn: z.number().int().nonnegative().meta({
      description: "Lifetime of `accessToken` in seconds, measured from the moment of issue.",
    }),
    tokenType: z.string().meta({
      description: "Token scheme used in the `Authorization` header (typically `Bearer`).",
    }),
    refreshToken: z.string().optional().meta({
      description:
        "Long-lived refresh token. Present on auth flows that support refresh (v1-style); absent on short-lived v2 tokens.",
    }),
    refreshExpiresIn: z.number().int().nonnegative().optional().meta({
      description: "Lifetime of `refreshToken` in seconds, measured from the moment of issue.",
    }),
  })
  .meta({
    id: "maib.core.TokenResult",
    description: "Response returned by the maib auth endpoint after exchanging credentials.",
  });
