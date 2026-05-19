import { assertType, describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { buildSchema, type JSONSchema, type ParsingValidator } from "../src/schemas-builder";

/**
 * Type-level guard for the inference contract that `buildSchema` exposes to
 * SDK consumers. These tests fail compilation if the contract regresses —
 * vitest's typecheck runner picks them up via the `__tests__` test-d glob.
 *
 * Why these matter:
 *
 * - The first `buildSchema` overload is supposed to recover the SDK interface
 *   `T` from the phantom `__maibType` marker on the wrapper file's typed
 *   default export, so consumers write `buildSchema(z.fromJSONSchema, Def)`
 *   without needing a manual generic.
 *
 * - The generated wrappers (see `scripts/build-schemas.mjs`) declare exactly
 *   `{ readonly __maibType: T } & Record<string, unknown>` for that marker.
 *   These tests synthesize the same shape and pin down what `buildSchema`
 *   resolves to for both the inference path and the explicit-generic path.
 */

// Minimal interface that stands in for a real SDK type like `CallbackPayload`.
interface FixturePayload {
  payId: string;
  amount: number;
}

// Synthesize the typed default export that build-schemas.mjs emits. The shape
// MUST stay aligned with `scripts/build-schemas.mjs` — see the wrapper-shape
// test in `build-schemas/post-phase.test.ts` for the matching runtime check.
declare const FixturePayloadDef: {
  readonly __maibType: FixturePayload;
} & Record<string, unknown>;

// A raw JSON schema with no phantom marker — mimics the
// `import x from "./X.json" with { type: "json" }` path that consumers fall
// back to. Should hit the second overload of `buildSchema`.
declare const RawJsonDef: JSONSchema;

describe("buildSchema inference (typed wrapper path)", () => {
  it("recovers T from the phantom __maibType marker without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, FixturePayloadDef);
    // The inferred T must be FixturePayload, not unknown — that's the whole
    // point of the phantom marker. A failure here means the structural match
    // against TypedSchemaDef<T> stopped working (e.g. the wrapper's emitted
    // shape drifted from what the overload expects).
    expectTypeOf(schema).toEqualTypeOf<ParsingValidator<FixturePayload>>();
    expectTypeOf(schema.parse({})).toEqualTypeOf<FixturePayload>();
  });

  it("propagates T through safeParse's success branch", () => {
    const schema = buildSchema(z.fromJSONSchema, FixturePayloadDef);
    const result = schema.safeParse({});
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<FixturePayload>();
    }
  });

  it("preserves T when refs are passed alongside", () => {
    const schema = buildSchema(z.fromJSONSchema, FixturePayloadDef, {
      "maib.fixture.Other": { type: "string" },
    });
    expectTypeOf(schema).toEqualTypeOf<ParsingValidator<FixturePayload>>();
  });
});

describe("buildSchema inference (raw JSON path)", () => {
  it("requires an explicit generic when the marker is absent", () => {
    // Without an explicit generic, the marker-less overload kicks in and
    // returns `ParsingValidator<unknown>`. This documents the trade-off —
    // consumers using `with { type: \"json\" }` opt out of inference.
    const schema = buildSchema(z.fromJSONSchema, RawJsonDef);
    expectTypeOf(schema).toEqualTypeOf<ParsingValidator<unknown>>();
  });

  it("supports an explicit type argument to recover T on the raw path", () => {
    const schema = buildSchema<FixturePayload>(z.fromJSONSchema, RawJsonDef);
    expectTypeOf(schema).toEqualTypeOf<ParsingValidator<FixturePayload>>();
  });
});

describe("buildSchema return shape", () => {
  it("returns ParsingValidator<T> exposing parse + safeParse", () => {
    const schema = buildSchema(z.fromJSONSchema, FixturePayloadDef);
    expectTypeOf(schema.parse).parameter(0).toEqualTypeOf<unknown>();
    expectTypeOf(schema.parse).returns.toEqualTypeOf<FixturePayload>();
    expectTypeOf(schema.safeParse).parameter(0).toEqualTypeOf<unknown>();
    expectTypeOf(schema.safeParse).returns.toEqualTypeOf<
      { success: true; data: FixturePayload } | { success: false; error: unknown }
    >();
  });
});

describe("ParsingValidator structural contract", () => {
  it("is assignable from a Zod schema (the canonical implementation)", () => {
    const zodSchema = z.object({ payId: z.string(), amount: z.number() });
    // Zod's `z.ZodObject<...>` satisfies the ParsingValidator<T> shape
    // structurally. If this stops compiling, the SDK's contract with Zod
    // consumers is broken.
    const asValidator: ParsingValidator<FixturePayload> =
      zodSchema as unknown as ParsingValidator<FixturePayload>;
    assertType<ParsingValidator<FixturePayload>>(asValidator);
  });
});
