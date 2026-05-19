import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL_SCRIPT = resolve(__dirname, "../scripts/copy-root-subpaths.mjs");

// internal-schemas ships subpath imports (`@maib/internal-schemas/schemas-builder`,
// `/test-helpers`). tsup's dts pipeline can't see `package.json#exports`, so
// after build we copy the four-file artifact (`.d.ts/.d.cts/.js/.cjs`) for each
// subpath to the package root. This script must be exact — missing one file
// silently degrades type resolution for downstream packages.

const SUBPATHS = ["schemas-builder", "test-helpers"] as const;
const EXTS = ["d.ts", "d.cts", "js", "cjs"] as const;

interface StagedPkg {
  cwd: string;
  scriptPath: string;
}

function stagePackage(): StagedPkg {
  const cwd = mkdtempSync(join(tmpdir(), "maib-copy-subpaths-"));
  const distDir = join(cwd, "dist");
  const scriptDir = join(cwd, "scripts");
  mkdirSync(distDir, { recursive: true });
  mkdirSync(scriptDir, { recursive: true });

  // Stage dist artifacts the script expects to find.
  for (const name of SUBPATHS) {
    for (const ext of EXTS) {
      writeFileSync(join(distDir, `${name}.${ext}`), `// stub ${name}.${ext}\n`);
    }
  }

  // Copy the real script into the staged package so it resolves
  // `dist/<name>.<ext>` relative to itself.
  const scriptSource = readFileSync(REAL_SCRIPT, "utf8");
  const scriptPath = join(scriptDir, "copy-root-subpaths.mjs");
  writeFileSync(scriptPath, scriptSource);

  return { cwd, scriptPath };
}

describe("internal-schemas/scripts/copy-root-subpaths.mjs", () => {
  it("copies every (subpath, ext) pair from dist/ to the package root", () => {
    const pkg = stagePackage();
    try {
      const result = spawnSync("node", [pkg.scriptPath], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      for (const name of SUBPATHS) {
        for (const ext of EXTS) {
          const rooted = join(pkg.cwd, `${name}.${ext}`);
          expect(existsSync(rooted), `${name}.${ext} at root`).toBe(true);
          expect(readFileSync(rooted, "utf8")).toBe(`// stub ${name}.${ext}\n`);
        }
      }
    } finally {
      rmSync(pkg.cwd, { recursive: true, force: true });
    }
  });

  it("fails loudly when a dist artifact is missing (no silent skip)", () => {
    // Regression guard: if tsup ever stops emitting one of the subpath files,
    // the build must fail rather than ship an incomplete package.
    const pkg = stagePackage();
    try {
      rmSync(join(pkg.cwd, "dist", "schemas-builder.d.ts"));
      const result = spawnSync("node", [pkg.scriptPath], { encoding: "utf8" });
      expect(result.status).not.toBe(0);
    } finally {
      rmSync(pkg.cwd, { recursive: true, force: true });
    }
  });

  it("overwrites existing root files on re-run (idempotent)", () => {
    const pkg = stagePackage();
    try {
      // Pre-pollute the root file with stale content.
      writeFileSync(join(pkg.cwd, "schemas-builder.d.ts"), "// stale\n");
      const result = spawnSync("node", [pkg.scriptPath], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      const fresh = readFileSync(join(pkg.cwd, "schemas-builder.d.ts"), "utf8");
      expect(fresh).toBe("// stub schemas-builder.d.ts\n");
    } finally {
      rmSync(pkg.cwd, { recursive: true, force: true });
    }
  });
});
