import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { type FixtureHandle, makeFixture, runBuildSchemas } from "./helpers";

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

describe("build-schemas.mjs --pre", () => {
  it("skips packages without src/schemas/index.ts (exits 0, no output)", () => {
    // Custom fixture without the schemas module.
    const cwd = mkdtempSync(join(tmpdir(), "maib-build-schemas-skip-"));
    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify({ name: "skip-fixture", version: "0.0.0", type: "module" }),
    );
    const handle: FixtureHandle = {
      cwd,
      cleanup: () => {},
      read: () => "",
      readJson: () => null,
      exists: () => false,
    };
    const result = runBuildSchemas(handle, ["--pre"]);
    expect(result.status).toBe(0);
  });

  it("generates .schemas-cache/schemas.json with merged $defs from the local registry", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      const result = runBuildSchemas(fx, ["--pre"]);
      expect(result.status, result.stderr).toBe(0);
      expect(fx.exists(".schemas-cache/schemas.json")).toBe(true);
      const bundle = fx.readJson(".schemas-cache/schemas.json") as {
        $defs: Record<string, unknown>;
      };
      expect(Object.keys(bundle.$defs).sort()).toEqual(["maib.fixture.Owner", "maib.fixture.Pet"]);
    } finally {
      fx.cleanup();
    }
  });

  it("stashes localIds in .schemas-cache/meta.json (scopes wrapper emission later)", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      const result = runBuildSchemas(fx, ["--pre"]);
      expect(result.status, result.stderr).toBe(0);
      const meta = fx.readJson(".schemas-cache/meta.json") as { localIds: string[] };
      expect(meta.localIds.sort()).toEqual(["maib.fixture.Owner", "maib.fixture.Pet"]);
    } finally {
      fx.cleanup();
    }
  });

  it("emits src/generated/types.ts with one interface per local schema", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      const result = runBuildSchemas(fx, ["--pre"]);
      expect(result.status, result.stderr).toBe(0);
      const types = fx.read("src/generated/types.ts");
      expect(types).toMatch(/export interface Pet\b/);
      expect(types).toMatch(/export interface Owner\b/);
      // Synthetic root interface must be stripped.
      expect(types).not.toMatch(/_MaibSchemasRoot/);
      // The "referenced by _MaibSchemasRoot's JSON-Schema via the definition"
      // noise that json-schema-to-typescript appends must also be stripped.
      expect(types).not.toMatch(/referenced by `_MaibSchemasRoot`/);
    } finally {
      fx.cleanup();
    }
  });

  it("strips nested $schema markers on each definition", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: PET_OWNER_SCHEMAS });
    try {
      runBuildSchemas(fx, ["--pre"]);
      const bundle = fx.readJson(".schemas-cache/schemas.json") as {
        $defs: Record<string, { $schema?: string; title?: string }>;
      };
      for (const def of Object.values(bundle.$defs)) {
        expect(def.$schema).toBeUndefined();
        // And every def gets a title equal to the trailing id segment.
        expect(def.title).toMatch(/^(Pet|Owner)$/);
      }
    } finally {
      fx.cleanup();
    }
  });

  it("rewrites { $ref, ...siblings } into allOf wrapper (preserves description)", () => {
    // Zod's `.describe()` produces a sibling alongside the `$ref` emitted for
    // an inlined object. The pre phase must rewrite those into
    // `{ allOf: [{$ref}], description, ... }` so json-schema-to-typescript
    // follows the ref instead of inlining a duplicate interface.
    const source = `
      import { z } from "zod";
      const Inner = z.object({ x: z.string() }).meta({ id: "maib.fixture.Inner" });
      z.object({
        nested: Inner.describe("a referenced inner with a sibling description"),
      }).meta({ id: "maib.fixture.Wrapper" });
    `;
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: source });
    try {
      const result = runBuildSchemas(fx, ["--pre"]);
      expect(result.status, result.stderr).toBe(0);
      const bundle = fx.readJson(".schemas-cache/schemas.json") as {
        $defs: { "maib.fixture.Wrapper": { properties: { nested: object } } };
      };
      const nested = bundle.$defs["maib.fixture.Wrapper"].properties.nested as {
        $ref?: string;
        allOf?: Array<{ $ref: string }>;
        description?: string;
      };
      // After rewrite: the bare $ref is gone, replaced by allOf wrapper.
      expect(nested.$ref).toBeUndefined();
      expect(nested.allOf?.[0]?.$ref).toBe("#/$defs/maib.fixture.Inner");
      expect(nested.description).toBe("a referenced inner with a sibling description");
    } finally {
      fx.cleanup();
    }
  });

  it("merges workspace parent bundles found at ../<short>/dist/schemas/bundle.json", () => {
    // Workspace layout the script looks for: <parent>/<short>/dist/schemas/bundle.json
    // is resolved relative to the cwd's parent (`resolve(cwd, "..", short, ...)`).
    // We stage a sibling "parent" package with a pre-built bundle.json next to
    // our self-fixture and confirm the merge.
    const fx = makeFixture({
      name: "@maib/self",
      schemasSource: PET_OWNER_SCHEMAS,
      dependencies: { "@maib/parent": "workspace:*" },
    });
    try {
      // The script computes the parent path as ../parent/dist/schemas/bundle.json
      // relative to cwd, so stage it in a sibling dir under tmpdir.
      const parentBundle = join(fx.cwd, "..", "parent", "dist", "schemas", "bundle.json");
      mkdirSync(join(fx.cwd, "..", "parent", "dist", "schemas"), { recursive: true });
      writeFileSync(
        parentBundle,
        JSON.stringify({
          $defs: {
            "maib.parent.Extra": { type: "object", properties: { z: { type: "number" } } },
          },
        }),
      );
      const result = runBuildSchemas(fx, ["--pre"]);
      expect(result.status, result.stderr).toBe(0);
      const bundle = fx.readJson(".schemas-cache/schemas.json") as {
        $defs: Record<string, unknown>;
      };
      expect(Object.keys(bundle.$defs).sort()).toEqual([
        "maib.fixture.Owner",
        "maib.fixture.Pet",
        "maib.parent.Extra",
      ]);
      // The parent id must NOT be in localIds (so we don't emit wrappers for it).
      const meta = fx.readJson(".schemas-cache/meta.json") as { localIds: string[] };
      expect(meta.localIds).not.toContain("maib.parent.Extra");
    } finally {
      fx.cleanup();
      // Best-effort: the sibling "parent" dir lives next to fx.cwd in tmpdir.
      // makeFixture's cleanup only removes fx.cwd; clean the parent too.
      try {
        rmSync(join(fx.cwd, "..", "parent"), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });
});
