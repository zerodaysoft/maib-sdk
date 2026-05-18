import type { BaseClientConfig } from "@maib/http";

export type * from "./generated/types";

/** Configuration for the OBP client (DirectLogin auth). */
export interface ObClientConfig extends BaseClientConfig {
  /** OBP user name. */
  username: string;
  /** OBP user password. */
  password: string;
  /** OAuth consumer key registered with the OBP instance. */
  consumerKey: string;
  /**
   * OBP API host.
   * @default "https://ob-sandbox.maib.md"
   */
  baseUrl?: string;
}
