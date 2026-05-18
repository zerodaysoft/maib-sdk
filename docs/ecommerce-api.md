---
source: https://docs.maibmerchants.md/e-commerce
upstream_updated: 2026-05-19
---

# maib e-Commerce API - Complete Reference

> Source: https://docs.maibmerchants.md/e-commerce

## Table of Contents

- [Overview](#overview)
- [API Fundamentals](#api-fundamentals)
  - [Base URL and Version](#base-url-and-version)
  - [Authentication Flow](#authentication-flow)
  - [Headers](#headers)
  - [Request / Response Envelope](#request--response-envelope)
  - [Data Specifications](#data-specifications)
  - [HTTP Status Codes](#http-status-codes)
- [Endpoints](#endpoints)
  - [Generate Access Token](#generate-access-token)
  - [Direct Payment](#direct-payment)
  - [Two-Step Payment — Authorization (Hold)](#two-step-payment--authorization-hold)
  - [Two-Step Payment — Capture (Complete)](#two-step-payment--capture-complete)
  - [Refund Payment](#refund-payment)
  - [Get Payment Information](#get-payment-information)
  - [Recurring — Register Card](#recurring--register-card)
  - [Recurring — Execute Payment](#recurring--execute-payment)
  - [One-Click — Register Card](#one-click--register-card)
  - [One-Click — Execute Payment](#one-click--execute-payment)
  - [Delete a Saved Card](#delete-a-saved-card)
- [Callback Notifications](#callback-notifications)
  - [Source IPs](#source-ips)
  - [Retry Schedule](#retry-schedule)
  - [Signature Algorithm](#signature-algorithm)
  - [Signature Verification Code Examples](#signature-verification-code-examples)
- [Transaction & 3-D Secure Status](#transaction--3-d-secure-status)
- [API Errors](#api-errors)
- [Glossary](#glossary)

---

## Overview

The maib **e-Commerce API** is a card-payment gateway covering direct payments, two-step
(authorize/capture) payments, recurring payments, and one-click payments. It supports card payments
plus Apple Pay™ and Google Pay™ on the **maib ecomm checkout** page where the customer enters card
details. Each transaction flows through:

1. Merchant calls the appropriate `POST` endpoint (e.g. `/v1/pay`).
2. **maib ecomm** returns an _intermediate response_ with a transaction identifier (`payId`) and a
   redirect link (`payUrl`).
3. The merchant redirects the customer to `payUrl`.
4. The customer enters card data (or pays via Apple/Google Pay) on the **maib ecomm checkout** page.
5. maib processes the transaction; the customer is redirected to `okUrl` or `failUrl`.
6. The merchant receives a server-to-server _final response_ on `callbackUrl` containing the
   transaction status, amount, RRN, approval code, and signature.

---

## API Fundamentals

### Base URL and Version

| Environment    | Base URL                       | Version |
| -------------- | ------------------------------ | ------- |
| **Production** | `https://api.maibmerchants.md` | `v1`    |

> The e-Commerce v1 API has no public sandbox. Test access (`Project ID` / `Project Secret` /
> `Signature Key`) is granted on request to `ecom@maib.md` against the production base URL.

All endpoints follow the pattern `{base-url}/{api-version}/{point}`, e.g.
`https://api.maibmerchants.md/v1/pay`.

### Authentication Flow

OAuth-style access token authentication. Two ways to obtain a token:

1. **With Project credentials** — exchange `projectId` + `projectSecret` at
   `POST /v1/generate-token` for an Access Token.
2. **With Refresh Token** — exchange `refreshToken` at the same endpoint for a new Access Token.
   When the Refresh Token has also expired, fall back to mode (1).

The response includes:

| Field              | Type      | Description                                |
| ------------------ | --------- | ------------------------------------------ |
| `accessToken`      | `string`  | Bearer token to send on every API call.    |
| `expiresIn`        | `integer` | Access Token lifetime, in seconds.         |
| `refreshToken`     | `string`  | Refresh Token for renewing the access one. |
| `refreshExpiresIn` | `integer` | Refresh Token lifetime, in seconds.        |
| `tokenType`        | `string`  | Always `Bearer`.                           |

Every subsequent API call must include `Authorization: Bearer {accessToken}`.

### Headers

| Header          | Required for                       | Value                  |
| --------------- | ---------------------------------- | ---------------------- |
| `Authorization` | All API endpoints except the token | `Bearer {accessToken}` |
| `Content-Type`  | All endpoints with a JSON body     | `application/json`     |

**Bodyless endpoints** (`GET /v1/pay-info/{payId}`, `DELETE /v1/delete-card/{billerId}`) MUST be
sent **without** `Content-Type` and **without** a body — upstream calls this out explicitly.

### Request / Response Envelope

All responses use the same envelope:

```json
{
  "result": {
    /* operation-specific data */
  },
  "ok": true,
  "errors": [
    {
      "errorCode": "10000",
      "errorMessage": "Error description {{errorArg}}",
      "errorArgs": { "errorArg": "context value" }
    }
  ]
}
```

- On success: `ok: true`, `result` populated, `errors` absent.
- On failure: `ok: false`, `errors[]` populated, `result` absent.

### Data Specifications

| Type            | Format / Notes                                                  |
| --------------- | --------------------------------------------------------------- |
| Numeric amounts | `number(decimal)`, format `X.XX`, ≥ `1` for `/pay` and `/hold`. |
| Currency        | ISO 4217 — `MDL`, `EUR`, or `USD`.                              |
| `language`      | 2-char code — `ro`, `en`, `ru`.                                 |
| `clientIp`      | IPv4 only (see error `12019`).                                  |
| `billerExpiry`  | `MMYY` (e.g. `1229` → 31 Dec 2029, 23:59:59).                   |
| URLs            | Max 2048 chars, HTTPS recommended.                              |
| `items` array   | Max 50 entries.                                                 |
| Per-item `id`   | Max 36 chars.                                                   |
| Per-item `name` | Max 128 chars.                                                  |

### HTTP Status Codes

| Code | Meaning              | When                                                          |
| ---- | -------------------- | ------------------------------------------------------------- |
| 200  | OK                   | Successful request (envelope still inspects `ok` for errors). |
| 400  | Bad Request          | Malformed body or invalid parameter (see `errors[]`).         |
| 401  | Unauthorized         | Missing/invalid `Authorization` or expired token.             |
| 403  | Forbidden            | Caller IP not registered for the Project.                     |
| 404  | Not Found            | Unknown URL or unknown `payId` / `billerId`.                  |
| 415  | Unsupported Media    | Wrong `Content-Type` or body format.                          |
| 429  | Too Many Requests    | Rate-limit triggered.                                         |
| 500  | Internal Server Err. | Unhandled server-side condition.                              |
| 503  | Service Unavailable  | Temporary overload or maintenance.                            |

---

## Endpoints

### Endpoint Index

| Method   | URL                          | Purpose                                  |
| -------- | ---------------------------- | ---------------------------------------- |
| `POST`   | `/v1/generate-token`         | Obtain Access Token / refresh.           |
| `POST`   | `/v1/pay`                    | Direct (single-step) payment.            |
| `POST`   | `/v1/hold`                   | Two-step authorization (hold).           |
| `POST`   | `/v1/complete`               | Two-step capture (complete).             |
| `POST`   | `/v1/refund`                 | Refund a previous payment.               |
| `GET`    | `/v1/pay-info/{payId}`       | Read payment status & metadata.          |
| `POST`   | `/v1/savecard-recurring`     | Register a card for recurring payments.  |
| `POST`   | `/v1/execute-recurring`      | Charge a stored card (server-to-server). |
| `POST`   | `/v1/savecard-oneclick`      | Register a card for one-click payments.  |
| `POST`   | `/v1/execute-oneclick`       | Charge a stored card (CVV/3DS redirect). |
| `DELETE` | `/v1/delete-card/{billerId}` | Remove a stored card.                    |

### Generate Access Token

|            |                                                |
| ---------- | ---------------------------------------------- |
| **Method** | `POST`                                         |
| **URL**    | `/v1/generate-token`                           |
| **Auth**   | None (this is the authentication entry point). |

#### Request body — mode A (credentials)

| Field           | Required | Type     | Description                            |
| --------------- | -------- | -------- | -------------------------------------- |
| `projectId`     | YES      | `string` | Project ID from **maibmerchants**.     |
| `projectSecret` | YES      | `string` | Project Secret from **maibmerchants**. |

#### Request body — mode B (refresh)

| Field          | Required | Type     | Description                      |
| -------------- | -------- | -------- | -------------------------------- |
| `refreshToken` | YES      | `string` | Previously issued Refresh Token. |

#### Response — `result`

| Field              | Type      | Description                         |
| ------------------ | --------- | ----------------------------------- |
| `accessToken`      | `string`  | Access Token.                       |
| `expiresIn`        | `integer` | Access Token lifetime, in seconds.  |
| `refreshToken`     | `string`  | Refresh Token.                      |
| `refreshExpiresIn` | `integer` | Refresh Token lifetime, in seconds. |
| `tokenType`        | `string`  | `Bearer`.                           |

Example success:

```json
{
  "result": {
    "accessToken": "xxxxxx",
    "expiresIn": 300,
    "refreshToken": "xxxxxx",
    "refreshExpiresIn": 1800,
    "tokenType": "Bearer"
  },
  "ok": true
}
```

### Direct Payment

|            |              |
| ---------- | ------------ |
| **Method** | `POST`       |
| **URL**    | `/v1/pay`    |
| **Auth**   | Bearer token |

Single-step (SMS / Single Message System) payment. The customer is redirected to **maib ecomm
checkout** to enter card data; if the transaction succeeds, the amount is debited from the card.

#### Request body

| Field         | Required | Type                 | Description                                                                                                                                                                              |
| ------------- | -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amount`      | YES      | `number(decimal)` ≥1 | Transaction amount. Format `X.XX`. Example `10.25` USD = $10.25.                                                                                                                         |
| `currency`    | YES      | `string(3)`          | Transaction currency. One of `MDL`, `EUR`, `USD`.                                                                                                                                        |
| `clientIp`    | YES      | `string(15)`         | Customer IPv4 address.                                                                                                                                                                   |
| `language`    | YES      | `string(2)`          | Checkout page language. One of `ro`, `en`, `ru`.                                                                                                                                         |
| `description` | NO       | `string(124)`        | Payment description shown on the checkout page.                                                                                                                                          |
| `clientName`  | NO       | `string(128)`        | Customer name.                                                                                                                                                                           |
| `email`       | NO       | `string(40)`         | Customer email.                                                                                                                                                                          |
| `phone`       | NO       | `string(40)`         | Customer phone number.                                                                                                                                                                   |
| `orderId`     | NO       | `string(36)`         | Merchant-side order identifier.                                                                                                                                                          |
| `delivery`    | NO       | `number(decimal)`    | Shipping cost.                                                                                                                                                                           |
| `items`       | NO       | array, max 50        | Ordered products or services.                                                                                                                                                            |
| ↳ `id`        | no       | `string(36)`         | Product ID.                                                                                                                                                                              |
| ↳ `name`      | no       | `string(128)`        | Product name.                                                                                                                                                                            |
| ↳ `price`     | no       | `number(decimal)`    | Product price.                                                                                                                                                                           |
| ↳ `quantity`  | no       | `integer`            | Product quantity.                                                                                                                                                                        |
| `callbackUrl` | YES \*   | `string(2048)`       | URL where the final response is delivered. _Upstream marks this as required; in practice the API falls back to the Project's configured `Callback URL` in **maibmerchants** if omitted._ |
| `okUrl`       | YES \*   | `string(2048)`       | Redirect URL on success. (`okUrl + payId&orderId` on GET). Same fallback as `callbackUrl`.                                                                                               |
| `failUrl`     | YES \*   | `string(2048)`       | Redirect URL on failure. (`failUrl + payId&orderId` on GET). Same fallback as `callbackUrl`.                                                                                             |

#### Intermediate response — `result`

| Field     | Type     | Description                                                                                       |
| --------- | -------- | ------------------------------------------------------------------------------------------------- |
| `payId`   | `string` | Transaction identifier assigned by **maib ecomm**.                                                |
| `orderId` | `string` | Echoed merchant `orderId`.                                                                        |
| `payUrl`  | `string` | URL of the **maib ecomm checkout** page where the customer must be redirected to enter card data. |

Example:

```json
{
  "result": {
    "payId": "f16a9006-128a-46bc-8e2a-77a6ee99df75",
    "orderId": "123",
    "payUrl": "https://maib.ecommerce.md/ecomm01/ClientHandler?trans_id=rEsfhyIk8s9ypxkcS9fj/3C8FqA="
  },
  "ok": true
}
```

#### Final response — delivered to `callbackUrl`

| Field           | Type     | Description                                                          |
| --------------- | -------- | -------------------------------------------------------------------- |
| `payId`         | `string` | Transaction identifier.                                              |
| `orderId`       | `string` | Merchant `orderId`.                                                  |
| `status`        | `string` | [Transaction status](#transaction-status). `OK` on success.          |
| `statusCode`    | `string` | Transaction status code.                                             |
| `statusMessage` | `string` | Status message.                                                      |
| `threeDs`       | `string` | [3-D Secure status](#3-d-secure-status). `AUTHENTICATED` on success. |
| `rrn`           | `string` | RRN — transaction ID generated by **maib**.                          |
| `approval`      | `string` | Approval code from card-issuing bank.                                |
| `cardNumber`    | `string` | Masked card number.                                                  |
| `amount`        | `number` | Transaction amount. Format `X.XX`.                                   |
| `currency`      | `string` | Transaction currency.                                                |

The callback envelope adds a top-level `signature` (see
[Signature Algorithm](#signature-algorithm)).

### Two-Step Payment — Authorization (Hold)

|            |              |
| ---------- | ------------ |
| **Method** | `POST`       |
| **URL**    | `/v1/hold`   |
| **Auth**   | Bearer token |

Holds (blocks) the amount on the customer's card without debiting. Must be followed by either
`/v1/complete` (capture) or `/v1/refund` (release).

Request body and intermediate/final response shapes are identical to
[Direct Payment](#direct-payment), **except** `callbackUrl` / `okUrl` / `failUrl` are formally
optional (project-defaults apply). The final-response `amount` is the **hold amount**, not the
captured one.

### Two-Step Payment — Capture (Complete)

|            |                |
| ---------- | -------------- |
| **Method** | `POST`         |
| **URL**    | `/v1/complete` |
| **Auth**   | Bearer token   |

Captures (debits) a previously held authorization.

#### Request body

| Field           | Required | Type              | Description                                                                                  |
| --------------- | -------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `payId`         | YES      | `string`          | Transaction identifier returned by `/v1/hold`.                                               |
| `confirmAmount` | NO       | `number(decimal)` | Amount to debit. Must be `≤` the hold amount. If omitted, the entire hold amount is debited. |

#### Response — `result`

| Field           | Type     | Description                                 |
| --------------- | -------- | ------------------------------------------- |
| `payId`         | `string` | Transaction identifier.                     |
| `orderId`       | `string` | Echoed merchant `orderId`.                  |
| `status`        | `string` | [Transaction status](#transaction-status).  |
| `statusCode`    | `string` | Status code.                                |
| `statusMessage` | `string` | Status message.                             |
| `rrn`           | `string` | RRN.                                        |
| `approval`      | `string` | Approval code.                              |
| `cardNumber`    | `string` | Masked card number.                         |
| `confirmAmount` | `number` | Amount debited from the customer's account. |

### Refund Payment

|            |              |
| ---------- | ------------ |
| **Method** | `POST`       |
| **URL**    | `/v1/refund` |
| **Auth**   | Bearer token |

Refund (fully or partially) a previously completed payment. **A given payment can be refunded only
once.** For a second partial refund on the same payment, contact `ecom@maib.md`.

#### Request body

| Field          | Required | Type              | Description                                                                                             |
| -------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `payId`        | YES      | `string`          | Transaction identifier to refund.                                                                       |
| `refundAmount` | NO       | `number(decimal)` | Amount to refund. Must be `≤` the original amount. If omitted, the full transaction amount is refunded. |

#### Response — `result`

| Field           | Type     | Description                                                                                                        |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `payId`         | `string` | Transaction identifier.                                                                                            |
| `orderId`       | `string` | Echoed merchant `orderId`.                                                                                         |
| `status`        | `string` | `OK` — successfully refunded. `REVERSED` — the transaction was already refunded; repeated refunds are not allowed. |
| `statusCode`    | `string` | Status code.                                                                                                       |
| `statusMessage` | `string` | Status message.                                                                                                    |
| `refundAmount`  | `number` | Amount returned to the customer. Format `X.XX`.                                                                    |

### Get Payment Information

|            |                        |
| ---------- | ---------------------- |
| **Method** | `GET`                  |
| **URL**    | `/v1/pay-info/{payId}` |
| **Auth**   | Bearer token           |

> **Important:** Do not send a `Content-Type` header or a request body for this endpoint.

#### Path parameters

| Field   | Required | Type           | Description             |
| ------- | -------- | -------------- | ----------------------- |
| `payId` | YES      | `string(UUID)` | Transaction identifier. |

#### Response — `result`

| Field           | Type              | Description                                     |
| --------------- | ----------------- | ----------------------------------------------- |
| `payId`         | `string`          | Transaction identifier.                         |
| `orderId`       | `string`          | Merchant `orderId`.                             |
| `billerId`      | `string`          | Stored-card identifier (recurring / one-click). |
| `billerExpiry`  | `string(MMYY)`    | Cutoff for the stored-card data.                |
| `status`        | `string`          | [Transaction status](#transaction-status).      |
| `statusCode`    | `string`          | Status code.                                    |
| `statusMessage` | `string`          | Status message.                                 |
| `threeDs`       | `string`          | [3-D Secure status](#3-d-secure-status).        |
| `rrn`           | `string`          | RRN.                                            |
| `approval`      | `string`          | Approval code.                                  |
| `cardNumber`    | `string`          | Masked card number.                             |
| `amount`        | `number(decimal)` | Transaction amount.                             |
| `confirmAmount` | `number(decimal)` | Amount debited (two-step payments).             |
| `refundAmount`  | `number(decimal)` | Amount refunded (refunded payments).            |
| `currency`      | `string`          | Transaction currency.                           |
| `description`   | `string`          | Payment description.                            |
| `clientIp`      | `string`          | Customer IPv4.                                  |
| `clientName`    | `string`          | Customer name.                                  |
| `email`         | `string`          | Customer email.                                 |
| `phone`         | `string`          | Customer phone.                                 |
| `delivery`      | `string`          | Shipping cost.                                  |
| `items`         | array             | Ordered products (same shape as the request).   |

### Recurring — Register Card

|            |                          |
| ---------- | ------------------------ |
| **Method** | `POST`                   |
| **URL**    | `/v1/savecard-recurring` |
| **Auth**   | Bearer token             |

First-time recurring transaction. The customer enters card details on the checkout page; on success
maib returns a `billerId` for use with `/v1/execute-recurring`.

#### Request body

Same fields as [Direct Payment](#direct-payment), plus:

| Field          | Required            | Type         | Description                                                                                                                     |
| -------------- | ------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `billerExpiry` | YES                 | `string(4)`  | Cutoff date for the stored card data. Format `MMYY`. If the card itself expires earlier, the card's own expiry is used instead. |
| `email`        | **YES** (recurring) | `string(40)` | Customer email (required for recurring; optional for direct payments).                                                          |
| `amount`       | NO \*               | `number`     | If provided, the amount is charged and the card is stored. If omitted, only the card is stored (no debit).                      |

URL fields (`callbackUrl`, `okUrl`, `failUrl`) are optional (project defaults apply).

#### Final response — `result`

| Field           | Type     | Description                                                                                                           |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `payId`         | `string` | Transaction identifier.                                                                                               |
| `orderId`       | `string` | Merchant `orderId`.                                                                                                   |
| `billerId`      | `string` | Identifier of the stored card. Pass this to `/v1/execute-recurring`.                                                  |
| `billerExpiry`  | `string` | `MMYY` cutoff — may be earlier than the requested value if the card itself expires sooner.                            |
| `status`        | `string` | `OK` when `amount` was provided and the transaction succeeded; `PENDING` when `amount` was omitted (card-store only). |
| `statusCode`    | `string` | Status code.                                                                                                          |
| `statusMessage` | `string` | Status message.                                                                                                       |
| `threeDs`       | `string` | 3-D Secure result.                                                                                                    |
| `rrn`           | `string` | RRN.                                                                                                                  |
| `approval`      | `string` | Approval code.                                                                                                        |
| `cardNumber`    | `string` | Masked card number.                                                                                                   |
| `amount`        | `number` | Charged amount (`0` when card-store only).                                                                            |
| `currency`      | `string` | Transaction currency.                                                                                                 |

### Recurring — Execute Payment

|            |                         |
| ---------- | ----------------------- |
| **Method** | `POST`                  |
| **URL**    | `/v1/execute-recurring` |
| **Auth**   | Bearer token            |

Server-to-server recurring charge against a previously saved card. **No** customer redirect, **no**
3-D Secure (the card was already authenticated at registration time).

#### Request body

| Field         | Required | Type              | Description                                           |
| ------------- | -------- | ----------------- | ----------------------------------------------------- |
| `billerId`    | YES      | `string(UUID)`    | Stored-card identifier.                               |
| `amount`      | YES      | `number(decimal)` | Transaction amount. Format `X.XX`.                    |
| `currency`    | YES      | `string(3)`       | Currency. One of `MDL`, `EUR`, `USD`.                 |
| `description` | NO       | `string(124)`     | Payment description.                                  |
| `orderId`     | NO       | `string(36)`      | Merchant `orderId`.                                   |
| `delivery`    | NO       | `number(decimal)` | Shipping cost.                                        |
| `items`       | NO       | array, max 50     | Ordered products (`id`, `name`, `price`, `quantity`). |

Upstream **does not** list `clientName`, `email`, `phone`, `clientIp`, `language`, `callbackUrl`,
`okUrl`, `failUrl` for this endpoint — the merchant initiates server-side without a customer
session.

#### Response — `result`

Same shape as [Direct Payment final response](#direct-payment) plus `billerId`. No `payUrl` (no
redirect).

### One-Click — Register Card

|            |                         |
| ---------- | ----------------------- |
| **Method** | `POST`                  |
| **URL**    | `/v1/savecard-oneclick` |
| **Auth**   | Bearer token            |

Mirror of [Recurring — Register Card](#recurring--register-card), except `email` is **optional**
(the customer is authenticated on the merchant site for one-click flows). Issues a `billerId` for
later use with `/v1/execute-oneclick`.

> Upstream's documentation typos: `amount` is listed as `string(2)` and `currency` as `string(4)`.
> The runtime contract is `number(decimal)` and `string(3)` (consistent with every other endpoint).

### One-Click — Execute Payment

|            |                        |
| ---------- | ---------------------- |
| **Method** | `POST`                 |
| **URL**    | `/v1/execute-oneclick` |
| **Auth**   | Bearer token           |

Charge a one-click stored card. The customer is briefly redirected to the **maib ecomm checkout**
page to enter the CVV/CVC2 (can be skipped) and clear 3-D Secure — no card data re-entry.

#### Request body

| Field         | Required | Type              | Description                                                |
| ------------- | -------- | ----------------- | ---------------------------------------------------------- |
| `billerId`    | YES      | `string(UUID)`    | Stored-card identifier.                                    |
| `amount`      | YES      | `number(decimal)` | Transaction amount. Format `X.XX`.                         |
| `currency`    | YES      | `string(3)`       | Currency.                                                  |
| `clientIp`    | YES      | `string(15)`      | Customer IPv4 address.                                     |
| `language`    | YES      | `string(2-3)`     | Checkout page language. One of `ro`, `en`, `ru`.           |
| `description` | NO       | `string(124)`     | Payment description.                                       |
| `orderId`     | NO       | `string(36)`      | Merchant `orderId`.                                        |
| `delivery`    | NO       | `number(decimal)` | Shipping cost.                                             |
| `items`       | NO       | array, max 50     | Ordered products.                                          |
| `callbackUrl` | NO       | `string(2048)`    | Final-response URL (project default applies if omitted).   |
| `okUrl`       | NO       | `string(2048)`    | Success redirect URL (project default applies if omitted). |
| `failUrl`     | NO       | `string(2048)`    | Failure redirect URL (project default applies if omitted). |

> Upstream does **not** list `clientName`, `email`, or `phone` for this endpoint. The SDK omits them
> from `ExecuteOneclickRequest` to track the documented contract.

#### Intermediate / final response

Same shapes as [Direct Payment](#direct-payment), with the final-response payload also including
`billerId`.

### Delete a Saved Card

|            |                              |
| ---------- | ---------------------------- |
| **Method** | `DELETE`                     |
| **URL**    | `/v1/delete-card/{billerId}` |
| **Auth**   | Bearer token                 |

> **Important:** Do not send a `Content-Type` header or a request body for this endpoint.

Removes the stored card from **maib ecomm** for both recurring and one-click stored cards.

#### Path parameters

| Field      | Required | Type           | Description             |
| ---------- | -------- | -------------- | ----------------------- |
| `billerId` | YES      | `string(UUID)` | Stored-card identifier. |

#### Response — `result`

| Field      | Type           | Description                               |
| ---------- | -------------- | ----------------------------------------- |
| `billerId` | `string(UUID)` | Identifier of the card that was deleted.  |
| `status`   | `string`       | `OK` — the card was successfully deleted. |

Example:

```json
{
  "result": {
    "billerId": "t78i8006-458a-46bc-9e0a-89a6ee11df68",
    "status": "OK"
  },
  "ok": true
}
```

---

## Callback Notifications

The merchant receives final-response notifications as **HTTPS POST** requests with a JSON body on
the URL configured for the Project (or sent at request time as `callbackUrl`). The body has the
shape:

```json
{
  "result": {
    /* transaction-specific fields */
  },
  "signature": "Base64-encoded SHA-256"
}
```

### Source IPs

Allow these IPs in your firewall to receive callbacks:

```
91.250.245.70
91.250.245.71
91.250.245.142
```

### Retry Schedule

A notification is considered **delivered** when the merchant returns HTTP `200 OK`. Otherwise **maib
ecomm** retries on this schedule (seconds after the previous attempt):

```
10, 60, 300, 600, 3600, 43200, 86400
```

That is: 10 s → 1 min → 5 min → 10 min → 1 h → 12 h → 24 h. After 24 h with no `200 OK`, the
notification is dropped — merchants must reconcile via `GET /v1/pay-info/{payId}`.

### Signature Algorithm

The legacy e-Commerce signature algorithm is:

```
signature = Base64(sha256(Implode(Sort(values(result)) + SignatureKey, ':')))
```

Concretely:

1. Take every field inside the top-level `result` object.
2. Sort field **names** alphabetically (case-sensitive — this is the legacy algorithm).
3. Collect the corresponding **values** in that order.
4. Append the `Signature Key` (from the Project settings) at the end.
5. Concatenate with `:` as separator.
6. Compute `SHA-256` over the resulting string (**binary** output).
7. Encode the binary hash as **Base64** — this is the value the merchant compares to `signature`.

> The newer MIA QR and RTP products use a different algorithm (`amount`/`commission` formatted to
> two decimals, null/empty values skipped, **case-insensitive** sort). The e-Commerce API still uses
> the legacy algorithm; the `@maib/ecommerce` SDK exposes it via `EcommerceClient.verifyCallback`.

### Signature Verification Code Examples

PHP:

```php
<?php
$key = "8508706b-3454-4733-8295-56e617c4abcf"; // Signature Key from Project settings

$json = file_get_contents('php://input');
$data = json_decode($json, true);

function sortByKeyRecursive(array $a) {
    ksort($a, SORT_STRING);
    foreach ($a as $k => $v) if (is_array($v)) $a[$k] = sortByKeyRecursive($v);
    return $a;
}
function implodeRecursive($sep, $arr) {
    $out = '';
    foreach ($arr as $item) $out .= (is_array($item) ? implodeRecursive($sep, $item) : (string)$item) . $sep;
    return substr($out, 0, -1);
}

$sorted = sortByKeyRecursive($data['result']);
$sorted[] = $key;
$signString = implodeRecursive(':', $sorted);
$sign = base64_encode(hash('sha256', $signString, true));

if ($sign === $data['signature']) {
    // Valid – process the data.
}
```

Node.js (matches `EcommerceClient.verifyCallback`):

```ts
import { EcommerceClient } from "@maib/ecommerce";

const client = new EcommerceClient({
  projectId: "…",
  projectSecret: "…",
  signatureKey: "8508706b-3454-4733-8295-56e617c4abcf",
});

if (!client.verifyCallback(callbackBody)) {
  // Reject – do not fulfil the order.
}
```

---

## Transaction & 3-D Secure Status

### Transaction Status

| `status`   | Meaning                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `OK`       | Transaction was successful.                                                                                                         |
| `FAILED`   | Transaction failed.                                                                                                                 |
| `CREATED`  | Intermediate response delivered (`payId`/`payUrl`), but the customer has not yet completed payment on the checkout page.            |
| `PENDING`  | Transaction not yet completed. For `savecard-recurring`/`savecard-oneclick` without `amount`: card details saved successfully.      |
| `DECLINED` | Declined by maib ecomm.                                                                                                             |
| `TIMEOUT`  | The customer did not complete payment within 10 minutes of receiving the intermediate response.                                     |
| `REVERSED` | Refund-only status — the payment was already refunded; further refunds are not allowed. Only returned on `POST /v1/refund` results. |

### 3-D Secure Status

| `threeDs`           | Meaning                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `AUTHENTICATED`     | 3DS completed and cardholder identity verified.                                      |
| `NOT_AUTHENTICATED` | 3DS not completed or identity not verified.                                          |
| `UNAVAILABLE`       | 3DS service unavailable; authentication could not start.                             |
| `ATTEMPTED`         | Authentication attempted but could not be completed (e.g. technical issue mid-flow). |
| `REJECTED`          | Card issuer rejected authentication. Contact the issuer.                             |
| `SKIPPED`           | Authentication skipped based on dynamic 3-D Secure rules.                            |
| `NOTPARTICIPATED`   | Card issuer has not enrolled the card in 3-D Secure.                                 |

---

## API Errors

Error envelope:

```json
{
  "errors": [
    {
      "errorCode": "12001",
      "errorMessage": "Parameter 'amount' is invalid",
      "errorArgs": { "parameter": "amount" }
    }
  ],
  "ok": false
}
```

| Code  | Message                                                                                       | HTTP |
| ----- | --------------------------------------------------------------------------------------------- | ---- |
| 10000 | Internal error encountered. Please try again or report if error persists                      | 500  |
| 11001 | Invalid credentials. Please check `projectId` and `projectSecret`                             | 401  |
| 11002 | Please provide `projectId` and `projectSecret` or `refreshToken`                              | 401  |
| 11101 | Unregistered Project IP: `{{ip}}`                                                             | 403  |
| 12001 | Parameter `{{parameter}}` is invalid                                                          | 400  |
| 12002 | Provided request is invalid: `{{error}}`                                                      | 400  |
| 12004 | Parameter `language` must have `{{length}}` characters                                        | 400  |
| 12005 | Parameter `currency` is invalid. Possible values: `{{values}}`                                | 400  |
| 12006 | Parameter `phone` must not exceed `{{maxLength}}` characters                                  | 400  |
| 12007 | Parameter `email` must not exceed `{{maxLength}}` characters                                  | 400  |
| 12008 | Parameter `email` has invalid format                                                          | 400  |
| 12011 | Parameter `payId` is required                                                                 | 400  |
| 12012 | Parameter `confirmAmount` must be in range `{{minValue}}`…`{{maxValue}}`                      | 400  |
| 12013 | Parameter `confirmAmount` must have no more than `{{maxScale}}` decimal places                | 400  |
| 12014 | Parameter `amount` must be in range `{{minValue}}`…`{{maxValue}}`                             | 400  |
| 12015 | Parameter `amount` must have no more than `{{maxScale}}` decimal places                       | 400  |
| 12016 | Parameter `delivery` must be in range `{{minValue}}`…`{{maxValue}}`                           | 400  |
| 12017 | Parameter `delivery` must have no more than `{{maxScale}}` decimal places                     | 400  |
| 12018 | Parameter `clientIp` is required                                                              | 400  |
| 12019 | Parameter `clientIp` has invalid format. Only IPv4 is allowed                                 | 400  |
| 12020 | Parameter `description` must not exceed `{{maxLength}}` characters                            | 400  |
| 12021 | Parameter `clientName` must not exceed `{{maxLength}}` characters                             | 400  |
| 12022 | Parameter `okUrl` has invalid format                                                          | 400  |
| 13023 | Parameter `failUrl` has invalid format                                                        | 400  |
| 12024 | Parameter `callbackUrl` has invalid format                                                    | 400  |
| 12025 | Parameter `orderId` must not exceed `{{maxLength}}` characters                                | 400  |
| 12026 | `items` array must not exceed `{{maxCount}}` elements                                         | 400  |
| 12028 | Parameter `refundAmount` must be in range `{{minValue}}`…`{{maxValue}}`                       | 400  |
| 12029 | Parameter `refundAmount` must have no more than `{{maxScale}}` decimal places                 | 400  |
| 12032 | Parameter `billerId` is required                                                              | 400  |
| 12033 | Parameter `billerExpiry` is required                                                          | 400  |
| 12034 | Parameter `billerExpiry` has invalid format. Valid format is `MMYY`                           | 400  |
| 12035 | Parameter `billerExpiry` must contain current or future date. Current date: `{{currentDate}}` | 400  |
| 12036 | Parameter `items[{{itemIndex}}].id` must not exceed `{{maxLength}}` characters                | 400  |
| 12037 | Parameter `items[{{itemIndex}}].name` must not exceed `{{maxLength}}` characters              | 400  |
| 12038 | Parameter `items[{{itemIndex}}].price` must be in range `{{minValue}}`…`{{maxValue}}`         | 400  |
| 12039 | Parameter `items[{{itemIndex}}].price` must have no more than `{{maxScale}}` decimals         | 400  |
| 12040 | Parameter `items[{{itemIndex}}].quantity` must be more than zero                              | 400  |
| 12041 | Please provide `projectId` and `projectSecret` or `refreshToken`                              | 400  |
| 13002 | Payment ID `{{paymentId}}` not found                                                          | 404  |
| 13003 | Biller ID `{{billerId}}` not found                                                            | 404  |
| 13004 | Confirm amount cannot be greater than `{{amount}}`                                            | 409  |
| 13101 | Processing error: `{{processingError}}`                                                       | 409  |
| 13102 | Refund amount cannot be greater than `{{amount}}`                                             | 409  |
| 13103 | Refund amount cannot be greater than `{{confirmAmount}}`                                      | 409  |
| 13106 | Payment does not require completion                                                           | 409  |
| 13107 | OK URL is not set                                                                             | 409  |
| 13108 | FAIL URL is not set                                                                           | 409  |
| 13109 | CALLBACK URL is not set                                                                       | 409  |
| 13110 | Partial refund is not supported for payments in Hold status                                   | 409  |
| 13111 | Biller ID `{{billerId}}` is inactive                                                          | 409  |
| 13112 | Biller ID `{{billerId}}` is not allowed for this payment type                                 | 409  |
| 13113 | `{{paymentType}}` in `{{currency}}` is not allowed for this Project                           | 409  |
| 13114 | Refund is not possible for payment with a zero amount                                         | 409  |
| 13115 | Complete is supported only for payments in Hold status                                        | 409  |
| 13116 | Payment is already refunded                                                                   | 409  |
| 13117 | Refund is not allowed for payment in `{{statusPay}}` status                                   | 409  |

---

## Glossary

- **maibmerchants** — merchant portal where Project configuration, signature keys, and refunds are
  managed (https://maibmerchants.md).
- **maib ecomm** — the system processing e-commerce transactions.
- **maib ecomm checkout** — hosted payment page where the customer enters card data or pays via
  Apple Pay / Google Pay.
- **Project** — configuration entity in maibmerchants (Domain, IP, Platform, Callback URL, Ok URL,
  Fail URL).
- **Project Secret** — paired with `projectId` to obtain Access Tokens.
- **Signature Key** — shared secret used to verify callback signatures.
- **Intermediate response** — initial server-to-server response with `payId` and `payUrl`.
- **Final response** — callback notification with the final transaction status.
