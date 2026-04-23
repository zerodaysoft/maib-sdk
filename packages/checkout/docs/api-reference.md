---
source: https://docs.maibmerchants.md/checkout
upstream_updated: 2026-04-23
---

# maib e-Commerce Checkout API - Complete Reference

> Source: https://docs.maibmerchants.md/checkout

## Table of Contents

- [Overview](#overview)
- [API Fundamentals](#api-fundamentals)
  - [Base URLs](#base-urls)
  - [Authentication](#authentication)
  - [Headers and Content Type](#headers-and-content-type)
  - [Request/Response Format](#requestresponse-format)
  - [Data Specifications](#data-specifications)
  - [HTTP Status Codes](#http-status-codes)
- [Endpoints](#endpoints)
  - [Obtain Authentication Token](#obtain-authentication-token)
  - [Register a New Hosted Checkout Session](#register-a-new-hosted-checkout-session)
  - [Cancel a Checkout Session](#cancel-a-checkout-session)
  - [Get Checkout Details](#get-checkout-details)
  - [Retrieve All Checkouts](#retrieve-all-checkouts)
  - [Get Payment by ID](#get-payment-by-id)
  - [Retrieve All Payments by Filter](#retrieve-all-payments-by-filter)
  - [Refund a Payment](#refund-a-payment)
  - [Retrieve Refund Details](#retrieve-refund-details)
- [Callback Notifications](#callback-notifications)
  - [Browser Redirect Parameters](#browser-redirect-parameters)
  - [Back Channel Callbacks](#back-channel-callbacks)
  - [Callback Payload Fields](#callback-payload-fields)
  - [Signature Verification](#signature-verification)
  - [Signature Verification Code Examples](#signature-verification-code-examples)
- [API Errors](#api-errors)
- [Sandbox Simulation Environment](#sandbox-simulation-environment)
- [Glossary](#glossary)
- [SDKs and Plugins](#sdks-and-plugins)
- [API Tools and Resources](#api-tools-and-resources)

---

## Overview

maib's hosted checkout solution handles the complete payment workflow, supporting multiple payment methods within their secure infrastructure.

Key capabilities:

- Session creation and management
- Payment method selection
- Transaction processing
- Payment confirmation/cancellation
- Checkout detail retrieval
- Payment status verification

---

## API Fundamentals

### Base URLs

| Environment        | Base URL                           |
| ------------------ | ---------------------------------- |
| **Production**     | `https://api.maibmerchants.md`     |
| **Sandbox (Test)** | `https://sandbox.maibmerchants.md` |

### Authentication

The API uses **OAuth 2.0 Client Credentials Flow**.

1. Submit a POST request to `/v2/auth/token` with `clientId` and `clientSecret`
2. Receive a JWT `accessToken` with expiry (`expiresIn` in seconds, e.g. 300 = 5 minutes)
3. Include the token in every request header:
   ```
   Authorization: {tokenType} {access_token}
   ```
4. After the token expires, obtain a new one by repeating step 1

If the token is missing, expired, or invalid, the API returns `401 Unauthorized`.

### Headers and Content Type

- All communication requires **HTTPS**
- Content-Type: `application/json`
- Request and response payloads are exchanged in JSON format

### Request/Response Format

All responses include a top-level structure:

```json
{
  "result": { ... },
  "ok": true,
  "errors": null
}
```

- `ok` (boolean) - indicates success
- `errors` (array | null) - contains error objects with `errorCode`, `errorMessage`, and optional `errorArgs`

Always validate both the HTTP status code and the `ok` flag in the JSON response.

### Data Specifications

- **Datetime fields:** ISO 8601 format with timezone offset (e.g. `2029-10-22T10:32:28+03:00`)
- **Currency:** MDL (Moldovan Leu) per ISO 4217 standard

### HTTP Status Codes

| Code    | Error                  | Description                                                               |
| ------- | ---------------------- | ------------------------------------------------------------------------- |
| **200** | OK                     | Valid request; `ok` flag is `true`                                        |
| **400** | Bad Request            | The request cannot be processed due to incorrect syntax or missing fields |
| **401** | Unauthorized           | The access token is missing, invalid, or expired                          |
| **403** | Forbidden              | Access is denied for this IP or authentication data                       |
| **404** | Not Found              | The requested resource does not exist                                     |
| **405** | Method Not Allowed     | The HTTP method (GET, POST, etc.) is not allowed for this endpoint        |
| **409** | Conflict               | A conflict occurred (e.g., duplicate data or invalid state transition)    |
| **415** | Unsupported Media Type | The request body format is invalid                                        |
| **422** | Unprocessable Entity   | The request format is valid, but data content is logically inconsistent   |
| **429** | Too Many Requests      | Too many requests were sent in a short time                               |
| **500** | Internal Server Error  | An unexpected system error occurred                                       |
| **503** | Service Unavailable    | The service is temporarily unavailable due to overload or maintenance     |

---

## Endpoints

### Obtain Authentication Token

**`POST /v2/auth/token`**

Obtain an Access Token required to authorize all subsequent API requests.

#### Request Body

| Parameter      | Type   | Required | Description                               |
| -------------- | ------ | -------- | ----------------------------------------- |
| `clientId`     | string | Yes      | Client code provided by maib              |
| `clientSecret` | string | Yes      | The client's secret key, provided by maib |

#### Example Request

```json
{
  "clientId": "749c564f-1a65-48e3-a4bf-b7932b6ae3db",
  "clientSecret": "0d922db8-9a2f-4c66-a60d-76a762c9bb04"
}
```

#### Response Fields

| Field                | Type          | Description                                             |
| -------------------- | ------------- | ------------------------------------------------------- |
| `result.accessToken` | string        | JWT access token to be used in the Authorization header |
| `result.expiresIn`   | integer       | Token lifespan in seconds (e.g. 300 = 5 minutes)        |
| `result.tokenType`   | string        | Token type (`Bearer`)                                   |
| `ok`                 | boolean       | `true` if request was successfully processed            |
| `errors`             | array \| null | List of errors if `ok` = false                          |

#### Example Response

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

---

### Register a New Hosted Checkout Session

**`POST /v2/checkouts`**

Registers a new hosted checkout session and returns its unique identifier.

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Request Body - Top-Level Parameters

| Parameter     | Type   | Required | Description                                                      |
| ------------- | ------ | -------- | ---------------------------------------------------------------- |
| `amount`      | number | **Yes**  | Total amount to be charged, in major currency units              |
| `currency`    | string | **Yes**  | ISO 4217 currency code (e.g. `MDL`)                              |
| `orderInfo`   | object | Optional | Order details including ID, description, date, amounts and items |
| `payerInfo`   | object | Optional | Information about the payer (name, contact, IP, user agent)      |
| `language`    | string | Optional | Preferred language for the checkout interface (`ro`, `ru`, `en`) |
| `callbackUrl` | string | Optional | URL to which payment status will be sent after processing        |
| `successUrl`  | string | Optional | Redirect URL after successful payment                            |
| `failUrl`     | string | Optional | Redirect URL after failed or cancelled payment                   |

#### Request Body - `orderInfo` Object

| Field              | Type               | Required | Description                         |
| ------------------ | ------------------ | -------- | ----------------------------------- |
| `id`               | string             | Optional | Merchant's order identifier         |
| `description`      | string             | Optional | Description or purpose of the order |
| `date`             | string (date-time) | Optional | Order creation timestamp (ISO 8601) |
| `orderAmount`      | number             | Optional | Order subtotal (without delivery)   |
| `orderCurrency`    | string             | Optional | Currency for the order amount       |
| `deliveryAmount`   | number             | Optional | Delivery amount                     |
| `deliveryCurrency` | string             | Optional | Currency for the delivery amount    |
| `items`            | array              | Optional | List of order items                 |

#### Request Body - `orderInfo.items[]` Object

| Field          | Type    | Required | Description                         |
| -------------- | ------- | -------- | ----------------------------------- |
| `externalId`   | string  | Optional | External product identifier (SKU)   |
| `title`        | string  | Optional | Product name or title               |
| `amount`       | number  | Optional | Item price, in major currency units |
| `currency`     | string  | Optional | ISO 4217 code of the item currency  |
| `quantity`     | integer | Optional | Number of items ordered             |
| `displayOrder` | integer | Optional | Optional display order index        |

#### Request Body - `payerInfo` Object

| Field       | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `name`      | string | Optional | Payer full name                         |
| `email`     | string | Optional | Payer email address                     |
| `phone`     | string | Optional | Payer phone number (E.164 format)       |
| `ip`        | string | Optional | IP address of the payer                 |
| `userAgent` | string | Optional | User agent string of the payer's device |

#### Example Request

```json
{
  "amount": 50.61,
  "currency": "MDL",
  "orderInfo": {
    "id": "EK123123BV",
    "description": "Order description",
    "date": "2025-11-03T09:28:40.814748+00:00",
    "orderAmount": null,
    "orderCurrency": null,
    "deliveryAmount": null,
    "deliveryCurrency": null,
    "items": [
      {
        "externalId": "243345345",
        "title": "Product1",
        "amount": 50.61,
        "currency": "MDL",
        "quantity": 3,
        "displayOrder": null
      },
      {
        "externalId": "54353453",
        "title": "Product2",
        "amount": 50.61,
        "currency": "MDL",
        "quantity": 2,
        "displayOrder": null
      }
    ]
  },
  "payerInfo": {
    "name": "John D.",
    "email": "test@gmail.com",
    "phone": "+37377382716",
    "ip": "192.168.172.22",
    "userAgent": "Mozilla/5.0"
  },
  "language": "ro",
  "callbackUrl": "https://example.com/path",
  "successUrl": "https://example.com/path",
  "failUrl": "https://example.com/path"
}
```

#### Response Fields

| Field                | Type          | Description                                           |
| -------------------- | ------------- | ----------------------------------------------------- |
| `result.checkoutId`  | string (UUID) | Unique identifier of the created checkout session     |
| `result.checkoutUrl` | string        | URL to redirect the payer to the hosted checkout page |
| `ok`                 | boolean       | Indicates successful request execution                |
| `errors`             | array \| null | List of validation or processing errors, if any       |

#### Example Response

```json
{
  "result": {
    "checkoutId": "f6d0812a-50ee-47ec-bb3f-d3b3a4dda40d",
    "checkoutUrl": "https://example.com/path"
  },
  "ok": true,
  "errors": null
}
```

**Note:** The checkout is created in `WaitingForInit` status.

---

### Cancel a Checkout Session

**`POST /v2/checkouts/{id}/cancel`**

Cancels a checkout session that has not yet been completed, moving it to a `Cancelled` state that cannot be resumed.

#### Path Parameters

| Parameter | Type          | Required | Description         |
| --------- | ------------- | -------- | ------------------- |
| `id`      | string (UUID) | Yes      | Checkout session ID |

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Response Fields

| Field               | Type          | Description                       |
| ------------------- | ------------- | --------------------------------- |
| `result.checkoutId` | string (UUID) | The UUID of the cancelled session |
| `result.status`     | string        | Always returns `Cancelled`        |
| `ok`                | boolean       | Confirms successful execution     |
| `errors`            | array \| null | Validation or processing issues   |

#### Example Response

```json
{
  "result": {
    "checkoutId": "5d526a22-9354-4721-99da-fa58fb53216e",
    "status": "Cancelled"
  },
  "ok": true,
  "errors": null
}
```

**Important:** Cancellation is only possible if the checkout is not already in a terminal state (`Completed`, `Expired`, `Abandoned`, `Failed`, `Cancelled`).

---

### Get Checkout Details

**`GET /v2/checkouts/{id}`**

Returns aggregated details of a specific checkout session, including order, payer, and transaction information.

#### Path Parameters

| Parameter | Type          | Required | Description                        |
| --------- | ------------- | -------- | ---------------------------------- |
| `id`      | string (UUID) | Yes      | Identifier of the checkout session |

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Checkout Status Values

`WaitingForInit`, `Initialized`, `PaymentMethodSelected`, `Completed`, `Expired`, `Abandoned`, `Cancelled`, `Failed`

#### Response Fields - Root

| Field    | Type          | Description                            |
| -------- | ------------- | -------------------------------------- |
| `result` | object        | Operation result container             |
| `ok`     | boolean       | Indicates successful request execution |
| `errors` | array \| null | List of validation/processing errors   |

#### Response Fields - `result` (Checkout Object)

| Field         | Type                       | Description                        |
| ------------- | -------------------------- | ---------------------------------- |
| `id`          | string (UUID)              | Checkout identifier                |
| `createdAt`   | string (date-time)         | Creation timestamp (ISO 8601)      |
| `status`      | string                     | Checkout status (see values above) |
| `amount`      | number                     | Checkout amount in major units     |
| `currency`    | string                     | ISO 4217 currency code             |
| `callbackUrl` | string                     | Callback URL                       |
| `successUrl`  | string                     | Success redirect URL               |
| `failUrl`     | string                     | Fail redirect URL                  |
| `language`    | string                     | Language (`ro`, `ru`, `en`)        |
| `url`         | string                     | Checkout session URL               |
| `expiresAt`   | string (date-time)         | Expiration timestamp               |
| `completedAt` | string (date-time) \| null | Completion timestamp               |
| `failedAt`    | string (date-time) \| null | Failure timestamp                  |
| `cancelledAt` | string (date-time) \| null | Cancellation timestamp             |
| `order`       | object \| null             | Order summary                      |
| `payer`       | object \| null             | Payer information                  |
| `payment`     | object \| null             | Payment summary                    |

#### Response Fields - `result.order`

| Field              | Type                       | Description                 |
| ------------------ | -------------------------- | --------------------------- |
| `id`               | string \| null             | Merchant's order identifier |
| `description`      | string \| null             | Order description           |
| `amount`           | number \| null             | Order amount in major units |
| `currency`         | string \| null             | ISO 4217 currency code      |
| `deliveryAmount`   | number \| null             | Delivery amount             |
| `deliveryCurrency` | string \| null             | ISO 4217 currency code      |
| `date`             | string (date-time) \| null | Order date                  |
| `orderItems`       | array \| null              | List of order items         |

#### Response Fields - `result.order.orderItems[]`

| Field          | Type            | Description                        |
| -------------- | --------------- | ---------------------------------- |
| `externalId`   | string \| null  | External product identifier (SKU)  |
| `title`        | string \| null  | Product name or title              |
| `amount`       | number \| null  | Item price in major currency units |
| `currency`     | string \| null  | ISO 4217 currency code             |
| `quantity`     | number \| null  | Number of items ordered            |
| `displayOrder` | integer \| null | Display order index                |

#### Response Fields - `result.payer`

| Field       | Type           | Description                |
| ----------- | -------------- | -------------------------- |
| `name`      | string \| null | Payer full name            |
| `email`     | string \| null | Payer email address        |
| `phone`     | string \| null | Payer phone number (E.164) |
| `ip`        | string \| null | IP address of payer        |
| `userAgent` | string \| null | User agent string          |

#### Response Fields - `result.payment`

| Field                   | Type                       | Description                                |
| ----------------------- | -------------------------- | ------------------------------------------ |
| `paymentId`             | string (UUID)              | Payment identifier                         |
| `executedAt`            | string (date-time)         | Execution timestamp                        |
| `status`                | string                     | Payment status (e.g. `Executed`, `Failed`) |
| `amount`                | number                     | Payment amount                             |
| `currency`              | string                     | ISO 4217 currency code                     |
| `type`                  | string                     | Payment type (e.g. `MIA`, `MMC`)           |
| `providerType`          | string                     | Provider type (e.g. `QR`, `MMC`)           |
| `senderName`            | string \| null             | Sender name                                |
| `senderIban`            | string \| null             | Sender IBAN                                |
| `recipientIban`         | string \| null             | Recipient IBAN                             |
| `referenceNumber`       | string                     | Payment reference number                   |
| `mcc`                   | string                     | Merchant Category Code                     |
| `orderId`               | string \| null             | Order identifier                           |
| `terminalId`            | string \| null             | Terminal identifier                        |
| `refundedAmount`        | number                     | Refunded amount                            |
| `paymentMethod`         | string \| null             | Payment method (e.g. `Card`, `MiaQr`)      |
| `approvalCode`          | string \| null             | Provider approval code                     |
| `requestedRefundAmount` | number                     | Requested refund amount                    |
| `firstRefundedAt`       | string (date-time) \| null | First refund timestamp                     |
| `lastRefundedAt`        | string (date-time) \| null | Last refund timestamp                      |
| `note`                  | string \| null             | Free-form note                             |

#### Example Response

```json
{
  "result": {
    "id": "37193a81-a24f-4336-9f0e-5a2f544e0e8c",
    "createdAt": "2026-02-05T16:47:44.049+00:00",
    "status": "Completed",
    "amount": 3.0,
    "callbackUrl": "https://example.com/callback",
    "successUrl": "https://example.com/ok",
    "failUrl": "https://example.com/fail",
    "currency": "MDL",
    "language": "ro",
    "url": "https://checkout.maib.md/37193a81a24f43369f0e5a2f544e0e8c",
    "order": {
      "id": "some-order-id",
      "description": "My awesome order",
      "amount": 2.0,
      "currency": "MDL",
      "deliveryAmount": 1.0,
      "deliveryCurrency": "MDL",
      "date": "2026-01-01T00:00:00+00:00",
      "orderItems": [
        {
          "externalId": "item-2",
          "title": "Cookies",
          "amount": 1.0,
          "currency": "MDL",
          "quantity": 1.0,
          "displayOrder": 1
        },
        {
          "externalId": "item-1",
          "title": "Tea",
          "amount": 1.0,
          "currency": "MDL",
          "quantity": 1.0,
          "displayOrder": 0
        }
      ]
    },
    "payer": {
      "name": "John Doe",
      "email": "test@test.com",
      "phone": "+37311122333",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
    },
    "completedAt": "2026-02-05T16:47:52.765+00:00",
    "expiresAt": "2026-02-05T17:12:44.057+00:00",
    "payment": {
      "paymentId": "373827c5-6644-4ee3-a241-60de7c7af116",
      "executedAt": "2026-02-05T16:47:52.522+00:00",
      "status": "Executed",
      "amount": 3.0,
      "currency": "MDL",
      "type": "MMC",
      "providerType": "MMC",
      "referenceNumber": "603616098154",
      "mcc": "4511",
      "orderId": "some-order-id",
      "terminalId": "01E12345",
      "refundedAmount": 0.0,
      "paymentMethod": "Card",
      "approvalCode": "929776",
      "requestedRefundAmount": 0.0
    }
  },
  "ok": true,
  "errors": null
}
```

---

### Retrieve All Checkouts

**`GET /v2/checkouts`**

Returns a paginated list of checkout sessions with filtering capabilities.

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Query Parameters (All Optional)

| Parameter         | Type               | Description                                                                                                                                     |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | string (UUID)      | Match specific checkout                                                                                                                         |
| `orderId`         | string             | Filter by merchant order ID                                                                                                                     |
| `status`          | string             | Filter by checkout state (`WaitingForInit`, `Initialized`, `PaymentMethodSelected`, `Completed`, `Expired`, `Abandoned`, `Cancelled`, `Failed`) |
| `minAmount`       | number             | Minimum amount (inclusive)                                                                                                                      |
| `maxAmount`       | number             | Maximum amount (inclusive)                                                                                                                      |
| `currency`        | string             | ISO 4217 currency code                                                                                                                          |
| `language`        | string             | Checkout language (`ro`, `ru`, `en`)                                                                                                            |
| `payerName`       | string             | Filter by payer name                                                                                                                            |
| `payerEmail`      | string             | Filter by payer email                                                                                                                           |
| `payerPhone`      | string             | Filter by payer phone                                                                                                                           |
| `payerIp`         | string             | Filter by payer IP                                                                                                                              |
| `createdAtFrom`   | string (date-time) | Creation date range start                                                                                                                       |
| `createdAtTo`     | string (date-time) | Creation date range end                                                                                                                         |
| `expiresAtFrom`   | string (date-time) | Expiration date range start                                                                                                                     |
| `expiresAtTo`     | string (date-time) | Expiration date range end                                                                                                                       |
| `cancelledAtFrom` | string (date-time) | Cancellation date range start                                                                                                                   |
| `cancelledAtTo`   | string (date-time) | Cancellation date range end                                                                                                                     |
| `failedAtFrom`    | string (date-time) | Failure date range start                                                                                                                        |
| `failedAtTo`      | string (date-time) | Failure date range end                                                                                                                          |
| `completedAtFrom` | string (date-time) | Completion date range start                                                                                                                     |
| `completedAtTo`   | string (date-time) | Completion date range end                                                                                                                       |
| `count`           | integer            | Items per page                                                                                                                                  |
| `offset`          | integer            | Pagination offset                                                                                                                               |
| `sortBy`          | string             | Sort field (`createdAt`, `amount`)                                                                                                              |
| `order`           | string             | Sort direction (`asc`, `desc`)                                                                                                                  |

#### Example Request

```
GET /v2/checkouts?status=Completed&currency=MDL&count=10&offset=0&sortBy=createdAt&order=desc
```

#### Response Structure

| Field               | Type          | Description                                                                 |
| ------------------- | ------------- | --------------------------------------------------------------------------- |
| `result.items`      | array         | Array of checkout objects (same structure as Get Checkout Details `result`) |
| `result.count`      | integer       | Number of items returned                                                    |
| `result.totalCount` | integer       | Total number of matching items                                              |
| `ok`                | boolean       | Success indicator                                                           |
| `errors`            | array \| null | Error list                                                                  |

Each item in `result.items[]` contains the full checkout object including `order`, `payer`, and `payment` sub-objects (see [Get Checkout Details](#get-checkout-details) for field details).

---

### Get Payment by ID

**`GET /v2/payments/{id}`**

Retrieves details of a specific payment.

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `id`      | string (UUID) | Yes      | Unique identifier of the payment |

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Payment Status Values

`Executed`, `PartiallyRefunded`, `Refunded`, `Failed`

#### Response Fields - `result`

| Field                    | Type              | Description                                           |
| ------------------------ | ----------------- | ----------------------------------------------------- |
| `paymentId`              | string (UUID)     | Executed payment identifier                           |
| `paymentIntentId`        | string \| null    | Related payment intent ID                             |
| `executedAt`             | string (ISO 8601) | Payment execution timestamp                           |
| `status`                 | string            | `Executed`, `PartiallyRefunded`, `Refunded`, `Failed` |
| `amount`                 | number            | Payment value                                         |
| `currency`               | string            | ISO 4217 currency code                                |
| `type`                   | string            | Payment type (e.g. `MIA`, `MMC`)                      |
| `providerType`           | string            | Channel used (e.g. `QR`, `MMC`)                       |
| `senderName`             | string \| null    | Payer name                                            |
| `senderIban`             | string \| null    | Payer IBAN                                            |
| `recipientIban`          | string \| null    | Payee IBAN                                            |
| `referenceNumber`        | string            | Payment reference                                     |
| `mcc`                    | string            | Merchant Category Code                                |
| `orderId`                | string            | Merchant order ID                                     |
| `terminalId`             | string            | Terminal identifier                                   |
| `refundedAmount`         | number            | Total refunded                                        |
| `requestedRefundAmount`  | number            | Current refund request total                          |
| `firstRefundedAt`        | string \| null    | First refund timestamp                                |
| `lastRefundedAt`         | string \| null    | Most recent refund timestamp                          |
| `note`                   | string \| null    | Optional payment note                                 |
| `paymentMethod`          | string \| null    | Method used (e.g. `Card`, `MiaQr`)                    |
| `approvalCode`           | string \| null    | Transaction approval code                             |
| `isRefundable`           | boolean           | Refund eligibility                                    |
| `partialRefundAvailable` | boolean           | Partial refund capability                             |
| `paymentEntryPoint`      | string            | Entry point (`Checkout`, `API`, `PayByLink`, `Pos`)   |
| `refundableAmount`       | number            | Available refund amount                               |

#### Example Response

```json
{
  "result": {
    "paymentId": "a975d5c3-9b5c-4497-affa-b615cbbb43f2",
    "paymentIntentId": "d5c5e7ff-6ecc-4d56-9953-5f14cb0a9181",
    "executedAt": "2026-02-06T17:32:36.4267896+00:00",
    "status": "Executed",
    "amount": 3.0,
    "currency": "MDL",
    "type": "MMC",
    "providerType": "MMC",
    "referenceNumber": "603717100749",
    "mcc": "NONE",
    "orderId": "some-order-id",
    "terminalId": "0149587",
    "refundedAmount": 0.0,
    "requestedRefundAmount": 0.0,
    "isRefundable": true,
    "partialRefundAvailable": true,
    "paymentEntryPoint": "Checkout",
    "refundableAmount": 3.0
  },
  "ok": true
}
```

---

### Retrieve All Payments by Filter

**`GET /v2/payments`**

Retrieve payments with filtering, pagination, and sorting.

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Query Parameters (All Optional)

**Filtering:**

| Parameter         | Type              | Description                                           |
| ----------------- | ----------------- | ----------------------------------------------------- |
| `paymentId`       | string (UUID)     | Filter by specific payment identifier                 |
| `paymentIntentId` | string (UUID)     | Filter by payment intent                              |
| `terminalId`      | string            | Identifier of the terminal that initiated the payment |
| `amountFrom`      | number            | Minimum payment amount (inclusive)                    |
| `amountTo`        | number            | Maximum payment amount (inclusive)                    |
| `currency`        | string            | Currency code (ISO 4217)                              |
| `orderId`         | string            | Merchant order identifier                             |
| `note`            | string            | Filter by note content                                |
| `status`          | string            | Payment status (e.g. `Executed`)                      |
| `executedAtFrom`  | string (ISO 8601) | Start of execution date interval (inclusive)          |
| `executedAtTo`    | string (ISO 8601) | End of execution date interval (inclusive)            |
| `recipientIban`   | string            | IBAN of payment recipient                             |
| `referenceNumber` | string            | Reference number assigned to the payment              |
| `senderIban`      | string            | IBAN of payment sender                                |
| `senderName`      | string            | Name of payment sender                                |
| `providerType`    | string            | Provider channel (e.g. `QR`)                          |
| `mcc`             | string            | Merchant Category Code                                |
| `type`            | string            | Payment type (e.g. `MIA`)                             |

**Pagination & Sorting:**

| Parameter | Type            | Description                      |
| --------- | --------------- | -------------------------------- |
| `count`   | integer (int32) | Number of records per page       |
| `offset`  | integer (int32) | Number of records to skip        |
| `sortBy`  | string          | Field name for sorting           |
| `order`   | string          | Sort direction (`asc` or `desc`) |

#### Response Structure

| Field               | Type          | Description              |
| ------------------- | ------------- | ------------------------ |
| `result.items`      | array         | Array of payment objects |
| `result.totalCount` | integer       | Total matching records   |
| `ok`                | boolean       | Success indicator        |
| `errors`            | array \| null | Error list               |

Each item in `result.items[]` contains the same fields as [Get Payment by ID](#get-payment-by-id).

#### Example Response

```json
{
  "result": {
    "items": [
      {
        "paymentIntentId": "9783b6f8-1173-440c-b387-8d18938c972a",
        "isRefundable": true,
        "partialRefundAvailable": true,
        "paymentEntryPoint": "Checkout",
        "refundableAmount": 1.0,
        "paymentId": "265b0bb5-d484-40f2-8e84-6cfa88d15e9e",
        "executedAt": "2025-12-01T09:36:59.8654854+00:00",
        "status": "Executed",
        "amount": 1.0,
        "currency": "MDL",
        "type": "MMC",
        "providerType": "MMC",
        "referenceNumber": "533509726066",
        "mcc": "NONE",
        "orderId": "ORD-1764581774756",
        "terminalId": "0149587",
        "refundedAmount": 0.0,
        "requestedRefundAmount": 0.0
      }
    ],
    "totalCount": 8
  },
  "ok": true
}
```

---

### Refund a Payment

**`POST /v2/payments/{payId}/refund`**

Process a refund for a completed payment.

#### Path Parameters

| Parameter | Type          | Required | Description                      |
| --------- | ------------- | -------- | -------------------------------- |
| `payId`   | string (UUID) | Yes      | Unique identifier of the payment |

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Request Body

| Parameter | Type                   | Required | Description                           |
| --------- | ---------------------- | -------- | ------------------------------------- |
| `amount`  | number                 | **Yes**  | Refund amount in major currency units |
| `reason`  | string (max 500 chars) | **Yes**  | Explanation for the refund            |

#### Example Request

```json
{
  "amount": 50.61,
  "reason": "Client returned the product"
}
```

#### Response Fields

| Field             | Type          | Description                      |
| ----------------- | ------------- | -------------------------------- |
| `result.refundId` | string (UUID) | Unique identifier for the refund |
| `result.status`   | string        | Refund status (`Created`)        |
| `ok`              | boolean       | Request success indicator        |
| `errors`          | array \| null | Processing/validation issues     |

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

---

### Retrieve Refund Details

**`GET /v2/payments/refunds/{id}`**

Retrieve the details of a previously created refund.

#### Path Parameters

| Parameter | Type          | Required | Description              |
| --------- | ------------- | -------- | ------------------------ |
| `id`      | string (UUID) | Yes      | Unique refund identifier |

#### Required Headers

```
Authorization: {tokenType} {access_token}
Content-Type: application/json
```

#### Response Fields

| Field                 | Type               | Description                                                  |
| --------------------- | ------------------ | ------------------------------------------------------------ |
| `result.id`           | string (UUID)      | Unique refund identifier                                     |
| `result.paymentId`    | string (UUID)      | Identifier of the payment for which the refund was initiated |
| `result.refundType`   | string             | `Full` or `Partial`                                          |
| `result.amount`       | number             | Refund monetary value                                        |
| `result.currency`     | string             | Currency code                                                |
| `result.refundReason` | string             | Reason provided for refund                                   |
| `result.executedAt`   | string (date-time) | Date and time when the refund was created or processed       |
| `result.status`       | string             | Current processing state (see below)                         |
| `ok`                  | boolean            | Success indicator                                            |
| `errors`              | array \| null      | Issues encountered                                           |

#### Refund Status Values

| Status      | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `Created`   | Refund was successfully created                              |
| `Requested` | Refund request was sent for processing                       |
| `Accepted`  | Refund was successfully completed                            |
| `Rejected`  | Refund was rejected                                          |
| `Manual`    | Refund could not be processed automatically; contact support |

#### Example Request

```
GET /v2/payments/refunds/eaed443e-988f-4b59-89da-e76501977fab
```

---

## Callback Notifications

### Browser Redirect Parameters

After checkout completion, users are redirected to `successUrl` or `failUrl` with three query parameters:

| Parameter        | Description                |
| ---------------- | -------------------------- |
| `checkoutId`     | Checkout session ID        |
| `checkoutStatus` | `Completed` or `Failed`    |
| `orderId`        | Merchant's order reference |

### Back Channel Callbacks

Successful payments trigger server-to-server notifications to the merchant's `callbackUrl`, including a `signature` parameter for data authenticity verification.

### Callback Payload Fields

| Field                      | Type                      | Description                                            |
| -------------------------- | ------------------------- | ------------------------------------------------------ |
| `checkoutId`               | string (UUID)             | Unique identifier of the checkout                      |
| `terminalId`               | string \| null            | Merchant terminal identifier                           |
| `amount`                   | number                    | Total checkout amount                                  |
| `currency`                 | string (ISO 4217)         | Checkout currency                                      |
| `completedAt`              | string (date-time)        | Timestamp when checkout completed (ISO 8601-1:2019)    |
| `payerName`                | string \| null            | Payer's name                                           |
| `payerEmail`               | string \| null            | Payer's email address                                  |
| `payerPhone`               | string \| null            | Payer's phone number (MSISDN)                          |
| `payerIp`                  | string \| null            | Payer's IP address (IPv4/IPv6)                         |
| `orderId`                  | string \| null            | Merchant's order identifier                            |
| `orderDescription`         | string \| null            | Description of the purchased goods or services         |
| `orderDeliveryAmount`      | number \| null            | Delivery amount, if specified                          |
| `orderDeliveryCurrency`    | string (ISO 4217) \| null | Delivery currency                                      |
| `paymentId`                | string (UUID)             | Unique identifier of the payment                       |
| `paymentAmount`            | number                    | Payment amount                                         |
| `paymentCurrency`          | string (ISO 4217)         | Payment currency                                       |
| `paymentStatus`            | string                    | Status (e.g. `Executed`, `Failed`)                     |
| `paymentExecutedAt`        | string (date-time)        | Timestamp of payment execution (ISO 8601-1:2019)       |
| `senderIban`               | string \| null            | Sender's IBAN (for A2A payments)                       |
| `senderName`               | string                    | Name of the sender (cardholder/account holder)         |
| `senderCardNumber`         | string \| null            | Masked card number used in the transaction             |
| `retrievalReferenceNumber` | string                    | Retrieval Reference Number (RRN/ARN)                   |
| `processingStatus`         | string \| null            | Internal payment processing status                     |
| `processingStatusCode`     | string \| null            | Provider/internal status code (e.g. `00`)              |
| `approvalCode`             | string \| null            | Provider approval code                                 |
| `threeDsResult`            | string \| null            | 3-D Secure authentication result (`Y`, `N`, `U`, etc.) |
| `threeDsReason`            | string \| null            | Additional information on the 3DS result               |
| `paymentMethod`            | string \| null            | Payment method used (e.g. `Card`, `MiaQr`)             |

### Signature Verification

#### Algorithm

```
signature = HMAC_SHA256(secretKey, rawBody.timestamp)
```

Where:

- **secretKey** - merchant's shared authentication key (UUID format)
- **rawBody** - exact bytes of JSON body as transmitted (UTF-8 encoded, compact format, no pretty-printing)
- **timestamp** - callback timestamp from `X-Signature-Timestamp` header

Encode the resulting binary hash as lowercase hex or **Base64**. All parties must use a consistent encoding format.

#### HTTP Headers

| Header                  | Format                      | Description             |
| ----------------------- | --------------------------- | ----------------------- |
| `X-Signature`           | `sha256=<base64_signature>` | Computed HMAC signature |
| `X-Signature-Timestamp` | Unix epoch (milliseconds)   | Callback timestamp      |

#### Verification Steps

1. Extract the signature from `X-Signature` header (remove `sha256=` prefix)
2. Retrieve timestamp from `X-Signature-Timestamp` header
3. Concatenate raw JSON body with timestamp using a dot separator: `{body}.{timestamp}`
4. Compute HMAC-SHA256 hash using the shared secret key
5. Encode result as Base64
6. Compare computed signature against received signature using **constant-time comparison** (to prevent timing attacks)
7. Validate timestamp freshness - absolute difference from current time must be less than N minutes

#### Canonicalization

- JSON is serialized compactly (no pretty-printing or spaces)
- Keys and values appear exactly as transmitted
- Future RFC 8785 JSON Canonicalization Scheme adoption possible

### Signature Verification Code Examples

#### Test Data

- **Secret Key:** `4cde378d-43b6-405f-94aa-55c010d4d42a`
- **Expected Signature:** `sha256=yu2OvBe3Gyq1Nz/4R6KO8F3KpGCuW7VhH9yUPhYtNRU=`
- **Timestamp:** `1762181943494`

#### Node.js

```javascript
import crypto from "crypto";

const jsonMessage = "[CALLBACK MESSAGE]";

const headers = {
  "X-Signature": "sha256=yu2OvBe3Gyq1Nz/4R6KO8F3KpGCuW7VhH9yUPhYtNRU=",
  "X-Signature-Timestamp": "1762181943494",
};

const signatureHeader = headers["X-Signature"];
const signature = signatureHeader.substring("sha256=".length);
const timestamp = headers["X-Signature-Timestamp"];

const signatureKey = "4cde378d-43b6-405f-94aa-55c010d4d42a";

const message = `${jsonMessage}.${timestamp}`;

const hmac = crypto.createHmac("sha256", signatureKey);
hmac.update(message, "utf8");
const computedSignature = hmac.digest("base64");

if (
  crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature))
) {
  console.log("Signature is valid");
} else {
  console.log("INVALID SIGNATURE!");
}
```

#### PHP

```php
<?php
$jsonMessage = '[CALLBACK MESSAGE]';

$headers = [
    'X-Signature' => 'sha256=yu2OvBe3Gyq1Nz/4R6KO8F3KpGCuW7VhH9yUPhYtNRU=',
    'X-Signature-Timestamp' => '1762181943494'
];

$signatureHeader = $headers['X-Signature'];
$signature = substr($signatureHeader, strlen('sha256='));
$timestamp = $headers['X-Signature-Timestamp'];

$signatureKey = '4cde378d-43b6-405f-94aa-55c010d4d42a';

$message = $jsonMessage . '.' . $timestamp;

$computedHash = hash_hmac('sha256', $message, $signatureKey, true);

$result = base64_encode($computedHash);

if (hash_equals($result, $signature)) {
    echo "Signature is valid\n";
} else {
    echo "INVALID SIGNATURE!\n";
}
?>
```

#### .NET (C#)

```csharp
using System.Security.Cryptography;
using System.Text;

var jsonMessage = "[CALLBACK MESSAGE]";

var headers = new Dictionary<string, string>()
{
    { "X-Signature", $"sha256=yu2OvBe3Gyq1Nz/4R6KO8F3KpGCuW7VhH9yUPhYtNRU="},
    { "X-Signature-Timestamp", "1762181943494" }
};

var signature = headers.GetValueOrDefault("X-Signature")!["sha256=".Length..];

var signatureKey = "4cde378d-43b6-405f-94aa-55c010d4d42a";

var unixTimeMilliseconds = headers.GetValueOrDefault("X-Signature-Timestamp");

string message = $"{jsonMessage}.{unixTimeMilliseconds}";

using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signatureKey));

var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));

var result = Convert.ToBase64String(hash);

if (result.Equals(signature))
    Console.WriteLine("Signature is valid");
else
    Console.WriteLine("INVALID SIGNATURE!");
```

---

## API Errors

### Error Response Format

All errors follow a JSON structure with `errorCode`, `errorMessage`, and optional `errorArgs` for context.

### Error Catalog

| Error Code                     | Message                                                        | HTTP Status | Handling                           |
| ------------------------------ | -------------------------------------------------------------- | ----------- | ---------------------------------- |
| `maib.merchant.payments-42000` | The selected currency is invalid. Please review and try again. | 400         | Verify currency parameter          |
| `maib.merchant.payments-42001` | Amount must be greater than zero.                              | 400         | Check amount is positive           |
| `maib.merchant.payments-42002` | Amount must be greater than or equal to zero.                  | 400         | Validate amount value              |
| `maib.merchant.payments-42003` | Quantity must be greater than zero.                            | 400         | Ensure quantity exceeds zero       |
| `maib.merchant.payments-42004` | Language is not supported. Supported: RO, RU, EN.              | 400         | Use supported language codes       |
| `maib.merchant.payments-42005` | Field has invalid format.                                      | 400         | Review all request parameters      |
| `maib.merchant.payments-42006` | A required field is missing.                                   | 400         | Verify all required fields present |
| `maib.merchant.payments-42007` | The pagination options are invalid.                            | 400         | Correct pagination parameters      |
| `maib.merchant.payments-43000` | The specified merchant does not exist.                         | 404         | Verify merchant credentials        |
| `maib.merchant.payments-43001` | The specified checkout does not exist or has expired.          | 404         | Recreate or refresh checkout       |
| `maib.merchant.payments-44000` | This merchant is not currently active. Contact support.        | 409         | Contact support team               |
| `maib.merchant.payments-44001` | No payment methods available for this checkout.                | 409         | Check status and retry             |
| `maib.merchant.payments-44002` | Current status doesn't permit this operation.                  | 409         | Verify checkout state              |
| `maib.merchant.payments-44003` | The payment profile is misconfigured. Contact support.         | 409         | Contact support                    |
| `common.error-1`               | An unexpected error occurred. Please try again later.          | 500         | Retry or contact support           |

### Reporting Requirements

When reporting errors to maib support, include: HTTP status, errorCode, errorMessage, timestamp, and integration details (Project ID, Merchant name, application/website info).

---

## Sandbox Simulation Environment

### MIA QR Testing

When testing MIA QR payments in sandbox, the payment is **not completed automatically** after the QR is displayed. Manual simulation is required.

#### Test Credentials

**Test Card:**
| Field | Value |
|-------|-------|
| Cardholder Name | Test Test |
| Card Number | `5102180060101124` |
| Expiration | `06/28` |
| CVV | `760` |

**Test IBAN (for MIA QR sandbox simulation):**

```
MD88AG000000011621810140
```

#### MIA QR Testing Procedure

1. **QR Generation:** Start a checkout payment and select MIA QR as the payment method. The transaction enters a pending state without executing actual payments.
2. **QR Identifier Retrieval:** Call the endpoint to list generated QR codes, then identify the most recent one by creation timestamp and extract its `qrId`.
3. **Payment Simulation:** Using the retrieved `qrId`, simulate the payment according to the sandbox simulation documentation with the test IBAN.

---

## Glossary

| Term               | Definition                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Checkout**       | A payment session created by the merchant to collect money for an order. Includes order, payer, and payment data representing the full payment process. |
| **Merchant**       | A registered business entity authorized to accept payments through maib's acquiring system.                                                             |
| **Terminal**       | The merchant's point of sale or integration endpoint through which transactions are processed.                                                          |
| **Order**          | The purchase or service request initiated by the customer and represented in the checkout process.                                                      |
| **Payer**          | The customer who performs the payment using one of the available payment methods.                                                                       |
| **Payment Method** | The channel used to make a payment (e.g., MIA QR, Card, Apple Pay, A2A).                                                                                |
| **Refund**         | The process of returning funds for a completed payment due to a cancellation or return.                                                                 |
| **Callback**       | A system notification sent by maib to the merchant's server containing the final payment result.                                                        |
| **Sandbox**        | The testing environment that simulates transactions without real payments.                                                                              |
| **Status**         | Indicates the current state of the payment or checkout (`Created`, `WaitingForPayment`, `Completed`, `Cancelled`, `Refunded`).                          |
| **Signature**      | A digital verification hash confirming the authenticity of callback notifications.                                                                      |

---

## SDKs and Plugins

### Official SDKs

| Language | Repository                                                    |
| -------- | ------------------------------------------------------------- |
| PHP      | https://github.com/maib-ecomm/maib-checkout-sdk-php           |
| .NET     | https://github.com/maib-ecomm/maib-checkout-api-dotnet-client |

---

## API Tools and Resources

### OpenAPI Specifications

OpenAPI files represent the official API contract: endpoints, schemas, parameters, validation rules, and example payloads. Available as a Checkout OpenAPI specification file from the documentation site.

### Postman Assets

1. **Checkout API Collection** - Pre-built requests for all Checkout API endpoints, ready for import into Postman
2. **Sandbox Environment** - Environment file with placeholder variables (`clientId`, `clientSecret`, etc.) for local configuration
