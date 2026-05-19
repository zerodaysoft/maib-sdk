/**
 * Tiny, validator-agnostic helpers for turning a `dist/schemas/*.json` file or
 * `dist/schemas/bundle.json` into runtime validators. The SDK ships zero
 * validation runtime — you pass in the conversion function from your validator
 * of choice (Zod, Valibot, an Ajv compile, anything that consumes a JSON
 * Schema).
 *
 * @module
 */

import type { _JSONSchema, JSONSchema } from "./json-schema";

export type { _JSONSchema, JSONSchema } from "./json-schema";

/**
 * Backwards-compatible alias for {@link JSONSchema}. Prefer importing
 * `JSONSchema` directly in new code — both refer to the same Draft 2020-12
 * structural type carried by `@maib/<pkg>/schemas/*.json` files.
 */
export type JSONSchemaDef = JSONSchema;

/**
 * Layout of every `@maib/<package>/schemas/bundle.json` artifact:
 * `{ $schema?, $defs: { [id]: JSONSchema } }`.
 */
export interface SchemaBundle extends JSONSchema {
  $defs: Record<string, JSONSchema>;
}

/**
 * Minimal structural contract for a "give me back parsed data of type T"
 * validator. Zod's schemas (`z.ZodType<T>`) and Standard Schema's interface
 * satisfy this shape, which is why a Zod schema casts cleanly to it.
 *
 * If your validator does not expose `parse` / `safeParse` (e.g. Ajv returns a
 * predicate function), use the inference overload of {@link buildSchema} and
 * pass the type via your validator's own generic instead.
 */
export interface ParsingValidator<TData> {
  parse(input: unknown): TData;
  safeParse(input: unknown): { success: true; data: TData } | { success: false; error: unknown };
}

/**
 * Phantom marker carried by the generated `.ts` schema wrappers
 * (`@maib/<pkg>/schemas/<ShortName>`). Pulls the original SDK interface
 * through the JSON file so {@link buildSchema} can infer `ParsingValidator<T>`
 * without a manual type argument.
 *
 * Raw JSON imports — `import def from "./X.json" with { type: "json" }` — do
 * not carry this marker; consumers of the JSON path keep the explicit-generic
 * pattern instead.
 */
export type TypedSchemaDef<T> = JSONSchema & { readonly __maibType: T };

/**
 * Convert a single schema definition into a validator using `convert`.
 *
 * Two call styles are supported:
 *
 * 1. **Typed wrapper (no generic needed)** — preferred. Import the generated
 *    wrapper from `@maib/<pkg>/schemas/<ShortName>` (no `.json` suffix) and
 *    `TData` is inferred from the phantom `__maibType` field that the
 *    wrapper carries.
 *
 *    ```ts
 *    import { buildSchema } from "@maib/checkout/schemas";
 *    import CancelSessionResultDef from "@maib/checkout/schemas/CancelSessionResult";
 *    import { z } from "zod";
 *
 *    export const CancelSessionResultSchema =
 *      buildSchema(z.fromJSONSchema, CancelSessionResultDef);
 *    // → ParsingValidator<CancelSessionResult> (inferred)
 *    ```
 *
 * 2. **Raw JSON (explicit generic)** — for the `with { type: "json" }` import
 *    style, pass the SDK's TS interface as the type argument:
 *
 *    ```ts
 *    import type { CancelSessionResult } from "@maib/checkout";
 *    import { buildSchema } from "@maib/checkout/schemas";
 *    import CancelSessionResultDef from "@maib/checkout/schemas/CancelSessionResult.json" with { type: "json" };
 *    import { z } from "zod";
 *
 *    export const CancelSessionResultSchema =
 *      buildSchema<CancelSessionResult>(z.fromJSONSchema, CancelSessionResultDef);
 *    ```
 *
 * `refs` is optional — per-schema JSON files already embed `$defs` and are
 * self-resolving on their own. Pass `bundle.$defs` only when handing
 * `convert` a definition you pulled out of a bundle yourself.
 */
export function buildSchema<T>(
  convert: (schema: _JSONSchema) => unknown,
  def: TypedSchemaDef<T>,
  refs?: Record<string, JSONSchema>,
): ParsingValidator<T>;
export function buildSchema<TData = unknown>(
  convert: (schema: _JSONSchema) => unknown,
  def: JSONSchema,
  refs?: Record<string, JSONSchema>,
): ParsingValidator<TData>;
export function buildSchema(
  convert: (schema: _JSONSchema) => unknown,
  def: JSONSchema,
  refs?: Record<string, JSONSchema>,
): ParsingValidator<unknown> {
  return (refs ? convert({ ...def, $defs: refs }) : convert(def)) as ParsingValidator<unknown>;
}

/** Behaviour selector for {@link BuildSchemasBundleOptions.onCollision}. */
export type CollisionStrategy = "throw" | "namespace" | "namespace-prefix";

/** Options accepted by {@link buildSchemasBundle}. */
export interface BuildSchemasBundleOptions {
  /**
   * What to do when two ids share the same trailing segment.
   *
   * - `"throw"` (default): match per-package bundles — flag the collision as
   *   a developer error so an SDK consumer doesn't silently pick the "wrong"
   *   schema for a given short name.
   * - `"namespace"`: opt-in for aggregator bundles like
   *   `@maib/merchants/schemas/bundle.json` where collisions across parent
   *   packages are structural, not mistakes. Colliding entries are keyed by
   *   the id minus the leading `maib.` namespace (e.g. `checkout.RefundRequest`,
   *   `ecommerce.RefundRequest`); unique short names keep their short-name key.
   * - `"namespace-prefix"`: like `"namespace"`, but the namespace segment is
   *   PascalCased and concatenated to the short name without a separator —
   *   so `maib.ecommerce.RefundRequest` becomes `EcommerceRefundRequest`,
   *   matching the `CheckoutRefundRequest` / `EcommerceRefundRequest` type
   *   aliases that `@maib/merchants` already exports for the same colliding
   *   pairs. Unique short names still keep their short-name key.
   */
  onCollision?: CollisionStrategy;
}

function pascalCase(segment: string): string {
  if (segment.length === 0) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function collisionKey(id: string, strategy: Exclude<CollisionStrategy, "throw">): string {
  const stripped = id.replace(/^maib\./, "");
  if (strategy === "namespace") return stripped;
  // `namespace-prefix`: PascalCase the namespace segment and concatenate.
  // Falls through to the dotted form if the stripped id is not exactly
  // `<namespace>.<ShortName>` (defensive — preserves uniqueness either way).
  const parts = stripped.split(".");
  if (parts.length === 2) return pascalCase(parts[0]) + parts[1];
  return stripped;
}

/**
 * Convert every definition in a bundle into a validator, keyed by the trailing
 * segment of each id (`maib.checkout.RefundRequest` → `RefundRequest`).
 *
 * Throws on short-name collisions by default. Aggregator bundles such as
 * `@maib/merchants/schemas/bundle.json` contain legitimate cross-package
 * collisions and must opt in via the `onCollision` option:
 *
 * - `"namespace"` → dotted key, e.g. `"checkout.RefundRequest"`.
 * - `"namespace-prefix"` → PascalCase concatenated key, e.g.
 *   `"CheckoutRefundRequest"`, matching the type alias exported from the
 *   merchants package root.
 *
 * Unique short names always keep their short-name key regardless of strategy.
 *
 * @example Per-package bundle (no collisions)
 * ```ts
 * import { z } from "zod";
 * import bundleDef from "@maib/checkout/schemas/bundle.json" with { type: "json" };
 * import { buildSchemasBundle } from "@maib/checkout/schemas";
 *
 * export const SchemasBundle = buildSchemasBundle(z.fromJSONSchema, bundleDef);
 *
 * SchemasBundle.RefundRequest.parse(someObject);
 * ```
 *
 * @example Aggregator bundle — PascalCase keys mirror the type aliases
 * ```ts
 * import { z } from "zod";
 * import bundleDef from "@maib/merchants/schemas/bundle.json" with { type: "json" };
 * import { buildSchemasBundle } from "@maib/merchants/schemas";
 *
 * const Schemas = buildSchemasBundle(z.fromJSONSchema, bundleDef, {
 *   onCollision: "namespace-prefix",
 * });
 *
 * Schemas.CheckoutRefundRequest.parse(checkoutRefundBody);
 * Schemas.EcommerceRefundRequest.parse(ecommerceRefundBody);
 * Schemas.MaibApiError.parse(error); // unique short name kept
 * ```
 */
export function buildSchemasBundle<TSchema>(
  convert: (schema: _JSONSchema) => TSchema,
  bundle: SchemaBundle,
  options: BuildSchemasBundleOptions = {},
): Record<string, TSchema> {
  const onCollision: CollisionStrategy = options.onCollision ?? "throw";
  const ids = Object.keys(bundle.$defs);
  const shortNameCounts = new Map<string, number>();
  for (const id of ids) {
    const shortName = id.split(".").pop();
    if (!shortName) throw new Error(`Schema id has no trailing segment: ${id}`);
    shortNameCounts.set(shortName, (shortNameCounts.get(shortName) ?? 0) + 1);
  }
  if (onCollision === "throw") {
    const firstId = new Map<string, string>();
    for (const id of ids) {
      const shortName = id.split(".").pop() as string;
      if (firstId.has(shortName)) {
        throw new Error(
          `Short-name collision while building schemas: "${shortName}" appears for multiple ids ` +
            `("${firstId.get(shortName)}" and "${id}"). ` +
            `Pass \`{ onCollision: "namespace" }\` or \`{ onCollision: "namespace-prefix" }\` ` +
            `to keep both under disambiguated keys, or call \`buildSchema\` directly with the ` +
            `per-schema JSON file.`,
        );
      }
      firstId.set(shortName, id);
    }
  }
  const out: Record<string, TSchema> = {};
  for (const id of ids) {
    const shortName = id.split(".").pop() as string;
    const key =
      shortNameCounts.get(shortName) === 1
        ? shortName
        : collisionKey(id, onCollision === "throw" ? "namespace" : onCollision);
    out[key] = convert({ ...bundle.$defs[id], $defs: bundle.$defs });
  }
  return out;
}
