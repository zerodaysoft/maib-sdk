# maib SDK for Node.js

TypeScript SDK for [maib](https://www.maib.md) merchant APIs — checkout, e-commerce payments, request to pay, and MIA QR.

Built by [Zero-day](https://www.zero-day.md).

## Packages

| Package | Description |
| --- | --- |
| [`@maib/merchants`](./packages/merchants) | Umbrella package — includes everything below |
| [`@maib/checkout`](./packages/checkout) | Hosted checkout sessions, payments & refunds |
| [`@maib/ecommerce`](./packages/ecommerce) | Direct, hold, recurring & one-click card payments |
| [`@maib/rtp`](./packages/rtp) | Request to Pay — bank-initiated payment requests |
| [`@maib/mia`](./packages/mia) | MIA QR — static, dynamic & hybrid QR code payments |
| [`@maib/core`](./packages/core) | Shared HTTP client, auth, errors & signature helpers |

## Quick start

```bash
npm install @maib/merchants
```

Or install only the package you need:

```bash
npm install @maib/checkout
```

```typescript
import { CheckoutClient } from "@maib/merchants";

const checkout = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID!,
  clientSecret: process.env.MAIB_CLIENT_SECRET!,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!,
});

const session = await checkout.createSession({
  amount: 100,
  currency: "MDL",
  callbackUrl: "https://example.com/callback",
  successUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
});

// redirect user to session.checkoutUrl
```

## Requirements

- Node.js >= 18

## API documentation

- [Checkout API](https://docs.maibmerchants.md/checkout)
- [E-Commerce API](https://docs.maibmerchants.md/e-commerce)
- [Request to Pay API](https://docs.maibmerchants.md/request-to-pay)
- [MIA QR API](https://docs.maibmerchants.md/mia-qr-api/en)

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## License

[MIT](./LICENSE)
