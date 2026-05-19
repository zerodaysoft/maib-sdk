import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const COPY_DOCS = join(REPO_ROOT, "scripts", "copy-docs.mjs");

function run(cwd: string) {
  return spawnSync("node", [COPY_DOCS], { cwd, encoding: "utf8" });
}

describe("copy-docs.mjs", () => {
  let cwd = "";

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "maib-copy-docs-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("creates dist/docs/ even when no source docs exist", () => {
    const result = run(cwd);
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(cwd, "dist", "docs"))).toBe(true);
  });

  it("copies README.md to dist/docs/README.md when present", () => {
    writeFileSync(join(cwd, "README.md"), "# Test package\n");
    const result = run(cwd);
    expect(result.status, result.stderr).toBe(0);
    const copied = readFileSync(join(cwd, "dist", "docs", "README.md"), "utf8");
    expect(copied).toBe("# Test package\n");
  });

  it("does not write a README.md when there is none in the source", () => {
    const result = run(cwd);
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(cwd, "dist", "docs", "README.md"))).toBe(false);
  });

  it("copies docs/ recursively into dist/docs/ when present", () => {
    mkdirSync(join(cwd, "docs", "guides"), { recursive: true });
    writeFileSync(join(cwd, "docs", "api.md"), "API\n");
    writeFileSync(join(cwd, "docs", "guides", "getting-started.md"), "Getting started\n");
    const result = run(cwd);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(cwd, "dist", "docs", "api.md"), "utf8")).toBe("API\n");
    expect(readFileSync(join(cwd, "dist", "docs", "guides", "getting-started.md"), "utf8")).toBe(
      "Getting started\n",
    );
  });

  it("ships both README.md AND docs/ when both exist", () => {
    writeFileSync(join(cwd, "README.md"), "# Pkg\n");
    mkdirSync(join(cwd, "docs"), { recursive: true });
    writeFileSync(join(cwd, "docs", "extra.md"), "extra\n");
    const result = run(cwd);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(cwd, "dist", "docs", "README.md"), "utf8")).toBe("# Pkg\n");
    expect(readFileSync(join(cwd, "dist", "docs", "extra.md"), "utf8")).toBe("extra\n");
  });

  it("is idempotent — running twice produces the same result", () => {
    writeFileSync(join(cwd, "README.md"), "# Pkg\n");
    run(cwd);
    const first = readFileSync(join(cwd, "dist", "docs", "README.md"), "utf8");
    run(cwd);
    const second = readFileSync(join(cwd, "dist", "docs", "README.md"), "utf8");
    expect(first).toBe(second);
  });
});
