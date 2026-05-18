---
source: https://docs.maibmerchants.md/main/en/integration
upstream_updated: 2026-05-19
---

# Getting Started with maib SDK

This SDK is a code library. Using it in production also requires you to complete maib's operational
onboarding — testing, contract signing, and project activation in the **maibmerchants** portal. This
page tells a developer what to do **before** the SDK has anything to call against.

> Authoritative reference:
> [docs.maibmerchants.md/main/en/integration](https://docs.maibmerchants.md/main/en/integration) for
> the live business-side rules.

## At a glance

```
1. Request test credentials by email      ──► ecom@maib.md
2. Integrate & test against the sandbox   ──► this SDK
3. Send sandbox payIds for validation     ──► ecom@maib.md
4. Submit questionnaire + documents       ──► ecom@maib.md
5. Sign payment-acceptance contract       ──► maib branch / digital signature
6. Register on maibmerchants portal       ──► email link to set password
7. Activate Production Project            ──► obtain prod Project ID / Secret / Signature Key
```

## 1. Request test credentials

Email **ecom@maib.md** with:

- Your **IDNO** (legal entity identifier).
- The **website domain** (or app name) you intend to integrate.
- The **type of integration** you want (Checkout / e-Commerce / MIA QR / Request to Pay / Open
  Banking).

You will receive:

- `Project ID`
- `Project Secret`
- `Signature Key` (used for callback verification — see
  [@maib/core/docs/sdk-reference.md](../packages/core/docs/sdk-reference.md))

These are sandbox credentials. The production set is issued separately, after you activate the
Production Project in the portal (step 7).

## 2. Sandbox testing

| Product       | Sandbox base URL                                 |
| ------------- | ------------------------------------------------ |
| Checkout      | `https://sandbox.maibmerchants.md`               |
| MIA QR        | `https://sandbox.maibmerchants.md`               |
| RTP           | `https://sandbox.maibmerchants.md`               |
| Open Banking  | `https://ob-sandbox.maib.md`                     |
| e-Commerce v1 | `https://api.maibmerchants.md` (no sandbox) [^1] |

[^1]:
    The legacy e-Commerce v1 API has no separate sandbox — test access is granted against the
    production base URL with a non-activated Test Project.

Pass `environment: Environment.SANDBOX` (or set `baseUrl` explicitly) to point the client at the
test environment.

### Test card

Use this card to drive successful sandbox card payments:

```
Cardholder:  Test Test
Card number: 5102180060101124
Expiry:      06/28
CVV:         760
```

### Test IBAN (Checkout / MIA QR account-to-account)

```
IBAN: MD88AG000000011621810140
```

## 3. Submit successful sandbox runs

Once your integration completes at least one happy-path payment in sandbox, send back to
**ecom@maib.md**:

- The **payment IDs** (`payId`) of the successful sandbox transactions.
- The **website or app URL** the integration targets.

The Bank uses these to confirm that your callbacks, signature verification, and status handling all
work end-to-end.

## 4. Submit the questionnaire

The Merchant's representative downloads the questionnaire from the upstream
[Integration steps](https://docs.maibmerchants.md/main/en/integration/steps) page and emails it
(plus supporting documents) to **ecom@maib.md**. May be submitted before or during sandbox testing.

## 5. Requirements verification

The Bank verifies your solution against
[Integration requirements](https://docs.maibmerchants.md/main/en/integration/requirements).
Highlights — verify these as you build:

- The website/app is served over **HTTPS** (valid SSL).
- The **Terms and Conditions** page exists and the checkout requires the customer to tick a _Terms &
  Conditions_ checkbox before paying.
- The customer is **emailed a payment confirmation** containing order number, merchant name, amount,
  currency, payment date, and order description.
- After payment the customer **sees order details** (order number, details, date) on a return page.
- Contact info (legal name, IDNO, address) is visible on the site.
- maib and International Payment System **logos** are displayed (footer is fine). Logo bundle:
  [download](https://109545076-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F15y2IL07pJBxRX7U52WU%2Fuploads%2FNywKsTrcUfgPVsAMXh0r%2Flogo.zip?alt=media&token=fb8ca009-9b2a-4df6-ae78-534df1682d63).
- Products/services sold are **not** on the
  [unacceptable list](https://docs.maibmerchants.md/main/en/integration/requirements#products-unacceptable-for-online-payment)
  (gambling, tobacco, drugs, prescription medication, escort services, etc.).
- If your business is registered with **maib liber**, also display the maib liber logo and the rates
  banner on each product page or in the cart.

## 6. Sign the contract

Once requirements are met and tests are validated, the Merchant Administrator receives the
payment-acceptance contract. Sign it in person at any maib branch, or online with a Moldovan digital
signature.

## 7. Register and activate the Production Project

After the contract is signed:

1. The Bank registers your user on the [maibmerchants portal](https://maibmerchants.md). You'll get
   a password-set email.
2. In the portal, open your Production Project and fill in:
   - **Domain** (must match the contract).
   - **IP** (server/hosting public IP).
   - **Platform** (CMS / framework / language).
   - **Callback URL** — receives final payment responses.
   - **Ok URL** — customer redirect on success.
   - **Fail URL** — customer redirect on failure.
3. Activate the project to obtain the production `Project ID`, `Project Secret`, and
   `Signature Key`. Swap them in for the sandbox ones — the SDK code does not change, only the
   credentials and `environment`.
4. Run a smoke test with a real **10 MDL** payment to confirm end-to-end.

## After activation

- Watch the Callback URL: maib retries with the schedule `10, 60, 300, 600, 3600, 43200, 86400`
  seconds until you return HTTP 200.
- Whitelist the callback source IPs in your firewall: `91.250.245.70`, `91.250.245.71`,
  `91.250.245.142`.
- Verify every callback signature (`MaibError` / `verifyCallback`) before fulfilling the order — see
  the per-product `sdk-reference.md` for the exact signature algorithm (HMAC for Checkout; SHA-256
  modern for MIA QR & RTP; legacy SHA-256 for e-Commerce v1).

## Support

For integration issues, email **ecom@maib.md** with:

- HTTP status code
- `errorCode` / `errorMessage`
- Date/time of the failing request
- `Project ID`, Merchant name, app/site name, URL
