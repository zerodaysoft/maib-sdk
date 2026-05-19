import type { AnswerConsentChallengeBody, ConsentStatus } from "../src/index";

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import AnswerConsentChallengeBodyDefDefault, {
  AnswerConsentChallengeBodyDef,
} from "../dist/schemas/AnswerConsentChallengeBody";
import ConsentStatusDefDefault, { ConsentStatusDef } from "../dist/schemas/ConsentStatus";
import { buildSchema } from "../src/schemas-builder";

describe("@maib/ob wrapper inference (default import)", () => {
  it("infers AnswerConsentChallengeBody without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, AnswerConsentChallengeBodyDefDefault);
    expectTypeOf(schema.parse({})).toEqualTypeOf<AnswerConsentChallengeBody>();
  });

  it("infers ConsentStatus without a manual generic", () => {
    const schema = buildSchema(z.fromJSONSchema, ConsentStatusDefDefault);
    expectTypeOf(schema.parse("PENDING")).toEqualTypeOf<ConsentStatus>();
  });
});

describe("@maib/ob wrapper inference (named import)", () => {
  it("AnswerConsentChallengeBodyDef carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, AnswerConsentChallengeBodyDef);
    expectTypeOf(schema.parse({})).toEqualTypeOf<AnswerConsentChallengeBody>();
  });

  it("ConsentStatusDef carries the phantom marker", () => {
    const schema = buildSchema(z.fromJSONSchema, ConsentStatusDef);
    expectTypeOf(schema.parse("PENDING")).toEqualTypeOf<ConsentStatus>();
  });
});

describe("@maib/ob wrapper inference — does not widen", () => {
  it("does not collapse to unknown", () => {
    const schema = buildSchema(z.fromJSONSchema, AnswerConsentChallengeBodyDef);
    expectTypeOf(schema.parse({})).not.toEqualTypeOf<unknown>();
  });
});
