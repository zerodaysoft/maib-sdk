import type { MaibClientConfig } from "@maib/core";

export type * from "./generated/types";

/**
 * Configuration for the e-Commerce client.
 *
 * The `environment` option is excluded because the v1 E-Commerce API
 * is only available in the production environment.
 */
export interface EcommerceClientConfig
  extends Omit<MaibClientConfig, "clientId" | "clientSecret" | "environment"> {
  /** Project ID from the maibmerchants portal. */
  projectId: string;
  /** Project secret from the maibmerchants portal. */
  projectSecret: string;
}
