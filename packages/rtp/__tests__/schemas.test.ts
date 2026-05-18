import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildBundleFromRegistry, extractSchema } from "@maib/internal-schemas/test-helpers";
import "../src/schemas/index";
import type { CreateRtpRequest, RtpCallbackResult, RtpStatusResult } from "../src/index";

import { buildSchema, buildSchemasBundle } from "../src/schemas-builder";

const bundle = buildBundleFromRegistry();
const defs = bundle.$defs;
const ids = Object.keys(defs);
const CreateRtpRequestDef = extractSchema(bundle, "maib.rtp.CreateRtpRequest");
const RtpStatusResultDef = extractSchema(bundle, "maib.rtp.RtpStatusResult");

describe("@maib/rtp schemas — bundle", () => {
  it("ships at least one schema", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it.each(ids)("rebuilds %s via z.fromJSONSchema", (id) => {
    const def = defs[id];

    const schema = z.fromJSONSchema({ ...def, $defs: defs });
    expect(schema).toBeDefined();
    expect(typeof schema.safeParse).toBe("function");
  });

  it.each(ids)("rejects null for %s", (id) => {
    const def = defs[id];

    const schema = z.fromJSONSchema({ ...def, $defs: defs });
    expect(schema.safeParse(null).success).toBe(false);
  });

  it("merged core's $defs", () => {
    expect(ids.some((id) => id.startsWith("maib.core."))).toBe(true);
  });
});

describe("@maib/rtp schemas — shared core defs", () => {
  it.each([
    "maib.core.SortOrder",
    "maib.core.PaginationParams",
  ])("%s is registered in the bundle", (id) => {
    expect(defs[id]).toBeDefined();
  });

  it("ListRtpParams composes via allOf $ref to PaginationParams", () => {
    const listParams = defs["maib.rtp.ListRtpParams"] as {
      allOf?: { $ref?: string }[];
    };
    expect(listParams.allOf?.[0]?.$ref).toBe("#/$defs/maib.core.PaginationParams");
  });
});

describe("@maib/rtp schemas — buildSchemasBundle", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("indexes every $defs entry by short name", () => {
    expect(Object.keys(all).sort()).toEqual(ids.map((id) => id.split(".").pop()).sort());
  });

  it("CreateRtpRequest accepts a valid payload", () => {
    const payload: CreateRtpRequest = {
      alias: "37360000000",
      amount: 25,
      expiresAt: "2029-01-01T00:00:00Z",
      currency: "MDL",
      description: "Loan repayment",
    };
    expect((all.CreateRtpRequest as z.ZodType<CreateRtpRequest>).safeParse(payload).success).toBe(
      true,
    );
  });

  it("CreateRtpRequest rejects bad alias format", () => {
    expect(
      (all.CreateRtpRequest as z.ZodType<CreateRtpRequest>).safeParse({
        alias: "+37360000000",
        amount: 25,
        expiresAt: "2029-01-01T00:00:00Z",
        currency: "MDL",
        description: "x",
      }).success,
    ).toBe(false);
  });

  it("RtpCallbackResult parses a full payload", () => {
    const payload: RtpCallbackResult = {
      rtpId: "rtp-1",
      rtpStatus: "Accepted",
      payId: "p-1",
      amount: 25,
      commission: 0.5,
      currency: "MDL",
      payerName: "John",
      payerIban: "MD24AG000000022500000000",
      executedAt: "2029-01-01T00:00:00Z",
    };
    expect((all.RtpCallbackResult as z.ZodType<RtpCallbackResult>).safeParse(payload).success).toBe(
      true,
    );
  });
});

describe("@maib/rtp schemas — boundary validation", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  const baseCreateRtp: CreateRtpRequest = {
    alias: "37360000000",
    amount: 25,
    expiresAt: "2029-01-01T00:00:00Z",
    currency: "MDL",
    description: "Loan repayment",
  };

  it("CreateRtpRequest rejects alias missing the 373 country prefix", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, alias: "76060000000" }).success).toBe(false);
  });

  it("CreateRtpRequest rejects alias with wrong length (not 11 digits total)", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, alias: "3736000000" }).success).toBe(false);
    expect(schema.safeParse({ ...baseCreateRtp, alias: "373600000000" }).success).toBe(false);
  });

  it("CreateRtpRequest rejects an HTTP callback URL (HTTPS required)", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, callbackUrl: "http://example.com" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...baseCreateRtp, callbackUrl: "https://example.com" }).success).toBe(
      true,
    );
  });

  it("CreateRtpRequest rejects non-positive amount", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, amount: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...baseCreateRtp, amount: -1 }).success).toBe(false);
  });

  it("CreateRtpRequest rejects currency other than MDL", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, currency: "USD" as never }).success).toBe(false);
  });

  it("CreateRtpRequest rejects description over 500 characters", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, description: "a".repeat(501) }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...baseCreateRtp, description: "a".repeat(500) }).success).toBe(true);
  });

  it("CreateRtpRequest rejects orderId / terminalId over 100 characters", () => {
    const schema = all.CreateRtpRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...baseCreateRtp, orderId: "a".repeat(101) }).success).toBe(false);
    expect(schema.safeParse({ ...baseCreateRtp, terminalId: "a".repeat(101) }).success).toBe(false);
  });

  it("ListRtpParams rejects an unknown sort order value", () => {
    const schema = all.ListRtpParams as z.ZodType<unknown>;
    expect(schema.safeParse({ count: 10, offset: 0, order: "up" }).success).toBe(false);
    expect(schema.safeParse({ count: 10, offset: 0, order: "desc" }).success).toBe(true);
  });

  it("ListRtpParams rejects an unknown RtpStatus enum value", () => {
    const schema = all.ListRtpParams as z.ZodType<unknown>;
    expect(schema.safeParse({ count: 10, offset: 0, status: "Unknown" }).success).toBe(false);
    expect(schema.safeParse({ count: 10, offset: 0, status: "Active" }).success).toBe(true);
  });
});

describe("@maib/rtp schemas — buildSchema (typed)", () => {
  const CreateRtpRequestSchema = buildSchema<CreateRtpRequest>(
    z.fromJSONSchema,
    CreateRtpRequestDef,
  );
  const RtpStatusResultSchema = buildSchema<RtpStatusResult>(z.fromJSONSchema, RtpStatusResultDef);

  it("parses CreateRtpRequest", () => {
    const result = CreateRtpRequestSchema.parse({
      alias: "37360000001",
      amount: 100,
      expiresAt: "2029-01-01T00:00:00Z",
      currency: "MDL",
      description: "Tip",
    });
    expect(result.amount).toBe(100);
  });

  it("rejects RtpStatusResult missing required fields", () => {
    expect(RtpStatusResultSchema.safeParse({}).success).toBe(false);
  });

  it("RtpStatusResult parses a populated record", () => {
    const value: RtpStatusResult = {
      rtpId: "rtp-2",
      status: "Active",
      amount: 50,
      currency: "MDL",
      description: "x",
      createdAt: "2029-01-01T00:00:00Z",
      updatedAt: "2029-01-01T00:00:00Z",
      expiresAt: "2029-01-02T00:00:00Z",
    };
    expect(RtpStatusResultSchema.parse(value).rtpId).toBe("rtp-2");
  });
});
