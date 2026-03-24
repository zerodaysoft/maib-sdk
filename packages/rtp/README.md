# @maib/rtp

TypeScript SDK for the [maib Request to Pay (RTP) API](https://docs.maibmerchants.md/request-to-pay) — bank-initiated payment requests.

## Install

```bash
npm install @maib/rtp
```

Or use the umbrella package:

```bash
npm install @maib/merchants
```

## Usage

```typescript
import { RtpClient, Currency } from "@maib/rtp";

const client = new RtpClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!, // for callback verification
});
```

### Create a payment request

```typescript
const rtp = await client.create({
  alias: "+37360123456",
  amount: 100,
  currency: Currency.MDL,
  description: "Invoice #456",
  expiresAt: "2026-12-31T23:59:59Z",
  callbackUrl: "https://example.com/callback",
  redirectUrl: "https://example.com/redirect",
});

console.log(rtp.rtpId);
```

### Get status

```typescript
const status = await client.getStatus(rtp.rtpId);
```

### List payment requests

```typescript
const { items, totalCount } = await client.list({
  count: 20,
  offset: 0,
  status: RtpStatus.ACTIVE,
});
```

### Cancel a payment request

```typescript
await client.cancel(rtp.rtpId, { reason: "No longer needed" });
```

### Refund a completed payment

```typescript
const refund = await client.refund(payId, { reason: "Customer request" });
```

### Sandbox testing

```typescript
import { RtpClient, Environment } from "@maib/rtp";

const client = new RtpClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  environment: Environment.SANDBOX,
});

// Simulate customer accepting the payment
const accepted = await client.testAccept(rtp.rtpId, {
  amount: 100,
  currency: Currency.MDL,
});

// Simulate customer rejecting the payment
const rejected = await client.testReject(rtp.rtpId);
```

### Verify callback signature

```typescript
// In your webhook handler
const isValid = client.verifyCallback(callbackPayload);
// callbackPayload = { result: { ... }, signature: "..." }
```

## Enums

```typescript
import { RtpStatus } from "@maib/rtp";

RtpStatus.CREATED    // "Created"
RtpStatus.ACTIVE     // "Active"
RtpStatus.ACCEPTED   // "Accepted"
RtpStatus.REJECTED   // "Rejected"
RtpStatus.CANCELLED  // "Cancelled"
RtpStatus.EXPIRED    // "Expired"
```

## License

[MIT](../../LICENSE)
