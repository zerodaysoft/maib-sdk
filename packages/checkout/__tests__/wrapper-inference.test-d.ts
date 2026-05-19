import type { CancelSessionResult, CheckoutCallbackPayload } from "../src/index";

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

// Pulls from the GENERATED `dist/schemas/` wrappers — the same files an
// npm-installed consumer would touch. Regression guard for the bug where
// wrappers imported `TypedSchemaDef` from a workspace-only devDep, which
// collapsed `buildSchema(Def)` inference to `ParsingValidator<unknown>`.
import CancelSessionResultDefDefault, {
  CancelSessionResultDef,
} from "../dist/schemas/CancelSessionResult";
import CheckoutCallbackPayloadDefDefault, {
  CheckoutCallbackPayloadDef,
} from "../dist/schemas/CheckoutCallbackPayload";
import { buildSchema } from "../src/schemas-builder";

describe("@maib/checkout wrapper inference (default import)", () => {
  it("infers CancelSessionResult without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelSessionResultDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelSessionResult>();
  });

  it("infers CheckoutCallbackPayload without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, CheckoutCallbackPayloadDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CheckoutCallbackPayload>();
  });
});

describe("@maib/checkout wrapper inference (named import)", () => {
  it("named CancelSessionResultDef carries the same phantom marker as default", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelSessionResultDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelSessionResult>();
  });

  it("named CheckoutCallbackPayloadDef carries the same phantom marker as default", () => {
    const schema = buildSchema(z.fromJSONSchema, CheckoutCallbackPayloadDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CheckoutCallbackPayload>();
  });
});

describe("@maib/checkout wrapper inference — does not widen", () => {
  it("never collapses to ParsingValidator<unknown>", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelSessionResultDef);
    expectTypeOf(schema.parse({})).not.toEqualTypeOf<unknown>();
  });
});
