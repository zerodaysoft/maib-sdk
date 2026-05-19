import type { Currency, Environment } from "../src/index";

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import CurrencyDefDefault, { CurrencyDef } from "../dist/schemas/Currency";
import EnvironmentDefDefault, { EnvironmentDef } from "../dist/schemas/Environment";
import { buildSchema } from "../src/schemas-builder";

// Core's wrappers cover enum-style types (literal-string unions produced by
// the `as const` pattern). Inference must still resolve to the named union,
// not to a widened `string` or `unknown`.

describe("@maib/core wrapper inference (default import)", () => {
  it("infers Currency union without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, CurrencyDefDefault);
    expectTypeOf(schema.parse("MDL")).toEqualTypeOf<Currency>();
  });

  it("infers Environment union without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, EnvironmentDefDefault);
    expectTypeOf(schema.parse("test")).toEqualTypeOf<Environment>();
  });
});

describe("@maib/core wrapper inference (named import)", () => {
  it("CurrencyDef named export carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, CurrencyDef);
    expectTypeOf(schema.parse("MDL")).toEqualTypeOf<Currency>();
  });

  it("EnvironmentDef named export carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, EnvironmentDef);
    expectTypeOf(schema.parse("test")).toEqualTypeOf<Environment>();
  });
});

describe("@maib/core wrapper inference — does not widen", () => {
  it("does not widen Currency to a generic string", () => {
    const schema = buildSchema(z.fromJSONSchema, CurrencyDef);
    expectTypeOf(schema.parse("MDL")).not.toEqualTypeOf<string>();
    expectTypeOf(schema.parse("MDL")).not.toEqualTypeOf<unknown>();
  });
});
