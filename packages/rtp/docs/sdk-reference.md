---
package: "@maib/rtp"
version: 0.2.3
description: TypeScript SDK for the maib Request to Pay (RTP) API — bank-initiated payment requests.
api_version: v2
upstream_docs: https://docs.maibmerchants.md/request-to-pay
upstream_updated: 2025-11-10
---

# @maib/rtp SDK Reference

TypeScript SDK for the maib Request to Pay (RTP) API. You use this SDK to create bank-initiated payment requests, track their status, handle cancellations and refunds, and verify callback signatures.

## Installation

```bash
npm install @maib/rtp
# or
yarn add @maib/rtp
```

**Runtime requirement**: Node.js 18+ (uses native `fetch` and `node:crypto`).

## Quick Start

```typescript
import { RtpClient, Environment, Currency } from "@maib/rtp";

const client = new RtpClient({
  clientId: "your-project-id",
  clientSecret: "your-project-secret",
  signatureKey: "your-signature-key", // required for verifyCallback()
  environment: Environment.SANDBOX,
});

// Create a payment request
const rtp = await client.create({
  alias: "+37360123456",
  amount: 100.0,
  currency: Currency.MDL,
  description: "Order #1234",
  expiresAt: "2026-04-17T12:00:00Z",
});

console.log(rtp.rtpId); // "rtp_abc123"
console.log(rtp.expiresAt); // "2026-04-17T12:00:00Z"
```

## Architecture

`RtpClient` extends `BaseClient` from `@maib/core`. The base client handles:

- **OAuth2 Client Credentials authentication** with automatic token acquisition and refresh. You never manage tokens manually.
- **API response unwrapping** from the `{ result: T, ok: true }` envelope.
- **Error mapping** to `MaibError` (API errors) and `MaibNetworkError` (network failures).

The RTP client adds payment-request-specific methods and SHA-256 callback signature verification.

**API base URLs**:

- Production: `https://api.maibmerchants.md`
- Sandbox: `https://sandbox.maibmerchants.md`

## Configuration

You pass `MaibClientConfig` to the `RtpClient` constructor.

```typescript
import { RtpClient, Environment } from "@maib/rtp";

const client = new RtpClient(config);
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

### `create(params)`

Create a new payment request. The payer receives a push notification or payment prompt.

**Signature**: `create(params: CreateRtpRequest): Promise<CreateRtpResult>`

**API endpoint**: `POST /v2/rtp`

#### CreateRtpRequest

| Field         | Type       | Required | Description                                                              |
| ------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| `alias`       | `string`   | Yes      | Payer identifier (phone number or alias registered with the bank).       |
| `amount`      | `number`   | Yes      | Payment amount.                                                          |
| `expiresAt`   | `string`   | Yes      | Expiration timestamp in ISO 8601 format (e.g. `"2026-04-17T12:00:00Z"`). |
| `currency`    | `Currency` | Yes      | Payment currency (`"MDL"`, `"EUR"`, or `"USD"`).                         |
| `description` | `string`   | Yes      | Human-readable payment description shown to the payer.                   |
| `orderId`     | `string`   | No       | Your internal order identifier for reconciliation.                       |
| `terminalId`  | `string`   | No       | Terminal identifier if you have multiple terminals.                      |
| `callbackUrl` | `string`   | No       | URL to receive callback notifications when the RTP status changes.       |
| `redirectUrl` | `string`   | No       | URL to redirect the payer after they accept or reject the payment.       |

#### CreateRtpResult

| Field       | Type      | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `rtpId`     | `string`  | Unique identifier for the created payment request. |
| `orderId`   | `string?` | Your order ID, echoed back if provided.            |
| `expiresAt` | `string`  | Expiration timestamp.                              |

```typescript
const result = await client.create({
  alias: "+37360123456",
  amount: 250.5,
  currency: Currency.MDL,
  description: "Invoice #5678",
  expiresAt: "2026-04-20T23:59:59Z",
  orderId: "order-5678",
  callbackUrl: "https://yoursite.com/webhooks/rtp",
});
// result.rtpId -> "rtp_..."
```

---

### `getStatus(rtpId)`

Retrieve the current status and details of a payment request.

**Signature**: `getStatus(rtpId: string): Promise<RtpStatusResult>`

**API endpoint**: `GET /v2/rtp/{rtpId}`

#### RtpStatusResult

| Field         | Type       | Description                                   |
| ------------- | ---------- | --------------------------------------------- |
| `rtpId`       | `string`   | Payment request identifier.                   |
| `orderId`     | `string?`  | Your order ID.                                |
| `status`      | `string`   | Current status (see `RtpStatus` enum values). |
| `amount`      | `number`   | Requested payment amount.                     |
| `currency`    | `Currency` | Payment currency.                             |
| `description` | `string`   | Payment description.                          |
| `callbackUrl` | `string?`  | Callback URL.                                 |
| `redirectUrl` | `string?`  | Redirect URL.                                 |
| `createdAt`   | `string`   | Creation timestamp.                           |
| `updatedAt`   | `string`   | Last update timestamp.                        |
| `expiresAt`   | `string`   | Expiration timestamp.                         |
| `terminalId`  | `string?`  | Terminal identifier.                          |

```typescript
const status = await client.getStatus("rtp_abc123");
console.log(status.status); // "Active", "Accepted", etc.
```

---

### `list(params)`

List payment requests with optional filters and pagination.

**Signature**: `list(params: ListRtpParams): Promise<PaginatedResult<RtpStatusResult>>`

**API endpoint**: `GET /v2/rtp`

#### ListRtpParams

Extends `PaginationParams` with RTP-specific filters:

| Field           | Type              | Required | Description                                  |
| --------------- | ----------------- | -------- | -------------------------------------------- |
| `count`         | `number`          | Yes      | Number of items per page.                    |
| `offset`        | `number`          | Yes      | Number of items to skip.                     |
| `sortBy`        | `string`          | No       | Field name to sort by.                       |
| `order`         | `"asc" \| "desc"` | No       | Sort direction.                              |
| `rtpId`         | `string`          | No       | Filter by RTP ID.                            |
| `orderId`       | `string`          | No       | Filter by order ID.                          |
| `amount`        | `string`          | No       | Filter by amount.                            |
| `description`   | `string`          | No       | Filter by description.                       |
| `status`        | `string`          | No       | Filter by status (see `RtpStatus`).          |
| `createdAtFrom` | `string`          | No       | Filter: created on or after this timestamp.  |
| `createdAtTo`   | `string`          | No       | Filter: created on or before this timestamp. |
| `expiresAtFrom` | `string`          | No       | Filter: expires on or after this timestamp.  |
| `expiresAtTo`   | `string`          | No       | Filter: expires on or before this timestamp. |
| `terminalId`    | `string`          | No       | Filter by terminal ID.                       |

#### PaginatedResult\<RtpStatusResult\>

| Field        | Type                | Description                       |
| ------------ | ------------------- | --------------------------------- |
| `totalCount` | `number`            | Total number of matching items.   |
| `items`      | `RtpStatusResult[]` | Array of payment request records. |

```typescript
const page = await client.list({
  count: 20,
  offset: 0,
  status: RtpStatus.ACTIVE,
  order: "desc",
});
console.log(page.totalCount); // 42
console.log(page.items.length); // 20
```

---

### `cancel(rtpId, params)`

Cancel a pending payment request. Only works for requests in `Created` or `Active` status.

**Signature**: `cancel(rtpId: string, params: CancelRtpRequest): Promise<CancelRtpResult>`

**API endpoint**: `POST /v2/rtp/{rtpId}/cancel`

#### CancelRtpRequest

| Field    | Type     | Required | Description              |
| -------- | -------- | -------- | ------------------------ |
| `reason` | `string` | Yes      | Reason for cancellation. |

#### CancelRtpResult

| Field    | Type     | Description                         |
| -------- | -------- | ----------------------------------- |
| `rtpId`  | `string` | Payment request identifier.         |
| `status` | `string` | New status (will be `"Cancelled"`). |

```typescript
const result = await client.cancel("rtp_abc123", {
  reason: "Customer requested cancellation",
});
```

---

### `refund(payId, params)`

Refund a completed payment. You pass the `payId` (not the `rtpId`) from the callback or test-accept result.

**Signature**: `refund(payId: string, params: RefundRtpRequest): Promise<RefundRtpResult>`

**API endpoint**: `POST /v2/rtp/{payId}/refund`

#### RefundRtpRequest

| Field    | Type     | Required | Description            |
| -------- | -------- | -------- | ---------------------- |
| `reason` | `string` | Yes      | Reason for the refund. |

#### RefundRtpResult

| Field      | Type     | Description               |
| ---------- | -------- | ------------------------- |
| `refundId` | `string` | Unique refund identifier. |
| `status`   | `string` | Refund status.            |

```typescript
const refund = await client.refund("pay_xyz789", {
  reason: "Duplicate payment",
});
```

---

### `testAccept(rtpId, params)` (Sandbox only)

Simulate a payer accepting a payment request. Use this in the sandbox environment for testing.

**Signature**: `testAccept(rtpId: string, params: TestAcceptRequest): Promise<TestAcceptResult>`

**API endpoint**: `POST /v2/rtp/{rtpId}/test-accept`

#### TestAcceptRequest

| Field      | Type       | Required | Description               |
| ---------- | ---------- | -------- | ------------------------- |
| `amount`   | `number`   | Yes      | Payment amount to accept. |
| `currency` | `Currency` | Yes      | Payment currency.         |

#### TestAcceptResult

| Field        | Type       | Description                                |
| ------------ | ---------- | ------------------------------------------ |
| `rtpId`      | `string`   | Payment request identifier.                |
| `status`     | `string`   | New status (`"Accepted"`).                 |
| `orderId`    | `string?`  | Your order ID.                             |
| `payId`      | `string`   | Payment identifier (use this for refunds). |
| `amount`     | `number`   | Accepted amount.                           |
| `commission` | `number`   | Commission charged.                        |
| `currency`   | `Currency` | Payment currency.                          |
| `payerName`  | `string`   | Payer name.                                |
| `payerIban`  | `string`   | Payer IBAN.                                |
| `executedAt` | `string`   | Execution timestamp.                       |
| `signature`  | `string`   | Callback signature.                        |

```typescript
const accepted = await client.testAccept("rtp_abc123", {
  amount: 100.0,
  currency: Currency.MDL,
});
console.log(accepted.payId); // Use this for refund()
```

---

### `testReject(rtpId)` (Sandbox only)

Simulate a payer rejecting a payment request. Use this in the sandbox environment for testing.

**Signature**: `testReject(rtpId: string): Promise<TestRejectResult>`

**API endpoint**: `POST /v2/rtp/{rtpId}/test-reject`

#### TestRejectResult

| Field        | Type       | Description                 |
| ------------ | ---------- | --------------------------- |
| `rtpId`      | `string`   | Payment request identifier. |
| `rtpStatus`  | `string`   | New status (`"Rejected"`).  |
| `orderId`    | `string?`  | Your order ID.              |
| `payId`      | `string`   | Payment identifier.         |
| `amount`     | `number`   | Payment amount.             |
| `commission` | `number`   | Commission.                 |
| `currency`   | `Currency` | Payment currency.           |
| `payerName`  | `string`   | Payer name.                 |
| `payerIban`  | `string`   | Payer IBAN.                 |
| `executedAt` | `string`   | Execution timestamp.        |
| `signature`  | `string`   | Callback signature.         |

```typescript
const rejected = await client.testReject("rtp_abc123");
```

---

### `verifyCallback(payload)`

Verify the SHA-256 signature of an incoming callback notification. Returns `true` if the signature is valid, `false` otherwise.

Throws an `Error` if `signatureKey` was not provided in the client config.

**Signature**: `verifyCallback(payload: RtpCallbackPayload): boolean`

```typescript
// In your webhook handler (e.g. Express):
app.post("/webhooks/rtp", (req, res) => {
  const payload: RtpCallbackPayload = req.body;
  const isValid = client.verifyCallback(payload);

  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  // Process the callback
  const { rtpId, rtpStatus, payId, amount } = payload.result;
  console.log(`RTP ${rtpId} is now ${rtpStatus}`);

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
  rtpId: "rtp_abc123",
  rtpStatus: "Accepted",
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

### RtpCallbackPayload

The top-level structure sent to your callback URL.

| Field       | Type                | Description                                 |
| ----------- | ------------------- | ------------------------------------------- |
| `result`    | `RtpCallbackResult` | The payment result data.                    |
| `signature` | `string`            | SHA-256 Base64-encoded signature to verify. |

### RtpCallbackResult

| Field        | Type       | Description                 |
| ------------ | ---------- | --------------------------- |
| `rtpId`      | `string`   | Payment request identifier. |
| `rtpStatus`  | `string`   | Current RTP status.         |
| `orderId`    | `string?`  | Your order ID.              |
| `payId`      | `string`   | Payment identifier.         |
| `amount`     | `number`   | Payment amount.             |
| `commission` | `number`   | Commission charged.         |
| `currency`   | `Currency` | Payment currency.           |
| `payerName`  | `string`   | Payer name.                 |
| `payerIban`  | `string`   | Payer IBAN.                 |
| `executedAt` | `string`   | Execution timestamp.        |

## Enums and Constants

### RtpStatus

```typescript
import { RtpStatus } from "@maib/rtp";
```

| Key                   | Value         | Description                                 |
| --------------------- | ------------- | ------------------------------------------- |
| `RtpStatus.CREATED`   | `"Created"`   | Payment request created, not yet delivered. |
| `RtpStatus.ACTIVE`    | `"Active"`    | Delivered to the payer, awaiting response.  |
| `RtpStatus.CANCELLED` | `"Cancelled"` | Cancelled by the merchant.                  |
| `RtpStatus.ACCEPTED`  | `"Accepted"`  | Payer accepted the payment.                 |
| `RtpStatus.REJECTED`  | `"Rejected"`  | Payer rejected the payment.                 |
| `RtpStatus.EXPIRED`   | `"Expired"`   | Payment request expired without a response. |

### Currency (re-exported from @maib/core)

```typescript
import { Currency } from "@maib/rtp";
```

| Key            | Value   |
| -------------- | ------- |
| `Currency.MDL` | `"MDL"` |
| `Currency.EUR` | `"EUR"` |
| `Currency.USD` | `"USD"` |

### Environment (re-exported from @maib/core)

```typescript
import { Environment } from "@maib/rtp";
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
import { MaibError } from "@maib/rtp"; // re-exported from @maib/core

try {
  await client.create({
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
import { MaibNetworkError } from "@maib/rtp"; // re-exported from @maib/core

try {
  await client.create({
    /* ... */
  });
} catch (error) {
  if (error instanceof MaibNetworkError) {
    console.error("Network failure:", error.message, error.cause);
  }
}
```

## Exports

Everything you need is exported from the `@maib/rtp` package entry point:

```typescript
// Client
export { RtpClient } from "@maib/rtp";

// Constants / enums
export { RtpStatus, Currency, Environment } from "@maib/rtp";

// Types (import type)
export type {
  RtpClientConfig,
  CreateRtpRequest,
  CreateRtpResult,
  CancelRtpRequest,
  CancelRtpResult,
  RefundRtpRequest,
  RefundRtpResult,
  ListRtpParams,
  RtpStatusResult,
  TestAcceptRequest,
  TestAcceptResult,
  TestRejectResult,
  RtpCallbackPayload,
  RtpCallbackResult,
} from "@maib/rtp";
```

## Full Working Example

```typescript
import { RtpClient, Environment, Currency, RtpStatus } from "@maib/rtp";
import type { RtpCallbackPayload } from "@maib/rtp";

// 1. Initialize the client
const client = new RtpClient({
  clientId: process.env.MAIB_CLIENT_ID!,
  clientSecret: process.env.MAIB_CLIENT_SECRET!,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!,
  environment: Environment.SANDBOX,
});

// 2. Create a payment request
const rtp = await client.create({
  alias: "+37360123456",
  amount: 150.0,
  currency: Currency.MDL,
  description: "Monthly subscription",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  callbackUrl: "https://yoursite.com/webhooks/rtp",
});

// 3. Check status
const status = await client.getStatus(rtp.rtpId);
console.log(status.status); // "Created" or "Active"

// 4. Simulate acceptance (sandbox only)
const accepted = await client.testAccept(rtp.rtpId, {
  amount: 150.0,
  currency: Currency.MDL,
});

// 5. Verify a callback in your webhook handler
function handleCallback(payload: RtpCallbackPayload) {
  if (!client.verifyCallback(payload)) {
    throw new Error("Invalid callback signature");
  }
  // Process payload.result
}

// 6. List recent payment requests
const page = await client.list({
  count: 10,
  offset: 0,
  status: RtpStatus.ACCEPTED,
});

// 7. Refund a payment
await client.refund(accepted.payId, { reason: "Customer request" });
```
