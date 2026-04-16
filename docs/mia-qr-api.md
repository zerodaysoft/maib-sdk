# maib MIA QR API - Complete API Reference

> Source: <https://docs.maibmerchants.md/mia-qr-api/en>

## Table of Contents

- [Overview](#overview)
- [General Technical Specifications](#general-technical-specifications)
- [QR Code Types](#qr-code-types)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Create QR Code (Static, Dynamic)](#1-create-qr-code-static-dynamic)
  - [Create Hybrid QR Code](#2-create-hybrid-qr-code)
  - [Create Extension for QR Code by ID](#3-create-extension-for-qr-code-by-id)
  - [Get QR Details by ID](#4-get-qr-details-by-id)
  - [Get QR Code List (with filter)](#5-get-qr-code-list-with-filter)
  - [Get QR Extensions List](#6-get-qr-extensions-list)
  - [Cancel Active QR Code by ID](#7-cancel-active-qr-code-by-id)
  - [Cancel Active QR Extension (Hybrid)](#8-cancel-active-qr-extension-hybrid)
  - [Get Payment Details by ID](#9-get-payment-details-by-id)
  - [Get Payment List (with filter)](#10-get-payment-list-with-filter)
  - [Refund Payment by ID](#11-refund-payment-by-id)
  - [Simulate Payment (Sandbox)](#12-simulate-payment-sandbox)
- [Callback Notifications](#callback-notifications)
- [Signature Validation](#signature-validation)
- [HTTP Status Codes](#http-status-codes)
- [API Error Codes](#api-error-codes)
- [Glossary](#glossary)

---

## Overview

The QR MIA API allows for the generation, management, and monitoring of electronic payments via QR codes. It supports both static and dynamic QR codes, suitable for a wide range of merchant use cases.

Access credentials for testing (`clientId` and `clientSecret`) can be requested at: **ecom@maib.md**, providing IDNO, company name, website, or application for integration.

---

## General Technical Specifications

| Property                | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| **Production Base URL** | `https://api.maibmerchants.md`                        |
| **Sandbox Base URL**    | `https://sandbox.maibmerchants.md`                    |
| **API Version Prefix**  | `/v2`                                                 |
| **Protocol**            | HTTPS only                                            |
| **Data Format**         | JSON (request and response)                           |
| **Content-Type Header** | `application/json`                                    |
| **Authentication**      | Bearer token (`Authorization: Bearer {access_token}`) |
| **DateTime Format**     | ISO 8601 (e.g., `2029-10-22T10:32:28`)                |
| **Currency**            | `MDL` (Moldovan Leu, ISO 4217)                        |

> Recommendation: Perform initial testing in the sandbox environment before requesting access to the production environment.

---

## QR Code Types

### Static QR

- **Definition**: A predefined QR code with fixed data (no amount or personalized details).
- **Reusable**: Yes
- **Modifiable after creation**: Yes
- **Can be placed on static media** (stickers, posters): Yes
- **Amount types**: `Fixed`, `Controlled`, `Free`
- **Configurable validity period**: No
- **Supports callback and redirect URLs**: Yes
- **Use cases**: Recurring payments where the amount is manually entered by the customer (e.g., donations, flexible contributions). Universal QR codes with open payment.

### Dynamic QR

- **Definition**: A one-time generated code that includes specific transaction details such as amount, merchant ID, and optionally customer information.
- **Reusable**: No
- **Modifiable after creation**: No
- **Can be placed on static media**: No (one-time use)
- **Amount types**: `Fixed`, `Controlled`
- **Configurable validity period**: Yes
- **Supports callback and redirect URLs**: Yes
- **Use cases**: Cases where accurate and secure payment tracking is required. One-time orders or fixed payments.

### Hybrid QR

- **Definition**: Combines features of both static and dynamic codes. Used for both one-time and recurring payments, where some data remains constant and other data is transaction-specific.
- **Reusable**: Yes
- **Modifiable after creation**: Yes (via the extension endpoint)
- **Can be placed on static media**: Yes
- **Amount types**: `Fixed`, `Controlled`
- **Configurable validity period**: Yes (via extension)
- **Supports callback and redirect URLs**: Yes
- **Use cases**: One-time orders or fixed payments with QR code placed on static media.

### Amount Types

| Amount Type  | Description                                                                      |
| ------------ | -------------------------------------------------------------------------------- |
| `Fixed`      | Predetermined, exact amount. `amount` must be set.                               |
| `Controlled` | Variable amount within min/max bounds. `amountMin` and `amountMax` must be set.  |
| `Free`       | Customer enters amount in bank app. No amount fields needed. **Static QR only.** |

### QR Statuses

| Status      | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `Active`    | QR code is active and can receive payments.                             |
| `Inactive`  | Static or Hybrid QR with no payment in the last 30 days.                |
| `Expired`   | Dynamic or Hybrid QR whose validity period has expired without payment. |
| `Paid`      | Dynamic or Hybrid QR after a payment has been made.                     |
| `Cancelled` | QR code was cancelled via cancel request.                               |

---

## Authentication

Authentication uses a standard **OAuth 2.0 Client Credentials Flow** with `clientId` and `clientSecret` provided by maib.

### Obtain Authentication Token

|            |                                       |
| ---------- | ------------------------------------- |
| **Method** | `POST`                                |
| **URL**    | `/v2/auth/token`                      |
| **Auth**   | None (this endpoint issues the token) |

#### Request Body Parameters

| Parameter      | Type          | Required | Description                        |
| -------------- | ------------- | -------- | ---------------------------------- |
| `clientId`     | string (guid) | Yes      | Client code provided by maib       |
| `clientSecret` | string (guid) | Yes      | Client secret key provided by maib |

#### Request Example

```json
{
  "clientId": "749c564f-1a65-48e3-a4bf-b7932b6ae3db",
  "clientSecret": "0d922db8-9a2f-4c66-a60d-76a762c9bb04"
}
```

#### Response Parameters

| Field                | Type         | Description                                         |
| -------------------- | ------------ | --------------------------------------------------- |
| `result.accessToken` | string (JWT) | Access token for the `Authorization` header         |
| `result.expiresIn`   | integer      | Token lifespan in seconds (e.g., `300` = 5 minutes) |
| `result.tokenType`   | string       | Token type: `Bearer`                                |
| `ok`                 | boolean      | `true` if successfully processed                    |
| `errors`             | array        | List of errors if `ok = false`                      |

#### Response Example

```json
{
  "result": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 300,
    "tokenType": "Bearer"
  },
  "ok": true
}
```

#### Token Usage

All subsequent API requests must include the header:

```
Authorization: Bearer {access_token}
```

After the `accessToken` expires, the client must request a new token by repeating the authentication call.

---

## Endpoints

### Endpoint Summary Table

| Category | Method | Path                                 | Description                      |
| -------- | ------ | ------------------------------------ | -------------------------------- |
| Auth     | POST   | `/v2/auth/token`                     | Obtain authentication token      |
| QR       | POST   | `/v2/mia/qr`                         | Create QR Code (Static, Dynamic) |
| QR       | POST   | `/v2/mia/qr/hybrid`                  | Create Hybrid QR Code            |
| QR       | POST   | `/v2/mia/qr/{qrId}/extension`        | Create extension for QR Code     |
| QR       | GET    | `/v2/mia/qr/{qrId}`                  | Get QR details by ID             |
| QR       | GET    | `/v2/mia/qr`                         | Get QR code list (with filter)   |
| QR       | GET    | `/v2/mia/qr/extension`               | Get QR extensions list           |
| QR       | POST   | `/v2/mia/qr/{qrId}/cancel`           | Cancel active QR code            |
| QR       | POST   | `/v2/mia/qr/{qrId}/extension/cancel` | Cancel active QR extension       |
| Payments | GET    | `/v2/mia/payments/{payId}`           | Get payment details by ID        |
| Payments | GET    | `/v2/mia/payments`                   | Get payment list (with filter)   |
| Payments | POST   | `/v2/mia/payments/{payId}/refund`    | Refund payment                   |
| Testing  | POST   | `/v2/mia/test-pay`                   | Simulate payment (sandbox only)  |

---

### 1. Create QR Code (Static, Dynamic)

|            |              |
| ---------- | ------------ |
| **Method** | `POST`       |
| **URL**    | `/v2/mia/qr` |
| **Auth**   | Bearer token |

#### Request Body Parameters

| Parameter     | Type              | Required         | Constraints                                            | Description                                            |
| ------------- | ----------------- | ---------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `type`        | string (enum)     | Yes              | `Static`, `Dynamic`                                    | QR code type. Static = reusable; Dynamic = single-use. |
| `expiresAt`   | string (datetime) | Dynamic only     | ISO 8601; min 1 minute, max 60 days                    | Expiration date. Required for Dynamic QR.              |
| `amountType`  | string (enum)     | Yes              | `Fixed`, `Controlled`, `Free`                          | Amount type. `Free` is Static-only.                    |
| `amount`      | number (decimal)  | Fixed/Controlled | > 0 and <= 100,000; `amountMin <= amount <= amountMax` | Fixed payment amount.                                  |
| `amountMin`   | number (decimal)  | Controlled       | > 0 and < `amountMax`                                  | Minimum allowed amount.                                |
| `amountMax`   | number (decimal)  | Controlled       | > `amountMin` and <= 100,000                           | Maximum allowed amount.                                |
| `currency`    | string (enum)     | Yes              | `MDL` (ISO 4217)                                       | Payment currency.                                      |
| `description` | string            | Yes              | Max 500 chars                                          | Order description.                                     |
| `orderId`     | string            | No               | Max 100 chars                                          | Merchant-side order identifier.                        |
| `callbackUrl` | string            | No               | Max 1000 chars; HTTPS                                  | URL for payment notifications.                         |
| `redirectUrl` | string            | No               | Max 1000 chars; HTTPS                                  | Redirect URL after payment.                            |
| `terminalId`  | string            | No               | Max 100 chars                                          | Bank-provided terminal identifier.                     |

#### Response Parameters

| Field                   | Type              | Description                         |
| ----------------------- | ----------------- | ----------------------------------- |
| `result.qrId`           | string (guid)     | Unique QR code identifier           |
| `result.extensionId`    | string (guid)     | Extension identifier                |
| `result.orderId`        | string (max 100)  | Merchant order ID                   |
| `result.type`           | string (enum)     | `Static`, `Dynamic`                 |
| `result.url`            | string (max 1000) | HTTPS QR code URL                   |
| `result.expiresAt`      | string (datetime) | Expiration timestamp (Dynamic only) |
| `ok`                    | boolean           | `true` if successfully processed    |
| `errors`                | array             | Error list if `ok = false`          |
| `errors[].errorCode`    | string            | Error code                          |
| `errors[].errorMessage` | string            | Error description                   |

---

### 2. Create Hybrid QR Code

|            |                     |
| ---------- | ------------------- |
| **Method** | `POST`              |
| **URL**    | `/v2/mia/qr/hybrid` |
| **Auth**   | Bearer token        |

#### Request Body Parameters

| Parameter    | Type          | Required | Constraints                   | Description                        |
| ------------ | ------------- | -------- | ----------------------------- | ---------------------------------- |
| `amountType` | string (enum) | Yes      | `Fixed`, `Controlled`, `Free` | Amount type.                       |
| `currency`   | string (enum) | Yes      | `MDL` (ISO 4217)              | Payment currency.                  |
| `terminalId` | string        | No       | Max 100 chars                 | Bank-provided terminal identifier. |
| `extension`  | object        | No       | See below                     | QR code extension configuration.   |

#### Extension Object Parameters

| Parameter     | Type              | Required         | Constraints                                                           | Description                     |
| ------------- | ----------------- | ---------------- | --------------------------------------------------------------------- | ------------------------------- |
| `expiresAt`   | string (datetime) | Conditionally    | ISO 8601; min 1 minute, max 60 days; expires if no payment in 30 days | Expiration date.                |
| `amount`      | number (decimal)  | Fixed/Controlled | 0-100,000; `amountMin <= amount <= amountMax`                         | Payment amount.                 |
| `amountMin`   | number (decimal)  | Controlled       | > 0 and < `amountMax`                                                 | Minimum allowed amount.         |
| `amountMax`   | number (decimal)  | Controlled       | > `amountMin` and <= 100,000                                          | Maximum allowed amount.         |
| `description` | string            | Yes              | Max 500 chars                                                         | Order description.              |
| `orderId`     | string            | No               | Max 100 chars                                                         | Merchant-side order identifier. |
| `callbackUrl` | string            | No               | Max 1000 chars; HTTPS                                                 | URL for payment notifications.  |
| `redirectUrl` | string            | No               | Max 1000 chars; HTTPS                                                 | Redirect URL after payment.     |

#### Response Parameters

| Field                   | Type              | Description                         |
| ----------------------- | ----------------- | ----------------------------------- |
| `result.qrId`           | string (guid)     | Created QR code unique identifier   |
| `result.extensionId`    | string (guid)     | QR code extension unique identifier |
| `result.url`            | string (max 1000) | HTTPS QR code URL                   |
| `ok`                    | boolean           | Processing status                   |
| `errors`                | array             | Error list if `ok = false`          |
| `errors[].errorCode`    | string            | Error code                          |
| `errors[].errorMessage` | string            | Error description                   |

---

### 3. Create Extension for QR Code by ID

Used for Hybrid QR codes to update amount, expiration, and other extension-specific fields.

|            |                               |
| ---------- | ----------------------------- |
| **Method** | `POST`                        |
| **URL**    | `/v2/mia/qr/{qrId}/extension` |
| **Auth**   | Bearer token                  |

#### Path Parameters

| Parameter | Type          | Required | Description                           |
| --------- | ------------- | -------- | ------------------------------------- |
| `qrId`    | string (guid) | Yes      | Identifier of existing Hybrid QR code |

#### Request Body Parameters

| Parameter     | Type              | Required         | Constraints                                                  | Description                     |
| ------------- | ----------------- | ---------------- | ------------------------------------------------------------ | ------------------------------- |
| `expiresAt`   | string (datetime) | Yes              | ISO 8601; min 1 minute, max 60 days                          | Extension expiration.           |
| `amount`      | number (decimal)  | Fixed/Controlled | `amountMin <= amount <= amountMax`; prohibited for Free type | Payment amount.                 |
| `amountMin`   | number (decimal)  | Controlled       | Prohibited for Fixed/Free types                              | Min amount.                     |
| `amountMax`   | number (decimal)  | Controlled       | Prohibited for Fixed/Free types                              | Max amount.                     |
| `description` | string            | Yes              | Max 500 chars                                                | Order description.              |
| `orderId`     | string            | No               | Max 100 chars                                                | Merchant-side order identifier. |
| `callbackUrl` | string            | No               | Max 1000 chars; HTTPS                                        | URL for payment notifications.  |
| `redirectUrl` | string            | No               | Max 1000 chars; HTTPS                                        | Redirect URL after payment.     |

#### Response Parameters

| Field                   | Type          | Description                         |
| ----------------------- | ------------- | ----------------------------------- |
| `result.extensionId`    | string (guid) | Identifier of the created extension |
| `ok`                    | boolean       | Processing status                   |
| `errors`                | array         | Error list if `ok = false`          |
| `errors[].errorCode`    | string        | Error code                          |
| `errors[].errorMessage` | string        | Error description                   |

---

### 4. Get QR Details by ID

|            |                     |
| ---------- | ------------------- |
| **Method** | `GET`               |
| **URL**    | `/v2/mia/qr/{qrId}` |
| **Auth**   | Bearer token        |

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `qrId`    | string (guid) | Yes      | Unique identifier of the QR code |

#### Response Parameters

| Field                | Type              | Description                                          |
| -------------------- | ----------------- | ---------------------------------------------------- |
| `result.qrId`        | string (guid)     | Unique QR code identifier                            |
| `result.extensionId` | string (guid)     | QR extension identifier                              |
| `result.orderId`     | string (max 100)  | Merchant-side order identifier                       |
| `result.status`      | string (enum)     | `Active`, `Inactive`, `Expired`, `Paid`, `Cancelled` |
| `result.type`        | string (enum)     | `Static`, `Dynamic`, `Hybrid`                        |
| `result.url`         | string (max 1000) | QR URL (HTTPS)                                       |
| `result.amountType`  | string (enum)     | `Fixed`, `Controlled`, `Free`                        |
| `result.amount`      | number (decimal)  | Fixed amount                                         |
| `result.amountMin`   | number (decimal)  | Minimum amount (Controlled)                          |
| `result.amountMax`   | number (decimal)  | Maximum amount (Controlled)                          |
| `result.currency`    | string (enum)     | `MDL` (ISO 4217)                                     |
| `result.description` | string (max 500)  | Order description                                    |
| `result.callbackUrl` | string (max 1000) | Merchant callback URL                                |
| `result.redirectUrl` | string (max 1000) | Redirect URL after payment                           |
| `result.createdAt`   | string (datetime) | QR creation timestamp (ISO 8601)                     |
| `result.updatedAt`   | string (datetime) | Last status update timestamp                         |
| `result.expiresAt`   | string (datetime) | Expiry timestamp (Dynamic/Hybrid)                    |
| `result.terminalId`  | string (max 100)  | Terminal ID from bank                                |
| `ok`                 | boolean           | Processing status                                    |
| `errors`             | array             | Error list if `ok = false`                           |

#### Request Example

```bash
curl -G "https://api.maibmerchants.md/v2/mia/qr/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer {access_token}"
```

---

### 5. Get QR Code List (with filter)

|            |              |
| ---------- | ------------ |
| **Method** | `GET`        |
| **URL**    | `/v2/mia/qr` |
| **Auth**   | Bearer token |

#### Query Parameters

| Parameter       | Type              | Required | Constraints                                                         | Default     | Description                    |
| --------------- | ----------------- | -------- | ------------------------------------------------------------------- | ----------- | ------------------------------ |
| `count`         | integer           | Yes      | Positive integer                                                    | -           | Number of results to return    |
| `offset`        | integer           | Yes      | Non-negative integer                                                | -           | Starting index for result set  |
| `sortBy`        | string (enum)     | No       | `orderId`, `type`, `amountType`, `status`, `createdAt`, `expiresAt` | `createdAt` | Sort field                     |
| `order`         | string (enum)     | No       | `asc`, `desc`                                                       | `asc`       | Sort direction                 |
| `qrId`          | string (guid)     | No       | UUID format                                                         | -           | Filter by QR identifier        |
| `extensionId`   | string (guid)     | No       | UUID format                                                         | -           | Filter by extension identifier |
| `orderId`       | string            | No       | Max 100 chars                                                       | -           | Filter by merchant order ID    |
| `type`          | string (enum)     | No       | `Static`, `Dynamic`, `Hybrid`                                       | -           | Filter by QR type              |
| `amountType`    | string (enum)     | No       | `Fixed`, `Controlled`, `Free`                                       | -           | Filter by amount type          |
| `amountFrom`    | number (decimal)  | No       | -                                                                   | -           | Minimum amount filter          |
| `amountTo`      | number (decimal)  | No       | -                                                                   | -           | Maximum amount filter          |
| `description`   | string            | No       | Max 500 chars                                                       | -           | Filter by description          |
| `status`        | string (enum)     | No       | `Active`, `Inactive`, `Expired`, `Paid`, `Cancelled`                | -           | Filter by QR status            |
| `createdAtFrom` | string (datetime) | No       | ISO 8601                                                            | -           | Created after date filter      |
| `createdAtTo`   | string (datetime) | No       | ISO 8601                                                            | -           | Created before date filter     |
| `expiresAtFrom` | string (datetime) | No       | ISO 8601                                                            | -           | Expires after date filter      |
| `expiresAtTo`   | string (datetime) | No       | ISO 8601                                                            | -           | Expires before date filter     |
| `terminalId`    | string            | No       | Max 100 chars                                                       | -           | Filter by terminal ID          |

#### Response Parameters

| Field                        | Type              | Description                      |
| ---------------------------- | ----------------- | -------------------------------- |
| `result.totalCount`          | integer           | Total number of matching records |
| `result.items`               | array             | Array of QR code objects         |
| `result.items[].qrId`        | string (guid)     | Unique QR identifier             |
| `result.items[].extensionId` | string (guid)     | Extension reference              |
| `result.items[].orderId`     | string (max 100)  | Merchant order ID                |
| `result.items[].type`        | string (enum)     | `Static`, `Dynamic`, `Hybrid`    |
| `result.items[].url`         | string (max 1000) | HTTPS QR URL                     |
| `result.items[].amountType`  | string (enum)     | `Fixed`, `Controlled`, `Free`    |
| `result.items[].amount`      | number (decimal)  | Fixed amount                     |
| `result.items[].amountMin`   | number (decimal)  | Min controlled amount            |
| `result.items[].amountMax`   | number (decimal)  | Max controlled amount            |
| `result.items[].currency`    | string (enum)     | ISO 4217 (`MDL`)                 |
| `result.items[].description` | string (max 500)  | Order description                |
| `result.items[].callbackUrl` | string (max 1000) | Callback URL                     |
| `result.items[].redirectUrl` | string (max 1000) | Redirect URL                     |
| `result.items[].status`      | string (enum)     | QR status                        |
| `result.items[].createdAt`   | string (datetime) | Creation timestamp (ISO 8601)    |
| `result.items[].updatedAt`   | string (datetime) | Last update timestamp            |
| `result.items[].expiresAt`   | string (datetime) | Expiry timestamp                 |
| `result.items[].terminalId`  | string (max 100)  | Terminal ID                      |
| `ok`                         | boolean           | Processing status                |
| `errors`                     | array             | Error list if `ok = false`       |

#### Request Example

```bash
curl -G "https://api.maibmerchants.md/v2/mia/qr" \
  -H "Authorization: Bearer {access_token}" \
  --data-urlencode "count=10" \
  --data-urlencode "offset=0" \
  --data-urlencode "amountFrom=10.00" \
  --data-urlencode "amountTo=100.00" \
  --data-urlencode "sortBy=createdAt" \
  --data-urlencode "order=desc"
```

---

### 6. Get QR Extensions List

|            |                        |
| ---------- | ---------------------- |
| **Method** | `GET`                  |
| **URL**    | `/v2/mia/qr/extension` |
| **Auth**   | Bearer token           |

> This endpoint retrieves a paginated list of QR extensions. Query parameters follow the same pattern as the QR code list endpoint (count, offset, sortBy, order, and filtering options relevant to extensions).

---

### 7. Cancel Active QR Code by ID

|            |                            |
| ---------- | -------------------------- |
| **Method** | `POST`                     |
| **URL**    | `/v2/mia/qr/{qrId}/cancel` |
| **Auth**   | Bearer token               |

Cancels a standard QR code (Static or Dynamic) that is active but has not yet been used for payment. Once cancelled, the code becomes inactive and unusable.

> **Important**: Cancelling a QR code does not affect payments already processed.

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `qrId`    | string (guid) | Yes      | Unique identifier of the QR code |

#### Request Body Parameters

| Parameter | Type   | Required | Constraints   | Description                         |
| --------- | ------ | -------- | ------------- | ----------------------------------- |
| `reason`  | string | Yes      | Max 500 chars | Reason for the cancellation request |

#### Request Example

```json
{
  "reason": "Client cancelled the order"
}
```

#### Response Parameters

| Field                   | Type          | Description                      |
| ----------------------- | ------------- | -------------------------------- |
| `result.qrId`           | string (guid) | Unique identifier of the QR code |
| `result.status`         | string (enum) | `Cancelled`                      |
| `ok`                    | boolean       | Processing status                |
| `errors`                | array         | Error list if `ok = false`       |
| `errors[].errorCode`    | string        | Error code                       |
| `errors[].errorMessage` | string        | Error description                |

#### Response Example

```json
{
  "result": {
    "qrId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "Cancelled"
  },
  "ok": true
}
```

---

### 8. Cancel Active QR Extension (Hybrid)

|            |                                      |
| ---------- | ------------------------------------ |
| **Method** | `POST`                               |
| **URL**    | `/v2/mia/qr/{qrId}/extension/cancel` |
| **Auth**   | Bearer token                         |

Cancels an active extension linked to a Hybrid QR code. Revokes the extension without fully cancelling the original QR code.

> **Important**: Cancelling a QR code does not affect payments already processed.

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `qrId`    | string (guid) | Yes      | Unique identifier of the QR code |

#### Request Body Parameters

| Parameter | Type   | Required | Constraints   | Description                           |
| --------- | ------ | -------- | ------------- | ------------------------------------- |
| `reason`  | string | No       | Max 500 chars | Reason for the extension cancellation |

#### Request Example

```json
{
  "reason": "Client cancelled the order."
}
```

#### Response Parameters

| Field                   | Type          | Description                           |
| ----------------------- | ------------- | ------------------------------------- |
| `result.extensionId`    | string (guid) | Identifier of the cancelled extension |
| `ok`                    | boolean       | Processing status                     |
| `errors`                | array         | Error list if `ok = false`            |
| `errors[].errorCode`    | string        | Error code                            |
| `errors[].errorMessage` | string        | Error description                     |

#### Response Example

```json
{
  "result": {
    "extensionId": "40e6ba44-7dff-48cc-91ec-386a38318c68"
  },
  "ok": true
}
```

---

### 9. Get Payment Details by ID

|            |                            |
| ---------- | -------------------------- |
| **Method** | `GET`                      |
| **URL**    | `/v2/mia/payments/{payId}` |
| **Auth**   | Bearer token               |

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `payId`   | string (guid) | Yes      | Unique identifier of the payment |

#### Response Parameters

| Field                | Type              | Description                                |
| -------------------- | ----------------- | ------------------------------------------ |
| `result.payId`       | string (guid)     | Unique payment ID                          |
| `result.referenceId` | string (max 15)   | RRN code from the instant payments service |
| `result.qrId`        | string (guid)     | QR code associated with the payment        |
| `result.extensionId` | string (guid)     | QR extension associated with the payment   |
| `result.orderId`     | string (max 100)  | Merchant-side order ID                     |
| `result.amount`      | number (decimal)  | Payment amount                             |
| `result.commission`  | number (decimal)  | Fee applied to the payment                 |
| `result.currency`    | string (enum)     | `MDL` (ISO 4217)                           |
| `result.description` | string (max 500)  | Order description                          |
| `result.payerName`   | string (max 200)  | Abbreviated payer name                     |
| `result.payerIban`   | string (max 100)  | Payer's IBAN                               |
| `result.status`      | string (enum)     | `Executed`, `Refunded`                     |
| `result.executedAt`  | string (datetime) | Payment execution timestamp (ISO 8601)     |
| `result.refundedAt`  | string (datetime) | Refund timestamp if applicable (ISO 8601)  |
| `result.terminalId`  | string (max 100)  | Terminal ID from bank                      |
| `ok`                 | boolean           | Processing status                          |
| `errors`             | array             | Error list if `ok = false`                 |

#### Request Example

```bash
curl -G "https://api.maibmerchants.md/v2/mia/payments/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer {access_token}"
```

#### Response Example

```json
{
  "result": {
    "payId": "123e4567-e89b-12d3-a456-426614174000",
    "referenceId": "QR000123456789",
    "qrId": "789e0123-f456-7890-a123-456789012345",
    "extensionId": "40e6ba44-7dff-48cc-91ec-386a38318c68",
    "amount": 50.0,
    "commission": 0.5,
    "currency": "MDL",
    "description": "Payment for order #123",
    "payerName": "John D.",
    "payerIban": "MD24AG00225100013104168",
    "status": "Executed",
    "executedAt": "2024-08-05T10:32:28+03:00",
    "terminalId": "P011111"
  },
  "ok": true
}
```

---

### 10. Get Payment List (with filter)

|            |                    |
| ---------- | ------------------ |
| **Method** | `GET`              |
| **URL**    | `/v2/mia/payments` |
| **Auth**   | Bearer token       |

#### Query Parameters

| Parameter        | Type              | Required | Constraints                                 | Default      | Description                    |
| ---------------- | ----------------- | -------- | ------------------------------------------- | ------------ | ------------------------------ |
| `count`          | integer           | Yes      | Positive integer                            | -            | Items per page                 |
| `offset`         | integer           | Yes      | Non-negative integer                        | -            | Pagination start index         |
| `sortBy`         | string (enum)     | No       | `orderId`, `amount`, `status`, `executedAt` | `executedAt` | Sort field                     |
| `order`          | string (enum)     | No       | `asc`, `desc`                               | `asc`        | Sort direction                 |
| `payId`          | string (guid)     | No       | UUID format                                 | -            | Payment identifier filter      |
| `referenceId`    | string            | No       | Max 15 chars                                | -            | RRN code filter                |
| `qrId`           | string (guid)     | No       | UUID format                                 | -            | QR code identifier filter      |
| `extensionId`    | string (guid)     | No       | UUID format                                 | -            | QR extension identifier filter |
| `orderId`        | string            | No       | Max 100 chars                               | -            | Merchant order ID filter       |
| `amountFrom`     | number (decimal)  | No       | Positive number                             | -            | Minimum amount (inclusive)     |
| `amountTo`       | number (decimal)  | No       | Positive number                             | -            | Maximum amount (inclusive)     |
| `description`    | string            | No       | Max 500 chars                               | -            | Description filter             |
| `payerName`      | string            | No       | Max 200 chars                               | -            | Payer name filter              |
| `payerIban`      | string            | No       | Max 200 chars                               | -            | IBAN filter                    |
| `status`         | string (enum)     | No       | `Executed`, `Refunded`                      | -            | Status filter                  |
| `executedAtFrom` | string (datetime) | No       | ISO 8601                                    | -            | Execution start date           |
| `executedAtTo`   | string (datetime) | No       | ISO 8601                                    | -            | Execution end date             |
| `terminalId`     | string            | No       | Max 100 chars                               | -            | Terminal identifier filter     |

#### Response Parameters

| Field                        | Type              | Description                    |
| ---------------------------- | ----------------- | ------------------------------ |
| `result.totalCount`          | integer           | Total matching records         |
| `result.items`               | array             | Array of payment objects       |
| `result.items[].payId`       | string (guid)     | Unique payment identifier      |
| `result.items[].referenceId` | string (max 15)   | RRN code                       |
| `result.items[].qrId`        | string (guid)     | QR identifier                  |
| `result.items[].extensionId` | string (guid)     | Extension identifier           |
| `result.items[].orderId`     | string (max 100)  | Merchant order ID              |
| `result.items[].amount`      | number (decimal)  | Payment value                  |
| `result.items[].commission`  | number (decimal)  | Fee amount                     |
| `result.items[].currency`    | string (enum)     | ISO 4217 (`MDL`)               |
| `result.items[].description` | string (max 500)  | Transaction description        |
| `result.items[].payerName`   | string (max 200)  | Abbreviated payer name         |
| `result.items[].payerIban`   | string (max 200)  | Payer IBAN                     |
| `result.items[].status`      | string (enum)     | `Executed`, `Refunded`         |
| `result.items[].executedAt`  | string (datetime) | Execution timestamp (ISO 8601) |
| `result.items[].refundedAt`  | string (datetime) | Refund timestamp (ISO 8601)    |
| `result.items[].terminalId`  | string (max 100)  | Terminal ID                    |
| `ok`                         | boolean           | Processing status              |
| `errors`                     | array             | Error list if `ok = false`     |

---

### 11. Refund Payment by ID

|            |                                   |
| ---------- | --------------------------------- |
| **Method** | `POST`                            |
| **URL**    | `/v2/mia/payments/{payId}/refund` |
| **Auth**   | Bearer token                      |

Initiates a full or partial refund for a completed payment. Refunds are irreversible.

> **Constraints**:
>
> - Auto-refund is only allowed for dynamic QRs.
> - Only direct operations can be refunded.
> - Refunds are irreversible. Once processed, the amount is automatically returned to the customer's account.

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `payId`   | string (guid) | Yes      | Unique identifier of the payment |

#### Request Body Parameters

| Parameter     | Type             | Required | Constraints               | Description                                                                                                    |
| ------------- | ---------------- | -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `amount`      | number (decimal) | No       | -                         | Refund amount. If omitted, a full refund is initiated. If provided, a partial refund for the specified amount. |
| `reason`      | string           | Yes      | Recommended max 500 chars | Reason for initiating the refund.                                                                              |
| `callbackUrl` | string (URL)     | No       | HTTPS                     | URL where the system will send a callback when the refund is accepted/processed.                               |

#### Request Example

```json
{
  "amount": 50.61,
  "reason": "Reason for payment refund.",
  "callbackUrl": "https://www.example.com"
}
```

#### Response Parameters

| Field             | Type          | Description                             |
| ----------------- | ------------- | --------------------------------------- |
| `result.refundId` | string (guid) | Unique identifier of the created refund |
| `result.status`   | string (enum) | Refund request status: `Created`        |
| `ok`              | boolean       | Processing status                       |
| `errors`          | array/null    | Error details or null                   |

#### Response Example

```json
{
  "result": {
    "refundId": "8ce09e40-2948-4225-a9c4-f277dbd587ea",
    "status": "Created"
  },
  "ok": true,
  "errors": null
}
```

---

### 12. Simulate Payment (Sandbox)

|                 |                    |
| --------------- | ------------------ |
| **Method**      | `POST`             |
| **URL**         | `/v2/mia/test-pay` |
| **Auth**        | Bearer token       |
| **Environment** | Sandbox only       |

Available exclusively in the sandbox environment for testing the payment process.

#### Request Body Parameters

| Parameter   | Type             | Required | Constraints   | Description                      |
| ----------- | ---------------- | -------- | ------------- | -------------------------------- |
| `qrId`      | string (guid)    | Yes      | -             | Unique identifier of the QR code |
| `amount`    | number (decimal) | Yes      | -             | Payment amount                   |
| `iban`      | string           | Yes      | Max 100 chars | Payer's IBAN                     |
| `currency`  | string (enum)    | Yes      | `MDL`         | Payment currency                 |
| `payerName` | string           | Yes      | Max 200 chars | Short name of the payer          |

#### Request Example

```json
{
  "qrId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 10,
  "iban": "MD88AG000000011621810140",
  "currency": "MDL",
  "payerName": "John D."
}
```

#### Response Parameters

| Field                 | Type              | Description                                          |
| --------------------- | ----------------- | ---------------------------------------------------- |
| `result.qrId`         | string (guid)     | QR code identifier                                   |
| `result.qrStatus`     | string (enum)     | `Active`, `Inactive`, `Expired`, `Paid`, `Cancelled` |
| `result.orderId`      | string (max 100)  | Merchant-side order identifier                       |
| `result.payId`        | string (guid)     | Unique payment identifier                            |
| `result.amount`       | number (decimal)  | Payment amount                                       |
| `result.commission`   | number (decimal)  | Fee charged                                          |
| `result.currency`     | string (enum)     | `MDL` (ISO 4217)                                     |
| `result.payerName`    | string (max 200)  | Abbreviated payer name                               |
| `result.payerIban`    | string (max 100)  | Payer's IBAN                                         |
| `result.executedAt`   | string (datetime) | ISO 8601 timestamp                                   |
| `result.signatureKey` | string            | Signature key for validating the notification        |
| `ok`                  | boolean           | Processing status                                    |
| `errors`              | array             | Error list if `ok = false`                           |

#### Response Example

```json
{
  "result": {
    "qrId": "123e4567-e89b-12d3-a456-426614174000",
    "qrStatus": "Active",
    "orderId": "123",
    "payId": "6d24e4a5-c6bf-4d3e-bf7a-8d2123faf4e9",
    "amount": 10,
    "commission": 2.5,
    "currency": "MDL",
    "payerName": "John D.",
    "payerIban": "MD88AG000000011621810140",
    "executedAt": "2024-11-29T10:56:52.1380956+00:00",
    "signatureKey": "592b6999-fdd0-4fd3-9708-5cb9df590dee"
  },
  "ok": true
}
```

---

## Callback Notifications

When a payment is completed, the system sends a POST request to the merchant's `callbackUrl` with the transaction details.

A notification is considered successfully received if the merchant's server responds with **HTTP status code 200 OK**. Non-200 status codes trigger notification resends.

### Callback Body Fields

| Field                | Type              | Description                             |
| -------------------- | ----------------- | --------------------------------------- |
| `result`             | object            | Transaction data container              |
| `result.qrId`        | string (guid)     | Unique QR identifier                    |
| `result.extensionId` | string (guid)     | QR extension identifier                 |
| `result.qrStatus`    | string (enum)     | `Active`, `Paid`                        |
| `result.payId`       | string (guid)     | Unique payment identifier               |
| `result.referenceId` | string (max 15)   | Instant payments service RRN            |
| `result.orderId`     | string (max 100)  | Merchant-assigned order identifier      |
| `result.amount`      | number (decimal)  | Transaction amount                      |
| `result.commission`  | number (decimal)  | Payment fee charged                     |
| `result.currency`    | string (enum)     | ISO 4217 (`MDL`)                        |
| `result.payerName`   | string (max 200)  | Abbreviated payer name                  |
| `result.payerIban`   | string (max 200)  | Payer's IBAN                            |
| `result.executedAt`  | string (datetime) | ISO 8601 timestamp                      |
| `result.terminalId`  | string (max 100)  | Bank-provided terminal identifier       |
| `signature`          | string            | Signature for data integrity validation |

### Recommendations

- Ensure callback URL is accessible from maib IP addresses
- Return HTTP 200 only after successful signature verification
- Use non-200 status codes for failures to trigger notification resends
- Validate signature before processing transaction data

---

## Signature Validation

The callback signature must be validated to ensure data integrity. The algorithm uses SHA-256 hashing with Base64 encoding.

### Step-by-step Algorithm

1. **Sort** all fields in the `result` object alphabetically (case-insensitive), **excluding** the `signature` field
2. **Exclude** fields with `null` values or empty strings
3. **Format** decimal fields (`amount`, `commission`) to exactly **2 decimal places** (e.g., `100.50`)
4. **Concatenate** the remaining values using **colon** (`:`) as separator, in sorted order
5. **Append** the **Signature Key** (from project settings / obtained during test-pay) to the concatenated string
6. **Generate** a **SHA-256 hash** in binary format
7. **Encode** the binary output using **Base64**
8. **Compare** the calculated signature against the received `signature` value

### Node.js Implementation

```javascript
const crypto = require("crypto");

function validateSignature(callbackData, signatureKey) {
  const { signature, result } = callbackData;

  // Sort keys alphabetically (case-insensitive)
  const sortedKeys = Object.keys(result).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );

  // Build values array, formatting decimals and excluding nulls/empty
  const values = [];
  for (const key of sortedKeys) {
    const value = result[key];
    if (value === null || value === undefined || value === "") continue;

    if (typeof value === "number") {
      values.push(value.toFixed(2));
    } else {
      const strValue = String(value);
      if (strValue.trim() !== "") {
        values.push(strValue);
      }
    }
  }

  // Append signature key and generate hash
  values.push(signatureKey);
  const signString = values.join(":");
  const calculatedSignature = crypto
    .createHash("sha256")
    .update(signString)
    .digest("base64");

  return calculatedSignature === signature;
}
```

---

## HTTP Status Codes

| Code    | Name                   | Description                                        | Recommended Action                                                         |
| ------- | ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| **200** | OK                     | Valid request, response returned                   | -                                                                          |
| **400** | Bad Request            | Incorrect syntax in the request                    | Verify all parameters are correct and mandatory fields are included        |
| **401** | Unauthorized           | Access token is missing, invalid, or expired       | Ensure a valid token exists and is included in the Authorization header    |
| **403** | Forbidden              | Access restricted for the IP or auth data used     | Confirm the Project is active, configured correctly, and IP is whitelisted |
| **404** | Not Found              | Requested resource was not found                   | Check endpoint URLs and resource identifiers (qrId, payId)                 |
| **405** | Method Not Allowed     | HTTP method not allowed on endpoint                | Use the correct HTTP verb (GET/POST)                                       |
| **409** | Conflict               | Data conflict (e.g., duplicate QR, invalid state)  | Review application logic to prevent duplicate or contradictory submissions |
| **415** | Unsupported Media Type | Request content format not accepted                | Set Content-Type to `application/json` with properly formatted body        |
| **422** | Unprocessable Entity   | Valid format but logically incorrect content       | Validate values comply with business rules                                 |
| **429** | Too Many Requests      | Rate limit exceeded                                | Implement retry logic with exponential backoff                             |
| **500** | Internal Server Error  | Unexpected internal error                          | Retry after delay; contact support if persistent                           |
| **503** | Service Unavailable    | API temporarily unavailable (overload/maintenance) | Retry after several minutes or check for official updates                  |

---

## API Error Codes

| Error Code | HTTP Status | Error Name                     | Message                                                                                             |
| ---------- | ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| 10000      | 500         | `maib.merchant.payments-10000` | Internal error encountered. Please try again or report if error persists.                           |
| 11000      | 401         | `maib.merchant.payments-11000` | Invalid credentials. Please check 'clientId' and 'clientSecret'.                                    |
| 12000      | -           | `maib.merchant.payments-12000` | Parameter `{{parameter}}` is invalid.                                                               |
| 12001      | -           | `maib.merchant.payments-12001` | Provided request is invalid: `{{error}}`.                                                           |
| 12002      | -           | `maib.merchant.payments-12002` | Currency `{{currency}}` is invalid.                                                                 |
| 12003      | -           | `maib.merchant.payments-12003` | Sorting options are invalid.                                                                        |
| 12004      | -           | `maib.merchant.payments-12004` | QR type `{{actualValue}}` is invalid.                                                               |
| 12005      | -           | `maib.merchant.payments-12005` | QR status `{{actualValue}}` is invalid.                                                             |
| 12006      | -           | `maib.merchant.payments-12006` | 'expiresAt' field must be in future. Provided value: `{{actualValue}}`.                             |
| 12007      | -           | `maib.merchant.payments-12007` | Please provide 'clientId' and 'clientSecret'.                                                       |
| 13000      | 404         | `maib.merchant.payments-13000` | QR `{{qrId}}` is not found.                                                                         |
| 14000      | 409         | `maib.merchant.payments-14000` | Merchant is not active.                                                                             |
| 14001      | 409         | `maib.merchant.payments-14001` | 'expiresAt' field must be in future.                                                                |
| 14002      | 409         | `maib.merchant.payments-14002` | MIA MCC is not set.                                                                                 |
| 14003      | 409         | `maib.merchant.payments-14003` | MIA payment `{{miaPaymentId}}` is not found.                                                        |
| 14004      | 409         | `maib.merchant.payments-14004` | Merchant `{{merchantId}}` has no default MIA account set.                                           |
| 14005      | 409         | `maib.merchant.payments-14005` | QR `{{qrId}}` is already cancelled.                                                                 |
| 14006      | 409         | `maib.merchant.payments-14006` | QR code type `{{type}}` is invalid.                                                                 |
| 14007      | 409         | `maib.merchant.payments-14007` | QR code with a Fixed amount type must have amount set.                                              |
| 14008      | 409         | `maib.merchant.payments-14008` | QR code with a Controlled amount type must have min or max amount set.                              |
| 14009      | 409         | `maib.merchant.payments-14009` | Account is not active.                                                                              |
| 14010      | 404         | `maib.merchant.payments-14010` | MIA payment is not found by QR id `{{qrId}}`.                                                       |
| 14011      | 404         | `maib.merchant.payments-14011` | MIA payment is not found by RRN `{{rrn}}`.                                                          |
| 14012      | 404         | `maib.merchant.payments-14012` | MIA payment is not found by MIA message id `{{miaMessageId}}`.                                      |
| 14013      | 409         | `maib.merchant.payments-14013` | Auto-refund is only allowed for dynamic QRs.                                                        |
| 14014      | 409         | `maib.merchant.payments-14014` | Only direct operations can be refunded.                                                             |
| 14015      | 409         | `maib.merchant.payments-14015` | MIA payment `{{paymentId}}` is already refunded.                                                    |
| 14016      | 404         | `maib.merchant.payments-14016` | Cannot refund MIA payment for provided amount. Available refundable amount: `{{refundableAmount}}`. |
| 14017      | 404         | `maib.merchant.payments-14017` | Cannot determine MIA commission percent for MCC `{{mcc}}`.                                          |
| 14018      | 404         | `maib.merchant.payments-14018` | Merchant not found by Account Number `{{accountNumber}}`.                                           |
| 14019      | 409         | `maib.merchant.payments-14019` | QR code's state does not allow this operation: `{{state}}`.                                         |

---

## Standard Response Envelope

All API responses follow this envelope structure:

```typescript
{
  result: T; // Response data (type varies by endpoint)
  ok: boolean; // true = success, false = error
  errors: Array<{
    // Present when ok = false
    errorCode: string;
    errorMessage: string;
  }> | null;
}
```

---

## Glossary

| Term              | Description                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| **QR MIA**        | maib's system for generating, managing, and processing payments via QR codes            |
| **Static QR**     | Fixed data QR without amount or personalization; suited for variable-value transactions |
| **Dynamic QR**    | Single-use code containing specific transaction details (amount, customer info)         |
| **Hybrid QR**     | Combines static and dynamic approaches; supports one-time and recurring payments        |
| **qrId**          | Unique UUID reference for generated QR codes used across API operations                 |
| **payId**         | Transaction identifier returned in payment responses for tracking                       |
| **extensionId**   | Identifier for a Hybrid QR code extension                                               |
| **referenceId**   | RRN (Retrieval Reference Number) code from instant payments service                     |
| **Sandbox**       | Secure testing environment where payments can be simulated without real funds           |
| **Production**    | Live transaction environment with actual funds for active merchants                     |
| **MDL**           | Moldovan Leu, the only supported currency (ISO 4217)                                    |
| **Signature Key** | Secret key used for HMAC/SHA-256 signature validation in callbacks                      |
| **Bearer Token**  | JWT access token obtained via `/v2/auth/token` for authenticating API requests          |

---

## Source Documentation URLs

- Overview: <https://docs.maibmerchants.md/mia-qr-api/en>
- General Specs: <https://docs.maibmerchants.md/mia-qr-api/en/overview/general-technical-specifications>
- QR Types: <https://docs.maibmerchants.md/mia-qr-api/en/overview/mia-qr-types>
- Endpoints: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints>
- Authentication: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/authentication>
- Create QR: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/payment-initiation/create-qr-code-static-dynamic>
- Create Hybrid QR: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/payment-initiation/create-hybrid-qr-code>
- Create Extension: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/payment-initiation/create-hybrid-qr-code/create-extension-for-qr-code-by-id>
- Cancel QR: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/payment-cancellation/cancel-active-qr-static-dynamic>
- Cancel Extension: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/payment-cancellation/cancel-active-qr-extension-hybrid>
- Refund: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/payment-refund/refund-completed-payment>
- QR Details: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/information-retrieval-get/retrieve-qr-details-by-id>
- QR List: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/information-retrieval-get/display-list-of-qr-codes-with-filtering-options>
- Payment Details: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/information-retrieval-get/retrieve-payment-details-by-id>
- Payment List: <https://docs.maibmerchants.md/mia-qr-api/en/endpoints/information-retrieval-get/retrieve-list-of-payments-with-filtering-options>
- Sandbox Simulation: <https://docs.maibmerchants.md/mia-qr-api/en/payment-simulation-sandbox>
- Callbacks: <https://docs.maibmerchants.md/mia-qr-api/en/notifications-on-callback-url>
- Signature Verification: <https://docs.maibmerchants.md/mia-qr-api/en/examples/signature-key-verification>
- API Errors: <https://docs.maibmerchants.md/mia-qr-api/en/errors/api-errors>
- HTTP Status Codes: <https://docs.maibmerchants.md/mia-qr-api/en/errors/http-status-codes>
