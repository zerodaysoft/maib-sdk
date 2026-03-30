# @maib/ecommerce

TypeScript SDK for the [maib e-Commerce payment gateway](https://docs.maibmerchants.md/e-commerce) — direct payments, two-step (hold/complete), recurring, and one-click card payments.

## Install

```bash
npm install @maib/ecommerce
```

Or use the umbrella package [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants):

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { EcommerceClient, Currency, Language } from "@maib/ecommerce";

const client = new EcommerceClient({
  projectId: process.env.MAIB_PROJECT_ID!,
  projectSecret: process.env.MAIB_PROJECT_SECRET!,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!, // for callback verification
});
```

> **Note:** The e-commerce API uses `projectId`/`projectSecret` instead of `clientId`/`clientSecret`.

### Direct payment

```typescript
const result = await client.pay({
  amount: 100,
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
  description: "Order #123",
  callbackUrl: "https://example.com/callback",
  okUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
});

// Redirect the user to result.payUrl
```

### Two-step payment (hold & complete)

```typescript
// Step 1: Hold funds
const hold = await client.hold({
  amount: 200,
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});

// Step 2: Complete (capture) — optionally with a lower amount
const completed = await client.complete({
  payId: hold.payId,
  confirmAmount: 150,
});
```

### Refund

```typescript
const refund = await client.refund({
  payId: "pay-123",
  refundAmount: 50,
});
```

### Get payment info

```typescript
const info = await client.getPayInfo("pay-123");
```

### Recurring payments

```typescript
// Step 1: Save card for recurring
const savecard = await client.savecardRecurring({
  billerExpiry: "2027-12-31",
  email: "customer@example.com",
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});
// Redirect user to savecard.payUrl to enter card details

// Step 2: Execute recurring charge (no user interaction)
const recurring = await client.executeRecurring({
  billerId: "biller-123",
  amount: 50,
  currency: Currency.MDL,
});
```

### One-click payments

```typescript
// Step 1: Save card for one-click
const savecard = await client.savecardOneclick({
  billerExpiry: "2027-12-31",
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});

// Step 2: Execute one-click payment (user confirms)
const oneclick = await client.executeOneclick({
  billerId: "biller-123",
  amount: 75,
  currency: Currency.MDL,
  clientIp: "127.0.0.1",
  language: Language.RO,
});

// Delete saved card
await client.deleteCard("biller-123");
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(callbackPayload);
// callbackPayload = { result: { ... }, signature: "..." }
```

## Enums

```typescript
import { Currency, TransactionStatus, ThreeDsStatus } from "@maib/ecommerce";

Currency.MDL              // "MDL"
Currency.EUR              // "EUR"
Currency.USD              // "USD"

TransactionStatus.OK      // "OK"
TransactionStatus.FAILED  // "FAILED"
TransactionStatus.PENDING // "PENDING"

ThreeDsStatus.AUTHENTICATED     // "AUTHENTICATED"
ThreeDsStatus.NOT_AUTHENTICATED // "NOT_AUTHENTICATED"
```

## License

[MIT](../../LICENSE)
