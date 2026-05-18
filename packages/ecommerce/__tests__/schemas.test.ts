import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildBundleFromRegistry, extractSchema } from "@maib/internal-schemas/test-helpers";
import "../src/schemas/index";
import type { CallbackResult, RefundRequest, RefundResult } from "../src/index";

import { buildSchema, buildSchemasBundle } from "../src/schemas-builder";

const bundle = buildBundleFromRegistry();
const defs = bundle.$defs;
const ids = Object.keys(defs);
const RefundRequestDef = extractSchema(bundle, "maib.ecommerce.RefundRequest");
const RefundResultDef = extractSchema(bundle, "maib.ecommerce.RefundResult");

describe("@maib/ecommerce schemas — bundle", () => {
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

  it("merged core's $defs (envelope etc. from @maib/core)", () => {
    expect(ids.some((id) => id.startsWith("maib.core."))).toBe(true);
  });
});

describe("@maib/ecommerce schemas — shared core defs", () => {
  it("Language enum is registered from the shared core source", () => {
    const def = defs["maib.core.Language"] as { enum?: string[] };
    expect(Array.isArray(def.enum)).toBe(true);
    expect(def.enum?.sort()).toEqual(["en", "ro", "ru"]);
  });

  it("SupportedCurrency is a package-local subset (3 values, MDL/EUR/USD)", () => {
    const def = defs["maib.ecommerce.SupportedCurrency"] as { enum?: string[] };
    expect(Array.isArray(def.enum)).toBe(true);
    expect(def.enum?.sort()).toEqual(["EUR", "MDL", "USD"]);
  });
});

describe("@maib/ecommerce schemas — buildSchemasBundle", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("indexes every $defs entry by short name", () => {
    expect(Object.keys(all).sort()).toEqual(ids.map((id) => id.split(".").pop()).sort());
  });

  it("RefundRequest accepts a valid payload", () => {
    const payload: RefundRequest = { payId: "tx-1", refundAmount: 5.5 };
    expect((all.RefundRequest as z.ZodType<RefundRequest>).safeParse(payload).success).toBe(true);
  });

  it("RefundRequest rejects negative refundAmount", () => {
    expect(
      (all.RefundRequest as z.ZodType<RefundRequest>).safeParse({
        payId: "tx-1",
        refundAmount: -1,
      }).success,
    ).toBe(false);
  });

  it("CallbackResult requires the documented fields", () => {
    const callback: CallbackResult = {
      payId: "tx-2",
      status: "OK",
      statusCode: "0",
      statusMessage: "Approved",
    };
    expect((all.CallbackResult as z.ZodType<CallbackResult>).safeParse(callback).success).toBe(
      true,
    );
    expect((all.CallbackResult as z.ZodType<CallbackResult>).safeParse({}).success).toBe(false);
  });
});

describe("@maib/ecommerce schemas — boundary validation", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  const validPayBody = {
    amount: 10,
    clientIp: "192.168.1.1",
    language: "ro" as const,
    currency: "MDL" as const,
  };

  it("PayRequest rejects amount below 1 (minimum is 1)", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...validPayBody, amount: 0.99 }).success).toBe(false);
    expect(schema.safeParse({ ...validPayBody, amount: 1 }).success).toBe(true);
  });

  it("PayRequest rejects unsupported currency (only MDL/EUR/USD)", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...validPayBody, currency: "GBP" }).success).toBe(false);
    expect(schema.safeParse({ ...validPayBody, currency: "EUR" }).success).toBe(true);
  });

  it("PayRequest rejects unsupported language (only ro/en/ru)", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...validPayBody, language: "de" }).success).toBe(false);
  });

  it("PayRequest rejects IPv6 clientIp (IPv4 only)", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    expect(schema.safeParse({ ...validPayBody, clientIp: "2001:db8::1" }).success).toBe(false);
    expect(schema.safeParse({ ...validPayBody, clientIp: "127.0.0.1" }).success).toBe(true);
  });

  it("PayRequest rejects email longer than 40 characters", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    const longEmail = `${"a".repeat(36)}@x.io`; // 41 chars total (36 + @x.io = 41)
    const boundary = `${"a".repeat(35)}@x.io`; // 40 chars total — at the limit
    expect(schema.safeParse({ ...validPayBody, email: longEmail }).success).toBe(false);
    expect(schema.safeParse({ ...validPayBody, email: boundary }).success).toBe(true);
  });

  it("PayRequest rejects callbackUrl longer than 2048 characters", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    const longUrl = `https://x.io/${"a".repeat(2040)}`; // > 2048
    expect(schema.safeParse({ ...validPayBody, callbackUrl: longUrl }).success).toBe(false);
  });

  it("SavecardRecurringRequest rejects billerExpiry not matching MMYY", () => {
    const schema = all.SavecardRecurringRequest as z.ZodType<unknown>;
    const baseBody = {
      ...validPayBody,
      email: "buyer@example.com",
      billerExpiry: "1229",
    };
    expect(schema.safeParse(baseBody).success).toBe(true);
    expect(schema.safeParse({ ...baseBody, billerExpiry: "29-12" }).success).toBe(false);
    expect(schema.safeParse({ ...baseBody, billerExpiry: "123" }).success).toBe(false);
  });

  it("SavecardRecurringRequest requires email (recurring needs it)", () => {
    const schema = all.SavecardRecurringRequest as z.ZodType<unknown>;
    expect(
      schema.safeParse({
        ...validPayBody,
        billerExpiry: "1229",
      }).success,
    ).toBe(false);
  });

  it("PayRequest rejects items array longer than 50", () => {
    const schema = all.PayRequest as z.ZodType<unknown>;
    const items = Array.from({ length: 51 }, (_, i) => ({
      id: `i${i}`,
      name: "x",
      price: 1,
      quantity: 1,
    }));
    expect(schema.safeParse({ ...validPayBody, items }).success).toBe(false);
  });
});

describe("@maib/ecommerce schemas — buildSchema (typed)", () => {
  const RefundRequestSchema = buildSchema<RefundRequest>(z.fromJSONSchema, RefundRequestDef);
  const RefundResultSchema = buildSchema<RefundResult>(z.fromJSONSchema, RefundResultDef);

  it("parses RefundRequest", () => {
    const result = RefundRequestSchema.parse({ payId: "tx-3" });
    expect(result.payId).toBe("tx-3");
  });

  it("rejects missing payId", () => {
    expect(RefundRequestSchema.safeParse({}).success).toBe(false);
  });

  it("parses RefundResult", () => {
    const refund: RefundResult = {
      payId: "tx-4",
      status: "OK",
      statusCode: "0",
      statusMessage: "Refunded",
      refundAmount: 10.5,
    };
    const parsed = RefundResultSchema.parse(refund);
    expect(parsed.refundAmount).toBe(10.5);
  });
});
