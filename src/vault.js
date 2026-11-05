// Writes the brain as an Obsidian vault: one Markdown note per thing, linked with [[wikilinks]].
// Open the repository folder in Obsidian and everything (notes and source documents) is linked.
//
// The brain is yours to correct: anything under "## Your notes" and "confirmed: true" in a
// note's header are kept on every rebuild.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { neighbours } from "./graph.js";

export const NOTES_DIR = "brain/notes";
const YOUR_NOTES = "## Your notes";
const IRREGULAR = { person: "People", category: "Categories", company: "Companies", opportunity: "Opportunities", activity: "Activities" };
export const TYPE_FOLDER = (t) => IRREGULAR[t] || t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") + (t.endsWith("s") ? "" : "s");

export const fileName = (name) => name.replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120);
const yamlList = (xs) => `[${xs.map((x) => JSON.stringify(x)).join(", ")}]`;

// Reads what you added by hand, so a rebuild never loses it.
export function readUserEdits(root) {
  const dir = join(root, NOTES_DIR);
  const edits = new Map();
  if (!existsSync(dir)) return edits;
  for (const folder of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const f of readdirSync(join(dir, folder.name)).filter((x) => x.endsWith(".md"))) {
      const text = readFileSync(join(dir, folder.name, f), "utf8");
      const id = text.match(/^threadline_id:\s*(.+)$/m)?.[1]?.trim();
      if (!id) continue;
      const confirmed = /^confirmed:\s*true\s*$/m.test(text);
      const i = text.indexOf(YOUR_NOTES);
      const notes = i >= 0 ? text.slice(i + YOUR_NOTES.length).replace(/^\s*\n/, "").replace(/\s+$/, "") : "";
      const placeholder = notes.startsWith("_Add anything Threadline");
      edits.set(id, { confirmed, notes: placeholder ? "" : notes });
    }
  }
  return edits;
}

export function renderNote(g, n, edits = {}) {
  const docName = (id) => g.docs[id]?.name || id;
  const lines = [
    "---",
    `type: ${n.type}`,
    `aliases: ${yamlList(n.aliases)}`,
    n.date ? `date: ${n.date}` : null,
    n.value ? `value: ${JSON.stringify(n.value)}` : null,
    `sources: ${n.sources.length}`,
    `confirmed: ${edits.confirmed ? "true" : "false"}`,
    `threadline_id: ${n.id}`,
    "---",
    `# ${n.name}`,
    "",
    n.summary || "_No summary yet._",
    "",
  ].filter((x) => x !== null);
  if (n.date || n.value) lines.push([n.date ? `**Date:** ${n.date}` : "", n.value ? `**Amount:** ${n.value}` : ""].filter(Boolean).join(" · "), "");
  const links = neighbours(g, n.id);
  if (links.length) {
    lines.push("## Connections");
    for (const e of links) {
      const out = e.from === n.id;
      const other = g.nodes[out ? e.to : e.from];
      const rel = out ? e.relation.replace(/_/g, " ") : `${e.relation.replace(/_/g, " ")} (from)`;
      const badge = e.kind === "stated" ? "" : ` · _${e.kind}_`;
      lines.push(`- ${rel} [[${other.name}]]${badge}`, `  > ${e.evidence}`, `  > — [[${docName(e.source)}]]`);
    }
    lines.push("");
  }
  if (n.sources.length) {
    lines.push("## Sources", ...n.sources.map((s) => `- [[${docName(s)}]]`), "");
  } else {
    lines.push("## Sources", "- _No document mentions this any more. Kept because you confirmed it or added notes._", "");
  }
  lines.push(YOUR_NOTES, edits.notes || "_Add anything Threadline couldn't know. This section is never overwritten._", "");
  return lines.join("\n");
}

export function writeVault(root, g, edits) {
  const dir = join(root, NOTES_DIR);
  // Remove only the notes Threadline generated (they carry a threadline_id). Your own notes stay.
  if (existsSync(dir)) {
    for (const folder of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const f of readdirSync(join(dir, folder.name)).filter((x) => x.endsWith(".md"))) {
        const p = join(dir, folder.name, f);
        if (/^threadline_id:/m.test(readFileSync(p, "utf8"))) rmSync(p);
      }
    }
  }
  const written = [];
  for (const n of Object.values(g.nodes)) {
    const folder = join(dir, TYPE_FOLDER(n.type));
    mkdirSync(folder, { recursive: true });
    const path = join(folder, `${fileName(n.name)}.md`);
    writeFileSync(path, renderNote(g, n, edits.get(n.id)));
    written.push(path);
  }
  return written;
}

export function renderHome(g) {
  const byType = {};
  for (const n of Object.values(g.nodes)) (byType[n.type] ||= []).push(n);
  const lines = ["# Home", "", "Start here. Every note links to the things it's connected to and to the documents it came from.", "", "- [[REPORT]]: what's most connected, what's coming up, what needs checking", ""];
  for (const t of Object.keys(byType).sort()) {
    lines.push(`## ${TYPE_FOLDER(t)}`, ...byType[t].sort((a, b) => a.name.localeCompare(b.name)).map((n) => `- [[${n.name}]]${n.date ? ` · ${n.date}` : ""}`), "");
  }
  return lines.join("\n");
}
