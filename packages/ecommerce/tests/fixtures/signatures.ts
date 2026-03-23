import { Currency } from "@maib/core";
import { ThreeDsStatus, TransactionStatus } from "../../src/constants.js";

export const SIGNATURE_KEY = "8508706b-3454-4733-8295-56e617c4abcf";

export const CALLBACK_RESULT = {
  payId: "f16a9006-128a-46bc-8e2a-77a6ee99df75",
  orderId: "123",
  status: TransactionStatus.OK,
  statusCode: "000",
  statusMessage: "Approved",
  threeDs: ThreeDsStatus.AUTHENTICATED,
  rrn: "331711380059",
  approval: "327593",
  cardNumber: "510218******1124",
  amount: 10.25,
  currency: Currency.MDL,
};

export const EXPECTED_SIGNATURE = "5wHkZvm9lFeXxSeFF0ui2CnAp7pCEFSNmuHYFYJlC0s=";

export const VALID_CALLBACK_PAYLOAD = {
  result: CALLBACK_RESULT,
  signature: EXPECTED_SIGNATURE,
};
