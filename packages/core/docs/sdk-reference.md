---
package: "@maib/core"
version: 0.2.4
description: Shared infrastructure for maib merchant API SDKs — HTTP client, authentication, errors, signature verification.
---

# @maib/core SDK Reference

Shared infrastructure package for all maib merchant API SDKs. Provides the abstract `BaseClient` class, error types, signature verification utilities, and common type definitions used by `@maib/checkout`, `@maib/ecommerce`, `@maib/rtp`, and `@maib/mia`.

You typically do not install `@maib/core` directly. It is a dependency of each merchant SDK package. However, you may import from it for error handling, signature verification, or type definitions.

## Installation

```bash
npm install @maib/core
```

## BaseClient

Abstract base class extended by `CheckoutClient`, `EcommerceClient`, `RtpClient`, and `MiaClient`. Handles OAuth2 Client Credentials authentication with automatic token management.

### Constructor

```typescript
abstract class BaseClient {
  constructor(config: MaibClientConfig);
}
```

You do not instantiate `BaseClient` directly. Use one of the concrete client classes instead.

### Public API

| Member               | Type                     | Description                                                                          |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `BaseClient.version` | `static readonly string` | SDK version string, shared by all maib client packages.                              |
| `apiVersion`         | `string` (getter)        | The API version this client targets (e.g. `"v1"`, `"v2"`). Defined by each subclass. |

### Protected Methods (for subclass authors)

| Method           | Signature                                                                    | Description                                                                               |
| ---------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `_getRequest`    | `_getRequest<T>(path: string, params?: Record<string, unknown>): Promise<T>` | Make an authenticated GET request. Undefined/null query params are omitted automatically. |
| `_postRequest`   | `_postRequest<T>(path: string, body?: Record<string, unknown>): Promise<T>`  | Make an authenticated POST request with a JSON body.                                      |
| `_deleteRequest` | `_deleteRequest<T>(path: string): Promise<T>`                                | Make an authenticated DELETE request. Returns `undefined` for HTTP 200/204 with no body.  |

### Authentication Flow

`BaseClient` uses the OAuth2 Client Credentials flow:

1. On first request, the client sends `clientId` and `clientSecret` to the token endpoint.
2. The token is cached by `TokenManager` from `@maib/http`.
3. Before the token expires (with a 30-second buffer), the client proactively refreshes it.
4. Concurrent requests share a single in-flight token acquisition (no thundering herd).
5. If a `refreshToken` is available (e-commerce v1 flow), the client uses it for renewal instead of re-authenticating with credentials.
6. If an authenticated request receives an HTTP 401 response, the cached token is discarded and the request is retried once with a fresh token. If the retry also fails, a `MaibError` is thrown.

All HTTP requests include `Authorization: Bearer <token>` and `User-Agent` headers automatically.

### Response Unwrapping

The maib merchant API wraps responses in an envelope:

```json
{ "result": { ... }, "ok": true }
```

or on error:

```json
{ "errors": [{ "errorCode": "...", "errorMessage": "..." }], "ok": false }
```

`BaseClient` automatically unwraps this envelope. Your code receives the inner `result` value directly. If the API returns a non-envelope response (e.g. during token exchange) with a successful HTTP status, the raw payload is returned as-is. If the HTTP status is 400 or above and the response does not match the envelope format, a `MaibError` is thrown with error code `UNKNOWN_RESPONSE`.

### Abstract Members (subclasses must implement)

| Member            | Type                                 | Description                                                                 |
| ----------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `_apiVersion`     | `protected abstract readonly string` | API version prefix (e.g. `"v1"`, `"v2"`).                                   |
| `_tokenEndpoint`  | `protected abstract readonly string` | Full token endpoint path (e.g. `"/v1/generate-token"`, `"/v2/auth/token"`). |
| `_userAgent`      | `protected abstract readonly string` | User-Agent string for HTTP requests.                                        |
| `_getTokenBody()` | `protected abstract method`          | Returns the request body for the token endpoint.                            |

Subclasses may also override `_processTokenResult(result: TokenResult): TokenState` to customize token state handling (e.g. for refresh token flows).

## Configuration

### `MaibClientConfig`

```typescript
interface MaibClientConfig {
  clientId: string;
  clientSecret: string;
  signatureKey?: string;
  environment?: Environment;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}
```

| Property       | Type                      | Required | Default                          | Description                                                                                     |
| -------------- | ------------------------- | -------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `clientId`     | `string`                  | Yes      | --                               | Client ID / Project ID from the maibmerchants portal.                                           |
| `clientSecret` | `string`                  | Yes      | --                               | Client secret / Project secret from the maibmerchants portal.                                   |
| `signatureKey` | `string`                  | No       | --                               | Signature key for validating callback notifications. Required if you verify webhook signatures. |
| `environment`  | `Environment`             | No       | `"production"`                   | Target environment. Determines the API host automatically. Ignored if `baseUrl` is provided.    |
| `baseUrl`      | `string`                  | No       | `"https://api.maibmerchants.md"` | API host (without version prefix). Overrides `environment` when set.                            |
| `fetch`        | `typeof globalThis.fetch` | No       | `globalThis.fetch`               | Custom fetch implementation (e.g. for testing or Node < 18 polyfills).                          |

## Error Classes

### `MaibError`

Thrown when the maib API returns a response with `ok: false`, or when the API returns an HTTP error (status >= 400) with a response body that does not match the expected envelope format.

```typescript
class MaibError extends Error {
  readonly statusCode: number;
  readonly errors: MaibApiError[];
  readonly message: string;
  readonly name: "MaibError";
}
```

| Property     | Type             | Description                                                                                                                                                                   |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | `number`         | HTTP status code from the API response.                                                                                                                                       |
| `errors`     | `MaibApiError[]` | Array of structured error objects from the API.                                                                                                                               |
| `message`    | `string`         | Human-readable message. Formatted as `[errorCode] errorMessage` for each error, joined by `"; "`. Falls back to `"API error (HTTP {statusCode})"` when no errors are present. |

#### `MaibApiError`

```typescript
interface MaibApiError {
  errorCode: string;
  errorMessage: string;
  errorArgs?: Record<string, string>;
}
```

| Property       | Type                                  | Description                                                                                          |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `errorCode`    | `string`                              | Machine-readable error code (e.g. `"INVALID_REQUEST"`, `"SESSION_NOT_FOUND"`, `"UNKNOWN_RESPONSE"`). |
| `errorMessage` | `string`                              | Human-readable error description.                                                                    |
| `errorArgs`    | `Record<string, string> \| undefined` | Additional context key-value pairs for the error.                                                    |

**Example: catching API errors**

```typescript
import { MaibError } from "@maib/core";

try {
  await client.getSessionDetails("invalid-id");
} catch (error) {
  if (error instanceof MaibError) {
    console.log(error.statusCode); // 404
    console.log(error.errors[0].errorCode); // "SESSION_NOT_FOUND"
    console.log(error.message); // "[SESSION_NOT_FOUND] Session not found"
  }
}
```

### `MaibNetworkError`

Alias for `NetworkError` from `@maib/http`. Thrown when the HTTP request itself fails before receiving an API response.

```typescript
// These are the same class:
import { MaibNetworkError } from "@maib/core";
import { NetworkError } from "@maib/http";
```

```typescript
class NetworkError extends Error {
  readonly cause: unknown;
  readonly name: "NetworkError";
}
```

## Signature Verification

Four functions for verifying callback/webhook signatures. Two algorithms are supported:

- **SHA-256 (sorted values)**: Used by ecommerce, RTP, and MIA callbacks.
- **HMAC-SHA256**: Used by checkout callbacks.

### SHA-256 Signature Functions

Used for `@maib/ecommerce`, `@maib/rtp`, and `@maib/mia` callback verification.

**Algorithm**: Sort object keys alphabetically (recursively), collect all leaf values in order, append `signatureKey`, join with `":"`, SHA-256 hash, base64 encode.

#### `computeSignature`

```typescript
function computeSignature(
  result: Record<string, unknown>,
  signatureKey: string,
): string;
```

Computes the expected SHA-256 signature for a callback payload.

| Parameter      | Type                      | Description                                       |
| -------------- | ------------------------- | ------------------------------------------------- |
| `result`       | `Record<string, unknown>` | The callback payload object (parsed JSON body).   |
| `signatureKey` | `string`                  | Your signature key from the maibmerchants portal. |

**Returns**: Base64-encoded SHA-256 hash string.

#### `verifySignature`

```typescript
function verifySignature(
  result: Record<string, unknown>,
  signature: string,
  signatureKey: string,
): boolean;
```

Verifies a SHA-256 callback signature using timing-safe comparison.

| Parameter      | Type                      | Description                                       |
| -------------- | ------------------------- | ------------------------------------------------- |
| `result`       | `Record<string, unknown>` | The callback payload object (parsed JSON body).   |
| `signature`    | `string`                  | The signature value received in the callback.     |
| `signatureKey` | `string`                  | Your signature key from the maibmerchants portal. |

**Returns**: `true` if the signature is valid, `false` otherwise.

**Example: verify an ecommerce callback**

```typescript
import { verifySignature } from "@maib/core";

app.post("/webhook/ecommerce", (req, res) => {
  const { result, signature } = req.body;
  const isValid = verifySignature(result, signature, process.env.SIGNATURE_KEY);
  if (!isValid) {
    return res.status(400).send("Invalid signature");
  }
  // Process the callback...
});
```

### HMAC-SHA256 Signature Functions

Used for `@maib/checkout` callback verification.

**Algorithm**: Concatenate `rawBody + "." + timestamp`, compute HMAC-SHA256 with `signatureKey`, base64 encode.

#### `computeHmacSignature`

```typescript
function computeHmacSignature(
  rawBody: string,
  timestamp: string,
  signatureKey: string,
): string;
```

Computes the expected HMAC-SHA256 signature for a checkout callback.

| Parameter      | Type     | Description                                        |
| -------------- | -------- | -------------------------------------------------- |
| `rawBody`      | `string` | The raw JSON body string as received (not parsed). |
| `timestamp`    | `string` | The `X-Signature-Timestamp` header value.          |
| `signatureKey` | `string` | Your signature key from the maibmerchants portal.  |

**Returns**: Base64-encoded HMAC-SHA256 hash string.

#### `verifyHmacSignature`

```typescript
function verifyHmacSignature(
  rawBody: string,
  xSignature: string,
  xTimestamp: string,
  signatureKey: string,
): boolean;
```

Verifies an HMAC-SHA256 checkout callback signature using timing-safe comparison. Handles the `sha256=` prefix in the `X-Signature` header automatically. Also handles duplicated headers from reverse proxies (e.g. Cloudflare joining headers with `", "`).

| Parameter      | Type     | Description                                                      |
| -------------- | -------- | ---------------------------------------------------------------- |
| `rawBody`      | `string` | The raw JSON body string as received (not parsed).               |
| `xSignature`   | `string` | The `X-Signature` header value (may include `"sha256="` prefix). |
| `xTimestamp`   | `string` | The `X-Signature-Timestamp` header value.                        |
| `signatureKey` | `string` | Your signature key from the maibmerchants portal.                |

**Returns**: `true` if the signature is valid, `false` otherwise.

**Example: verify a checkout callback**

```typescript
import { verifyHmacSignature } from "@maib/core";

app.post("/webhook/checkout", (req, res) => {
  const rawBody = req.rawBody; // must be the raw string, not parsed JSON
  const xSignature = req.headers["x-signature"];
  const xTimestamp = req.headers["x-signature-timestamp"];

  const isValid = verifyHmacSignature(
    rawBody,
    xSignature,
    xTimestamp,
    process.env.SIGNATURE_KEY,
  );
  if (!isValid) {
    return res.status(400).send("Invalid signature");
  }
  // Process the callback...
});
```

## Types

### Response Types

```typescript
/** Union of all possible API responses. */
type MaibResponse<T> = MaibSuccessResponse<T> | MaibErrorResponse;

interface MaibSuccessResponse<T> {
  result: T;
  ok: true;
}

interface MaibErrorResponse {
  errors: MaibApiError[];
  ok: false;
}
```

### Token Types

```typescript
interface TokenResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  refreshToken?: string;
  refreshExpiresIn?: number;
}
```

| Property           | Type     | Required | Description                              |
| ------------------ | -------- | -------- | ---------------------------------------- |
| `accessToken`      | `string` | Yes      | The OAuth2 access token.                 |
| `expiresIn`        | `number` | Yes      | Token lifetime in seconds.               |
| `tokenType`        | `string` | Yes      | Token type (e.g. `"Bearer"`).            |
| `refreshToken`     | `string` | No       | Refresh token (e-commerce v1 flow only). |
| `refreshExpiresIn` | `number` | No       | Refresh token lifetime in seconds.       |

### Pagination Types

```typescript
interface PaginationParams {
  count: number;
  offset: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

interface PaginatedResult<T> {
  totalCount: number;
  items: T[];
}
```

#### `PaginationParams`

| Property | Type              | Required | Description               |
| -------- | ----------------- | -------- | ------------------------- |
| `count`  | `number`          | Yes      | Number of items per page. |
| `offset` | `number`          | Yes      | Number of items to skip.  |
| `sortBy` | `string`          | No       | Field name to sort by.    |
| `order`  | `"asc" \| "desc"` | No       | Sort direction.           |

#### `PaginatedResult<T>`

| Property     | Type     | Description                               |
| ------------ | -------- | ----------------------------------------- |
| `totalCount` | `number` | Total number of items matching the query. |
| `items`      | `T[]`    | Array of items for the current page.      |

## Enums

### `Currency`

```typescript
const Currency = {
  MDL: "MDL",
  EUR: "EUR",
  USD: "USD",
} as const;

type Currency = (typeof Currency)[keyof typeof Currency];
```

| Key   | Value   | Description   |
| ----- | ------- | ------------- |
| `MDL` | `"MDL"` | Moldovan Leu. |
| `EUR` | `"EUR"` | Euro.         |
| `USD` | `"USD"` | US Dollar.    |

### `Language`

```typescript
const Language = {
  RO: "ro",
  EN: "en",
  RU: "ru",
} as const;

type Language = (typeof Language)[keyof typeof Language];
```

| Key  | Value  | Description |
| ---- | ------ | ----------- |
| `RO` | `"ro"` | Romanian.   |
| `EN` | `"en"` | English.    |
| `RU` | `"ru"` | Russian.    |

### `Environment`

```typescript
const Environment = {
  PRODUCTION: "production",
  SANDBOX: "sandbox",
} as const;

type Environment = (typeof Environment)[keyof typeof Environment];
```

| Key          | Value          | API Host                           |
| ------------ | -------------- | ---------------------------------- |
| `PRODUCTION` | `"production"` | `https://api.maibmerchants.md`     |
| `SANDBOX`    | `"sandbox"`    | `https://sandbox.maibmerchants.md` |

## Utility Functions

### `isMaibResponse`

```typescript
function isMaibResponse<T = unknown>(value: unknown): value is MaibResponse<T>;
```

Type guard that checks whether a parsed JSON value is a maib API envelope (contains an `ok` boolean discriminator with either `result` or `errors`).

```typescript
import { isMaibResponse } from "@maib/core";

const data = await response.json();
if (isMaibResponse(data)) {
  if (data.ok) {
    console.log(data.result); // typed as unknown by default
  } else {
    console.log(data.errors); // MaibApiError[]
  }
}
```

## Constants

| Constant                 | Value                                | Description                                               |
| ------------------------ | ------------------------------------ | --------------------------------------------------------- |
| `PRODUCTION_API_HOST`    | `"https://api.maibmerchants.md"`     | Production API host.                                      |
| `SANDBOX_API_HOST`       | `"https://sandbox.maibmerchants.md"` | Sandbox (test) API host.                                  |
| `DEFAULT_API_HOST`       | `"https://api.maibmerchants.md"`     | Deprecated alias for `PRODUCTION_API_HOST`.               |
| `TOKEN_REFRESH_BUFFER_S` | `30`                                 | Seconds before token expiry to trigger proactive refresh. |
| `SDK_VERSION`            | `string`                             | SDK version string, re-exported from `@maib/http`.        |

## Exports

Everything below is exported from the `@maib/core` package entry point:

**Classes**: `BaseClient`, `MaibError`, `MaibNetworkError`

**Functions**: `computeSignature`, `verifySignature`, `computeHmacSignature`, `verifyHmacSignature`, `isMaibResponse`

**Constants**: `PRODUCTION_API_HOST`, `SANDBOX_API_HOST`, `DEFAULT_API_HOST`, `TOKEN_REFRESH_BUFFER_S`, `SDK_VERSION`, `Currency`, `Language`, `Environment`

**Types** (type-only exports): `BaseClientConfig`, `MaibApiError`, `MaibClientConfig`, `MaibErrorResponse`, `MaibResponse`, `MaibSuccessResponse`, `PaginatedResult`, `PaginationParams`, `TokenResult`
