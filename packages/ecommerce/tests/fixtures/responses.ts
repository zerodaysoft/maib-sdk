import { Currency } from "@maib/core";
import { TransactionStatus } from "../../src/constants.js";

export interface MockHttpResponse {
  status: number;
  body: unknown;
}

export const TOKEN_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      accessToken: "test-access-token",
      expiresIn: 300,
      refreshToken: "test-refresh-token",
      refreshExpiresIn: 1800,
      tokenType: "Bearer",
    },
  },
};

export const PAY_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      payId: "abc-123",
      orderId: "order-1",
      payUrl: "https://checkout.example.com/pay",
    },
  },
};

export const COMPLETE_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      payId: "abc-123",
      status: TransactionStatus.OK,
      statusCode: "000",
      statusMessage: "Approved",
      confirmAmount: 50,
    },
  },
};

export const REFUND_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      payId: "abc-123",
      status: TransactionStatus.OK,
      statusCode: "400",
      statusMessage: "Accepted",
      refundAmount: 10,
    },
  },
};

export const PAY_INFO_RESPONSE: MockHttpResponse = {
  status: 200,
  body: {
    ok: true,
    result: {
      payId: "abc-123",
      status: TransactionStatus.OK,
      statusCode: "000",
      statusMessage: "Approved",
      amount: 100,
      currency: Currency.MDL,
    },
  },
};

export const DELETE_CARD_RESPONSE: MockHttpResponse = {
  status: 200,
  body: { ok: true, result: {} },
};

export const ERROR_RESPONSE_INVALID_AMOUNT: MockHttpResponse = {
  status: 400,
  body: {
    ok: false,
    errors: [
      {
        errorCode: "12001",
        errorMessage: "Parameter 'amount' is invalid",
        errorArgs: { parameter: "amount" },
      },
    ],
  },
};
