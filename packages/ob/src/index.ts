export type {
  AnswerConsentChallengeBody,
  CreateConsentBody,
  CreatePaymentBody,
  ListTransactionsParams,
  ObAccount,
  ObAccountDetails,
  ObAccountOwner,
  ObAccountView,
  ObAmountOfMoney,
  ObApiInfo,
  ObApiVersion,
  ObBank,
  ObBankRouting,
  ObChallenge,
  ObCheckFundsResult,
  ObClientConfig,
  ObConsent,
  ObConsentInfo,
  ObTransaction,
  ObTransactionDetails,
  ObTransactionOtherAccount,
  ObTransactionRequest,
  ObTransactionRequestType,
  ObTransactionThisAccount,
  ObUser,
} from "./types";

/**
 * @deprecated Use {@link ObTransactionThisAccount} (for `this_account` — has
 *   `holders[]`) or {@link ObTransactionOtherAccount} (for `other_account` —
 *   has a single `holder`). Kept as an alias for source compatibility; both
 *   sides used to share this shape but upstream distinguishes them.
 */
export type ObTransactionAccount = import("./types").ObTransactionThisAccount;

export { ObClient } from "./client";
export { ConsentStatus, OB_DEFAULT_HOST, TransactionRequestStatus } from "./constants";
export { ObError } from "./errors";
