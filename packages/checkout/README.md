# @maib/checkout

TypeScript SDK for the [maib Checkout API](https://docs.maibmerchants.md/checkout) — hosted checkout sessions, payments, and refunds.

## Install

```bash
npm install @maib/checkout
```

Or use the umbrella package [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants):

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { CheckoutClient, Currency } from "@maib/checkout";

const client = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!, // for callback verification
});
```

### Create a checkout session

```typescript
const session = await client.createSession({
  amount: 100,
  currency: Currency.MDL,
  callbackUrl: "https://example.com/callback",
  successUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
  orderInfo: {
    id: "order-123",
    description: "Test order",
  },
  payerInfo: {
    name: "John Doe",
    email: "john@example.com",
  },
});

// Redirect the user to session.checkoutUrl
```

### Get session details

```typescript
const details = await client.getSession(session.checkoutId);
```

### List sessions

```typescript
const { items, totalCount } = await client.listSessions({
  count: 20,
  offset: 0,
  status: CheckoutStatus.COMPLETED,
});
```

### Cancel a session

```typescript
await client.cancelSession(session.checkoutId);
```

### Payments

```typescript
// Get a single payment
const payment = await client.getPayment(paymentId);

// List payments with filters
const { items } = await client.listPayments({
  count: 20,
  offset: 0,
  currency: Currency.MDL,
});
```

### Refund a payment

```typescript
const refund = await client.refund(paymentId, {
  amount: 50,
  reason: "Customer request",
});

// Get refund details
const refundDetails = await client.getRefund(refund.refundId);
```

### Sandbox testing

```typescript
import { CheckoutClient, Environment } from "@maib/checkout";

const client = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  environment: Environment.SANDBOX,
});
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(
  rawBody,
  xSignatureHeader,
  xTimestampHeader,
);
```

## Enums

```typescript
import { CheckoutStatus, PaymentStatus, RefundStatus } from "@maib/checkout";

CheckoutStatus.COMPLETED; // "Completed"
CheckoutStatus.EXPIRED; // "Expired"
CheckoutStatus.CANCELLED; // "Cancelled"

PaymentStatus.EXECUTED; // "Executed"
PaymentStatus.REFUNDED; // "Refunded"

RefundStatus.ACCEPTED; // "Accepted"
RefundStatus.REJECTED; // "Rejected"
```

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) — Complete TypeScript API surface (all methods, types, params)
- [`api-reference.md`](./docs/api-reference.md) — Upstream REST API reference from [docs.maibmerchants.md](https://docs.maibmerchants.md/checkout)

## License

[MIT](../../LICENSE)
