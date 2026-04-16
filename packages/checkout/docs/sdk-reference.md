---
package: "@maib/checkout"
version: 0.2.2
description: TypeScript SDK for the maib hosted Checkout API — session management, payments, and refunds.
api_version: v2
upstream_docs: https://docs.maibmerchants.md/checkout
upstream_updated: 2025-11-10
---

# @maib/checkout SDK Reference

TypeScript SDK for the maib hosted Checkout API (v2). Create checkout sessions, process payments, issue refunds, and verify callback signatures.

## Installation

```bash
npm install @maib/checkout
# or
yarn add @maib/checkout
```

## Architecture

- `CheckoutClient` extends `BaseClient` from `@maib/core`.
- Authentication uses OAuth2 Client Credentials flow. Tokens are acquired and refreshed automatically; you never manage tokens directly.
- Callback signature verification uses **HMAC-SHA256** (different from `@maib/ecommerce` which uses SHA-256 sorted-values).
- All API responses are automatically unwrapped from the `{ result: T, ok: true }` envelope.
- HTTP requests include automatic retry-safe error handling. Network failures throw `MaibNetworkError`; API errors throw `MaibError`.

## Configuration

Create a client by passing `MaibClientConfig` to the `CheckoutClient` constructor.

```typescript
import { CheckoutClient, Environment } from "@maib/checkout";

const client = new CheckoutClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  signatureKey: "your-signature-key", // optional, required for verifyCallback / computeCallbackSignature
  environment: Environment.PRODUCTION, // optional, default: "production"
  // baseUrl: "https://custom-host.example", // optional, overrides environment
  // fetch: customFetch,                     // optional, default: globalThis.fetch
});
```

### MaibClientConfig

| Property       | Type           | Required | Default                          | Description                                                                                                                 |
| -------------- | -------------- | -------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `clientId`     | `string`       | Yes      | --                               | OAuth2 client ID from the maibmerchants portal.                                                                             |
| `clientSecret` | `string`       | Yes      | --                               | OAuth2 client secret from the maibmerchants portal.                                                                         |
| `signatureKey` | `string`       | No       | --                               | HMAC key for callback signature verification. Required only if you call `verifyCallback()` or `computeCallbackSignature()`. |
| `environment`  | `Environment`  | No       | `"production"`                   | `Environment.PRODUCTION` or `Environment.SANDBOX`. Determines the API host. Ignored when `baseUrl` is set.                  |
| `baseUrl`      | `string`       | No       | `"https://api.maibmerchants.md"` | Override the API host entirely. Takes precedence over `environment`.                                                        |
| `fetch`        | `typeof fetch` | No       | `globalThis.fetch`               | Custom fetch implementation for testing or Node.js polyfills.                                                               |

### Environment values

| Constant                 | Value          | API Host                           |
| ------------------------ | -------------- | ---------------------------------- |
| `Environment.PRODUCTION` | `"production"` | `https://api.maibmerchants.md`     |
| `Environment.SANDBOX`    | `"sandbox"`    | `https://sandbox.maibmerchants.md` |

## API Methods

### Checkout Sessions

#### createSession

Create a new checkout session. Returns a URL to redirect the payer to.

```typescript
createSession(params: CreateSessionRequest): Promise<CreateSessionResult>
```

**CreateSessionRequest**

| Field         | Type        | Required | Description                                              |
| ------------- | ----------- | -------- | -------------------------------------------------------- |
| `amount`      | `number`    | Yes      | Payment amount.                                          |
| `currency`    | `Currency`  | Yes      | `"MDL"`, `"EUR"`, or `"USD"`.                            |
| `callbackUrl` | `string`    | No       | URL for server-to-server callback on payment completion. |
| `successUrl`  | `string`    | No       | Redirect URL after successful payment.                   |
| `failUrl`     | `string`    | No       | Redirect URL after failed payment.                       |
| `language`    | `string`    | No       | Checkout page language (`"ro"`, `"en"`, `"ru"`).         |
| `orderInfo`   | `OrderInfo` | No       | Order metadata.                                          |
| `payerInfo`   | `PayerInfo` | No       | Payer metadata.                                          |

**OrderInfo**

| Field              | Type          | Required | Description            |
| ------------------ | ------------- | -------- | ---------------------- |
| `id`               | `string`      | No       | External order ID.     |
| `description`      | `string`      | No       | Order description.     |
| `date`             | `string`      | No       | Order date.            |
| `orderAmount`      | `number`      | No       | Order total amount.    |
| `orderCurrency`    | `Currency`    | No       | Order amount currency. |
| `deliveryAmount`   | `number`      | No       | Delivery fee.          |
| `deliveryCurrency` | `Currency`    | No       | Delivery fee currency. |
| `items`            | `OrderItem[]` | No       | Line items.            |

**OrderItem**

| Field          | Type       | Required | Description                     |
| -------------- | ---------- | -------- | ------------------------------- |
| `externalId`   | `string`   | No       | Item external ID.               |
| `title`        | `string`   | No       | Item title.                     |
| `amount`       | `number`   | No       | Item price.                     |
| `currency`     | `Currency` | No       | Item currency.                  |
| `quantity`     | `number`   | No       | Quantity.                       |
| `displayOrder` | `number`   | No       | Display order on checkout page. |

**PayerInfo**

| Field       | Type     | Required | Description         |
| ----------- | -------- | -------- | ------------------- |
| `name`      | `string` | No       | Payer name.         |
| `email`     | `string` | No       | Payer email.        |
| `phone`     | `string` | No       | Payer phone number. |
| `ip`        | `string` | No       | Payer IP address.   |
| `userAgent` | `string` | No       | Payer user agent.   |

**CreateSessionResult**

| Field         | Type     | Description                   |
| ------------- | -------- | ----------------------------- |
| `checkoutId`  | `string` | Unique checkout session ID.   |
| `checkoutUrl` | `string` | URL to redirect the payer to. |

**Example**

```typescript
const session = await client.createSession({
  amount: 100.5,
  currency: "MDL",
  callbackUrl: "https://example.com/api/maib/callback",
  successUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
  language: "ro",
  orderInfo: {
    id: "order-123",
    description: "Test order",
    items: [{ title: "Widget", amount: 100.5, quantity: 1 }],
  },
});

// Redirect payer to session.checkoutUrl
console.log(session.checkoutId); // "ck_abc123..."
console.log(session.checkoutUrl); // "https://checkout.maibmerchants.md/..."
```

---

#### getSession

Retrieve details of a specific checkout session.

```typescript
getSession(checkoutId: string): Promise<SessionDetails>
```

**SessionDetails**

| Field         | Type                     | Description                                           |
| ------------- | ------------------------ | ----------------------------------------------------- |
| `id`          | `string`                 | Checkout session ID.                                  |
| `createdAt`   | `string`                 | ISO 8601 creation timestamp.                          |
| `status`      | `string`                 | Session status (see `CheckoutStatus` enum).           |
| `amount`      | `number`                 | Payment amount.                                       |
| `currency`    | `Currency`               | Payment currency.                                     |
| `callbackUrl` | `string`                 | Callback URL.                                         |
| `successUrl`  | `string`                 | Success redirect URL.                                 |
| `failUrl`     | `string`                 | Fail redirect URL.                                    |
| `language`    | `string`                 | Checkout page language.                               |
| `url`         | `string`                 | Checkout page URL.                                    |
| `expiresAt`   | `string`                 | ISO 8601 expiration timestamp.                        |
| `completedAt` | `string \| null`         | ISO 8601 completion timestamp.                        |
| `failedAt`    | `string \| null`         | ISO 8601 failure timestamp.                           |
| `cancelledAt` | `string \| null`         | ISO 8601 cancellation timestamp.                      |
| `order`       | `SessionOrder \| null`   | Order details.                                        |
| `payer`       | `SessionPayer \| null`   | Payer details.                                        |
| `payment`     | `SessionPayment \| null` | Payment details (present when status is `Completed`). |

**Example**

```typescript
const details = await client.getSession("ck_abc123");
console.log(details.status); // "Completed"
console.log(details.payment?.paymentId);
```

---

#### listSessions

List checkout sessions with pagination and filters.

```typescript
listSessions(params: ListSessionsParams): Promise<PaginatedResult<SessionDetails>>
```

**ListSessionsParams** (extends `PaginationParams`)

| Field             | Type              | Required | Description                              |
| ----------------- | ----------------- | -------- | ---------------------------------------- |
| `count`           | `number`          | Yes      | Number of items per page.                |
| `offset`          | `number`          | Yes      | Number of items to skip.                 |
| `sortBy`          | `string`          | No       | Field to sort by.                        |
| `order`           | `"asc" \| "desc"` | No       | Sort direction.                          |
| `id`              | `string`          | No       | Filter by checkout ID.                   |
| `orderId`         | `string`          | No       | Filter by order ID.                      |
| `status`          | `string`          | No       | Filter by status (see `CheckoutStatus`). |
| `minAmount`       | `number`          | No       | Minimum amount filter.                   |
| `maxAmount`       | `number`          | No       | Maximum amount filter.                   |
| `currency`        | `Currency`        | No       | Filter by currency.                      |
| `language`        | `string`          | No       | Filter by language.                      |
| `payerName`       | `string`          | No       | Filter by payer name.                    |
| `payerEmail`      | `string`          | No       | Filter by payer email.                   |
| `payerPhone`      | `string`          | No       | Filter by payer phone.                   |
| `payerIp`         | `string`          | No       | Filter by payer IP.                      |
| `createdAtFrom`   | `string`          | No       | Filter: created at or after (ISO 8601).  |
| `createdAtTo`     | `string`          | No       | Filter: created at or before (ISO 8601). |
| `expiresAtFrom`   | `string`          | No       | Filter: expires at or after.             |
| `expiresAtTo`     | `string`          | No       | Filter: expires at or before.            |
| `cancelledAtFrom` | `string`          | No       | Filter: cancelled at or after.           |
| `cancelledAtTo`   | `string`          | No       | Filter: cancelled at or before.          |
| `failedAtFrom`    | `string`          | No       | Filter: failed at or after.              |
| `failedAtTo`      | `string`          | No       | Filter: failed at or before.             |
| `completedAtFrom` | `string`          | No       | Filter: completed at or after.           |
| `completedAtTo`   | `string`          | No       | Filter: completed at or before.          |

**PaginatedResult\<T\>**

| Field        | Type     | Description                          |
| ------------ | -------- | ------------------------------------ |
| `totalCount` | `number` | Total number of matching items.      |
| `items`      | `T[]`    | Array of items for the current page. |

**Example**

```typescript
const result = await client.listSessions({
  count: 10,
  offset: 0,
  status: "Completed",
  currency: "MDL",
});

console.log(result.totalCount);
for (const session of result.items) {
  console.log(session.id, session.amount);
}
```

---

#### cancelSession

Cancel a pending checkout session.

```typescript
cancelSession(checkoutId: string): Promise<CancelSessionResult>
```

**CancelSessionResult**

| Field        | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| `checkoutId` | `string` | Checkout session ID.                        |
| `status`     | `string` | New session status (will be `"Cancelled"`). |

**Example**

```typescript
const result = await client.cancelSession("ck_abc123");
console.log(result.status); // "Cancelled"
```

---

### Payments

#### getPayment

Retrieve details of a specific payment.

```typescript
getPayment(paymentId: string): Promise<PaymentDetails>
```

**PaymentDetails**

| Field                    | Type             | Description                                                                |
| ------------------------ | ---------------- | -------------------------------------------------------------------------- |
| `paymentId`              | `string`         | Payment ID.                                                                |
| `paymentIntentId`        | `string \| null` | Payment intent ID.                                                         |
| `executedAt`             | `string`         | ISO 8601 execution timestamp.                                              |
| `status`                 | `string`         | Payment status (see `PaymentStatus`).                                      |
| `amount`                 | `number`         | Payment amount.                                                            |
| `currency`               | `Currency`       | Payment currency.                                                          |
| `type`                   | `string`         | Payment type.                                                              |
| `providerType`           | `string`         | Payment provider type.                                                     |
| `senderName`             | `string \| null` | Sender name.                                                               |
| `senderIban`             | `string \| null` | Sender IBAN.                                                               |
| `recipientIban`          | `string \| null` | Recipient IBAN.                                                            |
| `referenceNumber`        | `string`         | Retrieval reference number (RRN).                                          |
| `mcc`                    | `string`         | Merchant category code.                                                    |
| `orderId`                | `string`         | Order ID.                                                                  |
| `terminalId`             | `string`         | Terminal ID.                                                               |
| `refundedAmount`         | `number`         | Total refunded amount.                                                     |
| `paymentMethod`          | `string \| null` | Payment method used.                                                       |
| `approvalCode`           | `string \| null` | Authorization approval code.                                               |
| `requestedRefundAmount`  | `number`         | Total requested refund amount (may differ from refundedAmount if pending). |
| `firstRefundedAt`        | `string \| null` | ISO 8601 timestamp of first refund.                                        |
| `lastRefundedAt`         | `string \| null` | ISO 8601 timestamp of last refund.                                         |
| `note`                   | `string \| null` | Payment note.                                                              |
| `isRefundable`           | `boolean`        | Whether this payment can be refunded.                                      |
| `partialRefundAvailable` | `boolean`        | Whether partial refunds are available.                                     |
| `paymentEntryPoint`      | `string`         | Payment entry point.                                                       |
| `refundableAmount`       | `number`         | Remaining refundable amount.                                               |

---

#### listPayments

List payments with pagination and filters.

```typescript
listPayments(params: ListPaymentsParams): Promise<PaginatedResult<PaymentDetails>>
```

**ListPaymentsParams** (extends `PaginationParams`)

| Field             | Type              | Required | Description                             |
| ----------------- | ----------------- | -------- | --------------------------------------- |
| `count`           | `number`          | Yes      | Number of items per page.               |
| `offset`          | `number`          | Yes      | Number of items to skip.                |
| `sortBy`          | `string`          | No       | Field to sort by.                       |
| `order`           | `"asc" \| "desc"` | No       | Sort direction.                         |
| `paymentId`       | `string`          | No       | Filter by payment ID.                   |
| `paymentIntentId` | `string`          | No       | Filter by payment intent ID.            |
| `terminalId`      | `string`          | No       | Filter by terminal ID.                  |
| `amountFrom`      | `number`          | No       | Minimum amount filter.                  |
| `amountTo`        | `number`          | No       | Maximum amount filter.                  |
| `currency`        | `Currency`        | No       | Filter by currency.                     |
| `orderId`         | `string`          | No       | Filter by order ID.                     |
| `note`            | `string`          | No       | Filter by note.                         |
| `status`          | `string`          | No       | Filter by status (see `PaymentStatus`). |
| `executedAtFrom`  | `string`          | No       | Filter: executed at or after.           |
| `executedAtTo`    | `string`          | No       | Filter: executed at or before.          |
| `recipientIban`   | `string`          | No       | Filter by recipient IBAN.               |
| `referenceNumber` | `string`          | No       | Filter by reference number.             |
| `senderIban`      | `string`          | No       | Filter by sender IBAN.                  |
| `senderName`      | `string`          | No       | Filter by sender name.                  |
| `providerType`    | `string`          | No       | Filter by provider type.                |
| `mcc`             | `string`          | No       | Filter by MCC.                          |
| `type`            | `string`          | No       | Filter by payment type.                 |

---

### Refunds

#### refund

Refund a payment (full or partial).

```typescript
refund(payId: string, params: RefundRequest): Promise<RefundResult>
```

**RefundRequest**

| Field    | Type     | Required | Description            |
| -------- | -------- | -------- | ---------------------- |
| `amount` | `number` | Yes      | Amount to refund.      |
| `reason` | `string` | Yes      | Reason for the refund. |

**RefundResult**

| Field      | Type     | Description                         |
| ---------- | -------- | ----------------------------------- |
| `refundId` | `string` | Unique refund ID.                   |
| `status`   | `string` | Refund status (see `RefundStatus`). |

**Example**

```typescript
const result = await client.refund("pay_xyz789", {
  amount: 50.0,
  reason: "Customer requested refund",
});
console.log(result.refundId); // "ref_abc123"
```

---

#### getRefund

Retrieve details of a specific refund.

```typescript
getRefund(refundId: string): Promise<RefundDetails>
```

**RefundDetails**

| Field          | Type       | Description                         |
| -------------- | ---------- | ----------------------------------- |
| `id`           | `string`   | Refund ID.                          |
| `paymentId`    | `string`   | Associated payment ID.              |
| `refundType`   | `string`   | Type of refund.                     |
| `amount`       | `number`   | Refund amount.                      |
| `currency`     | `Currency` | Refund currency.                    |
| `refundReason` | `string`   | Reason for refund.                  |
| `executedAt`   | `string`   | ISO 8601 execution timestamp.       |
| `status`       | `string`   | Refund status (see `RefundStatus`). |

---

### Callback Signature Verification

Checkout callbacks are sent as POST requests to your `callbackUrl`. The request includes `X-Signature` and `X-Signature-Timestamp` headers for HMAC-SHA256 verification.

#### verifyCallback

Verify the HMAC-SHA256 signature of an incoming callback. Uses timing-safe comparison. Handles duplicated headers from reverse proxies (e.g. Cloudflare).

```typescript
verifyCallback(rawBody: string, xSignature: string, xTimestamp: string): boolean
```

| Parameter    | Type     | Description                                                               |
| ------------ | -------- | ------------------------------------------------------------------------- |
| `rawBody`    | `string` | The raw JSON request body as a string. Do **not** parse and re-serialize. |
| `xSignature` | `string` | Value of the `X-Signature` header (e.g. `"sha256=abc123..."`).            |
| `xTimestamp` | `string` | Value of the `X-Signature-Timestamp` header.                              |

Returns `true` if the signature is valid.

Throws `Error` if `signatureKey` was not provided in the constructor config.

**Example (Express.js)**

```typescript
import express from "express";

const app = express();

// IMPORTANT: Use raw body — do not use express.json() before this route
app.post(
  "/api/maib/callback",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody = req.body.toString("utf-8");
    const xSignature = req.headers["x-signature"] as string;
    const xTimestamp = req.headers["x-signature-timestamp"] as string;

    if (!client.verifyCallback(rawBody, xSignature, xTimestamp)) {
      return res.status(401).send("Invalid signature");
    }

    const payload: CheckoutCallbackPayload = JSON.parse(rawBody);
    // Process the payment notification...
    console.log(payload.paymentId, payload.paymentStatus);

    res.status(200).send("OK");
  },
);
```

---

#### computeCallbackSignature

Compute the expected HMAC-SHA256 signature for a given body and timestamp. Useful for testing.

```typescript
computeCallbackSignature(rawBody: string, timestamp: string): string
```

Returns the base64-encoded HMAC-SHA256 signature string (without the `sha256=` prefix).

Throws `Error` if `signatureKey` was not provided in the constructor config.

---

## Callback Payload

When a checkout completes, maib sends a POST request to your `callbackUrl` with a JSON body matching `CheckoutCallbackPayload`.

**CheckoutCallbackPayload**

| Field                      | Type               | Description                           |
| -------------------------- | ------------------ | ------------------------------------- |
| `checkoutId`               | `string`           | Checkout session ID.                  |
| `terminalId`               | `string \| null`   | Terminal ID.                          |
| `amount`                   | `number`           | Checkout amount.                      |
| `currency`                 | `Currency`         | Checkout currency.                    |
| `completedAt`              | `string`           | ISO 8601 completion timestamp.        |
| `payerName`                | `string \| null`   | Payer name.                           |
| `payerEmail`               | `string \| null`   | Payer email.                          |
| `payerPhone`               | `string \| null`   | Payer phone.                          |
| `payerIp`                  | `string \| null`   | Payer IP address.                     |
| `orderId`                  | `string \| null`   | External order ID.                    |
| `orderDescription`         | `string \| null`   | Order description.                    |
| `orderDeliveryAmount`      | `number \| null`   | Delivery fee amount.                  |
| `orderDeliveryCurrency`    | `Currency \| null` | Delivery fee currency.                |
| `paymentId`                | `string`           | Payment ID.                           |
| `paymentAmount`            | `number`           | Payment amount.                       |
| `paymentCurrency`          | `Currency`         | Payment currency.                     |
| `paymentStatus`            | `string`           | Payment status.                       |
| `paymentExecutedAt`        | `string`           | ISO 8601 payment execution timestamp. |
| `senderIban`               | `string \| null`   | Sender IBAN.                          |
| `senderName`               | `string`           | Sender name.                          |
| `senderCardNumber`         | `string \| null`   | Masked card number.                   |
| `retrievalReferenceNumber` | `string`           | Retrieval reference number (RRN).     |
| `processingStatus`         | `string \| null`   | Processing status.                    |
| `processingStatusCode`     | `string \| null`   | Processing status code.               |
| `approvalCode`             | `string \| null`   | Authorization approval code.          |
| `threeDsResult`            | `string \| null`   | 3D Secure result.                     |
| `threeDsReason`            | `string \| null`   | 3D Secure reason.                     |
| `paymentMethod`            | `string \| null`   | Payment method used.                  |

---

## Enums

All enums are plain objects with `as const` (not TypeScript `enum`). You can use either the constant or the string literal value.

### CheckoutStatus

```typescript
import { CheckoutStatus } from "@maib/checkout";
```

| Constant                                 | Value                     |
| ---------------------------------------- | ------------------------- |
| `CheckoutStatus.WAITING_FOR_INIT`        | `"WaitingForInit"`        |
| `CheckoutStatus.INITIALIZED`             | `"Initialized"`           |
| `CheckoutStatus.PAYMENT_METHOD_SELECTED` | `"PaymentMethodSelected"` |
| `CheckoutStatus.COMPLETED`               | `"Completed"`             |
| `CheckoutStatus.EXPIRED`                 | `"Expired"`               |
| `CheckoutStatus.ABANDONED`               | `"Abandoned"`             |
| `CheckoutStatus.CANCELLED`               | `"Cancelled"`             |
| `CheckoutStatus.FAILED`                  | `"Failed"`                |

### PaymentStatus

```typescript
import { PaymentStatus } from "@maib/checkout";
```

| Constant                           | Value                 |
| ---------------------------------- | --------------------- |
| `PaymentStatus.EXECUTED`           | `"Executed"`          |
| `PaymentStatus.PARTIALLY_REFUNDED` | `"PartiallyRefunded"` |
| `PaymentStatus.REFUNDED`           | `"Refunded"`          |
| `PaymentStatus.FAILED`             | `"Failed"`            |

### RefundStatus

```typescript
import { RefundStatus } from "@maib/checkout";
```

| Constant                 | Value         |
| ------------------------ | ------------- |
| `RefundStatus.CREATED`   | `"Created"`   |
| `RefundStatus.REQUESTED` | `"Requested"` |
| `RefundStatus.ACCEPTED`  | `"Accepted"`  |
| `RefundStatus.REJECTED`  | `"Rejected"`  |
| `RefundStatus.MANUAL`    | `"Manual"`    |

---

## Shared Types from @maib/core

These types are re-exported from `@maib/checkout` for convenience.

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

### Environment

| Constant                 | Value          |
| ------------------------ | -------------- |
| `Environment.PRODUCTION` | `"production"` |
| `Environment.SANDBOX`    | `"sandbox"`    |

### PaginationParams

| Field    | Type              | Required | Description               |
| -------- | ----------------- | -------- | ------------------------- |
| `count`  | `number`          | Yes      | Number of items per page. |
| `offset` | `number`          | Yes      | Number of items to skip.  |
| `sortBy` | `string`          | No       | Field to sort by.         |
| `order`  | `"asc" \| "desc"` | No       | Sort direction.           |

### PaginatedResult\<T\>

| Field        | Type     | Description                          |
| ------------ | -------- | ------------------------------------ |
| `totalCount` | `number` | Total number of matching items.      |
| `items`      | `T[]`    | Array of items for the current page. |

---

## Error Handling

The SDK throws two error types. Both are importable from `@maib/core` or caught generically.

### MaibError

Thrown when the maib API returns a response with `ok: false`.

```typescript
import { MaibError } from "@maib/core";

try {
  await client.createSession({ amount: -1, currency: "MDL" });
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
  await client.getSession("ck_abc123");
} catch (error) {
  if (error instanceof MaibNetworkError) {
    console.log(error.message); // "Network request to GET /v2/checkouts/ck_abc123 failed"
    console.log(error.cause); // Original error (e.g. TypeError: fetch failed)
  }
}
```

---

## Full Exports

Everything importable from `@maib/checkout`:

```typescript
// Classes
export { CheckoutClient } from "@maib/checkout";

// Enum-like constants (also usable as types)
export { CheckoutStatus, PaymentStatus, RefundStatus } from "@maib/checkout";
export { Currency, Environment, Language } from "@maib/checkout";

// Types (import type)
export type {
  CancelSessionResult,
  CheckoutCallbackPayload,
  CheckoutClientConfig,
  CreateSessionRequest,
  CreateSessionResult,
  ListPaymentsParams,
  ListSessionsParams,
  OrderInfo,
  OrderItem,
  PayerInfo,
  PaymentDetails,
  RefundDetails,
  RefundRequest,
  RefundResult,
  SessionDetails,
  SessionOrder,
  SessionOrderItem,
  SessionPayer,
  SessionPayment,
} from "@maib/checkout";
```
