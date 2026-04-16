# maib Open Banking API Reference

> Source: https://ob-explorer-sandbox.maib.md / https://ob-sandbox.maib.md
> Platform: Open Bank Project (OBP) v5.1.0
> Fetched: 2026-03-30

---

## Table of Contents

- [Overview](#overview)
- [Environments](#environments)
- [API Fundamentals](#api-fundamentals)
- [Authentication](#authentication)
  - [DirectLogin](#1-directlogin)
  - [OAuth 1.0a](#2-oauth-10a)
  - [OAuth 2.0](#3-oauth-20)
- [API Categories](#api-categories)
- [Endpoints: Accounts](#accounts)
- [Endpoints: Transactions](#transactions)
- [Endpoints: Transaction Requests (Payments)](#transaction-requests-payments)
- [Endpoints: Consents](#consents)
- [Endpoints: Banks](#banks)
- [Endpoints: Customers & KYC](#customers--kyc)
- [Endpoints: Documentation & Meta](#documentation--meta)
- [Schemas](#schemas)
- [Error Handling](#error-handling)
- [SDK Showcases](#sdk-showcases)
- [Glossary](#glossary)

---

## Overview

maib joined the Open Bank Project (OBP), an open-source API framework for banks. The platform provides 550+ RESTful APIs for account access (XS2A), payments (PIS), consents (AIS), customer management, KYC, and more. It supports PSD2 compliance, third-party payment initiation, and fine-grained account access delegation.

The API Explorer at `https://ob-explorer-sandbox.maib.md` provides interactive documentation. The sandbox at `https://ob-sandbox.maib.md` is the actual API server.

---

## Environments

| Environment | API Base URL                 | Explorer URL                          |
| ----------- | ---------------------------- | ------------------------------------- |
| Sandbox     | `https://ob-sandbox.maib.md` | `https://ob-explorer-sandbox.maib.md` |

- **API Version**: OBPv5.1.0
- **Git Commit**: `1668770d1b15ba17207d974dc2fd50f8255c3f98`
- **Swagger endpoint**: `GET /obp/v1.4.0/resource-docs/OBPv5.1.0/swagger`

---

## API Fundamentals

- **Protocol**: HTTPS (avoid trailing slashes or you get 404)
- **Encoding**: UTF-8
- **Content-Type**: `application/json`
- **Authentication**: Via `Authorization` header (DirectLogin or OAuth)
- **URL Pattern**: `/obp/{version}/banks/{BANK_ID}/...`
- **Caching**: Resource docs cached with 3600s TTL

---

## Authentication

### 1. DirectLogin

Recommended for hackathons and development. A protocol where user credentials + consumer key are exchanged for a JWT token.

#### Step 1: Obtain Token

```
POST /my/logins/direct
Authorization: DirectLogin username="user", password="pass", consumer_key="yourConsumerKey"
Accept: application/json
```

**Response**: Returns a JWT token.

#### Step 2: Use Token for API Calls

```
Authorization: DirectLogin token="your_jwt_token_here"
```

**Example**:

```bash
curl -X GET https://ob-sandbox.maib.md/obp/v5.1.0/banks \
  -H 'Accept: application/json' \
  -H 'Authorization: DirectLogin token="eyJ..."'
```

### 2. OAuth 1.0a

Standard three-legged OAuth flow for production integrations. Requires consumer key/secret registration via `/consumer-registration`.

### 3. OAuth 2.0

Standard OAuth 2.0 flow. Consumer registration required.

**Registration URLs**:

- Consumer Registration: `https://ob-sandbox.maib.md/consumer-registration`
- User Registration: `https://ob-sandbox.maib.md/user_mgt/sign_up`
- User Login: `https://ob-sandbox.maib.md/user_mgt/login`

---

## API Categories

The API organizes endpoints into these tag groups:

| Category         | Tags                                                         | Description                                    |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| Accounts & Cards | `Account`, `Card`                                            | XS2A access, fine-grained permissions          |
| Branches & ATMs  | `Bank`, `Bank-Branch`, `Bank-ATM`, `Bank-Product`, `Bank-FX` | Open data on locations and products            |
| Transactions     | `Transaction`, `Transaction-Metadata`                        | History, balances, metadata                    |
| Metadata         | `Transaction-Metadata`, `Counterparty-Metadata`              | Tags, comments, images, narrative, geolocation |
| Counterparties   | `Counterparty`, `Counterparty-Metadata`                      | Payer/beneficiary details                      |
| Webhooks         | `Webhook`                                                    | Event-driven external service calls            |
| Onboarding & KYC | `Customer`, `KYC`, `Onboarding`                              | User/account creation, identity verification   |
| API Management   | `API`, `API-Role`, `API-Metrics`, `API-Documentation`        | Roles, metrics, docs                           |
| Payments         | `Transaction-Request`                                        | Payment initiation (PIS), PSD2                 |
| Consents         | `Consent`                                                    | Account Information Service (AIS), VRP         |
| Dynamic Entities | `Dynamic-Entity`                                             | Custom entity and endpoint creation            |

---

## Accounts

### Core Endpoints

| Method | Path                                                                          | Description                                                           |
| ------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/obp/v4.0.0/accounts/public`                                                 | List public accounts across all banks                                 |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts`                                        | List accounts user has access to                                      |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/accounts`                                        | Create account at bank                                                |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts-held`                                   | Get accounts held by current user                                     |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}`                           | Update account label                                                  |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/account`         | Get full account details (number, owners, type, balance, IBAN, views) |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/funds-available` | Check available funds (PSD2 PIIS)                                     |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/permissions`               | List account permissions                                              |
| POST   | `/obp/v4.0.0/account/check/scheme/iban`                                       | Validate IBAN                                                         |

### Account Applications

| Method | Path                                                    | Description               |
| ------ | ------------------------------------------------------- | ------------------------- |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/account-applications`      | List applications         |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/account-applications`      | Create application        |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/account-applications/{ID}` | Get application           |
| PUT    | `/obp/v4.0.0/banks/{BANK_ID}/account-applications/{ID}` | Update application status |

### Counterparties (on Account)

| Method | Path                                                                              | Description         |
| ------ | --------------------------------------------------------------------------------- | ------------------- |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/counterparties`      | List counterparties |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/counterparties`      | Create counterparty |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/counterparties/{ID}` | Delete counterparty |

### Other Account Endpoints

| Method   | Path                                                          | Description                                  |
| -------- | ------------------------------------------------------------- | -------------------------------------------- |
| GET      | `.../{VIEW_ID}/other_accounts`                                | List other accounts with shared transactions |
| GET      | `.../{VIEW_ID}/other_accounts/{OTHER_ACCOUNT_ID}`             | Get specific other account                   |
| GET      | `.../{VIEW_ID}/checkbook/orders`                              | Get checkbook orders                         |
| POST     | `.../{VIEW_ID}/direct-debit`                                  | Create direct debit                          |
| POST     | `.../{VIEW_ID}/standing-order`                                | Create standing order                        |
| GET/POST | `.../{VIEW_ID}/metadata/tags`                                 | Account tags (CRUD)                          |
| POST     | `.../accounts/{ACCOUNT_ID}/products/{PRODUCT_CODE}/attribute` | Create account attribute                     |

### Key Schemas

**CreateAccountRequestJsonV310**:

```json
{
  "user_id": "string",
  "label": "string",
  "product_code": "string",
  "balance": { "currency": "EUR", "amount": "0" },
  "branch_id": "string",
  "account_routing": { "scheme": "IBAN", "address": "string" }
}
```

**ModeratedAccountJSON400** (response):

- `bank_id`, `account_id`, `label`, `number`, `owners`, `type`, `balance`, `IBAN`, `views_available`

---

## Transactions

### Core Endpoints

| Method | Path                                                                                      | Description                   |
| ------ | ----------------------------------------------------------------------------------------- | ----------------------------- |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/transactions`                | List transactions (paginated) |
| GET    | `.../{VIEW_ID}/transactions/{TRANSACTION_ID}/transaction`                                 | Get single transaction        |
| GET    | `/obp/v4.0.0/my/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/transactions`                       | Get core transactions         |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/firehose/accounts/{ACCOUNT_ID}/views/{VIEW_ID}/transactions` | Firehose (bulk) access        |

**Query Parameters** (for list):

- `limit` - number of results
- `offset` - pagination offset
- `sort_direction` - ASC or DESC
- `from_date` - ISO date filter start
- `to_date` - ISO date filter end

### Transaction Metadata

Each transaction supports rich metadata via sub-endpoints under `.../{TRANSACTION_ID}/metadata/`:

| Metadata    | Methods                | Sub-path                              |
| ----------- | ---------------------- | ------------------------------------- |
| Comments    | GET, POST, DELETE      | `/comments`, `/comments/{COMMENT_ID}` |
| Images      | GET, POST, DELETE      | `/images`, `/images/{IMAGE_ID}`       |
| Narrative   | GET, POST, PUT, DELETE | `/narrative`                          |
| Tags        | GET, POST, DELETE      | `/tags`, `/tags/{TAG_ID}`             |
| Where (geo) | GET, POST, PUT, DELETE | `/where`                              |

### Transaction Attributes

| Method | Path                                                | Description      |
| ------ | --------------------------------------------------- | ---------------- |
| POST   | `.../transactions/{TRANSACTION_ID}/attribute`       | Create attribute |
| GET    | `.../transactions/{TRANSACTION_ID}/attributes`      | List attributes  |
| PUT    | `.../transactions/{TRANSACTION_ID}/attributes/{ID}` | Update attribute |

### Related Endpoints

| Method | Path                                                                                                   | Description                      |
| ------ | ------------------------------------------------------------------------------------------------------ | -------------------------------- |
| GET    | `.../{TRANSACTION_ID}/other_account`                                                                   | Get counterparty for transaction |
| GET    | `.../{TRANSACTION_ID}/double-entry-transaction`                                                        | Get double-entry view            |
| GET    | `/obp/v4.0.0/transactions/{TRANSACTION_ID}/balancing-transaction`                                      | Get balancing transaction        |
| DELETE | `/obp/v4.0.0/management/cascading/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/transactions/{TRANSACTION_ID}` | Delete with cascade              |

### Key Schemas

**TransactionJsonV300**:

- `id`, `this_account`, `other_account`, `details` (type, description, posted, completed, new_balance, value)
- `metadata` (narrative, comments, tags, images, where)

---

## Transaction Requests (Payments)

### Create Payment (SANDBOX_TAN)

```
POST /obp/v5.1.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/transaction-request-types/SANDBOX_TAN/transaction-requests
```

**Auth**: Required

**Request Body** (`TransactionRequestBodyJsonV200`):

```json
{
  "to": {
    "bank_id": "gh.29.uk",
    "account_id": "8ca8a7e4-6d02-40e3-a129-0b2bf89de9f0"
  },
  "value": {
    "currency": "EUR",
    "amount": "10.12"
  },
  "description": "Payment description (max 2000 chars)"
}
```

**Response** (`TransactionRequestWithChargeJSON210`):

```json
{
  "id": "uuid",
  "type": "SANDBOX_TAN",
  "status": "COMPLETED",
  "from": { "bank_id": "...", "account_id": "..." },
  "details": { "to": {...}, "value": {...}, "description": "..." },
  "charge": { "summary": "...", "value": { "currency": "EUR", "amount": "0.00" } },
  "challenge": { "id": "...", "allowed_attempts": 3, "challenge_type": "..." },
  "start_date": "...",
  "end_date": "...",
  "transaction_ids": ["..."]
}
```

### Transaction Request Types

The platform supports multiple payment types. Each type uses the same URL pattern:

```
POST /obp/v5.1.0/banks/{BANK_ID}/accounts/{ACCOUNT_ID}/{VIEW_ID}/transaction-request-types/{TYPE}/transaction-requests
```

| Type                  | Body Schema                                       | Description                       |
| --------------------- | ------------------------------------------------- | --------------------------------- |
| `SANDBOX_TAN`         | `TransactionRequestAccount` (bank_id, account_id) | Sandbox testing                   |
| `SEPA`                | `TransactionRequestIban` (iban)                   | SEPA by IBAN                      |
| `COUNTERPARTY`        | `TransactionRequestCounterpartyId`                | By counterparty ID                |
| `SIMPLE`              | `TransactionRequestSimple` (routing schemes)      | By routing addresses              |
| `FREE_FORM`           | Various                                           | Free-form transfer                |
| `TRANSFER_TO_PHONE`   | `TransactionRequestTransferToPhone`               | Phone-based transfer              |
| `TRANSFER_TO_ATM`     | `TransactionRequestTransferToAtm`                 | ATM withdrawal                    |
| `TRANSFER_TO_ACCOUNT` | `TransactionRequestTransferToAccount`             | Account transfer with future date |

### Business Rules

- **Challenge Threshold**: Amounts < 1000 EUR (sandbox default) process without challenge; larger amounts require SCA
- **Multi-Currency**: Sender currency must match source account; sandbox provides static FX rates across 13 major currencies
- **PSD2 Compliance**: Supports third-party payment initiation with charge transparency

### SEPA Credit Transfer Schema

```json
{
  "debtorAccount": { "iban": "..." },
  "instructedAmount": { "currency": "EUR", "amount": "10.12" },
  "creditorAccount": { "iban": "..." },
  "creditorName": "Recipient Name"
}
```

### Get Transaction Request Types

```
GET /obp/v4.0.0/banks/{BANK_ID}/transaction-request-types
```

Returns the list of supported transaction request types for a bank.

---

## Consents

### Consent Creation

| Method | Path                                               | Description                          |
| ------ | -------------------------------------------------- | ------------------------------------ |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/my/consents/EMAIL`    | Create consent (email SCA)           |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/my/consents/SMS`      | Create consent (SMS SCA)             |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/my/consents/IMPLICIT` | Create consent (implicit SCA)        |
| POST   | `/obp/v5.1.0/my/consents/IMPLICIT`                 | Create consent (implicit, all banks) |

### Consent Requests (Third-Party Flow)

| Method | Path                                                           | Description                            |
| ------ | -------------------------------------------------------------- | -------------------------------------- |
| POST   | `/obp/v5.0.0/consumer/consent-requests`                        | Create consent request                 |
| GET    | `/obp/v5.0.0/consumer/consent-requests/{ID}`                   | Get consent request                    |
| POST   | `/obp/v5.0.0/consumer/consent-requests/{ID}/EMAIL/consents`    | Create consent from request (email)    |
| POST   | `/obp/v5.0.0/consumer/consent-requests/{ID}/SMS/consents`      | Create consent from request (SMS)      |
| POST   | `/obp/v5.0.0/consumer/consent-requests/{ID}/IMPLICIT/consents` | Create consent from request (implicit) |
| GET    | `/obp/v5.0.0/consumer/consent-requests/{ID}/consents`          | Get consent by request ID              |

### VRP (Variable Recurring Payments)

| Method | Path                                        | Description                |
| ------ | ------------------------------------------- | -------------------------- |
| POST   | `/obp/v5.1.0/consumer/vrp-consent-requests` | Create VRP consent request |

### Consent Management

| Method | Path                                                                    | Description              |
| ------ | ----------------------------------------------------------------------- | ------------------------ |
| PUT    | `/obp/v4.0.0/banks/{BANK_ID}/consents/{CONSENT_ID}`                     | Update consent status    |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/consents/{CONSENT_ID}/challenge`           | Answer consent challenge |
| PUT    | `/obp/v4.0.0/banks/{BANK_ID}/consents/{CONSENT_ID}/user-update-request` | Add user to consent      |
| DELETE | `/obp/v5.1.0/banks/{BANK_ID}/consents/{CONSENT_ID}`                     | Revoke consent at bank   |
| DELETE | `/obp/v5.1.0/my/consent/current`                                        | Revoke current consent   |
| DELETE | `/obp/v5.1.0/my/consents/{CONSENT_ID}`                                  | Revoke my consent        |

### Consent Query

| Method | Path                                                 | Description                  |
| ------ | ---------------------------------------------------- | ---------------------------- |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/my/consent-infos`       | My consent info at bank      |
| GET    | `/obp/v4.0.0/my/consent-infos`                       | My consent info (all banks)  |
| GET    | `/obp/v5.1.0/banks/{BANK_ID}/my/consents`            | My consents at bank          |
| GET    | `/obp/v5.1.0/my/consents`                            | My consents (all banks)      |
| GET    | `/obp/v5.1.0/consumer/current/consents/{CONSENT_ID}` | Get consent by ID (consumer) |

### Consent Admin (Management)

| Method | Path                                                           | Description                    |
| ------ | -------------------------------------------------------------- | ------------------------------ |
| PUT    | `/obp/v5.1.0/management/banks/{BANK_ID}/consents/{CONSENT_ID}` | Update consent status          |
| PUT    | `...consents/{CONSENT_ID}/account-access`                      | Update account access          |
| PUT    | `...consents/{CONSENT_ID}/created-by-user`                     | Update created-by user         |
| GET    | `/obp/v5.1.0/management/consents`                              | List all consents (filterable) |
| GET    | `/obp/v5.1.0/management/consents/banks/{BANK_ID}`              | List consents at bank          |

### Consent Statuses

`INITIATED` | `ACCEPTED` | `REJECTED` | `REVOKED` | `EXPIRED` | `AUTHORISED`

### Consent Response Fields

- `consent_id` (UUID)
- `jwt` (signed token encoding consent details)
- `status`
- `consumer_id`, `created_by_user_id`
- `views` (account access specifications)
- `entitlements` (role-based permissions)
- `last_action_date`, `last_usage_date`

---

## Banks

| Method | Path                                                    | Description                        |
| ------ | ------------------------------------------------------- | ---------------------------------- |
| GET    | `/obp/v4.0.0/banks`                                     | List all banks (public)            |
| GET    | `/obp/v5.0.0/banks/{BANK_ID}`                           | Get bank details                   |
| POST   | `/obp/v5.1.0/banks`                                     | Create bank                        |
| PUT    | `/obp/v5.1.0/banks`                                     | Update bank                        |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/branches`                  | List branches                      |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/branches/{BRANCH_ID}`      | Get branch                         |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/attributes`                | Get bank attributes                |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/transaction-request-types` | Get supported payment types        |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/transaction-types`         | Get transaction types with charges |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/account-web-hooks`         | Create webhook                     |
| DELETE | `/obp/v4.0.0/management/cascading/banks/{BANK_ID}`      | Delete bank (cascade)              |

---

## Customers & KYC

### Customer Management

| Method | Path                                                               | Description               |
| ------ | ------------------------------------------------------------------ | ------------------------- |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/customers/{CUSTOMER_ID}`              | Get customer              |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/customers/customer-number`            | Lookup by customer number |
| POST   | `/obp/v4.0.0/banks/{BANK_ID}/search/customers/mobile-phone-number` | Search by phone           |
| GET    | `/obp/v4.0.0/banks/{BANK_ID}/firehose/customers`                   | Bulk customer access      |

### Customer Updates

| Method | Path                                          | Description            |
| ------ | --------------------------------------------- | ---------------------- |
| PUT    | `.../customers/{ID}/address`                  | Update address         |
| PUT    | `.../customers/{ID}/branch`                   | Update branch          |
| PUT    | `.../customers/{ID}/data`                     | Update misc data       |
| PUT    | `.../customers/{ID}/email`                    | Update email           |
| PUT    | `.../customers/{ID}/identity`                 | Update identity        |
| PUT    | `.../customers/{ID}/mobile-number`            | Update phone           |
| PUT    | `.../customers/{ID}/number`                   | Update customer number |
| PUT    | `.../customers/{ID}/credit-limit`             | Set credit limit       |
| PUT    | `.../customers/{ID}/credit-rating-and-source` | Update credit rating   |

### Customer Addresses & Tax

| Method | Path                                     | Description          |
| ------ | ---------------------------------------- | -------------------- |
| POST   | `.../customers/{ID}/address`             | Create address       |
| GET    | `.../customers/{ID}/addresses`           | List addresses       |
| DELETE | `.../customers/{ID}/addresses/{ADDR_ID}` | Delete address       |
| POST   | `.../customers/{ID}/tax-residence`       | Create tax residence |
| GET    | `.../customers/{ID}/tax-residences`      | List tax residences  |

### KYC

| Method | Path                                                 | Description       |
| ------ | ---------------------------------------------------- | ----------------- |
| PUT    | `.../customers/{ID}/kyc_check/{KYC_CHECK_ID}`        | Add KYC check     |
| PUT    | `.../customers/{ID}/kyc_documents/{KYC_DOCUMENT_ID}` | Add KYC document  |
| PUT    | `.../customers/{ID}/kyc_media/{KYC_MEDIA_ID}`        | Upload KYC media  |
| PUT    | `.../customers/{ID}/kyc_statuses`                    | Record KYC status |

### Customer Attributes

| Method | Path                                      | Description      |
| ------ | ----------------------------------------- | ---------------- |
| POST   | `.../customers/{ID}/attribute`            | Create attribute |
| GET    | `.../customers/{ID}/attributes`           | List attributes  |
| PUT    | `.../customers/{ID}/attributes/{ATTR_ID}` | Update attribute |
| DELETE | `.../customers/{ID}/attributes/{ATTR_ID}` | Delete attribute |

### Messages & CRM

| Method | Path                             | Description              |
| ------ | -------------------------------- | ------------------------ |
| POST   | `.../customer/{ID}/messages`     | Send message to customer |
| GET    | `.../customer/messages`          | Get my messages          |
| POST   | `.../banks/{BANK_ID}/meetings`   | Schedule meeting         |
| GET    | `.../banks/{BANK_ID}/crm-events` | Get CRM events           |

---

## Documentation & Meta

| Method | Path                                                      | Description                                     |
| ------ | --------------------------------------------------------- | ----------------------------------------------- |
| GET    | `/obp/v5.1.0/root`                                        | API info (version, host, connector, git commit) |
| GET    | `/obp/v4.0.0/api/versions`                                | List all API versions                           |
| GET    | `/obp/v1.4.0/resource-docs/{VERSION}/swagger`             | Get Swagger docs (filterable by tags)           |
| GET    | `/obp/v1.4.0/resource-docs/{VERSION}/obp`                 | Get OBP-format docs (auth required)             |
| GET    | `/obp/v1.4.0/banks/{BANK_ID}/resource-docs/{VERSION}/obp` | Bank-level dynamic docs                         |

**Swagger filtering**: Add `?tags=Account,Transaction` to filter by category.

---

## Schemas

### Common Models

**AmountOfMoneyJsonV121**:

```json
{ "currency": "EUR", "amount": "10.12" }
```

**TransactionRequestAccountJsonV140**:

```json
{ "bank_id": "string", "account_id": "string" }
```

**TransactionRequestBodyJsonV200**:

```json
{
  "to": { "bank_id": "...", "account_id": "..." },
  "value": { "currency": "EUR", "amount": "10.12" },
  "description": "string (max 2000 chars)"
}
```

**TransactionRequestWithChargeJSON210** (response):

- `id` (UUID), `type`, `status`, `from`, `details`, `charge`, `challenge`, `start_date`, `end_date`, `transaction_ids[]`

**ChallengeJsonV140**:

```json
{ "id": "string", "allowed_attempts": 3, "challenge_type": "string" }
```

### Transaction Request Body Variants

| Schema                                | Key Fields                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `TransactionRequestAccount`           | `bank_id`, `account_id`                                                                            |
| `TransactionRequestIban`              | `iban`                                                                                             |
| `TransactionRequestCounterpartyId`    | `counterparty_id`                                                                                  |
| `TransactionRequestSimple`            | routing scheme/address pairs (bank, account, branch)                                               |
| `SepaCreditTransfers`                 | `debtorAccount`, `creditorAccount`, `creditorName`, `instructedAmount`                             |
| `TransactionRequestTransferToPhone`   | `to.mobile_phone_number`, `from`, `message`, `value`                                               |
| `TransactionRequestTransferToAtm`     | `to.legal_name`, `to.date_of_birth`, `to.mobile_phone_number`, `to.kyc_document`                   |
| `TransactionRequestTransferToAccount` | `to.name`, `to.bank_code`, `to.branch_number`, `to.account_number`, `transfer_type`, `future_date` |

---

## Error Handling

Common error response:

```json
{
  "message": "OBP-20001: User not logged in. Authentication is required!"
}
```

Known error codes:

- `OBP-20001` - User not logged in
- `OBP-20017` - User lacks required role
- HTTP 400 for validation errors
- HTTP 404 for not found (also caused by trailing slashes!)

---

## SDK Showcases

Official OBP SDKs/examples available on GitHub (`OpenBankProject/` org):

| Language/Framework  | Repository                      |
| ------------------- | ------------------------------- |
| Python DirectLogin  | `Hello-OBP-DirectLogin-Python`  |
| Django OAuth        | `Hello-OBP-OAuth1.0a-Django`    |
| Node.js OAuth       | `Hello-OBP-OAuth1.0a-Node`      |
| React DirectLogin   | `Hello-OBP-DirectLogin-ReactJs` |
| Next.js             | `Hello-OBP-NextJS`              |
| Flutter DirectLogin | `Hello-OBP-Flutter-DirectLogin` |
| Spring Boot         | `Hello-OBP-SpringBoot`          |
| Android OAuth       | `Hello-OBP-OAuth1.0a-Android`   |
| PHP                 | `OBP-PHP-HelloWorld`            |
| TypeScript          | `OBP-TypeScript`                |
| Python CLI          | `OBP-CLI`                       |
| Python PyPI         | `obp-python-apiv5.1`            |
| Node-RED            | `node-red-contrib-obp`          |

---

## Glossary

| Term            | Definition                                                                |
| --------------- | ------------------------------------------------------------------------- |
| **OBP**         | Open Bank Project - open-source API framework for banks                   |
| **XS2A**        | Access to Accounts - PSD2 requirement for account information access      |
| **PIS**         | Payment Initiation Service - initiating payments on behalf of users       |
| **AIS**         | Account Information Service - accessing account data with consent         |
| **PIIS**        | Payment Instrument Issuer Service - checking fund availability            |
| **PSD2**        | Payment Services Directive 2 - EU regulation for open banking             |
| **SCA**         | Strong Customer Authentication - multi-factor auth required by PSD2       |
| **VRP**         | Variable Recurring Payments - standing consent for recurring transfers    |
| **DirectLogin** | OBP's simplified auth: credentials + consumer key exchanged for JWT       |
| **VIEW_ID**     | Access view (e.g., `owner`, `public`) that moderates visible account data |
| **Firehose**    | Bulk data access endpoints requiring special roles                        |
| **SANDBOX_TAN** | Test payment type for sandbox environment                                 |

---

## Contact & Links

- **Email**: contact@maib.md
- **OBP GitHub**: https://github.com/OpenBankProject/OBP-API
- **OBP Website**: https://openbankproject.com
- **License**: AGPL and commercial licenses (TESOBE GmbH)
