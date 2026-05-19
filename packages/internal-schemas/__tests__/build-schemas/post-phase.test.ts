import { describe, expect, it } from "vitest";

import { makeFixture, runBuildSchemas, runPipeline } from "./helpers";

const PET_OWNER_SCHEMAS = `
import { z } from "zod";

const Pet = z.object({
  name: z.string(),
}).meta({ id: "maib.fixture.Pet" });

const Owner = z.object({
  ownerName: z.string(),
  pet: Pet,
}).meta({ id: "maib.fixture.Owner" });

export { Pet, Owner };
`;

describe("build-schemas.mjs --post", () => {
  it("fails when the pre-phase cache is missing", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      const result = runBuildSchemas(fx, ["--post"]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/missing cache/);
    } finally {
      fx.cleanup();
    }
  });

  it("writes dist/schemas/bundle.json with every $defs entry", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      const result = runPipeline(fx);
      expect(result.status, result.stderr).toBe(0);
      expect(fx.exists("dist/schemas/bundle.json")).toBe(true);
      const bundle = fx.readJson("dist/schemas/bundle.json") as {
        $defs: Record<string, unknown>;
      };
      expect(Object.keys(bundle.$defs).sort()).toEqual(["maib.fixture.Owner", "maib.fixture.Pet"]);
    } finally {
      fx.cleanup();
    }
  });

  it("writes per-schema JSON files with reachable $defs embedded", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runPipeline(fx);
      // Owner refs Pet, so Owner.json must embed Pet under $defs.
      const owner = fx.readJson("dist/schemas/Owner.json") as {
        $defs?: Record<string, unknown>;
        properties: { pet: { $ref?: string; allOf?: Array<{ $ref: string }> } };
      };
      expect(owner.$defs).toBeDefined();
      expect(Object.keys(owner.$defs ?? {})).toContain("maib.fixture.Pet");
      // Pet has no outgoing refs, so its file should NOT have a $defs block.
      const pet = fx.readJson("dist/schemas/Pet.json") as { $defs?: Record<string, unknown> };
      expect(pet.$defs).toBeUndefined();
    } finally {
      fx.cleanup();
    }
  });

  it("emits a typed wrapper trio (.d.ts/.d.cts/.js/.cjs) for each local id", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runPipeline(fx);
      for (const name of ["Pet", "Owner"]) {
        for (const ext of [".d.ts", ".d.cts", ".js", ".cjs", ".json"]) {
          expect(fx.exists(`dist/schemas/${name}${ext}`), `${name}${ext} should exist`).toBe(true);
        }
      }
    } finally {
      fx.cleanup();
    }
  });

  it("does NOT import @maib/internal-schemas in wrapper .d.ts/.d.cts (regression)", () => {
    // Regression: prior to inlining the phantom-marker type, wrappers imported
    // `TypedSchemaDef` from `@maib/internal-schemas/schemas-builder`. That
    // package is only a workspace devDep of consumer SDKs, so the cross-package
    // type import resolved to `any` on the npm-install side, breaking
    // `buildSchema(Def)` inference.
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runPipeline(fx);
      const dts = fx.read("dist/schemas/Pet.d.ts");
      const dcts = fx.read("dist/schemas/Pet.d.cts");
      expect(dts).not.toMatch(/@maib\/internal-schemas/);
      expect(dcts).not.toMatch(/@maib\/internal-schemas/);
    } finally {
      fx.cleanup();
    }
  });

  it("inlines the phantom-marker shape used by buildSchema's inference overload", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runPipeline(fx);
      const dts = fx.read("dist/schemas/Pet.d.ts");
      // The exact shape `buildSchema`'s inference overload structurally matches.
      expect(dts).toMatch(/readonly __maibType: Pet/);
      expect(dts).toMatch(/Record<string, unknown>/);
    } finally {
      fx.cleanup();
    }
  });

  it("emits both named and default exports across all four wrapper variants", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runPipeline(fx);
      const dts = fx.read("dist/schemas/Pet.d.ts");
      const dcts = fx.read("dist/schemas/Pet.d.cts");
      const js = fx.read("dist/schemas/Pet.js");
      const cjs = fx.read("dist/schemas/Pet.cjs");

      expect(dts).toMatch(/export \{ PetDef \}/);
      expect(dts).toMatch(/export default PetDef/);
      expect(dcts).toMatch(/export \{ PetDef \}/);
      expect(dcts).toMatch(/export default PetDef/);
      expect(js).toMatch(/export \{ PetDef \}/);
      expect(js).toMatch(/export default PetDef/);
      // .cjs is the trickiest: both named and default must hang off module.exports.
      expect(cjs).toMatch(/const PetDef = require\("\.\/Pet\.json"\)/);
      expect(cjs).toMatch(/module\.exports = \{ PetDef, default: PetDef \}/);
    } finally {
      fx.cleanup();
    }
  });

  it(".cjs exposes both named and default exports as the same runtime value", () => {
    // Bridge the type-vs-runtime contract: .d.cts declares both `PetDef` and
    // default; .cjs must actually expose both, and they must point at the same
    // parsed JSON value (not different objects).
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runPipeline(fx);
      // eval the CJS module: load via require from the fixture cwd.
      const { createRequire } = require("node:module") as typeof import("node:module");
      const req = createRequire(`${fx.cwd}/dist/schemas/`);
      const mod = req("./Pet.cjs") as { PetDef?: unknown; default?: unknown };
      expect(mod.PetDef).toBeDefined();
      expect(mod.default).toBeDefined();
      expect(mod.PetDef).toBe(mod.default);
    } finally {
      fx.cleanup();
    }
  });

  it("emits per-schema JSON for parent ids but NO wrappers (scoped to localIds)", () => {
    // Parent schemas (merged in via aggregator builds) must NOT get wrappers
    // — those already live in the parent's own package.
    const fx = makeFixture({
      name: "@maib/self",
      schemasSource: PET_OWNER_SCHEMAS,
      dependencies: { "@maib/parent": "workspace:*" },
    });
    try {
      // Stage parent bundle.
      const { mkdirSync, rmSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
      const { join } = require("node:path") as typeof import("node:path");
      mkdirSync(join(fx.cwd, "..", "parent", "dist", "schemas"), { recursive: true });
      writeFileSync(
        join(fx.cwd, "..", "parent", "dist", "schemas", "bundle.json"),
        JSON.stringify({
          $defs: {
            "maib.parent.Extra": { type: "object", properties: { z: { type: "number" } } },
          },
        }),
      );
      try {
        runPipeline(fx);
        // JSON shipped for the parent id.
        expect(fx.exists("dist/schemas/Extra.json")).toBe(true);
        // No wrapper for the parent id (scoped to localIds).
        expect(fx.exists("dist/schemas/Extra.d.ts")).toBe(false);
        expect(fx.exists("dist/schemas/Extra.js")).toBe(false);
        // But wrappers for the local ids DO exist.
        expect(fx.exists("dist/schemas/Pet.d.ts")).toBe(true);
      } finally {
        rmSync(join(fx.cwd, "..", "parent"), { recursive: true, force: true });
      }
    } finally {
      fx.cleanup();
    }
  });
});
