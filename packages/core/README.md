# @maib/core

Shared infrastructure for [maib](https://www.maib.md) merchant API SDKs — HTTP client, authentication, error handling, and signature verification.

> You probably want [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants) or one of the API-specific packages instead. This package is used internally by the merchant SDKs.

## Install

```bash
npm install @maib/core
```

## Signature verification

Verify callback signatures from maib APIs:

```typescript
import { verifySignature, verifyHmacSignature } from "@maib/core";

// E-Commerce, MIA QR, RTP — SHA-256 sorted-values signature
const isValid = verifySignature(callbackResult, signature, signatureKey);

// Checkout — HMAC-SHA256 signature
const isValid = verifyHmacSignature(rawBody, xSignature, xTimestamp, signatureKey);
```

## Error handling

```typescript
import { MaibError, MaibNetworkError } from "@maib/core";

try {
  await client.someMethod();
} catch (error) {
  if (error instanceof MaibError) {
    // API returned an error response
    console.log(error.statusCode); // HTTP status code
    console.log(error.errors);     // Array of { errorCode, errorMessage }
  }
  if (error instanceof MaibNetworkError) {
    // Network/fetch failure
    console.log(error.cause);
  }
}
```

## Exports

| Export                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `BaseClient`           | Abstract HTTP client with token management |
| `MaibError`            | Error class for API error responses      |
| `MaibNetworkError`     | Error class for network failures         |
| `computeSignature`     | Compute SHA-256 callback signature       |
| `verifySignature`      | Verify SHA-256 callback signature        |
| `computeHmacSignature` | Compute HMAC-SHA256 callback signature   |
| `verifyHmacSignature`  | Verify HMAC-SHA256 callback signature    |
| `Currency`             | Enum: `MDL`, `EUR`, `USD`               |
| `Language`             | Enum: `RO`, `EN`, `RU`                  |
| `BaseClientConfig`     | Base config type (`baseUrl?`, `fetch?`)  |
| `DEFAULT_API_HOST`     | `https://api.maibmerchants.md`           |
| `SDK_VERSION`          | Current SDK version                      |

## License

[MIT](../../LICENSE)
