---
package: "@maib/ecommerce"
version: 0.2.3
description: TypeScript SDK for the maib e-Commerce payment gateway — direct, two-step, recurring, one-click payments.
api_version: v1
upstream_docs: https://docs.maibmerchants.md/e-commerce
upstream_updated: 2025-11-10
---

# @maib/ecommerce SDK Reference

TypeScript SDK for the maib e-Commerce payment gateway (v1 API). Process direct payments, two-step (hold/complete) payments, recurring charges, one-click payments, refunds, and callback verification.

## Installation

```bash
npm install @maib/ecommerce
# or
yarn add @maib/ecommerce
```

## Architecture

- `EcommerceClient` extends `BaseClient` from `@maib/core`.
- Authentication uses OAuth2 Client Credentials flow with `projectId`/`projectSecret` (not `clientId`/`clientSecret`). Tokens are acquired and refreshed automatically, including refresh-token rotation for the v1 API.
- Callback signature verification uses **SHA-256 sorted-values** (different from `@maib/checkout` which uses HMAC-SHA256).
- No sandbox environment support. The v1 e-Commerce API is production-only.
- All API responses are automatically unwrapped from the `{ result: T, ok: true }` envelope.

## Configuration

Create a client by passing `EcommerceClientConfig` to the `EcommerceClient` constructor.

```typescript
import { EcommerceClient } from "@maib/ecommerce";

const client = new EcommerceClient({
  projectId: "your-project-id",
  projectSecret: "your-project-secret",
  signatureKey: "your-signature-key", // optional, required for verifyCallback / computeCallbackSignature
  // baseUrl: "https://custom-host.example", // optional, default: "https://api.maibmerchants.md"
  // fetch: customFetch,                     // optional, default: globalThis.fetch
});
```

### EcommerceClientConfig

Extends `MaibClientConfig` but replaces `clientId`/`clientSecret` with `projectId`/`projectSecret` and omits the `environment` option (production-only).

| Property        | Type           | Required | Default                          | Description                                                                                                                    |
| --------------- | -------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `projectId`     | `string`       | Yes      | --                               | Project ID from the maibmerchants portal.                                                                                      |
| `projectSecret` | `string`       | Yes      | --                               | Project secret from the maibmerchants portal.                                                                                  |
| `signatureKey`  | `string`       | No       | --                               | SHA-256 key for callback signature verification. Required only if you call `verifyCallback()` or `computeCallbackSignature()`. |
| `baseUrl`       | `string`       | No       | `"https://api.maibmerchants.md"` | Override the API host.                                                                                                         |
| `fetch`         | `typeof fetch` | No       | `globalThis.fetch`               | Custom fetch implementation for testing or Node.js polyfills.                                                                  |

> **Note**: `EcommerceClientConfig` does not accept an `environment` property. The v1 e-Commerce API has no sandbox. To test, use the `baseUrl` override.

---

## API Methods

### Direct Payments

#### pay

Initiate a direct (single-step) payment. Returns a URL to redirect the payer to.

```typescript
pay(params: PayRequest): Promise<PaymentInitResult>
```

**PayRequest** (extends `BasePaymentParams` and `CustomerFacingParams`)

| Field         | Type            | Required | Description                                      |
| ------------- | --------------- | -------- | ------------------------------------------------ |
| `amount`      | `number`        | Yes      | Payment amount.                                  |
| `currency`    | `Currency`      | Yes      | `"MDL"`, `"EUR"`, or `"USD"`.                    |
| `clientIp`    | `string`        | Yes      | Payer's IP address.                              |
| `language`    | `string`        | Yes      | Checkout page language (`"ro"`, `"en"`, `"ru"`). |
| `description` | `string`        | No       | Payment description.                             |
| `clientName`  | `string`        | No       | Payer name.                                      |
| `email`       | `string`        | No       | Payer email.                                     |
| `phone`       | `string`        | No       | Payer phone.                                     |
| `orderId`     | `string`        | No       | External order ID.                               |
| `delivery`    | `number`        | No       | Delivery fee.                                    |
| `items`       | `PaymentItem[]` | No       | Line items.                                      |
| `callbackUrl` | `string`        | No       | Server-to-server callback URL.                   |
| `okUrl`       | `string`        | No       | Redirect URL after successful payment.           |
| `failUrl`     | `string`        | No       | Redirect URL after failed payment.               |

**PaymentItem**

| Field      | Type     | Required | Description    |
| ---------- | -------- | -------- | -------------- |
| `id`       | `string` | No       | Item ID.       |
| `name`     | `string` | No       | Item name.     |
| `price`    | `number` | No       | Item price.    |
| `quantity` | `number` | No       | Item quantity. |

**PaymentInitResult**

| Field     | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `payId`   | `string` | Unique payment ID.            |
| `orderId` | `string` | Order ID (if provided).       |
| `payUrl`  | `string` | URL to redirect the payer to. |

**Example**

```typescript
const result = await client.pay({
  amount: 100.5,
  currency: "MDL",
  clientIp: "192.168.1.1",
  language: "ro",
  description: "Order #123",
  callbackUrl: "https://example.com/api/maib/callback",
  okUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
  items: [{ name: "Widget", price: 100.5, quantity: 1 }],
});

// Redirect payer to result.payUrl
console.log(result.payId); // "pay_abc123..."
console.log(result.payUrl); // "https://..."
```

---

### Two-Step Payments (Hold / Complete)

Use two-step payments to authorize (hold) funds first, then capture (complete) them later.

#### hold

Hold (authorize) funds on the payer's card. Identical parameters to `pay`.

```typescript
hold(params: HoldRequest): Promise<PaymentInitResult>
```

**HoldRequest** has the same fields as `PayRequest`.

**Example**

```typescript
const result = await client.hold({
  amount: 200.0,
  currency: "MDL",
  clientIp: "192.168.1.1",
  language: "ro",
  description: "Hotel reservation",
});

// Redirect payer to result.payUrl to complete authorization
```

---

#### complete

Capture (complete) a previously held payment. You can capture the full amount or a partial amount.

```typescript
complete(params: CompleteRequest): Promise<CompleteResult>
```

**CompleteRequest**

| Field           | Type     | Required | Description                                                   |
| --------------- | -------- | -------- | ------------------------------------------------------------- |
| `payId`         | `string` | Yes      | Payment ID from the `hold` response.                          |
| `confirmAmount` | `number` | No       | Amount to capture. If omitted, captures the full held amount. |

**CompleteResult**

| Field           | Type     | Description                                   |
| --------------- | -------- | --------------------------------------------- |
| `payId`         | `string` | Payment ID.                                   |
| `orderId`       | `string` | Order ID (if provided during hold).           |
| `status`        | `string` | Transaction status (see `TransactionStatus`). |
| `statusCode`    | `string` | Status code.                                  |
| `statusMessage` | `string` | Human-readable status message.                |
| `rrn`           | `string` | Retrieval reference number.                   |
| `approval`      | `string` | Approval code.                                |
| `cardNumber`    | `string` | Masked card number.                           |
| `confirmAmount` | `number` | Captured amount.                              |

**Example**

```typescript
const result = await client.complete({
  payId: "pay_abc123",
  confirmAmount: 150.0, // Partial capture
});

console.log(result.status); // "OK"
console.log(result.confirmAmount); // 150.00
```

---

### Refunds

#### refund

Refund a completed payment. Supports full and partial refunds.

```typescript
refund(params: RefundRequest): Promise<RefundResult>
```

**RefundRequest**

| Field          | Type     | Required | Description                                                    |
| -------------- | -------- | -------- | -------------------------------------------------------------- |
| `payId`        | `string` | Yes      | Payment ID to refund.                                          |
| `refundAmount` | `number` | No       | Amount to refund. If omitted, refunds the full payment amount. |

**RefundResult**

| Field           | Type     | Description                                   |
| --------------- | -------- | --------------------------------------------- |
| `payId`         | `string` | Payment ID.                                   |
| `orderId`       | `string` | Order ID (if provided during payment).        |
| `status`        | `string` | Transaction status (see `TransactionStatus`). |
| `statusCode`    | `string` | Status code.                                  |
| `statusMessage` | `string` | Human-readable status message.                |
| `refundAmount`  | `number` | Refunded amount.                              |

**Example**

```typescript
const result = await client.refund({
  payId: "pay_abc123",
  refundAmount: 50.0, // Partial refund
});

console.log(result.status); // "OK"
```

---

### Payment Info

#### getPayInfo

Retrieve details of a specific payment.

```typescript
getPayInfo(payId: string): Promise<PayInfoResult>
```

**PayInfoResult**

| Field           | Type       | Description                                   |
| --------------- | ---------- | --------------------------------------------- |
| `payId`         | `string`   | Payment ID.                                   |
| `orderId`       | `string`   | Order ID (if provided).                       |
| `status`        | `string`   | Transaction status (see `TransactionStatus`). |
| `statusCode`    | `string`   | Status code.                                  |
| `statusMessage` | `string`   | Human-readable status message.                |
| `amount`        | `number`   | Payment amount.                               |
| `currency`      | `Currency` | Payment currency.                             |
| `cardNumber`    | `string`   | Masked card number.                           |
| `rrn`           | `string`   | Retrieval reference number.                   |
| `approval`      | `string`   | Approval code.                                |

**Example**

```typescript
const info = await client.getPayInfo("pay_abc123");
console.log(info.status); // "OK"
console.log(info.amount); // 100.50
```

---

### Recurring Payments

Save a card for recurring charges, then execute charges without payer interaction.

#### savecardRecurring

Initiate card saving for recurring payments. Returns a URL where the payer authorizes card storage.

```typescript
savecardRecurring(params: SavecardRecurringRequest): Promise<PaymentInitResult>
```

**SavecardRecurringRequest** (extends `BasePaymentParams` and `CustomerFacingParams`)

| Field          | Type            | Required | Description                                                                   |
| -------------- | --------------- | -------- | ----------------------------------------------------------------------------- |
| `billerExpiry` | `string`        | Yes      | Expiration date for the saved card authorization (format varies by provider). |
| `email`        | `string`        | Yes      | Payer email (required for recurring).                                         |
| `currency`     | `Currency`      | Yes      | Currency (inherited from `CustomerFacingParams`).                             |
| `clientIp`     | `string`        | Yes      | Payer IP (inherited from `CustomerFacingParams`).                             |
| `language`     | `string`        | Yes      | Language (inherited from `CustomerFacingParams`).                             |
| `amount`       | `number`        | No       | Initial charge amount. If omitted, no initial charge is made.                 |
| `description`  | `string`        | No       | Description.                                                                  |
| `clientName`   | `string`        | No       | Payer name.                                                                   |
| `phone`        | `string`        | No       | Payer phone.                                                                  |
| `orderId`      | `string`        | No       | External order ID.                                                            |
| `delivery`     | `number`        | No       | Delivery fee.                                                                 |
| `items`        | `PaymentItem[]` | No       | Line items.                                                                   |
| `callbackUrl`  | `string`        | No       | Callback URL.                                                                 |
| `okUrl`        | `string`        | No       | Success redirect URL.                                                         |
| `failUrl`      | `string`        | No       | Fail redirect URL.                                                            |

**Example**

```typescript
const result = await client.savecardRecurring({
  billerExpiry: "20261231",
  email: "customer@example.com",
  currency: "MDL",
  clientIp: "192.168.1.1",
  language: "ro",
});

// Redirect payer to result.payUrl to authorize card saving
```

---

#### executeRecurring

Execute a recurring charge against a previously saved card. No payer interaction required.

```typescript
executeRecurring(params: ExecuteRecurringRequest): Promise<ExecuteRecurringResult>
```

**ExecuteRecurringRequest**

| Field         | Type            | Required | Description                                                   |
| ------------- | --------------- | -------- | ------------------------------------------------------------- |
| `billerId`    | `string`        | Yes      | Biller ID returned in the callback after `savecardRecurring`. |
| `amount`      | `number`        | Yes      | Amount to charge.                                             |
| `currency`    | `Currency`      | Yes      | Currency.                                                     |
| `description` | `string`        | No       | Charge description.                                           |
| `orderId`     | `string`        | No       | External order ID.                                            |
| `delivery`    | `number`        | No       | Delivery fee.                                                 |
| `items`       | `PaymentItem[]` | No       | Line items.                                                   |

**ExecuteRecurringResult**

| Field           | Type       | Description                                   |
| --------------- | ---------- | --------------------------------------------- |
| `payId`         | `string`   | Payment ID for this charge.                   |
| `billerId`      | `string`   | Biller ID.                                    |
| `orderId`       | `string`   | Order ID (if provided).                       |
| `status`        | `string`   | Transaction status (see `TransactionStatus`). |
| `statusCode`    | `string`   | Status code.                                  |
| `statusMessage` | `string`   | Human-readable status message.                |
| `rrn`           | `string`   | Retrieval reference number.                   |
| `approval`      | `string`   | Approval code.                                |
| `cardNumber`    | `string`   | Masked card number.                           |
| `amount`        | `number`   | Charged amount.                               |
| `currency`      | `Currency` | Charged currency.                             |

**Example**

```typescript
const result = await client.executeRecurring({
  billerId: "biller_xyz",
  amount: 99.99,
  currency: "MDL",
  description: "Monthly subscription",
});

console.log(result.status); // "OK"
console.log(result.payId);
```

---

### One-Click Payments

Save a card for one-click payments, then execute charges with a simplified flow.

#### savecardOneclick

Initiate card saving for one-click payments.

```typescript
savecardOneclick(params: SavecardOneclickRequest): Promise<PaymentInitResult>
```

**SavecardOneclickRequest** (extends `BasePaymentParams` and `CustomerFacingParams`)

| Field          | Type            | Required | Description                                   |
| -------------- | --------------- | -------- | --------------------------------------------- |
| `billerExpiry` | `string`        | Yes      | Expiration date for saved card authorization. |
| `currency`     | `Currency`      | Yes      | Currency.                                     |
| `clientIp`     | `string`        | Yes      | Payer IP.                                     |
| `language`     | `string`        | Yes      | Language.                                     |
| `amount`       | `number`        | No       | Initial charge amount.                        |
| `description`  | `string`        | No       | Description.                                  |
| `clientName`   | `string`        | No       | Payer name.                                   |
| `email`        | `string`        | No       | Payer email.                                  |
| `phone`        | `string`        | No       | Payer phone.                                  |
| `orderId`      | `string`        | No       | External order ID.                            |
| `delivery`     | `number`        | No       | Delivery fee.                                 |
| `items`        | `PaymentItem[]` | No       | Line items.                                   |
| `callbackUrl`  | `string`        | No       | Callback URL.                                 |
| `okUrl`        | `string`        | No       | Success redirect URL.                         |
| `failUrl`      | `string`        | No       | Fail redirect URL.                            |

---

#### executeOneclick

Execute a one-click payment using a previously saved card. The payer is redirected to a simplified checkout page (no card entry required).

```typescript
executeOneclick(params: ExecuteOneclickRequest): Promise<PaymentInitResult>
```

**ExecuteOneclickRequest** (extends `BasePaymentParams` and `CustomerFacingParams`)

| Field         | Type            | Required | Description                                     |
| ------------- | --------------- | -------- | ----------------------------------------------- |
| `billerId`    | `string`        | Yes      | Biller ID from the `savecardOneclick` callback. |
| `amount`      | `number`        | Yes      | Payment amount.                                 |
| `currency`    | `Currency`      | Yes      | Currency.                                       |
| `clientIp`    | `string`        | Yes      | Payer IP.                                       |
| `language`    | `string`        | Yes      | Language.                                       |
| `description` | `string`        | No       | Description.                                    |
| `clientName`  | `string`        | No       | Payer name.                                     |
| `email`       | `string`        | No       | Payer email.                                    |
| `phone`       | `string`        | No       | Payer phone.                                    |
| `orderId`     | `string`        | No       | External order ID.                              |
| `delivery`    | `number`        | No       | Delivery fee.                                   |
| `items`       | `PaymentItem[]` | No       | Line items.                                     |
| `callbackUrl` | `string`        | No       | Callback URL.                                   |
| `okUrl`       | `string`        | No       | Success redirect URL.                           |
| `failUrl`     | `string`        | No       | Fail redirect URL.                              |

Returns `PaymentInitResult` with `payId`, `orderId`, and `payUrl`.

**Example**

```typescript
const result = await client.executeOneclick({
  billerId: "biller_xyz",
  amount: 49.99,
  currency: "MDL",
  clientIp: "192.168.1.1",
  language: "ro",
});

// Redirect payer to result.payUrl (simplified checkout, no card entry)
```

---

### Saved Card Management

#### deleteCard

Delete a previously saved card (removes both recurring and one-click authorizations).

```typescript
deleteCard(billerId: string): Promise<void>
```

**Example**

```typescript
await client.deleteCard("biller_xyz");
```

---

### Callback Signature Verification

E-commerce callbacks use SHA-256 signature verification based on sorted payload values. The callback POST body contains a `result` object and a `signature` string.

**Important difference from `@maib/checkout`**: This method takes a parsed `CallbackPayload` object, not a raw body string.

#### verifyCallback

Verify the SHA-256 signature of an incoming callback. Uses timing-safe comparison.

```typescript
verifyCallback(payload: CallbackPayload): boolean
```

**CallbackPayload**

| Field       | Type             | Description                                 |
| ----------- | ---------------- | ------------------------------------------- |
| `result`    | `CallbackResult` | The callback result object.                 |
| `signature` | `string`         | Base64-encoded SHA-256 signature to verify. |

**CallbackResult**

| Field           | Type       | Description                                      |
| --------------- | ---------- | ------------------------------------------------ |
| `payId`         | `string`   | Payment ID.                                      |
| `orderId`       | `string`   | Order ID (if provided).                          |
| `status`        | `string`   | Transaction status (see `TransactionStatus`).    |
| `statusCode`    | `string`   | Status code.                                     |
| `statusMessage` | `string`   | Human-readable status message.                   |
| `threeDs`       | `string`   | 3D Secure status (see `ThreeDsStatus`).          |
| `rrn`           | `string`   | Retrieval reference number.                      |
| `approval`      | `string`   | Approval code.                                   |
| `cardNumber`    | `string`   | Masked card number.                              |
| `amount`        | `number`   | Payment amount.                                  |
| `currency`      | `Currency` | Payment currency.                                |
| `billerId`      | `string`   | Biller ID (present for recurring/one-click).     |
| `billerExpiry`  | `string`   | Biller expiry (present for recurring/one-click). |

Returns `true` if the signature is valid.

Throws `Error` if `signatureKey` was not provided in the constructor config.

**Signature algorithm**: Sort all `result` keys alphabetically (recursively), collect all leaf values in order, join with `:`, append the `signatureKey`, compute SHA-256, and base64-encode.

**Example (Express.js)**

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.post("/api/maib/callback", (req, res) => {
  const payload = req.body as CallbackPayload;

  if (!client.verifyCallback(payload)) {
    return res.status(401).send("Invalid signature");
  }

  // Process the payment notification
  console.log(payload.result.payId, payload.result.status);

  // For recurring/one-click, save the billerId
  if (payload.result.billerId) {
    console.log("Saved card biller:", payload.result.billerId);
  }

  res.status(200).send("OK");
});
```

---

#### computeCallbackSignature

Compute the expected SHA-256 signature for a result object. Useful for testing.

```typescript
computeCallbackSignature(result: Record<string, unknown>): string
```

Returns the base64-encoded SHA-256 signature string.

Throws `Error` if `signatureKey` was not provided in the constructor config.

**Example**

```typescript
const signature = client.computeCallbackSignature({
  payId: "pay_abc123",
  status: "OK",
  statusCode: "000",
  statusMessage: "Approved",
  amount: 100,
  currency: "MDL",
});
```

---

## Enums

All enums are plain objects with `as const` (not TypeScript `enum`). You can use either the constant or the string literal value.

### TransactionStatus

```typescript
import { TransactionStatus } from "@maib/ecommerce";
```

| Constant                     | Value        |
| ---------------------------- | ------------ |
| `TransactionStatus.OK`       | `"OK"`       |
| `TransactionStatus.FAILED`   | `"FAILED"`   |
| `TransactionStatus.CREATED`  | `"CREATED"`  |
| `TransactionStatus.PENDING`  | `"PENDING"`  |
| `TransactionStatus.DECLINED` | `"DECLINED"` |
| `TransactionStatus.TIMEOUT`  | `"TIMEOUT"`  |
| `TransactionStatus.REVERSED` | `"REVERSED"` |

### ThreeDsStatus

```typescript
import { ThreeDsStatus } from "@maib/ecommerce";
```

| Constant                          | Value                 |
| --------------------------------- | --------------------- |
| `ThreeDsStatus.AUTHENTICATED`     | `"AUTHENTICATED"`     |
| `ThreeDsStatus.NOT_AUTHENTICATED` | `"NOT_AUTHENTICATED"` |
| `ThreeDsStatus.UNAVAILABLE`       | `"UNAVAILABLE"`       |
| `ThreeDsStatus.ATTEMPTED`         | `"ATTEMPTED"`         |
| `ThreeDsStatus.REJECTED`          | `"REJECTED"`          |
| `ThreeDsStatus.SKIPPED`           | `"SKIPPED"`           |
| `ThreeDsStatus.NOTPARTICIPATED`   | `"NOTPARTICIPATED"`   |

---

## Shared Types from @maib/core

These types are re-exported from `@maib/ecommerce` for convenience.

### Currency

| Constant       | Value   |
| -------------- | ------- |
| `Currency.MDL` | `"MDL"` |
| `Currency.EUR` | `"EUR"` |
| `Currency.USD` | `"USD"` |

### Language

| Constant      | Value  |
| ------------- | ------ |
| `Language.RO` | `"ro"` |
| `Language.EN` | `"en"` |
| `Language.RU` | `"ru"` |

> **Note**: `Environment` is not re-exported from `@maib/ecommerce` because the v1 API does not support sandbox environments.

---

## Error Handling

The SDK throws two error types. Both are importable from `@maib/core`.

### MaibError

Thrown when the maib API returns a response with `ok: false`.

```typescript
import { MaibError } from "@maib/core";

try {
  await client.pay({
    amount: -1,
    currency: "MDL",
    clientIp: "192.168.1.1",
    language: "ro",
  });
} catch (error) {
  if (error instanceof MaibError) {
    console.log(error.statusCode); // HTTP status code, e.g. 400
    console.log(error.errors); // MaibApiError[]
    // Each error: { errorCode: string, errorMessage: string, errorArgs?: Record<string, string> }
    console.log(error.message); // "[ERROR_CODE] Error message"
  }
}
```

### MaibNetworkError

Thrown when a network request fails entirely (DNS failure, timeout, invalid JSON response).

```typescript
import { MaibNetworkError } from "@maib/core";

try {
  await client.getPayInfo("pay_abc123");
} catch (error) {
  if (error instanceof MaibNetworkError) {
    console.log(error.message); // "Network request to GET /v1/pay-info/pay_abc123 failed"
    console.log(error.cause); // Original error
  }
}
```

---

## Full Exports

Everything importable from `@maib/ecommerce`:

```typescript
// Classes
export { EcommerceClient } from "@maib/ecommerce";

// Enum-like constants (also usable as types)
export { TransactionStatus, ThreeDsStatus } from "@maib/ecommerce";
export { Currency, Language } from "@maib/ecommerce";

// Types (import type)
export type {
  BasePaymentParams,
  CallbackPayload,
  CallbackResult,
  CompleteRequest,
  CompleteResult,
  CustomerFacingParams,
  EcommerceClientConfig,
  ExecuteOneclickRequest,
  ExecuteRecurringRequest,
  ExecuteRecurringResult,
  HoldRequest,
  PayInfoResult,
  PaymentInitResult,
  PaymentItem,
  PayRequest,
  RefundRequest,
  RefundResult,
  SavecardOneclickRequest,
  SavecardRecurringRequest,
} from "@maib/ecommerce";
```

---

## Key Differences from @maib/checkout

| Aspect                 | @maib/ecommerce (v1)                                                                   | @maib/checkout (v2)                         |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| Constructor config     | `projectId` / `projectSecret`                                                          | `clientId` / `clientSecret`                 |
| Config type            | `EcommerceClientConfig`                                                                | `MaibClientConfig`                          |
| Sandbox support        | No                                                                                     | Yes (`Environment.SANDBOX`)                 |
| Callback verification  | SHA-256 sorted-values on parsed object                                                 | HMAC-SHA256 on raw body string              |
| `verifyCallback` input | `CallbackPayload` object                                                               | `(rawBody, xSignature, xTimestamp)` strings |
| Payment flow           | Direct `pay()` returns `payUrl`                                                        | `createSession()` returns `checkoutUrl`     |
| Two-step payments      | `hold()` + `complete()`                                                                | Not available                               |
| Recurring/one-click    | `savecardRecurring()`, `executeRecurring()`, `savecardOneclick()`, `executeOneclick()` | Not available                               |
| Pagination/listing     | Not available                                                                          | `listSessions()`, `listPayments()`          |
| Token endpoint         | `/v1/generate-token`                                                                   | `/v2/auth/token`                            |
