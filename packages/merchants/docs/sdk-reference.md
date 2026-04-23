---
package: "@maib/merchants"
version: 0.2.4
description: Umbrella SDK for all maib merchant APIs — single import for checkout, e-commerce, RTP, and MIA QR.
---

# @maib/merchants SDK Reference

Umbrella package that re-exports everything from `@maib/checkout`, `@maib/ecommerce`, `@maib/rtp`, `@maib/mia`, and `@maib/core` through a single import. Install this one package to get access to all four maib merchant API clients and all shared infrastructure.

**Important**: This package does NOT include `@maib/ob` (Open Banking). The Open Banking SDK uses a different authentication model (DirectLogin) and must be installed separately as `@maib/ob`.

## Installation

```bash
npm install @maib/merchants
```

## Quick Start

```typescript
import {
  CheckoutClient,
  EcommerceClient,
  RtpClient,
  MiaClient,
  Environment,
  Currency,
  Language,
  verifyHmacSignature,
  verifySignature,
} from "@maib/merchants";

const checkout = new CheckoutClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  environment: Environment.SANDBOX,
});
```

## Available Clients

All four merchant API clients are available through this import:

| Client            | Source Package    | Description                                                                               |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `CheckoutClient`  | `@maib/checkout`  | Hosted checkout sessions API (v2). Create payment sessions, list payments, issue refunds. |
| `EcommerceClient` | `@maib/ecommerce` | E-commerce payment gateway (v1). Direct card payments, holds, recurring, one-click.       |
| `RtpClient`       | `@maib/rtp`       | Request to Pay API (v2). Create payment requests, check status, process refunds.          |
| `MiaClient`       | `@maib/mia`       | MIA QR payments API (v2). Static/dynamic/hybrid QR codes, extensions, payments.           |

## Import Map

The sections below list every export from `@maib/merchants` and which source package it originates from. Where two source packages export a type with the same name, `@maib/merchants` re-exports one with a prefixed alias to avoid collisions.

### From @maib/core

**Classes:**

- `BaseClient` -- Abstract base class for all merchant clients.
- `MaibError` -- API error (response with `ok: false`).
- `MaibNetworkError` -- Network-level failure (alias for `NetworkError` from `@maib/http`).

**Functions:**

- `computeSignature(result, signatureKey)` -- SHA-256 signature for ecomm/rtp/mia callbacks.
- `verifySignature(result, signature, signatureKey)` -- Verify SHA-256 callback signature.
- `computeHmacSignature(rawBody, timestamp, signatureKey)` -- HMAC-SHA256 for checkout callbacks.
- `verifyHmacSignature(rawBody, xSignature, xTimestamp, signatureKey)` -- Verify HMAC-SHA256 callback signature.
- `isMaibResponse(value)` -- Type guard for maib API response envelope.

**Enums:**

- `Environment` -- `{ PRODUCTION: "production", SANDBOX: "sandbox" }`
- `Language` -- `{ RO: "ro", EN: "en", RU: "ru" }`

**Constants:**

- `PRODUCTION_API_HOST` -- `"https://api.maibmerchants.md"`
- `SANDBOX_API_HOST` -- `"https://sandbox.maibmerchants.md"`
- `DEFAULT_API_HOST` -- Deprecated alias for `PRODUCTION_API_HOST`.
- `TOKEN_REFRESH_BUFFER_S` -- `30`
- `SDK_VERSION` -- SDK version string.

**Types:**

- `MaibApiError`
- `MaibClientConfig`
- `MaibErrorResponse`
- `MaibResponse<T>`
- `MaibSuccessResponse<T>`
- `PaginatedResult<T>`
- `PaginationParams`
- `TokenResult`

### From @maib/checkout

**Classes:**

- `CheckoutClient`

**Enums:**

| Enum             | Values                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `CheckoutStatus` | `WaitingForInit`, `Initialized`, `PaymentMethodSelected`, `Completed`, `Expired`, `Abandoned`, `Cancelled`, `Failed` |
| `PaymentStatus`  | `Executed`, `PartiallyRefunded`, `Refunded`, `Failed`                                                                |
| `RefundStatus`   | `Created`, `Requested`, `Accepted`, `Rejected`, `Manual`                                                             |

**Types:**

- `CheckoutClientConfig`
- `CreateSessionRequest`
- `CreateSessionResult`
- `CancelSessionResult`
- `SessionDetails`
- `SessionOrder`, `SessionOrderItem`
- `SessionPayer`
- `SessionPayment`
- `OrderInfo`, `OrderItem`
- `PayerInfo`
- `CheckoutCallbackPayload`
- `ListSessionsParams`

**Aliased types** (renamed to avoid collisions with other packages):

| Alias in @maib/merchants     | Original name in @maib/checkout |
| ---------------------------- | ------------------------------- |
| `CheckoutListPaymentsParams` | `ListPaymentsParams`            |
| `CheckoutPaymentDetails`     | `PaymentDetails`                |
| `CheckoutRefundDetails`      | `RefundDetails`                 |
| `CheckoutRefundRequest`      | `RefundRequest`                 |
| `CheckoutRefundResult`       | `RefundResult`                  |

### From @maib/ecommerce

**Classes:**

- `EcommerceClient`

**Enums:**

| Enum                | Values                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Currency`          | `MDL`, `EUR`, `USD`                                                                                        |
| `TransactionStatus` | `OK`, `FAILED`, `CREATED`, `PENDING`, `DECLINED`, `TIMEOUT`, `REVERSED`                                    |
| `ThreeDsStatus`     | `AUTHENTICATED`, `NOT_AUTHENTICATED`, `UNAVAILABLE`, `ATTEMPTED`, `REJECTED`, `SKIPPED`, `NOTPARTICIPATED` |

Note: `Currency` is re-exported from `@maib/ecommerce` (which itself re-exports it from `@maib/core`). It is the same `Currency` enum regardless of source.

**Types:**

- `EcommerceClientConfig`
- `BasePaymentParams`
- `CustomerFacingParams`
- `PayRequest`
- `HoldRequest`
- `CompleteRequest`, `CompleteResult`
- `PayInfoResult`
- `PaymentInitResult`
- `PaymentItem`
- `SavecardOneclickRequest`
- `SavecardRecurringRequest`
- `ExecuteOneclickRequest`
- `ExecuteRecurringRequest`, `ExecuteRecurringResult`
- `CallbackPayload`, `CallbackResult`

**Aliased types** (renamed to avoid collisions):

| Alias in @maib/merchants | Original name in @maib/ecommerce |
| ------------------------ | -------------------------------- |
| `EcommerceRefundRequest` | `RefundRequest`                  |
| `EcommerceRefundResult`  | `RefundResult`                   |

### From @maib/rtp

**Classes:**

- `RtpClient`

**Enums:**

| Enum        | Values                                                              |
| ----------- | ------------------------------------------------------------------- |
| `RtpStatus` | `Created`, `Active`, `Cancelled`, `Accepted`, `Rejected`, `Expired` |

**Types:**

- `RtpClientConfig`
- `CreateRtpRequest`, `CreateRtpResult`
- `CancelRtpRequest`, `CancelRtpResult`
- `RefundRtpRequest`, `RefundRtpResult`
- `RtpStatusResult`
- `RtpCallbackPayload`, `RtpCallbackResult`
- `ListRtpParams`
- `TestAcceptRequest`, `TestAcceptResult`
- `TestRejectResult`

### From @maib/mia

**Classes:**

- `MiaClient`

**Enums:**

| Enum               | Values                                               |
| ------------------ | ---------------------------------------------------- |
| `QrType`           | `Static`, `Dynamic`, `Hybrid`                        |
| `AmountType`       | `Fixed`, `Controlled`, `Free`                        |
| `QrStatus`         | `Active`, `Inactive`, `Expired`, `Paid`, `Cancelled` |
| `MiaPaymentStatus` | `Executed`, `Refunded`                               |

**Types:**

- `MiaClientConfig`
- `CreateQrRequest`, `CreateQrResult`
- `CreateHybridQrRequest`, `CreateHybridQrResult`
- `CancelQrRequest`, `CancelQrResult`
- `QrDetails`
- `CreateExtensionRequest`, `CreateExtensionResult`
- `CancelExtensionRequest`, `CancelExtensionResult`
- `HybridExtension`
- `RefundPaymentRequest`
- `MiaPaymentDetails`
- `MiaRefundResult`
- `MiaCallbackPayload`, `MiaCallbackResult`
- `ListQrParams`
- `ListExtensionsParams`
- `TestPayRequest`, `TestPayResult`

**Aliased types** (renamed to avoid collisions):

| Alias in @maib/merchants | Original name in @maib/mia |
| ------------------------ | -------------------------- |
| `MiaListPaymentsParams`  | `ListPaymentsParams`       |

## Aliased Types Summary

When importing from `@maib/merchants`, use these aliases for types that share a name across packages:

```typescript
import type {
  // Checkout-specific
  CheckoutListPaymentsParams,
  CheckoutPaymentDetails,
  CheckoutRefundDetails,
  CheckoutRefundRequest,
  CheckoutRefundResult,

  // Ecommerce-specific
  EcommerceRefundRequest,
  EcommerceRefundResult,

  // MIA-specific
  MiaListPaymentsParams,
} from "@maib/merchants";
```

If you install the individual packages instead (`@maib/checkout`, `@maib/ecommerce`, `@maib/mia`), you use the original unaliased names (`ListPaymentsParams`, `RefundRequest`, etc.) since there are no collisions within a single package.

## What Is NOT Included

`@maib/merchants` does **not** export anything from:

- **`@maib/ob`** (Open Banking) -- Uses DirectLogin authentication instead of OAuth2 Client Credentials. Install separately: `npm install @maib/ob`.
- **`@maib/http`** -- Low-level HTTP primitives. `NetworkError` is available as `MaibNetworkError` through `@maib/core` re-exports. For `TokenManager`, `buildQueryString`, `TokenState`, or `BaseClientConfig`, import from `@maib/http` directly.

## Usage Pattern

All four clients share the same `MaibClientConfig` structure and authentication flow:

```typescript
import {
  CheckoutClient,
  EcommerceClient,
  RtpClient,
  MiaClient,
  Environment,
} from "@maib/merchants";

// Same credentials work for all clients
const config = {
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY,
  environment: Environment.SANDBOX,
};

const checkout = new CheckoutClient(config);
const ecommerce = new EcommerceClient(config);
const rtp = new RtpClient(config);
const mia = new MiaClient(config);
```

## Error Handling

All clients throw the same error types (re-exported from `@maib/core`):

```typescript
import { MaibError, MaibNetworkError } from "@maib/merchants";

try {
  await checkout.createSession({
    /* ... */
  });
} catch (error) {
  if (error instanceof MaibError) {
    // API returned an error response (ok: false)
    console.log(error.statusCode); // HTTP status code
    console.log(error.errors); // MaibApiError[]
    console.log(error.errors[0].errorCode); // e.g. "INVALID_REQUEST"
  }
  if (error instanceof MaibNetworkError) {
    // Network failure (DNS, timeout, connection refused)
    console.log(error.message);
    console.log(error.cause);
  }
}
```

## Signature Verification

Both signature verification functions are available through this import:

```typescript
import { verifyHmacSignature, verifySignature } from "@maib/merchants";

// For checkout callbacks (HMAC-SHA256):
verifyHmacSignature(rawBody, xSignature, xTimestamp, signatureKey);

// For ecommerce, RTP, and MIA callbacks (SHA-256):
verifySignature(result, signature, signatureKey);
```
