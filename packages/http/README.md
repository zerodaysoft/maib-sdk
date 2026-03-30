# @maib/http

Shared HTTP primitives for [maib](https://www.maib.md) SDK packages — network errors, query string builder, and token management.

> This is an internal foundation package. You probably want [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants), [`@maib/ob`](https://www.npmjs.com/package/@maib/ob), or one of the API-specific packages instead.

## Install

```bash
npm install @maib/http
```

## Token management

`TokenManager` handles token caching, proactive refresh, and concurrent-request deduplication. Provide your own `acquire` callback for any auth flow (OAuth2, DirectLogin, etc.):

```typescript
import { TokenManager } from "@maib/http";

const tokens = new TokenManager(async () => {
  const res = await fetch("https://api.example.com/auth/token", {
    method: "POST",
    body: JSON.stringify({ clientId: "...", clientSecret: "..." }),
  });
  const { accessToken, expiresIn } = await res.json();
  return {
    accessToken,
    accessExpiresAt: Date.now() + expiresIn * 1000,
  };
});

// First call acquires a token; subsequent calls return the cached value.
// Concurrent calls share the same in-flight request.
const token = await tokens.getToken();
```

## Query string builder

```typescript
import { buildQueryString } from "@maib/http";

buildQueryString({ page: 1, limit: 20, filter: undefined });
// => "page=1&limit=20"  (undefined/null values are omitted)
```

## Error handling

```typescript
import { NetworkError } from "@maib/http";

try {
  await fetch(url);
} catch (error) {
  throw new NetworkError("Request failed", error);
}
```

## Exports

| Export             | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `TokenManager`     | Token cache with deduplication and proactive refresh     |
| `NetworkError`     | Error class for network/fetch failures                   |
| `buildQueryString` | Build URL query string from a params object              |
| `SDK_VERSION`      | Current SDK version string                               |
| `BaseClientConfig` | Base config type (`baseUrl?`, `fetch?`)                  |
| `TokenState`       | Token state type (`accessToken`, `accessExpiresAt`, ...) |

## License

[MIT](../../LICENSE)
