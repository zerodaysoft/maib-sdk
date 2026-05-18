import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildBundleFromRegistry, extractSchema } from "@maib/internal-schemas/test-helpers";
import "../src/schemas/index";
import type { MaibApiError, PaginationParams, TokenResult } from "../src/index";

import { buildSchema, buildSchemasBundle } from "../src/schemas-builder";

const bundle = buildBundleFromRegistry();
const ids = Object.keys(bundle.$defs);
const MaibApiErrorDef = extractSchema(bundle, "maib.core.MaibApiError");

describe("@maib/core schemas — bundle", () => {
  it("ships at least one schema", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it.each(ids)("rebuilds %s via z.fromJSONSchema", (id) => {
    const def = bundle.$defs[id];

    const schema = z.fromJSONSchema({ ...def, $defs: bundle.$defs });
    expect(schema).toBeDefined();
    expect(typeof schema.safeParse).toBe("function");
  });

  it.each(ids)("rejects null for %s", (id) => {
    const def = bundle.$defs[id];

    const schema = z.fromJSONSchema({ ...def, $defs: bundle.$defs });
    expect(schema.safeParse(null).success).toBe(false);
  });
});

describe("@maib/core schemas — buildSchemasBundle", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("indexes every $defs entry by short name", () => {
    expect(Object.keys(all).sort()).toEqual(ids.map((id) => id.split(".").pop()).sort());
  });

  it("MaibApiError parses a valid payload", () => {
    const payload: MaibApiError = {
      errorCode: "invalid_request",
      errorMessage: "Bad request",
    };
    const result = (all.MaibApiError as z.ZodType<MaibApiError>).safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("TokenResult requires accessToken/expiresIn/tokenType", () => {
    const partial = { accessToken: "abc" };
    const result = (all.TokenResult as z.ZodType<TokenResult>).safeParse(partial);
    expect(result.success).toBe(false);
  });

  it("PaginationParams requires count & offset", () => {
    const ok: PaginationParams = { count: 10, offset: 0 };
    expect((all.PaginationParams as z.ZodType<PaginationParams>).safeParse(ok).success).toBe(true);
    expect(
      (all.PaginationParams as z.ZodType<PaginationParams>).safeParse({ count: 10 }).success,
    ).toBe(false);
  });
});

describe("@maib/core schemas — buildSchema (typed)", () => {
  const MaibApiErrorSchema = buildSchema<MaibApiError>(z.fromJSONSchema, MaibApiErrorDef);

  it("parses a valid error and returns the SDK's TS shape", () => {
    const value = MaibApiErrorSchema.parse({
      errorCode: "x",
      errorMessage: "y",
    });
    expect(value.errorCode).toBe("x");
    expect(value.errorMessage).toBe("y");
  });

  it("rejects missing required fields", () => {
    const result = MaibApiErrorSchema.safeParse({ errorCode: "only-code" });
    expect(result.success).toBe(false);
  });

  it("per-schema JSON file is self-contained (no external refs needed)", () => {
    // MaibApiError has no outward $ref, so the extracted per-schema def should
    // omit $defs entirely. Downstream packages that do have refs embed only
    // the transitively-reachable subset.
    expect("$defs" in MaibApiErrorDef).toBe(false);
  });
});
