import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildBundleFromRegistry, extractSchema } from "@maib/internal-schemas/test-helpers";
import "#schemas/index";
import type {
  CancelSessionResult,
  CreateSessionRequest,
  RefundRequest,
  RefundResult,
} from "#index";

import { buildSchema, buildSchemasBundle } from "#schemas-builder";

const bundle = buildBundleFromRegistry();
const defs = bundle.$defs;
const ids = Object.keys(defs);
const CancelSessionResultDef = extractSchema(bundle, "maib.checkout.CancelSessionResult");
const CreateSessionRequestDef = extractSchema(bundle, "maib.checkout.CreateSessionRequest");
const RefundRequestDef = extractSchema(bundle, "maib.checkout.RefundRequest");

describe("@maib/checkout schemas — bundle", () => {
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

  it("includes shared core schemas", () => {
    expect(ids.some((id) => id.startsWith("maib.core."))).toBe(true);
  });
});

describe("@maib/checkout schemas — shared core defs", () => {
  it("Currency carries the full ISO 4217 enum", () => {
    const currency = defs["maib.core.Currency"] as { enum?: string[] };
    expect(Array.isArray(currency.enum)).toBe(true);
    expect((currency.enum ?? []).length).toBeGreaterThanOrEqual(170);
    expect(currency.enum).toContain("MDL");
    expect(currency.enum).toContain("USD");
    expect(currency.enum).toContain("EUR");
  });

  it("local schemas reference core via $ref (not by inlining the enum)", () => {
    const payload = JSON.stringify(defs["maib.checkout.CheckoutCallbackPayload"]);
    const inlineCount = (payload.match(/"AED"/g) ?? []).length;
    const refCount = (payload.match(/"#\/\$defs\/maib\.core\.Currency"/g) ?? []).length;
    expect(inlineCount).toBe(0);
    expect(refCount).toBeGreaterThanOrEqual(2);
  });
});

describe("@maib/checkout schemas — buildSchemasBundle", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("indexes every $defs entry by short name", () => {
    expect(Object.keys(all).sort()).toEqual(ids.map((id) => id.split(".").pop()).sort());
  });

  it("RefundRequest accepts a valid payload", () => {
    const payload: RefundRequest = { amount: 5.5, reason: "duplicate charge" };
    expect((all.RefundRequest as z.ZodType<RefundRequest>).safeParse(payload).success).toBe(true);
  });

  it("RefundRequest rejects non-positive amount", () => {
    expect(
      (all.RefundRequest as z.ZodType<RefundRequest>).safeParse({
        amount: -1,
        reason: "x",
      }).success,
    ).toBe(false);
  });

  it("RefundRequest rejects missing reason", () => {
    expect((all.RefundRequest as z.ZodType<RefundRequest>).safeParse({ amount: 5 }).success).toBe(
      false,
    );
  });

  it("CreateSessionRequest resolves the OrderInfo $ref across schemas", () => {
    const result = (all.CreateSessionRequest as z.ZodType<unknown>).safeParse({
      amount: 100,
      currency: "MDL",
      orderInfo: { id: "X1", description: "test" },
    });
    expect(result.success).toBe(true);
  });
});

describe("@maib/checkout schemas — boundary validation", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);
  const CreateSessionRequestSchema = buildSchema<CreateSessionRequest>(
    z.fromJSONSchema,
    CreateSessionRequestDef,
    defs,
  );
  const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);

  it("CreateSessionRequest rejects non-positive amount", () => {
    expect(CreateSessionRequestSchema.safeParse({ amount: 0, currency: "MDL" }).success).toBe(
      false,
    );
    expect(CreateSessionRequestSchema.safeParse({ amount: -1, currency: "MDL" }).success).toBe(
      false,
    );
  });

  it("CreateSessionRequest rejects an unknown currency code", () => {
    expect(
      CreateSessionRequestSchema.safeParse({ amount: 10, currency: "XYZ" as never }).success,
    ).toBe(false);
  });

  it("CreateSessionRequest rejects a non-URL callback", () => {
    expect(
      CreateSessionRequestSchema.safeParse({
        amount: 10,
        currency: "MDL",
        callbackUrl: "not-a-url",
      }).success,
    ).toBe(false);
  });

  it("CreateSessionRequest accepts an IPv4 payerInfo.ip but rejects IPv6", () => {
    const v4 = CreateSessionRequestSchema.safeParse({
      amount: 10,
      currency: "MDL",
      payerInfo: { ip: "192.168.1.1" },
    });
    expect(v4.success).toBe(true);
    const v6 = CreateSessionRequestSchema.safeParse({
      amount: 10,
      currency: "MDL",
      payerInfo: { ip: "2001:db8::1" },
    });
    expect(v6.success).toBe(false);
  });

  it("CreateSessionRequest rejects an invalid language enum value", () => {
    expect(
      CreateSessionRequestSchema.safeParse({
        amount: 10,
        currency: "MDL",
        language: "de" as never,
      }).success,
    ).toBe(false);
  });

  it("RefundRequest rejects reason longer than 500 characters", () => {
    expect(RefundRequestSchema.safeParse({ amount: 5, reason: "a".repeat(501) }).success).toBe(
      false,
    );
    expect(RefundRequestSchema.safeParse({ amount: 5, reason: "a".repeat(500) }).success).toBe(
      true,
    );
  });

  it("ListSessionsParams requires count and offset", () => {
    const schema = all.ListSessionsParams as z.ZodType<unknown>;
    expect(schema.safeParse({ count: 10, offset: 0 }).success).toBe(true);
    expect(schema.safeParse({ count: 10 }).success).toBe(false);
    expect(schema.safeParse({ offset: 0 }).success).toBe(false);
  });

  it("ListSessionsParams rejects negative offset and non-positive count", () => {
    const schema = all.ListSessionsParams as z.ZodType<unknown>;
    expect(schema.safeParse({ count: 10, offset: -1 }).success).toBe(false);
    expect(schema.safeParse({ count: 0, offset: 0 }).success).toBe(false);
  });

  it("ListSessionsParams rejects an unknown sort order value", () => {
    const schema = all.ListSessionsParams as z.ZodType<unknown>;
    expect(schema.safeParse({ count: 10, offset: 0, order: "up" }).success).toBe(false);
    expect(schema.safeParse({ count: 10, offset: 0, order: "asc" }).success).toBe(true);
  });
});

describe("@maib/checkout schemas — buildSchema (typed)", () => {
  const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
  const CancelSessionResultSchema = buildSchema<CancelSessionResult>(
    z.fromJSONSchema,
    CancelSessionResultDef,
  );

  it("parses RefundRequest", () => {
    const result: RefundRequest = RefundRequestSchema.parse({
      amount: 100,
      reason: "ok",
    });
    expect(result.amount).toBe(100);
  });

  it("parses CancelSessionResult", () => {
    const value: CancelSessionResult = {
      checkoutId: "c1",
      status: "Cancelled",
    };
    const result = CancelSessionResultSchema.parse(value);
    expect(result.checkoutId).toBe("c1");
  });

  it("rejects malformed RefundResult", () => {
    const RefundResultSchema = buildSchema<RefundResult>(
      z.fromJSONSchema,
      defs["maib.checkout.RefundResult"],
      defs,
    );
    expect(RefundResultSchema.safeParse({}).success).toBe(false);
    expect(RefundResultSchema.safeParse({ refundId: "r1", status: "Created" }).success).toBe(true);
  });
});
