# @maib/merchants

Umbrella SDK for all [maib](https://www.maib.md) merchant APIs. Installs and re-exports everything from the individual packages in a single import.

## Install

```bash
npm install @maib/merchants
```

## Usage

```typescript
import {
  CheckoutClient,
  EcommerceClient,
  RtpClient,
  MiaClient,
  Currency,
  MaibError,
} from "@maib/merchants";
```

Everything from the individual packages is available:

| Package | What you get |
| --- | --- |
| [`@maib/checkout`](https://www.npmjs.com/package/@maib/checkout) | `CheckoutClient`, `CheckoutStatus`, `PaymentStatus`, `RefundStatus` |
| [`@maib/ecommerce`](https://www.npmjs.com/package/@maib/ecommerce) | `EcommerceClient`, `Currency`, `TransactionStatus`, `ThreeDsStatus` |
| [`@maib/rtp`](https://www.npmjs.com/package/@maib/rtp) | `RtpClient`, `RtpStatus` |
| [`@maib/mia`](https://www.npmjs.com/package/@maib/mia) | `MiaClient`, `QrType`, `AmountType`, `QrStatus`, `MiaPaymentStatus` |
| [`@maib/core`](https://www.npmjs.com/package/@maib/core) | `BaseClient`, `MaibError`, `MaibNetworkError`, `Language`, signature helpers |

Where type names collide between packages, they are aliased with a prefix:

```typescript
import type {
  CheckoutRefundRequest,   // from @maib/checkout
  EcommerceRefundRequest,  // from @maib/ecommerce
  CheckoutListPaymentsParams,
  MiaListPaymentsParams,
} from "@maib/merchants";
```

If you only need one API, install the individual package instead for a smaller dependency footprint.

> Looking for Open Banking? See [`@maib/ob`](https://www.npmjs.com/package/@maib/ob).

## License

[MIT](../../LICENSE)
