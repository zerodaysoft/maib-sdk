import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildSchema, buildSchemasBundle } from "../src/schemas-builder";

/**
 * Merchants has no schemas of its own — the published bundle is built by
 * merging every sub-package's `dist/schemas/bundle.json` at build time. These
 * tests therefore read the published artifacts directly (rather than
 * `z.globalRegistry`, which is empty for this package's source).
 */
const distSchemas = join(__dirname, "..", "dist", "schemas");
const bundle = JSON.parse(readFileSync(join(distSchemas, "bundle.json"), "utf8")) as {
  $defs: Record<string, Record<string, unknown>>;
};
const ids = Object.keys(bundle.$defs);

describe("@maib/merchants schemas — aggregate bundle", () => {
  it("aggregates schemas from every merchant API plus core", () => {
    const prefixes = new Set(ids.map((id) => id.split(".").slice(0, 2).join(".")));
    for (const prefix of ["maib.core", "maib.checkout", "maib.ecommerce", "maib.rtp", "maib.mia"]) {
      expect(prefixes.has(prefix), `bundle should contain ${prefix}.*`).toBe(true);
    }
  });

  it("matches the sum of each sub-package's own schemas", () => {
    function ownIdsOf(pkg: string): string[] {
      const path = join(__dirname, "..", "..", pkg, "dist", "schemas", "bundle.json");
      const b = JSON.parse(readFileSync(path, "utf8")) as { $defs: Record<string, unknown> };
      return Object.keys(b.$defs).filter((id) => id.startsWith(`maib.${pkg}.`));
    }
    const ownByPkg = {
      core: ownIdsOf("core"),
      checkout: ownIdsOf("checkout"),
      ecommerce: ownIdsOf("ecommerce"),
      rtp: ownIdsOf("rtp"),
      mia: ownIdsOf("mia"),
    };
    const totalOwn =
      ownByPkg.core.length +
      ownByPkg.checkout.length +
      ownByPkg.ecommerce.length +
      ownByPkg.rtp.length +
      ownByPkg.mia.length;
    expect(ids.length).toBe(totalOwn);
  });

  it.each(ids)("rebuilds %s via z.fromJSONSchema", (id) => {
    const def = bundle.$defs[id];
    const schema = z.fromJSONSchema({ ...def, $defs: bundle.$defs });
    expect(schema).toBeDefined();
    expect(typeof schema.safeParse).toBe("function");
  });

  it("contains the expected cross-package short-name collisions", () => {
    function pairFor(shortName: string): string[] {
      return ids.filter((id) => id.endsWith(`.${shortName}`));
    }
    expect(pairFor("RefundRequest").sort()).toEqual([
      "maib.checkout.RefundRequest",
      "maib.ecommerce.RefundRequest",
    ]);
    expect(pairFor("RefundResult").sort()).toEqual([
      "maib.checkout.RefundResult",
      "maib.ecommerce.RefundResult",
    ]);
    expect(pairFor("ListPaymentsParams").sort()).toEqual([
      "maib.checkout.ListPaymentsParams",
      "maib.mia.ListPaymentsParams",
    ]);
  });
});

describe("@maib/merchants schemas — buildSchema (per-file)", () => {
  it("validates a checkout-specific refund request from the namespaced leaf", () => {
    const def = JSON.parse(
      readFileSync(join(distSchemas, "CheckoutRefundRequest.json"), "utf8"),
    ) as Record<string, unknown>;
    const schema = buildSchema(z.fromJSONSchema, def);
    expect(schema.safeParse({ amount: 5.5, reason: "duplicate" }).success).toBe(true);
    expect(schema.safeParse({ amount: 0, reason: "x" }).success).toBe(false); // exclusiveMinimum
    expect(schema.safeParse({ amount: 5 }).success).toBe(false); // reason required
  });

  it("validates the Currency enum from the unique-named leaf", () => {
    const def = JSON.parse(readFileSync(join(distSchemas, "Currency.json"), "utf8")) as Record<
      string,
      unknown
    >;
    const schema = buildSchema(z.fromJSONSchema, def);
    expect(schema.safeParse("MDL").success).toBe(true);
    expect(schema.safeParse("USD").success).toBe(true);
    expect(schema.safeParse("ZZZ").success).toBe(false);
    expect(schema.safeParse(42).success).toBe(false);
  });
});

describe("@maib/merchants schemas — buildSchemasBundle (aggregate)", () => {
  it("throws on collisions when onCollision is not set", () => {
    expect(() => buildSchemasBundle(z.fromJSONSchema, bundle)).toThrowError(
      /Short-name collision while building schemas/,
    );
  });

  it("keys colliders under `<pkg>.<ShortName>` when onCollision is `namespace`", () => {
    const Schemas = buildSchemasBundle(z.fromJSONSchema, bundle, {
      onCollision: "namespace",
    });
    expect(Schemas["checkout.RefundRequest"]).toBeDefined();
    expect(Schemas["ecommerce.RefundRequest"]).toBeDefined();
    expect(Schemas["checkout.ListPaymentsParams"]).toBeDefined();
    expect(Schemas["mia.ListPaymentsParams"]).toBeDefined();
    // Unique short names stay short.
    expect(Schemas.MaibApiError).toBeDefined();
    expect(Schemas.Currency).toBeDefined();
    // Total key count equals total id count — no schema is silently dropped.
    expect(Object.keys(Schemas).length).toBe(ids.length);
  });

  it("keys colliders under PascalCase aliases when onCollision is `namespace-prefix`", () => {
    const Schemas = buildSchemasBundle(z.fromJSONSchema, bundle, {
      onCollision: "namespace-prefix",
    });
    // Mirrors the type aliases exported from `@maib/merchants`:
    // `CheckoutRefundRequest`, `EcommerceRefundRequest`, `CheckoutListPaymentsParams`,
    // `MiaListPaymentsParams`.
    expect(Schemas.CheckoutRefundRequest).toBeDefined();
    expect(Schemas.EcommerceRefundRequest).toBeDefined();
    expect(Schemas.CheckoutRefundResult).toBeDefined();
    expect(Schemas.EcommerceRefundResult).toBeDefined();
    expect(Schemas.CheckoutListPaymentsParams).toBeDefined();
    expect(Schemas.MiaListPaymentsParams).toBeDefined();
    expect(Schemas.MaibApiError).toBeDefined();
    expect(Object.keys(Schemas).length).toBe(ids.length);
  });

  it("namespaced colliders parse the expected per-package shape", () => {
    const Schemas = buildSchemasBundle(z.fromJSONSchema, bundle, {
      onCollision: "namespace-prefix",
    }) as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(Schemas.CheckoutRefundRequest.safeParse({ amount: 1, reason: "ok" }).success).toBe(true);
    // ecommerce refund has a different required shape — proving the two are
    // genuinely separate schemas, not one shadowing the other.
    expect(Schemas.EcommerceRefundRequest.safeParse({ amount: 1, reason: "ok" }).success).toBe(
      false,
    );
  });
});
