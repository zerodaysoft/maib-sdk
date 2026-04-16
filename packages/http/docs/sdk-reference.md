---
package: "@maib/http"
version: 0.2.2
description: Shared HTTP primitives for maib SDK packages — network errors, query builder, token management.
---

# @maib/http SDK Reference

Low-level HTTP primitives shared across all maib SDK packages. Provides token lifecycle management, network error types, and query string utilities. This package is an internal dependency -- you typically do not install it directly, but you may import from it for error handling or advanced use cases.

## Installation

```bash
npm install @maib/http
```

## TokenManager

Manages token lifecycle: caching, proactive refresh before expiry, and concurrent-request deduplication. The actual token acquisition logic is injected via a callback, making `TokenManager` usable across different auth flows (OAuth2 Client Credentials, DirectLogin, etc.).

### Constructor

```typescript
class TokenManager {
  constructor(acquire: () => Promise<TokenState>, refreshBufferS?: number);
}
```

| Parameter        | Type                        | Required | Default | Description                                                                                                            |
| ---------------- | --------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `acquire`        | `() => Promise<TokenState>` | Yes      | --      | Async function that acquires a fresh token. Called when no cached token exists or the cached token is about to expire. |
| `refreshBufferS` | `number`                    | No       | `30`    | Number of seconds before expiry to trigger a proactive refresh.                                                        |

### Methods

| Method     | Signature                     | Returns  | Description                                                                                                                                                                                                                                       |
| ---------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getToken` | `getToken(): Promise<string>` | `string` | Returns a valid access token. If the cached token is still valid (with buffer), returns it immediately. If expired or about to expire, calls the `acquire` function. Concurrent calls share the same in-flight acquisition -- no thundering herd. |
| `reset`    | `reset(): void`               | `void`   | Clears the cached token, forcing re-acquisition on the next `getToken()` call.                                                                                                                                                                    |

### Properties

| Property | Type                 | Access    | Description                                                                                                                                   |
| -------- | -------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`  | `TokenState \| null` | get / set | Current token state. Returns `null` if no token is cached. You can set this directly to inject a token (e.g. after a refresh-token exchange). |

### Behavior

- **Caching**: After the first successful `acquire()` call, the token is stored in memory and reused for subsequent `getToken()` calls.
- **Proactive refresh**: The token is refreshed `refreshBufferS` seconds before `accessExpiresAt`. This prevents token expiry during in-flight requests.
- **Deduplication**: If multiple callers invoke `getToken()` concurrently while the token is expired, only one `acquire()` call is made. All callers await the same promise.
- **No automatic background refresh**: Refresh happens lazily on the next `getToken()` call, not on a timer.

### Example

```typescript
import { TokenManager } from "@maib/http";
import type { TokenState } from "@maib/http";

const manager = new TokenManager(async (): Promise<TokenState> => {
  const response = await fetch("https://auth.example.com/token", {
    method: "POST",
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });
  const data = await response.json();
  return {
    accessToken: data.access_token,
    accessExpiresAt: Date.now() + data.expires_in * 1000,
  };
}, 30);

// All three calls share one token acquisition if called concurrently:
const [token1, token2, token3] = await Promise.all([
  manager.getToken(),
  manager.getToken(),
  manager.getToken(),
]);
// token1 === token2 === token3
```

## NetworkError

Thrown when the HTTP request itself fails before receiving an API response (DNS failure, timeout, connection refused, invalid JSON in response).

```typescript
class NetworkError extends Error {
  readonly cause: unknown;
  readonly name: "NetworkError";

  constructor(message: string, cause?: unknown);
}
```

| Property  | Type             | Description                                                                                                                                              |
| --------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message` | `string`         | Human-readable description of the failure (e.g. `"Network request to POST /v2/auth/token failed"`).                                                      |
| `cause`   | `unknown`        | The original error that caused the failure (e.g. the `TypeError` thrown by `fetch`). May be `undefined` for non-fetch failures (e.g. JSON parse errors). |
| `name`    | `"NetworkError"` | Always `"NetworkError"`. Use `instanceof` for reliable checks.                                                                                           |

### Example

```typescript
import { NetworkError } from "@maib/http";

try {
  await client.listBanks();
} catch (error) {
  if (error instanceof NetworkError) {
    console.error("Network failure:", error.message);
    console.error("Cause:", error.cause);
  }
}
```

## buildQueryString

Builds a URL query string from a params object. Undefined and null values are omitted.

```typescript
function buildQueryString(params: Record<string, unknown>): string;
```

| Parameter | Type                      | Description                                                                |
| --------- | ------------------------- | -------------------------------------------------------------------------- |
| `params`  | `Record<string, unknown>` | Key-value pairs to encode. Values are converted to strings via `String()`. |

**Returns**: URL-encoded query string without the leading `?`. Returns an empty string `""` if all values are undefined or null.

Keys and values are encoded with `encodeURIComponent`.

### Example

```typescript
import { buildQueryString } from "@maib/http";

buildQueryString({ limit: 10, offset: 0, filter: undefined });
// Returns: "limit=10&offset=0"

buildQueryString({ q: "hello world", page: 1 });
// Returns: "q=hello%20world&page=1"

buildQueryString({ a: null, b: undefined });
// Returns: ""
```

## Types

### `BaseClientConfig`

Base configuration shared by all maib API clients.

```typescript
interface BaseClientConfig {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}
```

| Property  | Type                      | Required | Default            | Description                                                            |
| --------- | ------------------------- | -------- | ------------------ | ---------------------------------------------------------------------- |
| `baseUrl` | `string`                  | No       | --                 | API host (without version prefix or trailing slash).                   |
| `fetch`   | `typeof globalThis.fetch` | No       | `globalThis.fetch` | Custom fetch implementation (e.g. for testing or Node < 18 polyfills). |

This interface is extended by `MaibClientConfig` (in `@maib/core`) and `ObClientConfig` (in `@maib/ob`).

### `TokenState`

Internal state for a cached access/refresh token pair.

```typescript
interface TokenState {
  accessToken: string;
  refreshToken?: string;
  accessExpiresAt: number;
  refreshExpiresAt?: number;
}
```

| Property           | Type     | Required | Description                                                    |
| ------------------ | -------- | -------- | -------------------------------------------------------------- |
| `accessToken`      | `string` | Yes      | The access token string.                                       |
| `refreshToken`     | `string` | No       | Refresh token for token renewal (used by e-commerce v1 flow).  |
| `accessExpiresAt`  | `number` | Yes      | Unix timestamp in milliseconds when the access token expires.  |
| `refreshExpiresAt` | `number` | No       | Unix timestamp in milliseconds when the refresh token expires. |

## Constants

| Constant      | Type     | Description                                                                                                                                                                             |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SDK_VERSION` | `string` | SDK version string. Injected from `package.json` at build time via tsup `define`. Falls back to `"0.0.0-dev"` in development environments where the build-time constant is not defined. |

## Exports

Everything below is exported from the `@maib/http` package entry point:

**Classes**: `TokenManager`, `NetworkError`

**Functions**: `buildQueryString`

**Constants**: `SDK_VERSION`

**Types** (type-only exports): `BaseClientConfig`, `TokenState`
