import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildSchema,
  buildSchemasBundle,
  type JSONSchemaDef,
  type SchemaBundle,
} from "../src/schemas-builder";

/**
 * Synthetic bundles exercising the validator-agnostic helpers in isolation
 * from the published `dist/schemas/bundle.json` artifact. These tests guard
 * the contract `buildSchema` / `buildSchemasBundle` expose to SDK consumers:
 * collision detection, ref resolution, short-name indexing.
 */

const objectBundle: SchemaBundle = {
  $defs: {
    "test.Pet": {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    },
    "test.Owner": {
      type: "object",
      properties: {
        ownerName: { type: "string" },
        pet: { $ref: "#/$defs/test.Pet" },
      },
      required: ["ownerName", "pet"],
      additionalProperties: false,
    },
  },
};

describe("buildSchema", () => {
  it("builds a self-contained schema without refs", () => {
    const schema = buildSchema(
      z.fromJSONSchema as (s: JSONSchemaDef) => unknown,
      objectBundle.$defs["test.Pet"],
    );
    expect(schema.safeParse({ name: "Rex" }).success).toBe(true);
    expect(schema.safeParse({ name: 42 }).success).toBe(false);
  });

  it("resolves $ref when refs are passed explicitly", () => {
    const ownerDef = objectBundle.$defs["test.Owner"];
    const schema = buildSchema(
      z.fromJSONSchema as (s: JSONSchemaDef) => unknown,
      ownerDef,
      objectBundle.$defs,
    );
    expect(schema.safeParse({ ownerName: "Alice", pet: { name: "Rex" } }).success).toBe(true);
    // Without refs argument, $ref would be unresolved and parse should not succeed.
    expect(schema.safeParse({ ownerName: "Alice", pet: { name: 42 } }).success).toBe(false);
  });

  it("invokes convert exactly once with the merged definition", () => {
    let callCount = 0;
    let received: JSONSchemaDef | null = null;
    const convert = (s: JSONSchemaDef) => {
      callCount += 1;
      received = s;
      return { parse: () => null, safeParse: () => ({ success: true, data: null }) };
    };
    buildSchema(convert, objectBundle.$defs["test.Owner"], objectBundle.$defs);
    expect(callCount).toBe(1);
    expect(received).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: received is set in convert
    expect((received! as { $defs?: unknown }).$defs).toBe(objectBundle.$defs);
  });

  it("does not attach $defs when refs argument is omitted", () => {
    let received: JSONSchemaDef | null = null;
    const convert = (s: JSONSchemaDef) => {
      received = s;
      return { parse: () => null, safeParse: () => ({ success: true, data: null }) };
    };
    buildSchema(convert, objectBundle.$defs["test.Pet"]);
    expect(received).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: received is set in convert
    expect("$defs" in (received! as object)).toBe(false);
  });
});

describe("buildSchemasBundle", () => {
  it("indexes every $defs entry by short name (trailing id segment)", () => {
    const out = buildSchemasBundle(z.fromJSONSchema, objectBundle);
    expect(Object.keys(out).sort()).toEqual(["Owner", "Pet"]);
  });

  it("embeds $defs into each converted schema (so $ref resolves at parse time)", () => {
    const out = buildSchemasBundle(z.fromJSONSchema, objectBundle);
    const owner = out.Owner as z.ZodType<{ ownerName: string; pet: { name: string } }>;
    expect(owner.safeParse({ ownerName: "Bob", pet: { name: "Fido" } }).success).toBe(true);
  });

  it("throws on short-name collisions by default", () => {
    const collidingBundle: SchemaBundle = {
      $defs: {
        "alpha.Foo": { type: "string" },
        "beta.Foo": { type: "number" },
      },
    };
    expect(() => buildSchemasBundle(z.fromJSONSchema, collidingBundle)).toThrowError(
      /Short-name collision while building schemas: "Foo"/,
    );
  });

  it("falls back to namespaced keys when onCollision is `namespace`", () => {
    const collidingBundle: SchemaBundle = {
      $defs: {
        "maib.alpha.Foo": { type: "string" },
        "maib.beta.Foo": { type: "number" },
        "maib.alpha.Unique": { type: "boolean" },
      },
    };
    const out = buildSchemasBundle(z.fromJSONSchema, collidingBundle, {
      onCollision: "namespace",
    });
    // Collisions are keyed by id minus the leading `maib.` namespace; uniques
    // keep their short-name key — symmetric with the per-schema file layout
    // emitted by `scripts/build-schemas.mjs --allow-collisions`.
    expect(Object.keys(out).sort()).toEqual(["Unique", "alpha.Foo", "beta.Foo"]);
    const alphaFoo = out["alpha.Foo"] as z.ZodType<string>;
    const betaFoo = out["beta.Foo"] as z.ZodType<number>;
    expect(alphaFoo.safeParse("abc").success).toBe(true);
    expect(alphaFoo.safeParse(42).success).toBe(false);
    expect(betaFoo.safeParse(42).success).toBe(true);
    expect(betaFoo.safeParse("abc").success).toBe(false);
  });

  it("namespace fallback strips only the leading `maib.` prefix", () => {
    const collidingBundle: SchemaBundle = {
      $defs: {
        "alpha.Foo": { type: "string" },
        "beta.Foo": { type: "number" },
      },
    };
    const out = buildSchemasBundle(z.fromJSONSchema, collidingBundle, {
      onCollision: "namespace",
    });
    expect(Object.keys(out).sort()).toEqual(["alpha.Foo", "beta.Foo"]);
  });

  it("PascalCases the namespace segment when onCollision is `namespace-prefix`", () => {
    const collidingBundle: SchemaBundle = {
      $defs: {
        "maib.checkout.RefundRequest": { type: "object" },
        "maib.ecommerce.RefundRequest": { type: "object" },
        "maib.checkout.UniquePerCheckout": { type: "string" },
        "maib.core.MaibApiError": { type: "object" },
      },
    };
    const out = buildSchemasBundle(z.fromJSONSchema, collidingBundle, {
      onCollision: "namespace-prefix",
    });
    expect(Object.keys(out).sort()).toEqual([
      "CheckoutRefundRequest",
      "EcommerceRefundRequest",
      "MaibApiError",
      "UniquePerCheckout",
    ]);
  });

  it("`namespace-prefix` PascalCases any 2-part id (with or without `maib.` prefix)", () => {
    const collidingBundle: SchemaBundle = {
      $defs: {
        "alpha.Foo": { type: "string" },
        "beta.Foo": { type: "number" },
      },
    };
    const out = buildSchemasBundle(z.fromJSONSchema, collidingBundle, {
      onCollision: "namespace-prefix",
    });
    expect(Object.keys(out).sort()).toEqual(["AlphaFoo", "BetaFoo"]);
  });

  it("`namespace-prefix` falls back to the dotted form for ids without a clear namespace segment", () => {
    // Defensive: a 3+-segment id (after stripping `maib.`) doesn't fit the
    // `<namespace>.<ShortName>` shape, so we keep the dotted form to preserve
    // uniqueness rather than guessing where to split.
    const collidingBundle: SchemaBundle = {
      $defs: {
        "maib.nested.deep.Foo": { type: "string" },
        "maib.other.deep.Foo": { type: "number" },
      },
    };
    const out = buildSchemasBundle(z.fromJSONSchema, collidingBundle, {
      onCollision: "namespace-prefix",
    });
    expect(Object.keys(out).sort()).toEqual(["nested.deep.Foo", "other.deep.Foo"]);
  });

  it("throws on an id with no trailing segment", () => {
    const malformed: SchemaBundle = {
      $defs: {
        // Trailing-segment extraction is split("."), and ".pop()" returns undefined
        // only for the empty string id — an unusual but possible registry mistake
        // to guard against.
        "": { type: "string" },
      },
    };
    expect(() => buildSchemasBundle(z.fromJSONSchema, malformed)).toThrowError(
      /Schema id has no trailing segment/,
    );
  });

  it("returns an empty index for an empty bundle", () => {
    const out = buildSchemasBundle(z.fromJSONSchema, { $defs: {} });
    expect(out).toEqual({});
  });

  it("passes a fresh per-entry convert call (no shared state)", () => {
    const seen: JSONSchemaDef[] = [];
    const convert = (s: JSONSchemaDef) => {
      seen.push(s);
      return { parse: () => null, safeParse: () => ({ success: true, data: null }) };
    };
    buildSchemasBundle(convert, objectBundle);
    expect(seen.length).toBe(2);
    // Each call carries the same $defs (the original bundle), so $ref resolution
    // is uniform regardless of which entry buildSchemasBundle processes first.
    for (const def of seen) {
      expect((def as { $defs?: unknown }).$defs).toBe(objectBundle.$defs);
    }
  });
});
