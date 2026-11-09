// Reads every document in inbox/, cleans it and works out what changed since the last build.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, basename, sep } from "node:path";
import { createHash } from "node:crypto";
import { removeHidden, redact, htmlToText } from "./text.js";
import { pageMeta } from "./handbook.js";

export const SUPPORTED = new Set([".md", ".markdown", ".txt", ".html", ".htm"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".") || name.startsWith("_")) continue; // hidden files and _notes are ignored
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export function readDoc(root, path) {
  const id = relative(join(root, "inbox"), path).split(sep).join("/");
  const raw = readFileSync(path, "utf8");
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  let text = /\.html?$/i.test(path) ? htmlToText(raw) : raw;
  const h = removeHidden(text);
  const r = redact(h.text);
  text = r.text.replace(/\n{3,}/g, "\n\n").trim();
  const heading = text.match(/^#\s+(.+)$/m);
  return {
    id,
    name: basename(path, extname(path)), // used for [[wikilinks]] in Obsidian
    title: heading ? heading[1].trim() : basename(path, extname(path)),
    hash,
    text,
    meta: pageMeta(text),
    flags: [
      ...(h.hidden ? [`Hidden text removed (${h.hidden})`] : []),
      ...(r.redacted ? [`Sensitive details redacted (${r.redacted})`] : []),
    ],
  };
}

export function readInbox(root) {
  const files = walk(join(root, "inbox"));
  const docs = [], skipped = [];
  for (const f of files) {
    if (SUPPORTED.has(extname(f).toLowerCase())) docs.push(readDoc(root, f));
    else skipped.push(relative(root, f));
  }
  return { docs, skipped };
}

// Long documents are split on paragraph breaks so each part fits comfortably in one request.
export function chunk(text, max = 15000) {
  if (text.length <= max) return [text];
  const parts = [];
  let cur = "";
  for (const para of text.split(/\n{2,}/)) {
    if ((cur + "\n\n" + para).length > max && cur) { parts.push(cur); cur = para; }
    else cur = cur ? cur + "\n\n" + para : para;
  }
  if (cur) parts.push(cur);
  return parts.flatMap((p) => (p.length > max ? p.match(new RegExp(`[\\s\\S]{1,${max}}`, "g")) : [p]));
}
