# @maib/http

Shared HTTP primitives for [maib](https://www.maib.md) SDK packages – network errors, query string
builder, and token management.

> This is an internal foundation package. You probably want
> [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants),
> [`@maib/ob`](https://www.npmjs.com/package/@maib/ob), or one of the API-specific packages instead
> (`@maib/checkout`, `@maib/ecommerce`, `@maib/rtp`, `@maib/mia`).

## Install

```bash
npm install @maib/http
```

## Token management

`TokenManager` handles token caching, proactive refresh, and concurrent-request deduplication.
Provide your own `acquire` callback for any auth flow (OAuth2, DirectLogin, etc.):

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

## Documentation

This package ships documentation in `dist/docs/` for AI coding agents and tooling:

- [`sdk-reference.md`](./docs/sdk-reference.md) – Complete TypeScript API surface (TokenManager,
  NetworkError, utilities)

## AI / agent coding

Pointers for LLM-driven coding agents touching this package:

- This is shared infra. If you are writing application code against maib APIs, reach for
  [`@maib/merchants`](https://www.npmjs.com/package/@maib/merchants) (aggregator) or an API-specific
  package (`@maib/checkout`, `@maib/ecommerce`, `@maib/rtp`, `@maib/mia`, `@maib/ob`) – not
  `@maib/http` directly.
- `TokenManager` owns token caching, proactive refresh (`refreshBufferS` before expiry), and
  concurrent-request deduplication. Inject the auth flow via
  `new TokenManager(async () => ({ accessToken, accessExpiresAt }))`. Don't fork it – extend
  behavior through the `acquire` callback and the `state` getter/setter (e.g. refresh-token
  exchanges).
- `NetworkError` is thrown for fetch/transport failures (DNS, timeout, JSON parse). API-surfaced
  errors (non-2xx responses with an envelope) come from `MaibError` in `@maib/core`. Use
  `instanceof` to distinguish them.
- This package ships no JSON Schemas. Runtime validation lives in the API-specific packages:
  `@maib/checkout`, `@maib/ecommerce`, `@maib/rtp`, `@maib/mia`, `@maib/ob` – each exposes
  `schemas/bundle.json`, `schemas/<ShortName>.json`, and typed-wrapper subpaths.
- Typed-wrapper validation pattern (in those packages):
  `import Def from "@maib/ecommerce/schemas/<ShortName>"` then `buildSchema(z.fromJSONSchema, Def)`
  – no explicit generic, type is inferred via `TypedSchemaDef<T>`. The raw-JSON form
  (`...<ShortName>.json` with `{ type: "json" }` + explicit `buildSchema<Type>`) still works.
- Canonical TypeScript reference for this package:
  [`./docs/sdk-reference.md`](./docs/sdk-reference.md).
- `buildQueryString` omits `undefined`/`null` and URL-encodes keys and values – safe for both
  required and optional params.
- `BaseClientConfig` (`baseUrl?`, `fetch?`) is extended by `MaibClientConfig` and `ObClientConfig`;
  prefer those for new clients instead of consuming `BaseClientConfig` directly.

## License

[MIT](../../LICENSE)
