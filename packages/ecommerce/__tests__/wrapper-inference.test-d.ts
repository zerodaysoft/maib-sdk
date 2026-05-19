import type { CallbackPayload, CallbackResult } from "../src/index";

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

// Pulls from the GENERATED `dist/schemas/` wrappers — the same files an
// npm-installed consumer would touch. If these imports break, the build
// pipeline (scripts/build-schemas.mjs) has drifted from the wrapper contract.
import CallbackPayloadDefDefault, { CallbackPayloadDef } from "../dist/schemas/CallbackPayload";
import CallbackResultDefDefault, { CallbackResultDef } from "../dist/schemas/CallbackResult";
import { buildSchema } from "../src/schemas-builder";

/**
 * End-to-end inference contract: building a validator from a generated
 * wrapper must recover the SDK interface without a manual generic. This is
 * the regression test for the bug where wrappers imported `TypedSchemaDef`
 * from `@maib/internal-schemas` (a devDep that isn't installed on the
 * consumer side), which silently collapsed inference to
 * `ParsingValidator<unknown>`.
 */

describe("@maib/ecommerce wrapper inference (default import)", () => {
  it("buildSchema(z.fromJSONSchema, Def) infers ParsingValidator<CallbackPayload>", () => {
    const schema = buildSchema(z.fromJSONSchema, CallbackPayloadDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CallbackPayload>();
  });

  it("buildSchema(z.fromJSONSchema, Def) infers ParsingValidator<CallbackResult>", () => {
    const schema = buildSchema(z.fromJSONSchema, CallbackResultDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CallbackResult>();
  });
});

describe("@maib/ecommerce wrapper inference (named import)", () => {
  it("named CallbackPayloadDef carries the same phantom marker as default", () => {
    const schema = buildSchema(z.fromJSONSchema, CallbackPayloadDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CallbackPayload>();
  });

  it("named CallbackResultDef carries the same phantom marker as default", () => {
    const schema = buildSchema(z.fromJSONSchema, CallbackResultDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CallbackResult>();
  });
});

describe("@maib/ecommerce wrapper inference — failure modes", () => {
  it("does not silently widen the type to unknown", () => {
    const schema = buildSchema(z.fromJSONSchema, CallbackPayloadDef);
    // The whole purpose of the typed-wrapper pattern: this must NOT match
    // `unknown`. If it does, inference is broken and the SDK fell back to
    // the marker-less overload.
    expectTypeOf(schema.parse({})).not.toEqualTypeOf<unknown>();
  });
});
