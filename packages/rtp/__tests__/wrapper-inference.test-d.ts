import type { CancelRtpRequest, CancelRtpResult } from "../src/index";

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import CancelRtpRequestDefDefault, { CancelRtpRequestDef } from "../dist/schemas/CancelRtpRequest";
import CancelRtpResultDefDefault, { CancelRtpResultDef } from "../dist/schemas/CancelRtpResult";
import { buildSchema } from "../src/schemas-builder";

describe("@maib/rtp wrapper inference (default import)", () => {
  it("infers CancelRtpRequest without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelRtpRequestDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelRtpRequest>();
  });

  it("infers CancelRtpResult without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelRtpResultDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelRtpResult>();
  });
});

describe("@maib/rtp wrapper inference (named import)", () => {
  it("CancelRtpRequestDef carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelRtpRequestDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelRtpRequest>();
  });

  it("CancelRtpResultDef carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelRtpResultDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<CancelRtpResult>();
  });
});

describe("@maib/rtp wrapper inference — does not widen", () => {
  it("does not collapse to unknown", () => {
    const schema = buildSchema(z.fromJSONSchema, CancelRtpRequestDef);
    expectTypeOf(schema.parse({})).not.toEqualTypeOf<unknown>();
  });
});
