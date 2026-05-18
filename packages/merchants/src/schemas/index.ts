/**
 * Schema barrel for the umbrella `@maib/merchants` package.
 *
 * Unlike the per-API packages, this one defines no new Zod schemas of its own —
 * the build pipeline (`scripts/build-schemas.mjs`) instead aggregates every
 * sub-package's `dist/schemas/bundle.json` (checkout, ecommerce, rtp, mia, and
 * core) into a single `@maib/merchants/schemas/bundle.json` plus one
 * self-contained `<ShortName>.json` (or `<package>.<ShortName>.json` for ids
 * that collide across packages) per schema.
 *
 * The file must exist for `build-schemas.mjs` to engage parent-bundle merging.
 */

export {};
