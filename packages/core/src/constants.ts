/** Default host for the maib API (without version prefix). */
export const DEFAULT_API_HOST = "https://api.maibmerchants.md";

/** Buffer in seconds before token expiry to trigger a proactive refresh. */
export const TOKEN_REFRESH_BUFFER_S = 30;

/** Supported currencies for maib transactions. */
export const Currency = {
  MDL: "MDL",
  EUR: "EUR",
  USD: "USD",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

/** Supported checkout page languages. */
export const Language = {
  RO: "ro",
  EN: "en",
  RU: "ru",
} as const;

export type Language = (typeof Language)[keyof typeof Language];
