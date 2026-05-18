import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildSchema,
  buildSchemasBundle,
  type JSONSchemaDef,
  type SchemaBundle,
} from "../src/schemas-builder";

/**
 * `@maib/ob` ships its own copy of `schemas-builder.ts` because the package is
 * standalone (it doesn't depend on `@maib/core`). These tests guard the
 * collision/ref contract here so the duplicate doesn't drift silently from
 * core's version. If you add behaviour to one builder, mirror it here.
 */

it("schemas-builder source is byte-identical to @maib/core's copy", () => {
  const coreSrc = readFileSync(resolve(__dirname, "../../core/src/schemas-builder.ts"), "utf8");
  const obSrc = readFileSync(resolve(__dirname, "../src/schemas-builder.ts"), "utf8");
  expect(obSrc).toBe(coreSrc);
});

const objectBundle: SchemaBundle = {
  $defs: {
    "ob.Cat": {
      type: "object",
      properties: { whisker: { type: "string" } },
      required: ["whisker"],
      additionalProperties: false,
    },
    "ob.Box": {
      type: "object",
      properties: {
        size: { type: "number" },
        cat: { $ref: "#/$defs/ob.Cat" },
      },
      required: ["size", "cat"],
      additionalProperties: false,
    },
  },
};

describe("ob buildSchema", () => {
  it("builds a self-contained schema without refs", () => {
    const schema = buildSchema(
      z.fromJSONSchema as (s: JSONSchemaDef) => unknown,
      objectBundle.$defs["ob.Cat"],
    );
    expect(schema.safeParse({ whisker: "long" }).success).toBe(true);
    expect(schema.safeParse({ whisker: 1 }).success).toBe(false);
  });

  it("resolves $ref when refs are passed", () => {
    const schema = buildSchema(
      z.fromJSONSchema as (s: JSONSchemaDef) => unknown,
      objectBundle.$defs["ob.Box"],
      objectBundle.$defs,
    );
    expect(schema.safeParse({ size: 1, cat: { whisker: "long" } }).success).toBe(true);
    expect(schema.safeParse({ size: 1, cat: { whisker: 1 } }).success).toBe(false);
  });
});

describe("ob buildSchemasBundle", () => {
  it("indexes by short name", () => {
    const out = buildSchemasBundle(z.fromJSONSchema, objectBundle);
    expect(Object.keys(out).sort()).toEqual(["Box", "Cat"]);
  });

  it("throws on short-name collision", () => {
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

  it("throws on an id with no trailing segment", () => {
    const malformed: SchemaBundle = { $defs: { "": { type: "string" } } };
    expect(() => buildSchemasBundle(z.fromJSONSchema, malformed)).toThrowError(
      /Schema id has no trailing segment/,
    );
  });
});
