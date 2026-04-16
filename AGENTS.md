# maib SDK: Instructions for AI Coding Agents

Before writing any code that uses the maib SDK, **read the relevant docs bundled inside each package**. Your training data may be outdated — the bundled docs are the source of truth.

## Where to find docs

When a user has installed a maib SDK package, documentation is bundled at:

```
node_modules/@maib/<package>/dist/docs/
  README.md            # Entry point — quick start, usage examples, enums
  sdk-reference.md     # Complete TypeScript API surface — all methods, types, params
  api-reference.md     # Upstream REST API reference (where available)
```

## Package map

| Package           | What it does                                              | Main class        |
| ----------------- | --------------------------------------------------------- | ----------------- |
| `@maib/merchants` | Umbrella — re-exports everything below (except OB)        | All clients       |
| `@maib/checkout`  | Hosted checkout sessions, payments, refunds               | `CheckoutClient`  |
| `@maib/ecommerce` | Direct, hold, recurring, one-click card payments (v1)     | `EcommerceClient` |
| `@maib/rtp`       | Request to Pay — bank-initiated payment requests          | `RtpClient`       |
| `@maib/mia`       | MIA QR — static, dynamic, hybrid QR payments              | `MiaClient`       |
| `@maib/ob`        | Open Banking — accounts, transactions, payments, consents | `ObClient`        |
| `@maib/core`      | Shared auth, errors, signature verification               | `BaseClient`      |
| `@maib/http`      | HTTP primitives — token manager, network errors           | `TokenManager`    |

## Key differences between packages

- **Auth**: Checkout/RTP/MIA use `clientId`/`clientSecret`. E-Commerce uses `projectId`/`projectSecret`. OB uses `username`/`password`/`consumerKey`.
- **Callbacks**: Checkout uses HMAC-SHA256 (`verifyCallback(rawBody, xSignature, xTimestamp)`). E-Commerce/RTP/MIA use SHA-256 sorted-values (`verifyCallback(payload)`).
- **Sandbox**: Checkout/RTP/MIA support `Environment.SANDBOX`. E-Commerce (v1) does not. OB is sandbox-only.
- **Pagination**: Checkout/RTP/MIA use `PaginatedResult<T>` with `{ totalCount, items }`. OB returns raw arrays.

## How to read the docs

1. Start with `README.md` for quick start and usage examples
2. Check `sdk-reference.md` for complete method signatures and type definitions
3. Reference `api-reference.md` for REST endpoint details, error codes, and callback payloads

## Common patterns

```typescript
// All merchant clients (checkout, ecommerce, rtp, mia)
import { CheckoutClient, Currency, Environment } from "@maib/checkout";

const client = new CheckoutClient({
  clientId: process.env.MAIB_CLIENT_ID,
  clientSecret: process.env.MAIB_CLIENT_SECRET,
  signatureKey: process.env.MAIB_SIGNATURE_KEY, // for callback verification
  environment: Environment.SANDBOX, // optional
});

// Error handling
import { MaibError, MaibNetworkError } from "@maib/core";

try {
  await client.someMethod();
} catch (error) {
  if (error instanceof MaibError) {
    // API error: error.statusCode, error.errors
  }
  if (error instanceof MaibNetworkError) {
    // Network failure: error.cause
  }
}
```

## Monorepo structure

```
packages/
  checkout/     # @maib/checkout
  ecommerce/    # @maib/ecommerce
  rtp/          # @maib/rtp
  mia/          # @maib/mia
  ob/           # @maib/ob
  core/         # @maib/core
  http/         # @maib/http
  merchants/    # @maib/merchants (umbrella)
  maib-sdk/     # Deprecated — use @maib/merchants
```

Built by [Zero-day](https://www.zero-day.md).
