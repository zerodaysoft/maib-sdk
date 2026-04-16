---
package: "@maib/mia"
version: 0.2.3
description: TypeScript SDK for the maib MIA QR payment API — static, dynamic, and hybrid QR code payments.
api_version: v2
upstream_docs: https://docs.maibmerchants.md/mia-qr-api/en
upstream_updated: 2025-11-10
---

# @maib/mia SDK Reference

TypeScript SDK for the maib MIA QR payment API. You use this SDK to create QR codes for payments (static, dynamic, and hybrid), manage payment sessions, handle refunds, and verify callback signatures.

## Installation

```bash
npm install @maib/mia
# or
yarn add @maib/mia
```

**Runtime requirement**: Node.js 18+ (uses native `fetch` and `node:crypto`).

## Quick Start

```typescript
import {
  MiaClient,
  Environment,
  Currency,
  QrType,
  AmountType,
} from "@maib/mia";

const client = new MiaClient({
  clientId: "your-project-id",
  clientSecret: "your-project-secret",
  signatureKey: "your-signature-key", // required for verifyCallback()
  environment: Environment.SANDBOX,
});

// Create a dynamic QR code for a one-time payment
const qr = await client.createQr({
  type: QrType.DYNAMIC,
  amountType: AmountType.FIXED,
  amount: 100.0,
  currency: Currency.MDL,
  description: "Order #1234",
  callbackUrl: "https://yoursite.com/webhooks/mia",
});

console.log(qr.qrId); // "qr_abc123"
console.log(qr.url); // QR code URL for the payer to scan
```

## Architecture

`MiaClient` extends `BaseClient` from `@maib/core`. The base client handles:

- **OAuth2 Client Credentials authentication** with automatic token acquisition and refresh. You never manage tokens manually.
- **API response unwrapping** from the `{ result: T, ok: true }` envelope.
- **Error mapping** to `MaibError` (API errors) and `MaibNetworkError` (network failures).

The MIA client adds QR code management, payment operations, and SHA-256 callback signature verification.

**API base URLs**:

- Production: `https://api.maibmerchants.md`
- Sandbox: `https://sandbox.maibmerchants.md`

## QR Code Types

Understanding the three QR types is essential for correct integration:

### Static QR

A **reusable** QR code with fixed metadata. You can print it and display it physically. The payer scans the QR and enters the payment amount themselves. Best for: tip jars, donation boxes, in-store payment points.

- Created with `createQr({ type: QrType.STATIC, ... })`
- Does not expire (unless you set `expiresAt`)
- Can be used for multiple payments
- The payer decides the amount (unless `amountType` is `FIXED`)

### Dynamic QR

A **one-time** QR code with specific payment details. Each QR is used for a single payment session. Best for: online checkout, invoice payments, specific order payments.

- Created with `createQr({ type: QrType.DYNAMIC, ... })`
- Single use -- becomes inactive after payment
- Typically has a set expiration time
- The amount can be fixed, controlled, or free

### Hybrid QR

A **reusable base QR** with extensions that define individual payment sessions. The base QR is printed or displayed permanently, and you create extensions programmatically to define each payment. Best for: vending machines, parking meters, recurring point-of-sale displays.

- Base QR created with `createHybridQr()`
- Extensions created with `createExtension(qrId, ...)`
- The base QR is reusable; each extension represents one payment session
- You can optionally create the first extension together with the base QR

## Configuration

You pass `MaibClientConfig` to the `MiaClient` constructor.

```typescript
import { MiaClient, Environment } from "@maib/mia";

const client = new MiaClient(config);
```

### MaibClientConfig

| Property       | Type                      | Required | Default                          | Description                                                                                                       |
| -------------- | ------------------------- | -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `clientId`     | `string`                  | Yes      | --                               | OAuth2 client ID (Project ID from the maibmerchants portal).                                                      |
| `clientSecret` | `string`                  | Yes      | --                               | OAuth2 client secret (Project secret from the maibmerchants portal).                                              |
| `signatureKey` | `string`                  | No       | `undefined`                      | Signature key for callback verification. Required if you call `verifyCallback()` or `computeCallbackSignature()`. |
| `environment`  | `Environment`             | No       | `Environment.PRODUCTION`         | Target environment. Determines the API host automatically. Ignored if `baseUrl` is set.                           |
| `baseUrl`      | `string`                  | No       | `"https://api.maibmerchants.md"` | Override API base URL. Takes precedence over `environment`.                                                       |
| `fetch`        | `typeof globalThis.fetch` | No       | `globalThis.fetch`               | Custom fetch implementation (useful for testing or polyfills).                                                    |

## API Methods

### `createQr(params)`

Create a static or dynamic QR code.

**Signature**: `createQr(params: CreateQrRequest): Promise<CreateQrResult>`

**API endpoint**: `POST /v2/mia/qr`

#### CreateQrRequest

| Field         | Type         | Required    | Description                                                                 |
| ------------- | ------------ | ----------- | --------------------------------------------------------------------------- |
| `type`        | `QrType`     | Yes         | QR code type: `"Static"` or `"Dynamic"`. Use `createHybridQr()` for hybrid. |
| `amountType`  | `AmountType` | Yes         | Amount type: `"Fixed"`, `"Controlled"`, or `"Free"`.                        |
| `currency`    | `Currency`   | Yes         | Payment currency (`"MDL"`, `"EUR"`, or `"USD"`).                            |
| `description` | `string`     | Yes         | Human-readable payment description shown to the payer.                      |
| `amount`      | `number`     | Conditional | Payment amount. Required when `amountType` is `"Fixed"`.                    |
| `amountMin`   | `number`     | No          | Minimum allowed amount. Used when `amountType` is `"Controlled"`.           |
| `amountMax`   | `number`     | No          | Maximum allowed amount. Used when `amountType` is `"Controlled"`.           |
| `expiresAt`   | `string`     | No          | Expiration timestamp in ISO 8601 format.                                    |
| `orderId`     | `string`     | No          | Your internal order identifier for reconciliation.                          |
| `callbackUrl` | `string`     | No          | URL to receive callback notifications.                                      |
| `redirectUrl` | `string`     | No          | URL to redirect the payer after payment.                                    |
| `terminalId`  | `string`     | No          | Terminal identifier if you have multiple terminals.                         |

#### CreateQrResult

| Field         | Type      | Description                                                         |
| ------------- | --------- | ------------------------------------------------------------------- |
| `qrId`        | `string`  | Unique QR code identifier.                                          |
| `extensionId` | `string?` | Extension ID (present for dynamic QR codes).                        |
| `orderId`     | `string?` | Your order ID, echoed back.                                         |
| `type`        | `string`  | QR type (`"Static"` or `"Dynamic"`).                                |
| `url`         | `string`  | QR code URL. Display this as a QR code image for the payer to scan. |
| `expiresAt`   | `string?` | Expiration timestamp.                                               |

```typescript
// Dynamic QR with a fixed amount
const dynamicQr = await client.createQr({
  type: QrType.DYNAMIC,
  amountType: AmountType.FIXED,
  amount: 250.5,
  currency: Currency.MDL,
  description: "Invoice #5678",
  callbackUrl: "https://yoursite.com/webhooks/mia",
});

// Static QR where the payer enters any amount
const staticQr = await client.createQr({
  type: QrType.STATIC,
  amountType: AmountType.FREE,
  currency: Currency.MDL,
  description: "Donations",
});

// Dynamic QR with controlled amount range
const controlledQr = await client.createQr({
  type: QrType.DYNAMIC,
  amountType: AmountType.CONTROLLED,
  amountMin: 10,
  amountMax: 500,
  currency: Currency.MDL,
  description: "Top-up balance",
});
```

---

### `createHybridQr(params)`

Create a hybrid QR code. You can optionally include the first extension in the same call.

**Signature**: `createHybridQr(params: CreateHybridQrRequest): Promise<CreateHybridQrResult>`

**API endpoint**: `POST /v2/mia/qr/hybrid`

#### CreateHybridQrRequest

| Field        | Type              | Required | Description                                          |
| ------------ | ----------------- | -------- | ---------------------------------------------------- |
| `amountType` | `AmountType`      | Yes      | Amount type: `"Fixed"`, `"Controlled"`, or `"Free"`. |
| `currency`   | `Currency`        | Yes      | Payment currency.                                    |
| `terminalId` | `string`          | No       | Terminal identifier.                                 |
| `extension`  | `HybridExtension` | No       | Optional first extension to create with the QR.      |

#### HybridExtension

| Field         | Type     | Required | Description                                           |
| ------------- | -------- | -------- | ----------------------------------------------------- |
| `description` | `string` | Yes      | Payment description for this extension.               |
| `expiresAt`   | `string` | No       | Expiration timestamp.                                 |
| `amount`      | `number` | No       | Fixed amount (when `amountType` is `"Fixed"`).        |
| `amountMin`   | `number` | No       | Minimum amount (when `amountType` is `"Controlled"`). |
| `amountMax`   | `number` | No       | Maximum amount (when `amountType` is `"Controlled"`). |
| `orderId`     | `string` | No       | Your order ID.                                        |
| `callbackUrl` | `string` | No       | Callback URL.                                         |
| `redirectUrl` | `string` | No       | Redirect URL.                                         |

#### CreateHybridQrResult

| Field         | Type      | Description                                   |
| ------------- | --------- | --------------------------------------------- |
| `qrId`        | `string`  | Unique QR code identifier (reusable base QR). |
| `extensionId` | `string?` | Extension ID if an extension was created.     |
| `url`         | `string`  | QR code URL.                                  |

```typescript
// Create hybrid QR with first extension
const hybrid = await client.createHybridQr({
  amountType: AmountType.FIXED,
  currency: Currency.MDL,
  extension: {
    amount: 100.0,
    description: "Parking session #1",
    expiresAt: "2026-04-17T12:00:00Z",
    callbackUrl: "https://yoursite.com/webhooks/mia",
  },
});

// Create hybrid QR without initial extension
const baseQr = await client.createHybridQr({
  amountType: AmountType.FREE,
  currency: Currency.MDL,
});
```

---

### `createExtension(qrId, params)`

Create a new payment extension on an existing hybrid QR code. Each extension represents one payment session.

**Signature**: `createExtension(qrId: string, params: CreateExtensionRequest): Promise<CreateExtensionResult>`

**API endpoint**: `POST /v2/mia/qr/{qrId}/extension`

#### CreateExtensionRequest

| Field         | Type     | Required | Description                                           |
| ------------- | -------- | -------- | ----------------------------------------------------- |
| `expiresAt`   | `string` | Yes      | Expiration timestamp in ISO 8601 format.              |
| `description` | `string` | Yes      | Payment description for this extension.               |
| `amount`      | `number` | No       | Fixed amount (when `amountType` is `"Fixed"`).        |
| `amountMin`   | `number` | No       | Minimum amount (when `amountType` is `"Controlled"`). |
| `amountMax`   | `number` | No       | Maximum amount (when `amountType` is `"Controlled"`). |
| `orderId`     | `string` | No       | Your order ID.                                        |
| `callbackUrl` | `string` | No       | Callback URL for this extension.                      |
| `redirectUrl` | `string` | No       | Redirect URL for this extension.                      |

#### CreateExtensionResult

| Field         | Type     | Description                  |
| ------------- | -------- | ---------------------------- |
| `extensionId` | `string` | Unique extension identifier. |

```typescript
const extension = await client.createExtension(hybrid.qrId, {
  expiresAt: "2026-04-17T14:00:00Z",
  description: "Parking session #2",
  amount: 50.0,
  callbackUrl: "https://yoursite.com/webhooks/mia",
});
```

---

### `getQr(qrId)`

Retrieve details of a QR code.

**Signature**: `getQr(qrId: string): Promise<QrDetails>`

**API endpoint**: `GET /v2/mia/qr/{qrId}`

#### QrDetails

| Field         | Type       | Description                                           |
| ------------- | ---------- | ----------------------------------------------------- |
| `qrId`        | `string`   | QR code identifier.                                   |
| `extensionId` | `string?`  | Extension identifier (if applicable).                 |
| `orderId`     | `string?`  | Your order ID.                                        |
| `status`      | `string`   | Current status (see `QrStatus`).                      |
| `type`        | `string`   | QR type (`"Static"`, `"Dynamic"`, or `"Hybrid"`).     |
| `url`         | `string`   | QR code URL.                                          |
| `amountType`  | `string`   | Amount type (`"Fixed"`, `"Controlled"`, or `"Free"`). |
| `amount`      | `number?`  | Fixed amount.                                         |
| `amountMin`   | `number?`  | Minimum amount.                                       |
| `amountMax`   | `number?`  | Maximum amount.                                       |
| `currency`    | `Currency` | Payment currency.                                     |
| `description` | `string?`  | Payment description.                                  |
| `callbackUrl` | `string?`  | Callback URL.                                         |
| `redirectUrl` | `string?`  | Redirect URL.                                         |
| `createdAt`   | `string`   | Creation timestamp.                                   |
| `updatedAt`   | `string`   | Last update timestamp.                                |
| `expiresAt`   | `string?`  | Expiration timestamp.                                 |
| `terminalId`  | `string?`  | Terminal identifier.                                  |

```typescript
const qr = await client.getQr("qr_abc123");
console.log(qr.status); // "Active"
console.log(qr.url); // QR code URL
```

---

### `listQrs(params)`

List QR codes with optional filters and pagination.

**Signature**: `listQrs(params: ListQrParams): Promise<PaginatedResult<QrDetails>>`

**API endpoint**: `GET /v2/mia/qr`

#### ListQrParams

Extends `PaginationParams` with QR-specific filters:

| Field           | Type              | Required | Description                           |
| --------------- | ----------------- | -------- | ------------------------------------- |
| `count`         | `number`          | Yes      | Number of items per page.             |
| `offset`        | `number`          | Yes      | Number of items to skip.              |
| `sortBy`        | `string`          | No       | Field name to sort by.                |
| `order`         | `"asc" \| "desc"` | No       | Sort direction.                       |
| `qrId`          | `string`          | No       | Filter by QR ID.                      |
| `extensionId`   | `string`          | No       | Filter by extension ID.               |
| `orderId`       | `string`          | No       | Filter by order ID.                   |
| `type`          | `string`          | No       | Filter by QR type.                    |
| `amountType`    | `string`          | No       | Filter by amount type.                |
| `amountFrom`    | `number`          | No       | Filter: amount greater than or equal. |
| `amountTo`      | `number`          | No       | Filter: amount less than or equal.    |
| `description`   | `string`          | No       | Filter by description.                |
| `status`        | `string`          | No       | Filter by status (see `QrStatus`).    |
| `createdAtFrom` | `string`          | No       | Filter: created on or after.          |
| `createdAtTo`   | `string`          | No       | Filter: created on or before.         |
| `expiresAtFrom` | `string`          | No       | Filter: expires on or after.          |
| `expiresAtTo`   | `string`          | No       | Filter: expires on or before.         |
| `terminalId`    | `string`          | No       | Filter by terminal ID.                |

```typescript
const page = await client.listQrs({
  count: 20,
  offset: 0,
  status: QrStatus.ACTIVE,
  type: QrType.DYNAMIC,
});
console.log(page.totalCount);
console.log(page.items);
```

---

### `listExtensions(params)`

List extensions across hybrid QR codes with optional filters.

**Signature**: `listExtensions(params: ListExtensionsParams): Promise<PaginatedResult<QrDetails>>`

**API endpoint**: `GET /v2/mia/qr/extension`

#### ListExtensionsParams

| Field           | Type              | Required | Description                   |
| --------------- | ----------------- | -------- | ----------------------------- |
| `count`         | `number`          | Yes      | Number of items per page.     |
| `offset`        | `number`          | Yes      | Number of items to skip.      |
| `sortBy`        | `string`          | No       | Field name to sort by.        |
| `order`         | `"asc" \| "desc"` | No       | Sort direction.               |
| `qrId`          | `string`          | No       | Filter by parent QR ID.       |
| `extensionId`   | `string`          | No       | Filter by extension ID.       |
| `orderId`       | `string`          | No       | Filter by order ID.           |
| `status`        | `string`          | No       | Filter by status.             |
| `createdAtFrom` | `string`          | No       | Filter: created on or after.  |
| `createdAtTo`   | `string`          | No       | Filter: created on or before. |
| `expiresAtFrom` | `string`          | No       | Filter: expires on or after.  |
| `expiresAtTo`   | `string`          | No       | Filter: expires on or before. |

```typescript
const extensions = await client.listExtensions({
  count: 10,
  offset: 0,
  qrId: "qr_abc123",
});
```

---

### `cancelQr(qrId, params)`

Cancel a QR code. Only active QR codes can be cancelled.

**Signature**: `cancelQr(qrId: string, params: CancelQrRequest): Promise<CancelQrResult>`

**API endpoint**: `POST /v2/mia/qr/{qrId}/cancel`

#### CancelQrRequest

| Field    | Type     | Required | Description              |
| -------- | -------- | -------- | ------------------------ |
| `reason` | `string` | Yes      | Reason for cancellation. |

#### CancelQrResult

| Field    | Type     | Description                 |
| -------- | -------- | --------------------------- |
| `qrId`   | `string` | QR code identifier.         |
| `status` | `string` | New status (`"Cancelled"`). |

```typescript
await client.cancelQr("qr_abc123", { reason: "No longer needed" });
```

---

### `cancelExtension(qrId, params?)`

Cancel the active extension on a hybrid QR code.

**Signature**: `cancelExtension(qrId: string, params?: CancelExtensionRequest): Promise<CancelExtensionResult>`

**API endpoint**: `POST /v2/mia/qr/{qrId}/extension/cancel`

#### CancelExtensionRequest

| Field    | Type     | Required | Description              |
| -------- | -------- | -------- | ------------------------ |
| `reason` | `string` | No       | Reason for cancellation. |

#### CancelExtensionResult

| Field         | Type     | Description                     |
| ------------- | -------- | ------------------------------- |
| `extensionId` | `string` | Cancelled extension identifier. |

```typescript
await client.cancelExtension("qr_abc123", { reason: "Session ended" });
// or without a reason:
await client.cancelExtension("qr_abc123");
```

---

### `getPayment(payId)`

Retrieve details of a completed payment.

**Signature**: `getPayment(payId: string): Promise<MiaPaymentDetails>`

**API endpoint**: `GET /v2/mia/payments/{payId}`

#### MiaPaymentDetails

| Field         | Type       | Description                                    |
| ------------- | ---------- | ---------------------------------------------- |
| `payId`       | `string`   | Payment identifier.                            |
| `referenceId` | `string?`  | Bank reference ID.                             |
| `qrId`        | `string`   | QR code identifier.                            |
| `extensionId` | `string?`  | Extension identifier (for hybrid QR payments). |
| `orderId`     | `string?`  | Your order ID.                                 |
| `amount`      | `number`   | Payment amount.                                |
| `commission`  | `number`   | Commission charged.                            |
| `currency`    | `Currency` | Payment currency.                              |
| `description` | `string?`  | Payment description.                           |
| `payerName`   | `string?`  | Payer name.                                    |
| `payerIban`   | `string?`  | Payer IBAN.                                    |
| `status`      | `string`   | Payment status (see `MiaPaymentStatus`).       |
| `executedAt`  | `string`   | Execution timestamp.                           |
| `refundedAt`  | `string?`  | Refund timestamp (if refunded).                |
| `terminalId`  | `string?`  | Terminal identifier.                           |

```typescript
const payment = await client.getPayment("pay_xyz789");
console.log(payment.status); // "Executed"
console.log(payment.amount); // 100.0
```

---

### `listPayments(params)`

List payments with optional filters and pagination.

**Signature**: `listPayments(params: ListPaymentsParams): Promise<PaginatedResult<MiaPaymentDetails>>`

**API endpoint**: `GET /v2/mia/payments`

#### ListPaymentsParams

| Field            | Type              | Required | Description                                |
| ---------------- | ----------------- | -------- | ------------------------------------------ |
| `count`          | `number`          | Yes      | Number of items per page.                  |
| `offset`         | `number`          | Yes      | Number of items to skip.                   |
| `sortBy`         | `string`          | No       | Field name to sort by.                     |
| `order`          | `"asc" \| "desc"` | No       | Sort direction.                            |
| `payId`          | `string`          | No       | Filter by payment ID.                      |
| `referenceId`    | `string`          | No       | Filter by bank reference ID.               |
| `qrId`           | `string`          | No       | Filter by QR ID.                           |
| `extensionId`    | `string`          | No       | Filter by extension ID.                    |
| `orderId`        | `string`          | No       | Filter by order ID.                        |
| `amountFrom`     | `number`          | No       | Filter: amount greater than or equal.      |
| `amountTo`       | `number`          | No       | Filter: amount less than or equal.         |
| `description`    | `string`          | No       | Filter by description.                     |
| `payerName`      | `string`          | No       | Filter by payer name.                      |
| `payerIban`      | `string`          | No       | Filter by payer IBAN.                      |
| `status`         | `string`          | No       | Filter by status (see `MiaPaymentStatus`). |
| `executedAtFrom` | `string`          | No       | Filter: executed on or after.              |
| `executedAtTo`   | `string`          | No       | Filter: executed on or before.             |
| `terminalId`     | `string`          | No       | Filter by terminal ID.                     |

```typescript
const payments = await client.listPayments({
  count: 20,
  offset: 0,
  qrId: "qr_abc123",
});
```

---

### `refund(payId, params)`

Refund a completed payment. You can refund the full amount or a partial amount.

**Signature**: `refund(payId: string, params: RefundPaymentRequest): Promise<MiaRefundResult>`

**API endpoint**: `POST /v2/mia/payments/{payId}/refund`

#### RefundPaymentRequest

| Field         | Type     | Required | Description                                   |
| ------------- | -------- | -------- | --------------------------------------------- |
| `reason`      | `string` | Yes      | Reason for the refund.                        |
| `amount`      | `number` | No       | Amount to refund. Omit for a full refund.     |
| `callbackUrl` | `string` | No       | Callback URL for refund status notifications. |

#### MiaRefundResult

| Field      | Type     | Description               |
| ---------- | -------- | ------------------------- |
| `refundId` | `string` | Unique refund identifier. |
| `status`   | `string` | Refund status.            |

```typescript
// Full refund
await client.refund("pay_xyz789", { reason: "Customer request" });

// Partial refund
await client.refund("pay_xyz789", { reason: "Partial return", amount: 50.0 });
```

---

### `testPay(params)` (Sandbox only)

Simulate a payment in the sandbox environment. This mimics a payer scanning the QR code and completing a payment.

**Signature**: `testPay(params: TestPayRequest): Promise<TestPayResult>`

**API endpoint**: `POST /v2/mia/test-pay`

#### TestPayRequest

| Field       | Type       | Required | Description                |
| ----------- | ---------- | -------- | -------------------------- |
| `qrId`      | `string`   | Yes      | QR code identifier to pay. |
| `amount`    | `number`   | Yes      | Payment amount.            |
| `iban`      | `string`   | Yes      | Simulated payer IBAN.      |
| `currency`  | `Currency` | Yes      | Payment currency.          |
| `payerName` | `string`   | Yes      | Simulated payer name.      |

#### TestPayResult

| Field        | Type       | Description                           |
| ------------ | ---------- | ------------------------------------- |
| `qrId`       | `string`   | QR code identifier.                   |
| `qrStatus`   | `string`   | QR status after payment.              |
| `orderId`    | `string?`  | Your order ID.                        |
| `payId`      | `string`   | Payment identifier (use for refunds). |
| `amount`     | `number`   | Payment amount.                       |
| `commission` | `number`   | Commission charged.                   |
| `currency`   | `Currency` | Payment currency.                     |
| `payerName`  | `string`   | Payer name.                           |
| `payerIban`  | `string`   | Payer IBAN.                           |
| `executedAt` | `string`   | Execution timestamp.                  |
| `signature`  | `string`   | Callback signature.                   |

```typescript
const payment = await client.testPay({
  qrId: "qr_abc123",
  amount: 100.0,
  iban: "MD24AG000225100013104168",
  currency: Currency.MDL,
  payerName: "Test User",
});
console.log(payment.payId); // Use for refund()
```

---

### `verifyCallback(payload)`

Verify the SHA-256 signature of an incoming callback notification. Returns `true` if the signature is valid, `false` otherwise.

Throws an `Error` if `signatureKey` was not provided in the client config.

**Signature**: `verifyCallback(payload: MiaCallbackPayload): boolean`

```typescript
// In your webhook handler (e.g. Express):
app.post("/webhooks/mia", (req, res) => {
  const payload: MiaCallbackPayload = req.body;
  const isValid = client.verifyCallback(payload);

  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  // Process the callback
  const { qrId, qrStatus, payId, amount } = payload.result;
  console.log(`QR ${qrId} is now ${qrStatus}, payment ${payId}`);

  res.status(200).send("OK");
});
```

---

### `computeCallbackSignature(result)`

Compute a SHA-256 signature for a callback result object. Useful for testing or manually verifying signatures.

Throws an `Error` if `signatureKey` was not provided in the client config.

**Signature**: `computeCallbackSignature(result: Record<string, unknown>): string`

**Signature algorithm**: Sort object keys alphabetically (recursively), collect all leaf values in order, join with `:`, append the `signatureKey`, SHA-256 hash, and Base64-encode the digest.

```typescript
const signature = client.computeCallbackSignature({
  qrId: "qr_abc123",
  qrStatus: "Paid",
  payId: "pay_xyz",
  amount: 100,
  commission: 0,
  currency: "MDL",
  payerName: "John Doe",
  payerIban: "MD123456789",
  executedAt: "2026-04-16T10:00:00Z",
});
```

## Callback Payload Types

### MiaCallbackPayload

The top-level structure sent to your callback URL.

| Field       | Type                | Description                                 |
| ----------- | ------------------- | ------------------------------------------- |
| `result`    | `MiaCallbackResult` | The payment result data.                    |
| `signature` | `string`            | SHA-256 Base64-encoded signature to verify. |

### MiaCallbackResult

| Field        | Type       | Description          |
| ------------ | ---------- | -------------------- |
| `qrId`       | `string`   | QR code identifier.  |
| `qrStatus`   | `string`   | Current QR status.   |
| `orderId`    | `string?`  | Your order ID.       |
| `payId`      | `string`   | Payment identifier.  |
| `amount`     | `number`   | Payment amount.      |
| `commission` | `number`   | Commission charged.  |
| `currency`   | `Currency` | Payment currency.    |
| `payerName`  | `string`   | Payer name.          |
| `payerIban`  | `string`   | Payer IBAN.          |
| `executedAt` | `string`   | Execution timestamp. |

## Enums and Constants

### QrType

```typescript
import { QrType } from "@maib/mia";
```

| Key              | Value       | Description                                        |
| ---------------- | ----------- | -------------------------------------------------- |
| `QrType.STATIC`  | `"Static"`  | Reusable QR code. Payer enters the amount.         |
| `QrType.DYNAMIC` | `"Dynamic"` | One-time QR with specific payment details.         |
| `QrType.HYBRID`  | `"Hybrid"`  | Reusable base QR with session-specific extensions. |

### AmountType

```typescript
import { AmountType } from "@maib/mia";
```

| Key                     | Value          | Description                                                         |
| ----------------------- | -------------- | ------------------------------------------------------------------- |
| `AmountType.FIXED`      | `"Fixed"`      | Exact amount specified by the merchant. `amount` field is required. |
| `AmountType.CONTROLLED` | `"Controlled"` | Payer chooses within a range. Use `amountMin` and `amountMax`.      |
| `AmountType.FREE`       | `"Free"`       | Payer enters any amount.                                            |

### QrStatus

```typescript
import { QrStatus } from "@maib/mia";
```

| Key                  | Value         | Description                                 |
| -------------------- | ------------- | ------------------------------------------- |
| `QrStatus.ACTIVE`    | `"Active"`    | QR code is active and can receive payments. |
| `QrStatus.INACTIVE`  | `"Inactive"`  | QR code is inactive.                        |
| `QrStatus.EXPIRED`   | `"Expired"`   | QR code has expired.                        |
| `QrStatus.PAID`      | `"Paid"`      | QR code has been paid (dynamic QR).         |
| `QrStatus.CANCELLED` | `"Cancelled"` | QR code has been cancelled.                 |

### MiaPaymentStatus

```typescript
import { MiaPaymentStatus } from "@maib/mia";
```

| Key                         | Value        | Description                     |
| --------------------------- | ------------ | ------------------------------- |
| `MiaPaymentStatus.EXECUTED` | `"Executed"` | Payment completed successfully. |
| `MiaPaymentStatus.REFUNDED` | `"Refunded"` | Payment has been refunded.      |

### Currency (re-exported from @maib/core)

```typescript
import { Currency } from "@maib/mia";
```

| Key            | Value   |
| -------------- | ------- |
| `Currency.MDL` | `"MDL"` |
| `Currency.EUR` | `"EUR"` |
| `Currency.USD` | `"USD"` |

### Environment (re-exported from @maib/core)

```typescript
import { Environment } from "@maib/mia";
```

| Key                      | Value          |
| ------------------------ | -------------- |
| `Environment.PRODUCTION` | `"production"` |
| `Environment.SANDBOX`    | `"sandbox"`    |

## Error Handling

The SDK throws two error types:

### MaibError

Thrown when the maib API returns a response with `ok: false`. Indicates a business logic or validation error.

| Property     | Type             | Description                                          |
| ------------ | ---------------- | ---------------------------------------------------- |
| `message`    | `string`         | Formatted error message combining all error entries. |
| `statusCode` | `number`         | HTTP status code from the API response.              |
| `errors`     | `MaibApiError[]` | Array of structured error objects.                   |

Each `MaibApiError` contains:

| Property       | Type                      | Description                       |
| -------------- | ------------------------- | --------------------------------- |
| `errorCode`    | `string`                  | Machine-readable error code.      |
| `errorMessage` | `string`                  | Human-readable error description. |
| `errorArgs`    | `Record<string, string>?` | Additional error context.         |

```typescript
import { MaibError } from "@maib/mia"; // re-exported from @maib/core

try {
  await client.createQr({
    /* ... */
  });
} catch (error) {
  if (error instanceof MaibError) {
    console.error(`API error (HTTP ${error.statusCode}):`, error.errors);
  }
}
```

### MaibNetworkError

Thrown when a network request fails (DNS resolution, timeout, connection refused, invalid JSON in response). Wraps the underlying cause.

| Property  | Type      | Description                                 |
| --------- | --------- | ------------------------------------------- |
| `message` | `string`  | Error description.                          |
| `cause`   | `unknown` | The original error that caused the failure. |

```typescript
import { MaibNetworkError } from "@maib/mia"; // re-exported from @maib/core

try {
  await client.createQr({
    /* ... */
  });
} catch (error) {
  if (error instanceof MaibNetworkError) {
    console.error("Network failure:", error.message, error.cause);
  }
}
```

## Exports

Everything you need is exported from the `@maib/mia` package entry point:

```typescript
// Client
export { MiaClient } from "@maib/mia";

// Constants / enums
export {
  QrType,
  AmountType,
  QrStatus,
  MiaPaymentStatus,
  Currency,
  Environment,
} from "@maib/mia";

// Types (import type)
export type {
  MiaClientConfig,
  CreateQrRequest,
  CreateQrResult,
  CreateHybridQrRequest,
  CreateHybridQrResult,
  HybridExtension,
  CreateExtensionRequest,
  CreateExtensionResult,
  CancelQrRequest,
  CancelQrResult,
  CancelExtensionRequest,
  CancelExtensionResult,
  ListQrParams,
  ListExtensionsParams,
  ListPaymentsParams,
  QrDetails,
  MiaPaymentDetails,
  MiaRefundResult,
  RefundPaymentRequest,
  TestPayRequest,
  TestPayResult,
  MiaCallbackPayload,
  MiaCallbackResult,
} from "@maib/mia";
```

## Full Working Example

```typescript
import {
  MiaClient,
  Environment,
  Currency,
  QrType,
  QrStatus,
  AmountType,
} from "@maib/mia";
import type { MiaCallbackPayload } from "@maib/mia";

// 1. Initialize the client
const client = new MiaClient({
  clientId: process.env.MAIB_CLIENT_ID!,
  clientSecret: process.env.MAIB_CLIENT_SECRET!,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!,
  environment: Environment.SANDBOX,
});

// 2. Create a dynamic QR code
const qr = await client.createQr({
  type: QrType.DYNAMIC,
  amountType: AmountType.FIXED,
  amount: 150.0,
  currency: Currency.MDL,
  description: "Monthly subscription",
  callbackUrl: "https://yoursite.com/webhooks/mia",
});
console.log("QR URL:", qr.url);

// 3. Check QR status
const details = await client.getQr(qr.qrId);
console.log(details.status); // "Active"

// 4. Simulate payment (sandbox only)
const testPayment = await client.testPay({
  qrId: qr.qrId,
  amount: 150.0,
  iban: "MD24AG000225100013104168",
  currency: Currency.MDL,
  payerName: "Test User",
});

// 5. Verify a callback in your webhook handler
function handleCallback(payload: MiaCallbackPayload) {
  if (!client.verifyCallback(payload)) {
    throw new Error("Invalid callback signature");
  }
  // Process payload.result
}

// 6. Get payment details
const payment = await client.getPayment(testPayment.payId);
console.log(payment.status); // "Executed"

// 7. Refund the payment
await client.refund(testPayment.payId, { reason: "Customer request" });

// 8. Create a hybrid QR for recurring use
const hybrid = await client.createHybridQr({
  amountType: AmountType.FIXED,
  currency: Currency.MDL,
});

// 9. Create an extension (payment session) on the hybrid QR
const ext = await client.createExtension(hybrid.qrId, {
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  description: "Parking session #1",
  amount: 25.0,
});

// 10. List active QR codes
const page = await client.listQrs({
  count: 10,
  offset: 0,
  status: QrStatus.ACTIVE,
});
```
