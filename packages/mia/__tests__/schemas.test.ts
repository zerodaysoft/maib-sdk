import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildBundleFromRegistry, extractSchema } from "@maib/internal-schemas/test-helpers";
import "../src/schemas/index";
import type { CreateQrRequest, CreateQrResult, MiaCallbackResult } from "../src/index";

import { buildSchema, buildSchemasBundle } from "../src/schemas-builder";

const bundle = buildBundleFromRegistry();
const defs = bundle.$defs;
const ids = Object.keys(defs);
const CreateQrRequestDef = extractSchema(bundle, "maib.mia.CreateQrRequest");
const MiaCallbackResultDef = extractSchema(bundle, "maib.mia.MiaCallbackResult");

describe("@maib/mia schemas — bundle", () => {
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

describe("@maib/mia schemas — shared core defs", () => {
  it.each([
    "maib.core.PaymentStatus",
    "maib.core.SortOrder",
    "maib.core.PaginationParams",
  ])("%s is registered in the bundle", (id) => {
    expect(defs[id]).toBeDefined();
  });

  it("ListPaymentsParams composes via allOf $ref to PaginationParams (no inlining)", () => {
    const listParams = defs["maib.mia.ListPaymentsParams"] as {
      allOf?: { $ref?: string }[];
    };
    expect(listParams.allOf?.[0]?.$ref).toBe("#/$defs/maib.core.PaginationParams");
  });
});

describe("@maib/mia schemas — buildSchemasBundle", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("indexes every $defs entry by short name", () => {
    expect(Object.keys(all).sort()).toEqual(ids.map((id) => id.split(".").pop()).sort());
  });

  it("CreateQrRequest accepts a valid Dynamic QR payload", () => {
    const payload: CreateQrRequest = {
      type: "Dynamic",
      amountType: "Fixed",
      currency: "MDL",
      description: "Coffee",
      expiresAt: "2029-01-01T00:00:00Z",
      amount: 50,
    };
    expect((all.CreateQrRequest as z.ZodType<CreateQrRequest>).safeParse(payload).success).toBe(
      true,
    );
  });

  it("CreateQrRequest rejects amount > 100000", () => {
    expect(
      (all.CreateQrRequest as z.ZodType<CreateQrRequest>).safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "MDL",
        description: "x",
        amount: 999999,
      }).success,
    ).toBe(false);
  });

  it("MiaCallbackResult requires payment fields", () => {
    const callback: MiaCallbackResult = {
      qrId: "qr-1",
      qrStatus: "Paid",
      payId: "p-1",
      amount: 50,
      commission: 0.5,
      currency: "MDL",
      payerName: "John",
      payerIban: "MD24AG000000022500000000",
      executedAt: "2029-01-01T00:00:00Z",
    };
    expect(
      (all.MiaCallbackResult as z.ZodType<MiaCallbackResult>).safeParse(callback).success,
    ).toBe(true);
    expect((all.MiaCallbackResult as z.ZodType<MiaCallbackResult>).safeParse({}).success).toBe(
      false,
    );
  });
});

describe("@maib/mia schemas — boundary validation", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("CreateQrRequest rejects amount above the 100000 ceiling", () => {
    const schema = all.CreateQrRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "MDL",
        description: "x",
        amount: 100001,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "MDL",
        description: "x",
        amount: 100000,
      }).success,
    ).toBe(true);
  });

  it("CreateQrRequest rejects an unsupported currency (only MDL allowed)", () => {
    const schema = all.CreateQrRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "USD",
        description: "x",
        amount: 10,
      }).success,
    ).toBe(false);
  });

  it("CreateQrRequest rejects an HTTP callback (HTTPS required)", () => {
    const schema = all.CreateQrRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "MDL",
        description: "x",
        amount: 10,
        callbackUrl: "http://example.com/cb",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "MDL",
        description: "x",
        amount: 10,
        callbackUrl: "https://example.com/cb",
      }).success,
    ).toBe(true);
  });

  it("CreateQrRequest rejects description over 500 characters", () => {
    const schema = all.CreateQrRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        type: "Static",
        amountType: "Fixed",
        currency: "MDL",
        description: "a".repeat(501),
        amount: 10,
      }).success,
    ).toBe(false);
  });

  it("CreateQrRequest rejects an invalid QR type", () => {
    const schema = all.CreateQrRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        type: "InvalidQrType",
        amountType: "Fixed",
        currency: "MDL",
        description: "x",
        amount: 10,
      }).success,
    ).toBe(false);
  });

  it("RefundPaymentRequest rejects non-positive amount when amount is provided", () => {
    const schema = all.RefundPaymentRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ reason: "duplicate", amount: 0 }).success).toBe(false);
    expect(schema.safeParse({ reason: "duplicate", amount: -1 }).success).toBe(false);
    expect(schema.safeParse({ reason: "duplicate", amount: 0.01 }).success).toBe(true);
  });

  it("TestPayRequest rejects payerName longer than 200 chars", () => {
    const schema = all.TestPayRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        qrId: "qr-1",
        amount: 10,
        iban: "MD24",
        currency: "MDL",
        payerName: "a".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("ListPaymentsParams rejects PaymentStatus values outside the enum", () => {
    const schema = all.ListPaymentsParams as z.ZodType<unknown>;
    expect(schema.safeParse({ count: 10, offset: 0, status: "BogusStatus" }).success).toBe(false);
    expect(schema.safeParse({ count: 10, offset: 0, status: "Executed" }).success).toBe(true);
  });
});

describe("@maib/mia schemas — buildSchema (typed)", () => {
  const CreateQrRequestSchema = buildSchema<CreateQrRequest>(z.fromJSONSchema, CreateQrRequestDef);
  const MiaCallbackResultSchema = buildSchema<MiaCallbackResult>(
    z.fromJSONSchema,
    MiaCallbackResultDef,
  );

  it("parses CreateQrRequest", () => {
    const value: CreateQrRequest = {
      type: "Static",
      amountType: "Free",
      currency: "MDL",
      description: "Tip jar",
    };
    expect(CreateQrRequestSchema.parse(value).type).toBe("Static");
  });

  it("CreateQrResult rebuilt from bundle parses url/qrId/type", () => {
    const QrResultSchema = buildSchema<CreateQrResult>(
      z.fromJSONSchema,
      defs["maib.mia.CreateQrResult"],
      defs,
    );
    const value: CreateQrResult = {
      qrId: "qr-2",
      type: "Static",
      url: "https://example.com/qr",
    };
    expect(QrResultSchema.parse(value).qrId).toBe("qr-2");
  });

  it("rejects malformed callback", () => {
    expect(MiaCallbackResultSchema.safeParse({}).success).toBe(false);
  });
});
