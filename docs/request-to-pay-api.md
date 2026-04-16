# maib Request to Pay (RTP) API Reference

> Source: https://docs.maibmerchants.md/request-to-pay
> Fetched: 2026-03-23

---

## Table of Contents

- [Overview](#overview)
- [Environments](#environments)
- [API Fundamentals](#api-fundamentals)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Create RTP](#1-create-a-new-payment-request)
  - [Get RTP Status](#2-retrieve-the-status-of-a-payment-request)
  - [Cancel RTP](#3-cancel-a-pending-payment-request)
  - [List RTPs](#4-list-all-payment-requests)
  - [Refund RTP](#5-initiate-a-refund-for-a-completed-payment)
- [Sandbox Simulation](#sandbox-simulation)
  - [Simulate Accept](#simulate-acceptance)
  - [Simulate Reject](#simulate-rejection)
- [Callback Notifications](#callback-notifications)
- [Signature Verification](#signature-verification)
- [Error Codes](#error-codes)
- [HTTP Status Codes](#http-status-codes)
- [Glossary](#glossary)

---

## Overview

Request to Pay (RTP) is a bank-initiated payment request that a merchant can create and send to a customer through the bank's mobile app. Merchants specify payment details (amount, currency, description, expiration) and customers receive a notification in their banking app where they can accept or reject the payment. When the payment is executed, the merchant receives a server-to-server callback containing the payment outcome.

---

## Environments

| Environment | Base URL                           |
| ----------- | ---------------------------------- |
| Production  | `https://api.maibmerchants.md`     |
| Sandbox     | `https://sandbox.maibmerchants.md` |

---

## API Fundamentals

- **Protocol**: HTTPS only
- **Content-Type**: `application/json` (all requests and responses)
- **Authorization**: `Bearer {access_token}` header on all requests (except token endpoint)
- **Date/Time Format**: ISO 8601-1:2019 with timezone (e.g., `2029-10-22T10:32:28+03:00`)
- **Currency**: `MDL` (ISO 4217) - only supported currency
- **Identifiers**: UUID/GUID format (`rtpId`, `payId`, `refundId`)
- **Response Structure**: All responses include a top-level `ok` boolean; on failure, an `errors` array is present

### Standard Response Envelope

```json
{
  "result": { ... },
  "ok": true
}
```

### Standard Error Envelope

```json
{
  "ok": false,
  "errors": [
    {
      "errorCode": "12000",
      "errorMessage": "Parameter `alias` is invalid."
    }
  ]
}
```

---

## Authentication

**OAuth 2.0 Client Credentials Flow**

### POST `/v2/auth/token`

Obtain an access token using client credentials provided by maib.

#### Request Headers

```
Content-Type: application/json
```

#### Request Body

| Parameter      | Type          | Required | Description                        |
| -------------- | ------------- | -------- | ---------------------------------- |
| `clientId`     | string (GUID) | Yes      | Client code provided by maib       |
| `clientSecret` | string (GUID) | Yes      | Client secret key provided by maib |

#### Response

| Field                | Type    | Description                             |
| -------------------- | ------- | --------------------------------------- |
| `result.accessToken` | string  | JWT access token                        |
| `result.expiresIn`   | integer | Token lifetime in seconds (e.g., `300`) |
| `result.tokenType`   | string  | Always `"Bearer"`                       |
| `ok`                 | boolean | `true` on success                       |
| `errors`             | array   | Present only if `ok = false`            |

#### Example Response

```json
{
  "result": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 300,
    "tokenType": "Bearer"
  },
  "ok": true
}
```

#### Notes

- Token lifetime is **300 seconds** (5 minutes) based on the documented example.
- No refresh token mechanism. After expiry, request a new token.
- No `grant_type` parameter required; credentials are passed directly in the body.

---

## Endpoints

### 1. Create a New Payment Request

**POST** `/v2/rtp`

Creates a new RTP addressed to a customer alias (phone number). The RTP is created in **Pending** status and automatically transitions to **Expired** if not addressed before `expiresAt`.

#### Request Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### Request Body

| Parameter     | Type                     | Required | Constraints                          | Description                                        |
| ------------- | ------------------------ | -------- | ------------------------------------ | -------------------------------------------------- |
| `alias`       | string(100)              | Yes      | Format: `373xxxxxxxx`                | Customer phone number                              |
| `amount`      | number (decimal)         | Yes      | -                                    | Amount of the RTP                                  |
| `expiresAt`   | string (ISO 8601-1:2019) | Yes      | Min: 1 minute from now, Max: 60 days | Expiration date/time of the RTP                    |
| `currency`    | string (enum)            | Yes      | Only: `MDL`                          | Payment currency (ISO 4217)                        |
| `description` | string(500)              | Yes      | Max 500 characters                   | Order description                                  |
| `orderId`     | string(100)              | No       | Max 100 characters                   | Merchant's internal order identifier               |
| `terminalId`  | string(100)              | No       | Max 100 characters                   | Terminal ID provided by the bank                   |
| `callbackUrl` | string(1000)             | No       | HTTPS URL, max 1000 characters       | URL for server-to-server payment callback          |
| `redirectUrl` | string(1000)             | No       | HTTPS URL, max 1000 characters       | URL for customer redirect after successful payment |

#### Response

| Field              | Type                     | Description                    |
| ------------------ | ------------------------ | ------------------------------ |
| `result.rtpId`     | string (GUID)            | Unique identifier of the RTP   |
| `result.orderId`   | string(100)              | Merchant's order identifier    |
| `result.expiresAt` | string (ISO 8601-1:2019) | Timestamp when the RTP expires |
| `ok`               | boolean                  | `true` on success              |
| `errors`           | array                    | Present only if `ok = false`   |

#### Example Request

```json
POST /v2/rtp HTTP/1.1
Host: api.maibmerchants.md
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "alias": "37369112221",
  "amount": 150.00,
  "expiresAt": "2029-10-22T10:32:28+03:00",
  "currency": "MDL",
  "description": "Invoice #123",
  "orderId": "INV123",
  "terminalId": "P011111",
  "callbackUrl": "https://merchant.example.com/callback",
  "redirectUrl": "https://merchant.example.com/success"
}
```

#### Example Response

```json
{
  "result": {
    "rtpId": "123e4567-e89b-12d3-a456-426614174000",
    "orderId": "INV123",
    "expiresAt": "2029-10-22T10:32:28+03:00"
  },
  "ok": true
}
```

---

### 2. Retrieve the Status of a Payment Request

**GET** `/v2/rtp/{id}`

Retrieve the current status and details of a specific RTP request.

#### Request Headers

```
Authorization: Bearer {access_token}
```

#### Path Parameters

| Parameter | Type          | Required | Description           |
| --------- | ------------- | -------- | --------------------- |
| `rtpId`   | string (GUID) | Yes      | RTP unique identifier |

#### Response

| Field                | Type                     | Description                                                           |
| -------------------- | ------------------------ | --------------------------------------------------------------------- |
| `result.rtpId`       | string (GUID)            | RTP unique identifier                                                 |
| `result.orderId`     | string(100)              | Merchant-side order identifier                                        |
| `result.status`      | string (enum)            | `Created`, `Active`, `Cancelled`, `Accepted`, `Rejected`, `Expired`   |
| `result.amount`      | number (decimal)         | RTP amount                                                            |
| `result.currency`    | string (enum)            | `MDL` (ISO 4217)                                                      |
| `result.description` | string(500)              | Order description                                                     |
| `result.callbackUrl` | string(1000)             | HTTPS callback URL                                                    |
| `result.redirectUrl` | string(1000)             | HTTPS redirect URL                                                    |
| `result.createdAt`   | string (ISO 8601-1:2019) | RTP creation timestamp                                                |
| `result.updatedAt`   | string (ISO 8601-1:2019) | Last status update timestamp                                          |
| `result.expiresAt`   | string (ISO 8601-1:2019) | RTP expiration timestamp                                              |
| `result.terminalId`  | string(100)              | Terminal ID provided by the bank                                      |
| `ok`                 | boolean                  | `true` on success                                                     |
| `errors`             | array                    | Present only if `ok = false`, contains `errorCode` and `errorMessage` |

#### Status Values

| Status      | Description                                |
| ----------- | ------------------------------------------ |
| `Created`   | RTP has been created, pending delivery     |
| `Active`    | RTP has been delivered to the customer     |
| `Cancelled` | RTP has been cancelled by the merchant     |
| `Accepted`  | Customer accepted and payment was executed |
| `Rejected`  | Customer rejected the payment request      |
| `Expired`   | RTP expired without customer action        |

#### Example Request

```bash
curl -G "https://api.maibmerchants.md/v2/rtp/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer {access_token}"
```

#### Example Response

```json
{
  "result": {
    "rtpId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "Created",
    "amount": 50.0,
    "currency": "MDL",
    "description": "Order description",
    "callbackUrl": "https://example.com/callback",
    "redirectUrl": "https://example.com/success",
    "createdAt": "2029-10-22T10:32:28+03:00",
    "updatedAt": "2029-10-22T10:32:58+03:00",
    "expiresAt": "2029-10-22T10:33:28+03:00",
    "terminalId": "P011111"
  },
  "ok": true
}
```

---

### 3. Cancel a Pending Payment Request

**POST** `/v2/rtp/{id}/cancel`

Cancel an RTP that is still in **Pending** state. Cannot cancel if already Accepted, Rejected, or Expired.

#### Request Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type          | Required | Description           |
| --------- | ------------- | -------- | --------------------- |
| `rtpId`   | string (GUID) | Yes      | RTP unique identifier |

#### Request Body

| Parameter | Type        | Required | Constraints        | Description                            |
| --------- | ----------- | -------- | ------------------ | -------------------------------------- |
| `reason`  | string(500) | Yes      | Max 500 characters | Reason for initiating the cancellation |

#### Response

| Field           | Type          | Description                  |
| --------------- | ------------- | ---------------------------- |
| `result.rtpId`  | string (GUID) | RTP identifier echoed back   |
| `result.status` | string (enum) | Returns `Cancelled`          |
| `ok`            | boolean       | `true` on success            |
| `errors`        | array         | Present only if `ok = false` |

#### Example Response

```json
{
  "result": {
    "rtpId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "Cancelled"
  },
  "ok": true
}
```

#### Notes

- Cancellation is only allowed while the RTP is in **Pending** state.
- The operation exhibits idempotent behavior.

---

### 4. List All Payment Requests

**GET** `/v2/rtp`

Returns a paginated list of RTP requests created by the merchant. Supports filtering and sorting.

#### Request Headers

```
Authorization: Bearer {access_token}
```

#### Query Parameters

| Parameter       | Type                     | Required | Default     | Constraints / Allowed Values                                        |
| --------------- | ------------------------ | -------- | ----------- | ------------------------------------------------------------------- |
| `count`         | integer                  | Yes      | -           | Items per result set                                                |
| `offset`        | integer                  | Yes      | -           | Pagination starting point                                           |
| `sortBy`        | string (enum)            | No       | `createdAt` | `orderId`, `type`, `amount`, `status`, `createdAt`, `expiresAt`     |
| `order`         | string (enum)            | No       | `asc`       | `asc`, `desc`                                                       |
| `rtpId`         | string (GUID)            | No       | -           | Filter by RTP identifier                                            |
| `orderId`       | string                   | No       | -           | Max 100 chars                                                       |
| `amount`        | string                   | No       | -           | Filter by amount                                                    |
| `description`   | string                   | No       | -           | Max 500 chars                                                       |
| `status`        | string (enum)            | No       | -           | `Created`, `Active`, `Cancelled`, `Accepted`, `Rejected`, `Expired` |
| `createdAtFrom` | string (ISO 8601-1:2019) | No       | -           | Inclusive lower bound                                               |
| `createdAtTo`   | string (ISO 8601-1:2019) | No       | -           | Inclusive upper bound                                               |
| `expiresAtFrom` | string (ISO 8601-1:2019) | No       | -           | Inclusive lower bound                                               |
| `expiresAtTo`   | string (ISO 8601-1:2019) | No       | -           | Inclusive upper bound                                               |
| `terminalId`    | string                   | No       | -           | Max 100 chars, bank-provided                                        |

#### Response

| Field                        | Type                     | Description                      |
| ---------------------------- | ------------------------ | -------------------------------- |
| `result.totalCount`          | integer                  | Total number of matching records |
| `result.items[]`             | array                    | Array of RTP objects             |
| `result.items[].rtpId`       | string (GUID)            | RTP unique identifier            |
| `result.items[].orderId`     | string(100)              | Merchant order identifier        |
| `result.items[].url`         | string                   | RTP URL                          |
| `result.items[].amount`      | number (decimal)         | RTP amount                       |
| `result.items[].currency`    | string (enum)            | `MDL`                            |
| `result.items[].description` | string(500)              | Order description                |
| `result.items[].callbackUrl` | string(1000)             | Callback URL                     |
| `result.items[].redirectUrl` | string(1000)             | Redirect URL                     |
| `result.items[].status`      | string (enum)            | RTP status                       |
| `result.items[].createdAt`   | string (ISO 8601-1:2019) | Creation timestamp               |
| `result.items[].updatedAt`   | string (ISO 8601-1:2019) | Last update timestamp            |
| `result.items[].expiresAt`   | string (ISO 8601-1:2019) | Expiration timestamp             |
| `result.items[].terminalId`  | string(100)              | Terminal ID                      |
| `ok`                         | boolean                  | `true` on success                |
| `errors`                     | array                    | Present only if `ok = false`     |

---

### 5. Initiate a Refund for a Completed Payment

**POST** `/v2/rtp/{payId}/refund`

Initiates a refund for an RTP payment that has already been accepted. Uses `payId` (not `rtpId`).

#### Request Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type          | Required | Description               |
| --------- | ------------- | -------- | ------------------------- |
| `payId`   | string (GUID) | Yes      | Payment unique identifier |

#### Request Body

| Parameter | Type        | Required | Constraints        | Description                      |
| --------- | ----------- | -------- | ------------------ | -------------------------------- |
| `reason`  | string(500) | Yes      | Max 500 characters | Reason for initiating the refund |

#### Response

| Field             | Type          | Description                  |
| ----------------- | ------------- | ---------------------------- |
| `result.refundId` | string (GUID) | Refund unique identifier     |
| `result.status`   | string (enum) | Returns `Created`            |
| `ok`              | boolean       | `true` on success            |
| `errors`          | array         | Present only if `ok = false` |

#### Example Response

```json
{
  "result": {
    "refundId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "Created"
  },
  "ok": true
}
```

#### Notes

- Store both `payId` and `rtpId` after successful payments. Use `payId` specifically for refund operations.
- Partial refunds are **not** available (error code `34001` will be returned).

---

## Sandbox Simulation

These endpoints are available **only** in the sandbox environment (`https://sandbox.maibmerchants.md`). They allow testing complete payment flows without real transactions.

### Simulate Acceptance

**POST** `/v2/rtp/{id}/test-accept`

Simulates the acceptance of an RTP request.

#### Request Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type          | Required | Description           |
| --------- | ------------- | -------- | --------------------- |
| `rtpId`   | string (GUID) | Yes      | RTP unique identifier |

#### Request Body

| Parameter  | Type             | Required | Constraints | Description         |
| ---------- | ---------------- | -------- | ----------- | ------------------- |
| `amount`   | number (decimal) | Yes      | -           | Payment amount      |
| `currency` | string (enum)    | Yes      | Only: `MDL` | Currency (ISO 4217) |

#### Response

| Field               | Type                     | Description                                                           |
| ------------------- | ------------------------ | --------------------------------------------------------------------- |
| `result.rtpId`      | string (GUID)            | RTP identifier                                                        |
| `result.status`     | string (enum)            | `Pending`, `Accepted`, `Rejected`, `Expired`, `Cancelled`, `Refunded` |
| `result.orderId`    | string(100)              | Merchant order identifier                                             |
| `result.payId`      | string (GUID)            | Transaction/payment identifier                                        |
| `result.amount`     | number (decimal)         | Transaction amount                                                    |
| `result.commission` | number (decimal)         | Processing fee/commission                                             |
| `result.currency`   | string (enum)            | `MDL`                                                                 |
| `result.payerName`  | string(200)              | Abbreviated payer name (e.g., "John D.")                              |
| `result.payerIban`  | string(100)              | Payer IBAN                                                            |
| `result.executedAt` | string (ISO 8601-1:2019) | Payment execution timestamp                                           |
| `result.signature`  | string                   | Validation signature (for verifying callback authenticity)            |
| `ok`                | boolean                  | `true` on success                                                     |
| `errors`            | array                    | Present only if `ok = false`                                          |

---

### Simulate Rejection

**POST** `/v2/rtp/{id}/test-reject`

Simulates the rejection of an RTP request.

#### Request Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type          | Required | Description           |
| --------- | ------------- | -------- | --------------------- |
| `rtpId`   | string (GUID) | Yes      | RTP unique identifier |

#### Request Body

No request body parameters documented.

#### Response

| Field               | Type                     | Description                                                                     |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `result.rtpId`      | string (GUID)            | RTP identifier                                                                  |
| `result.rtpStatus`  | string (enum)            | `Active`, `Pending`, `Accepted`, `Rejected`, `Expired`, `Cancelled`, `Refunded` |
| `result.orderId`    | string(100)              | Merchant order identifier                                                       |
| `result.payId`      | string (GUID)            | Transaction identifier                                                          |
| `result.amount`     | number (decimal)         | Transaction amount                                                              |
| `result.commission` | number (decimal)         | Processing fee                                                                  |
| `result.currency`   | string (enum)            | `MDL`                                                                           |
| `result.payerName`  | string(200)              | Abbreviated payer name                                                          |
| `result.payerIban`  | string(100)              | Payer IBAN                                                                      |
| `result.executedAt` | string (ISO 8601-1:2019) | Execution timestamp                                                             |
| `result.signature`  | string                   | Validation signature                                                            |
| `ok`                | boolean                  | `true` on success                                                               |
| `errors`            | array                    | Present only if `ok = false`                                                    |

#### Note

The test-accept response uses `result.status` while test-reject uses `result.rtpStatus` based on the documentation. This may be an inconsistency in the docs - verify with actual API behavior.

---

## Callback Notifications

After a successful payment execution, maib sends a **server-to-server POST** request to the merchant's `callbackUrl`.

### Callback Request

- **HTTP Method**: POST
- **Content-Type**: `application/json`
- **Success Criterion**: Your server must respond with **HTTP 200 OK**. A notification is considered successfully received only if your server responds with `200`.

### Callback Payload

```json
{
  "result": {
    "rtpId": "123e4567-e89b-12d3-a456-426614174000",
    "rtpStatus": "Accepted",
    "orderId": "123",
    "payId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "amount": 100.0,
    "commission": 1.0,
    "currency": "MDL",
    "payerName": "John D.",
    "payerIban": "MD24AG000225100014156789",
    "executedAt": "2029-10-22T10:32:28+03:00"
  },
  "signature": "r4KwwIUXQGHhcEM7C4um8o9rSrGEriTRcYQuBbmjEec="
}
```

### Callback Payload Fields

| Field               | Type                     | Description                              |
| ------------------- | ------------------------ | ---------------------------------------- |
| `result.rtpId`      | string (GUID)            | RTP unique identifier                    |
| `result.rtpStatus`  | string (enum)            | Status: `Accepted`                       |
| `result.orderId`    | string                   | Merchant order identifier (if set)       |
| `result.payId`      | string (GUID)            | Unique payment identifier                |
| `result.amount`     | number (decimal)         | Payment amount                           |
| `result.commission` | number (decimal)         | Payment commission/fee                   |
| `result.currency`   | string (ISO 4217)        | Currency: `MDL`                          |
| `result.payerName`  | string                   | Payer abbreviated name (e.g., "John D.") |
| `result.payerIban`  | string                   | Payer IBAN                               |
| `result.executedAt` | string (ISO 8601-1:2019) | Payment execution timestamp              |
| `signature`         | string (Base64)          | Cryptographic signature for verification |

### Implementation Requirements

1. **Verify the signature first**, then update your order/payment state.
2. **Implement idempotency**: identical `payId` values must not trigger duplicate fulfillment.
3. **Log**: `rtpId`, `payId`, `rtpStatus`, `executedAt`, and verification outcome.
4. **Return HTTP 200** only after successful processing.
5. **Fallback**: Use `GET /v2/rtp/{id}` if callbacks are delayed or rejected.

### Retry Policy

Not explicitly specified. If your server rejects or delays a callback, use `GET /v2/rtp/{id}` to verify payment status.

---

## Signature Verification

The `signature` field in callback notifications must be verified to ensure data integrity and authenticity.

### Algorithm

1. **Extract** all fields from the `result` object (exclude the top-level `signature` field).
2. **Remove** any fields with null or empty string values.
3. **Format** `amount` and `commission` with exactly **2 decimal places** (e.g., `100.00`).
4. **Sort** field names **alphabetically** (case-insensitive).
5. **Concatenate** the sorted values with `:` (colon) separator.
6. **Append** `:` followed by the **Signature Key** (from maibmerchants project settings).
7. **Compute** SHA-256 hash (binary output).
8. **Encode** the hash as **Base64**.
9. **Compare** the result with the received `signature` value.

### Pseudocode

```
fields = extract_non_empty_fields(result)
fields["amount"] = format_decimal(fields["amount"], 2)
fields["commission"] = format_decimal(fields["commission"], 2)
sorted_keys = sort_case_insensitive(fields.keys())
values = [str(fields[key]) for key in sorted_keys]
concatenated = ":".join(values) + ":" + SIGNATURE_KEY
hash = sha256(concatenated)
computed_signature = base64_encode(hash)
is_valid = (computed_signature == received_signature)
```

### Example

Given the callback payload above and assuming a Signature Key:

1. Non-empty result fields: `rtpId`, `rtpStatus`, `orderId`, `payId`, `amount`, `commission`, `currency`, `payerName`, `payerIban`, `executedAt`
2. Format decimals: `amount` = `100.00`, `commission` = `1.00`
3. Sort alphabetically (case-insensitive): `amount`, `commission`, `currency`, `executedAt`, `orderId`, `payId`, `payerIban`, `payerName`, `rtpId`, `rtpStatus`
4. Concatenate values: `100.00:1.00:MDL:2029-10-22T10:32:28+03:00:123:c56a4180-65aa-42ec-a945-5fd21dec0538:MD24AG000225100014156789:John D.:123e4567-e89b-12d3-a456-426614174000:Accepted`
5. Append signature key: `...Accepted:{SIGNATURE_KEY}`
6. SHA-256 + Base64 = computed signature

### Validation Failure

If signature verification fails, return a **non-200** HTTP status code. Do **not** fulfill the order.

---

## Error Codes

### API-Specific Errors

| Error Code       | HTTP Status | Message                                                                                | Context                         |
| ---------------- | ----------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| `common.error-1` | 500         | Oops! An error occurred in the system. Call 1313.                                      | Generic system failure          |
| `10000`          | 500         | Internal error encountered. Please try again or report if error persists.              | Unspecified backend problem     |
| `11000`          | 401         | Invalid credentials. Please check `clientId` and `clientSecret`.                       | Authentication failed           |
| `12000`          | 400         | Parameter `{{parameter}}` is invalid.                                                  | Malformed request parameter     |
| `12001`          | 400         | Provided request is invalid: `{{error}}`.                                              | Overall request structure error |
| `12003`          | 400         | Sorting options are invalid.                                                           | Invalid sort parameters         |
| `12006`          | 400         | `expiresAt` field must be in the future. Provided value: `{{actualValue}}`.            | Expiration timestamp is in past |
| `14009`          | 409         | Account is not active.                                                                 | Account status inactive         |
| `22000`          | 400         | The selected currency is invalid. Please review and try again.                         | Unsupported currency            |
| `22001`          | 400         | The selected request status is invalid. Please verify your filter.                     | Bad status filter               |
| `22002`          | 400         | Sorting options are not valid. Please adjust and try again.                            | Invalid sorting configuration   |
| `23000`          | 404         | The specified Request to Pay does not exist or has expired.                            | Record not found or stale       |
| `24000`          | 409         | This merchant is not currently active. Please contact support.                         | Merchant account disabled       |
| `24001`          | 409         | This account is not active. Please use another account or contact us.                  | Account disabled                |
| `24002`          | 409         | Only MDL currency accounts are accepted for Request to Pay.                            | Currency mismatch               |
| `24003`          | 409         | Operation cannot be completed with the selected account.                               | Account incompatibility         |
| `24004`          | 409         | This request cannot be processed due to incomplete setup. Please contact maib support. | Configuration incomplete        |
| `24005`          | 409         | The current status does not permit the operation to be processed.                      | Invalid state transition        |
| `24006`          | 409         | The recipient has not activated MIA. Please verify or use another payment method.      | Recipient not enrolled          |
| `34001`          | 409         | Partial refund is not available: `{paymentId}`.                                        | Partial refund not supported    |

---

## HTTP Status Codes

| Status Code | Name                   | Description                                                                                      |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| 200         | OK                     | Request succeeded                                                                                |
| 400         | Bad Request            | Request not understood due to incorrect syntax; verify parameters and required fields            |
| 401         | Unauthorized           | Access token is missing, invalid, or expired                                                     |
| 403         | Forbidden              | Access restricted for the IP or authentication data; ensure project is active and IP whitelisted |
| 404         | Not Found              | Requested resource not found; check endpoint URL and resource identifiers                        |
| 405         | Method Not Allowed     | HTTP method (GET/POST/etc.) not allowed on this endpoint                                         |
| 409         | Conflict               | Data conflict (e.g., invalid state transition, duplicate request)                                |
| 415         | Unsupported Media Type | Content not in accepted format; verify `Content-Type: application/json`                          |
| 422         | Unprocessable Entity   | Data is valid in format but logically incorrect                                                  |
| 429         | Too Many Requests      | Rate limit exceeded; implement exponential backoff                                               |
| 500         | Internal Server Error  | Unexpected internal error; retry after a brief delay                                             |
| 503         | Service Unavailable    | API temporarily unavailable due to overload or maintenance                                       |

---

## Glossary

| Term              | Definition                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **RTP**           | Request to Pay - A bank-initiated payment request created by the merchant and sent to the customer's Bank App |
| **Alias**         | Customer's phone number in format `373xxxxxxxx`, used to address an RTP                                       |
| **RTP ID**        | Unique identifier of an RTP request (GUID)                                                                    |
| **Payment ID**    | Unique identifier of a completed payment (GUID), referred to as `payId`                                       |
| **Order ID**      | Merchant's internal order reference                                                                           |
| **Terminal ID**   | Bank-assigned terminal reference                                                                              |
| **Signature**     | Cryptographic value included in callback notifications for data integrity and authenticity verification       |
| **Signature Key** | Secret key from maibmerchants project settings, required to verify callback signatures                        |
| **Sandbox**       | Test environment at `https://sandbox.maibmerchants.md`                                                        |
| **Production**    | Live environment at `https://api.maibmerchants.md`                                                            |
| **MIA**           | maib's mobile banking app where customers receive and respond to RTP requests                                 |

---

## Endpoint Summary Table

| Method | Path                       | Description                               |
| ------ | -------------------------- | ----------------------------------------- |
| POST   | `/v2/auth/token`           | Obtain access token                       |
| POST   | `/v2/rtp`                  | Create a new payment request              |
| GET    | `/v2/rtp/{id}`             | Retrieve status of a payment request      |
| POST   | `/v2/rtp/{id}/cancel`      | Cancel a pending payment request          |
| GET    | `/v2/rtp`                  | List all payment requests (paginated)     |
| POST   | `/v2/rtp/{payId}/refund`   | Initiate a refund for a completed payment |
| POST   | `/v2/rtp/{id}/test-accept` | [Sandbox] Simulate acceptance             |
| POST   | `/v2/rtp/{id}/test-reject` | [Sandbox] Simulate rejection              |
