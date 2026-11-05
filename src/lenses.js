// Lenses are plain-English Markdown files in /lenses. Each one tells Claude what to remember
// for one kind of brain (business, personal, marketing). Folders in inbox/ choose the lens.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { nameKey } from "./text.js";

export function parseLens(text, file = "lens.md") {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing the --- header block at the top.`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim();
  }
  if (!meta.lens || !meta.types) throw new Error(`${file}: the header needs "lens:" and "types:" lines.`);
  const list = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
  return {
    id: basename(file, ".md"),
    name: meta.lens,
    folders: list(meta.folders),
    types: list(meta.types).map((t) => t.toLowerCase().replace(/\s+/g, "_")),
    description: meta.description || "",
    instructions: m[2].trim(),
  };
}

export function loadLenses(dir) {
  if (!existsSync(dir)) throw new Error(`No lenses folder at ${dir}.`);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort();
  if (!files.length) throw new Error(`No lenses found in ${dir}.`);
  return files.map((f) => parseLens(readFileSync(join(dir, f), "utf8"), f));
}

// inbox/clients/acme.md -> the lens whose folders include "clients"; otherwise the default lens.
export function lensFor(docId, lenses, defaultId) {
  const first = nameKey(docId.split("/")[0]);
  return lenses.find((l) => l.folders.some((f) => nameKey(f) === first)) ||
    lenses.find((l) => l.id === defaultId) || lenses[0];
}
