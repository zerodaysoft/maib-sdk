import { z } from "zod";

/** JSON Schema definition shape used by the test helpers below. */
export type JsonSchemaDef = Record<string, unknown>;

/** Layout returned by {@link buildBundleFromRegistry}. */
export interface TestBundle {
  $schema: string;
  $defs: Record<string, JsonSchemaDef>;
}

/**
 * Build an in-memory bundle from the current `z.globalRegistry` in the same
 * shape that `build-schemas.mjs` emits to `dist/schemas/bundle.json`.
 *
 * Call AFTER the package's `src/schemas/index.ts` has been imported, so all
 * schemas have registered via their `.meta({ id, ... })` side-effects.
 */
export function buildBundleFromRegistry(): TestBundle {
  const local = z.toJSONSchema(z.globalRegistry, {
    uri: (id) => `#/$defs/${id}`,
  });
  const rawDefs = (local.schemas ?? {}) as Record<string, JsonSchemaDef>;
  const defs: Record<string, JsonSchemaDef> = {};
  for (const id of Object.keys(rawDefs)) {
    const { $schema: _drop, ...rest } = rawDefs[id];
    defs[id] = { ...rest, title: id.split(".").pop() ?? id };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $defs: defs,
  };
}

/**
 * Extract a self-contained per-schema definition from a bundle, embedding only
 * the transitively-reachable `$defs`. Mirrors the post-phase logic in
 * `build-schemas.mjs` that writes `dist/schemas/<ShortName>.json` files.
 */
export function extractSchema(bundle: TestBundle, id: string): JsonSchemaDef {
  const defs = bundle.$defs;
  const root = defs[id];
  if (!root) throw new Error(`Schema id not registered: ${id}`);

  const refPrefix = "#/$defs/";
  const reached = new Set<string>();
  const queue: string[] = [id];
  while (queue.length > 0) {
    const next = queue.pop();
    if (!next) continue;
    const def = defs[next];
    if (!def) continue;
    const refs = new Set<string>();
    collectRefs(def, refs, refPrefix);
    for (const ref of refs) {
      if (ref === id || reached.has(ref)) continue;
      reached.add(ref);
      queue.push(ref);
    }
  }
  const embedded: Record<string, JsonSchemaDef> = {};
  for (const refId of reached) embedded[refId] = defs[refId];

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...root,
    ...(Object.keys(embedded).length > 0 ? { $defs: embedded } : {}),
  };
}

function collectRefs(node: unknown, into: Set<string>, refPrefix: string): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, into, refPrefix);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const ref = obj.$ref;
  if (typeof ref === "string" && ref.startsWith(refPrefix)) {
    into.add(ref.slice(refPrefix.length));
  }
  for (const value of Object.values(obj)) collectRefs(value, into, refPrefix);
}
