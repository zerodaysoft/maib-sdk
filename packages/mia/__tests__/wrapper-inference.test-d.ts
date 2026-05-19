import type { AmountType, CancelExtensionRequest } from "../src/index";

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import AmountTypeDefDefault, { AmountTypeDef } from "../dist/schemas/AmountType";
import CancelExtensionRequestDefDefault, {
  CancelExtensionRequestDef,
} from "../dist/schemas/CancelExtensionRequest";
import { buildSchema } from "../src/schemas-builder";

describe("@maib/mia wrapper inference (default import)", () => {
  it("infers AmountType without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, AmountTypeDefDefault);
    expectTypeOf(schema.parse("Fixed")).toEqualTypeOf<AmountType>();
  });

  it("infers CancelExtensionRequest without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelExtensionRequestDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelExtensionRequest>();
  });
});

describe("@maib/mia wrapper inference (named import)", () => {
  it("AmountTypeDef carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, AmountTypeDef);
    expectTypeOf(schema.parse("Fixed")).toEqualTypeOf<AmountType>();
  });

  it("CancelExtensionRequestDef carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelExtensionRequestDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelExtensionRequest>();
  });
});

describe("@maib/mia wrapper inference — does not widen", () => {
  it("does not collapse to unknown", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelExtensionRequestDef);
    expectTypeOf(schema.parse({})).not.toEqualTypeOf<unknown>();
  });
});
