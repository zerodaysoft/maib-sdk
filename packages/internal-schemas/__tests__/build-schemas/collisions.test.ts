import { describe, expect, it } from "vitest";

import { makeFixture, runBuildSchemas, runPipeline } from "./helpers";

// Two schemas whose ids collide on the trailing segment (`Common`).
const COLLIDING_SCHEMAS = `
import { z } from "zod";

z.object({ a: z.string() }).meta({ id: "maib.alpha.Common" });
z.object({ b: z.number() }).meta({ id: "maib.beta.Common" });
z.object({ unique: z.boolean() }).meta({ id: "maib.alpha.Unique" });
`;

describe("build-schemas.mjs collision handling", () => {
  it("throws by default on short-name collisions", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: COLLIDING_SCHEMAS });
    try {
      const pre = runBuildSchemas(fx, ["--pre"]);
      expect(pre.status, pre.stderr).toBe(0);
      const post = runBuildSchemas(fx, ["--post"]);
      expect(post.status).not.toBe(0);
      expect(post.stderr).toMatch(/short-name collision/);
      expect(post.stderr).toMatch(/Common/);
    } finally {
      fx.cleanup();
    }
  });

  it("--on-collision=namespace produces dotted filenames for collisions", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: COLLIDING_SCHEMAS });
    try {
      const result = runPipeline(fx, ["--on-collision=namespace"]);
      expect(result.status, result.stderr).toBe(0);
      // Colliding ids → "<namespace>.<ShortName>.json", unique → "<ShortName>.json".
      expect(fx.exists("dist/schemas/alpha.Common.json")).toBe(true);
      expect(fx.exists("dist/schemas/beta.Common.json")).toBe(true);
      expect(fx.exists("dist/schemas/Unique.json")).toBe(true);
      // Bare Common.json must NOT exist (would silently overwrite).
      expect(fx.exists("dist/schemas/Common.json")).toBe(false);
    } finally {
      fx.cleanup();
    }
  });

  it("--on-collision=namespace skips wrapper emission for dotted filenames", () => {
    // Dotted basenames aren't valid JS/TS identifiers, so they can't be the
    // default export of a single module file. Per-schema JSON keeps shipping,
    // but the typed `.d.ts/.js/...` quartet is skipped.
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: COLLIDING_SCHEMAS });
    try {
      runPipeline(fx, ["--on-collision=namespace"]);
      expect(fx.exists("dist/schemas/alpha.Common.json")).toBe(true);
      expect(fx.exists("dist/schemas/alpha.Common.d.ts")).toBe(false);
      expect(fx.exists("dist/schemas/alpha.Common.js")).toBe(false);
      expect(fx.exists("dist/schemas/alpha.Common.cjs")).toBe(false);
      // Non-colliding unique gets its full wrapper trio.
      expect(fx.exists("dist/schemas/Unique.d.ts")).toBe(true);
      expect(fx.exists("dist/schemas/Unique.js")).toBe(true);
    } finally {
      fx.cleanup();
    }
  });

  it("--on-collision=namespace-prefix produces PascalCase concat filenames", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: COLLIDING_SCHEMAS });
    try {
      const result = runPipeline(fx, ["--on-collision=namespace-prefix"]);
      expect(result.status, result.stderr).toBe(0);
      // `maib.alpha.Common` → `AlphaCommon`, `maib.beta.Common` → `BetaCommon`.
      expect(fx.exists("dist/schemas/AlphaCommon.json")).toBe(true);
      expect(fx.exists("dist/schemas/BetaCommon.json")).toBe(true);
      expect(fx.exists("dist/schemas/Unique.json")).toBe(true);
      // These are valid identifiers → wrappers DO get emitted.
      expect(fx.exists("dist/schemas/AlphaCommon.d.ts")).toBe(true);
      expect(fx.exists("dist/schemas/AlphaCommon.js")).toBe(true);
      expect(fx.exists("dist/schemas/AlphaCommon.cjs")).toBe(true);
    } finally {
      fx.cleanup();
    }
  });

  it("rejects unknown --on-collision values", () => {
    const fx = makeFixture({ name: "@maib/fixture", schemasSource: COLLIDING_SCHEMAS });
    try {
      runBuildSchemas(fx, ["--pre"]);
      const post = runBuildSchemas(fx, ["--post", "--on-collision=bogus"]);
      expect(post.status).not.toBe(0);
      expect(post.stderr).toMatch(/unknown --on-collision/);
    } finally {
      fx.cleanup();
    }
  });
});
