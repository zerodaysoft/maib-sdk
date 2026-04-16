# maib SDK for Node.js

TypeScript SDK for [maib](https://www.maib.md) merchant APIs — checkout, e-commerce payments, request to pay, MIA QR, and open banking.

Built by [Zero-day](https://www.zero-day.md).

## Packages

| Package                                                            | Description                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants) | Umbrella package — includes everything below                              |
| [`@maib/checkout`](https://www.npmjs.com/package/@maib/checkout)   | Hosted checkout sessions, payments & refunds                              |
| [`@maib/ecommerce`](https://www.npmjs.com/package/@maib/ecommerce) | Direct, hold, recurring & one-click card payments                         |
| [`@maib/rtp`](https://www.npmjs.com/package/@maib/rtp)             | Request to Pay — bank-initiated payment requests                          |
| [`@maib/mia`](https://www.npmjs.com/package/@maib/mia)             | MIA QR — static, dynamic & hybrid QR code payments                        |
| [`@maib/ob`](https://www.npmjs.com/package/@maib/ob)               | Open Banking — accounts, transactions, payments & consents                |
| [`@maib/core`](https://www.npmjs.com/package/@maib/core)           | Shared HTTP client, auth, errors & signature helpers                      |
| [`@maib/http`](https://www.npmjs.com/package/@maib/http)           | Shared HTTP primitives — network errors, query builder & token management |

## Quick start

```bash
npm install @maib/merchants
```

Or install only the package you need:

```bash
npm install @maib/checkout
```

```typescript
import { CheckoutClient, Currency } from "@maib/merchants";

const checkout = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!,
});

const session = await checkout.createSession({
  amount: 100,
  currency: Currency.MDL,
  callbackUrl: "https://example.com/callback",
  successUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
});

// redirect user to session.checkoutUrl
```

## Sandbox

Use `Environment.SANDBOX` to test against the sandbox environment without moving real funds:

```typescript
import { CheckoutClient, Environment } from "@maib/merchants";

const checkout = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  environment: Environment.SANDBOX,
});
```

> **Note:** The sandbox environment is available for the Checkout, RTP, MIA QR, and Open Banking APIs. The legacy E-Commerce (v1) API does not support sandbox.

## AI coding agents

Each package ships version-matched documentation in `dist/docs/` so AI coding agents (Claude Code, Cursor, Copilot, etc.) can reference accurate APIs instead of relying on training data.

```
node_modules/@maib/<package>/dist/docs/
  README.md            # Entry point — quick start and usage examples
  sdk-reference.md     # Complete TypeScript API — methods, types, params
  api-reference.md     # Upstream REST API reference (where available)
```

To point your agents to these docs, add the following files to your project root:

**`AGENTS.md`**

```md
<!-- BEGIN:maib-sdk-agent-rules -->

# maib SDK: ALWAYS read docs before coding

Before any maib SDK work, find and read the relevant doc in the installed package:

- `node_modules/@maib/<package>/dist/docs/README.md` — quick start
- `node_modules/@maib/<package>/dist/docs/sdk-reference.md` — complete API surface

Your training data may be outdated — the bundled docs are the source of truth.

<!-- END:maib-sdk-agent-rules -->
```

**`CLAUDE.md`** (for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) users)

```md
@AGENTS.md
```

The `<!-- BEGIN/END -->` markers delimit the SDK-managed section — add your own project rules outside them.

## Requirements

- Node.js >= 18

## API documentation

- [Checkout API](https://docs.maibmerchants.md/checkout)
- [E-Commerce API](https://docs.maibmerchants.md/e-commerce)
- [Request to Pay API](https://docs.maibmerchants.md/request-to-pay)
- [MIA QR API](https://docs.maibmerchants.md/mia-qr-api/en)
- [Open Banking API](https://ob-sandbox.maib.md)

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
