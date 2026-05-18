import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildBundleFromRegistry, extractSchema } from "@maib/internal-schemas/test-helpers";
import "../src/schemas/index";
import type { ObAccount, ObAmountOfMoney, ObTransaction } from "../src/index";

import { buildSchema, buildSchemasBundle } from "../src/schemas-builder";

const bundle = buildBundleFromRegistry();
const defs = bundle.$defs;
const ids = Object.keys(defs);
const ObAccountDef = extractSchema(bundle, "maib.ob.ObAccount");
const ObAmountOfMoneyDef = extractSchema(bundle, "maib.ob.ObAmountOfMoney");

describe("@maib/ob schemas — bundle", () => {
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

  it("does not merge core $defs (ob is standalone)", () => {
    expect(ids.some((id) => id.startsWith("maib.core."))).toBe(false);
  });
});

describe("@maib/ob schemas — buildSchemasBundle", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("indexes every $defs entry by short name", () => {
    expect(Object.keys(all).sort()).toEqual(ids.map((id) => id.split(".").pop()).sort());
  });

  it("ObAmountOfMoney accepts {currency, amount}", () => {
    const value: ObAmountOfMoney = { currency: "MDL", amount: "100.00" };
    expect((all.ObAmountOfMoney as z.ZodType<ObAmountOfMoney>).safeParse(value).success).toBe(true);
  });

  it("ObAccount resolves nested $refs (views_available)", () => {
    const value: ObAccount = {
      id: "acc-1",
      label: "Main",
      bank_id: "bank-1",
      views_available: [{ id: "owner", short_name: "Owner", is_public: false }],
    };
    expect((all.ObAccount as z.ZodType<ObAccount>).safeParse(value).success).toBe(true);
  });

  it("ObTransaction parses a full transaction record", () => {
    const tx: ObTransaction = {
      id: "tx-1",
      this_account: {
        id: "acc-1",
        holders: [{ name: "Alice" }],
        bank_routing: { scheme: "BIC", address: "AGRNMD2X" },
        account_routings: [{ scheme: "IBAN", address: "MD24AG000000022500000000" }],
      },
      other_account: {
        id: "acc-2",
        holders: [{ name: "Bob" }],
        bank_routing: { scheme: "BIC", address: "AGRNMD2X" },
        account_routings: [{ scheme: "IBAN", address: "MD24AG000000022500000001" }],
      },
      details: {
        type: "SANDBOX_TAN",
        description: "Test",
        posted: "2029-01-01T00:00:00Z",
        completed: "2029-01-01T00:00:01Z",
        new_balance: { currency: "MDL", amount: "100.00" },
        value: { currency: "MDL", amount: "-10.00" },
      },
      metadata: {},
    };
    expect((all.ObTransaction as z.ZodType<ObTransaction>).safeParse(tx).success).toBe(true);
  });
});

describe("@maib/ob schemas — boundary validation", () => {
  const all = buildSchemasBundle(z.fromJSONSchema, bundle);

  it("ObAmountOfMoney rejects missing fields", () => {
    const schema = all.ObAmountOfMoney as z.ZodType<ObAmountOfMoney>;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ currency: "MDL" }).success).toBe(false);
    expect(schema.safeParse({ amount: "1.00" }).success).toBe(false);
  });

  it("ObUser rejects malformed emails", () => {
    const schema = all.ObUser as z.ZodType<unknown>;
    const base = {
      user_id: "u1",
      email: "valid@example.com",
      provider_id: "maib",
      provider: "maib",
      username: "alice",
      entitlements: { list: [] },
    };
    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });

  it("ListTransactionsParams rejects non-positive limit and negative offset", () => {
    const schema = all.ListTransactionsParams as z.ZodType<unknown>;
    expect(schema.safeParse({ limit: 0 }).success).toBe(false);
    expect(schema.safeParse({ offset: -1 }).success).toBe(false);
    expect(schema.safeParse({ limit: 10, offset: 0 }).success).toBe(true);
  });

  it("ListTransactionsParams rejects sort_direction outside ASC/DESC", () => {
    const schema = all.ListTransactionsParams as z.ZodType<unknown>;
    expect(schema.safeParse({ sort_direction: "asc" }).success).toBe(false);
    expect(schema.safeParse({ sort_direction: "ASC" }).success).toBe(true);
    expect(schema.safeParse({ sort_direction: "DESC" }).success).toBe(true);
  });

  it("ObConsent rejects status values outside the ConsentStatus enum", () => {
    const schema = all.ObConsent as z.ZodType<unknown>;
    const valid = { consent_id: "c1", jwt: "token", status: "ACCEPTED" };
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, status: "ACCEPT" }).success).toBe(false);
  });
});

describe("@maib/ob schemas — buildSchema (typed)", () => {
  const ObAmountOfMoneySchema = buildSchema<ObAmountOfMoney>(z.fromJSONSchema, ObAmountOfMoneyDef);
  const ObAccountSchema = buildSchema<ObAccount>(z.fromJSONSchema, ObAccountDef);

  it("parses ObAmountOfMoney", () => {
    const value = ObAmountOfMoneySchema.parse({ currency: "EUR", amount: "1.00" });
    expect(value.currency).toBe("EUR");
  });

  it("ObAccount per-schema file resolves embedded $defs", () => {
    const value: ObAccount = {
      id: "acc-x",
      label: "label",
      bank_id: "b",
      views_available: [],
    };
    expect(ObAccountSchema.parse(value).id).toBe("acc-x");
  });

  it("rejects malformed ObAmountOfMoney", () => {
    expect(ObAmountOfMoneySchema.safeParse({ currency: "MDL" }).success).toBe(false);
  });
});
