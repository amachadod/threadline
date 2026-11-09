// Handbook mode: when the brain is a company handbook (for example a Notion export), Threadline also
// flags pages nobody has edited for a long time, and rules that two pages state differently.
// Both are flags for a human. Threadline never decides which page is right.
import { nameKey } from "./text.js";
import { ask } from "./ask.js";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function toIso(s) {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/); // Notion style: "March 2, 2026 4:12 PM"
  if (m && MONTHS.includes(m[1].toLowerCase())) return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

// Notion exports put page properties as plain lines under the title ("Owner: ...", "Last edited time: ...").
// A --- header with owner: and last_edited: works too.
export function pageMeta(text) {
  const head = String(text).split(/\r?\n/).slice(0, 15).join("\n");
  const owner = head.match(/^\s*owner\s*:\s*(.+)$/im)?.[1]?.trim() || null;
  const edited = head.match(/^\s*(?:last[ _]edited(?:[ _]time)?|updated)\s*:\s*(.+)$/im)?.[1] || null;
  return { owner, lastEdited: toIso(edited) };
}

const days = (from, to) => Math.floor((Date.parse(to) - Date.parse(from)) / 864e5);

// Pages in the handbook lens not edited for more than maxDays (or with no date at all).
export function stalePages(g, today, maxDays = 180, lensId = "handbook") {
  return Object.entries(g.docs).filter(([, d]) => d.lens === lensId).flatMap(([id, d]) => {
    if (!d.lastEdited) return [{ id, title: d.title, owner: d.owner || null, lastEdited: null, ageDays: null, reason: "No last-edited date on the page." }];
    const age = days(d.lastEdited, today);
    return age > maxDays ? [{ id, title: d.title, owner: d.owner || null, lastEdited: d.lastEdited, ageDays: age, reason: `Not edited for ${age} days (limit ${maxDays}).` }] : [];
  }).sort((a, b) => (b.ageDays ?? 1e9) - (a.ageDays ?? 1e9));
}

const normValue = (v) => nameKey(String(v || "").replace(/[€$£]/g, (c) => ` ${c} `)).replace(/\s+/g, " ").trim();

// A rule that two or more pages give different values for: "possible conflict, needs a human".
export function conflicts(g, lensId = "handbook") {
  const out = [];
  for (const n of Object.values(g.nodes)) {
    if (n.lens !== lensId) continue;
    const said = Object.entries(n.contrib).filter(([, c]) => c.value).map(([doc, c]) => ({ doc, title: g.docs[doc]?.title || doc, value: c.value, lastEdited: g.docs[doc]?.lastEdited || null }));
    if (new Set(said.map((s) => normValue(s.value))).size > 1) {
      out.push({ id: n.id, name: n.name, label: "possible conflict, needs a human", pages: said.sort((a, b) => (b.lastEdited || "").localeCompare(a.lastEdited || "")) });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const NOT_FOUND = "I could not find this in the handbook.";

// Answers only from the handbook, always citing the pages. If the handbook doesn't say, it says so
// instead of guessing. Warns when a page used is out of date or part of a conflict.
export async function askHandbook(g, question, answerFn, { today, maxDays = 180 } = {}) {
  const r = await ask(g, question, answerFn);
  if (r.unknown || !r.grounded || !r.sources.length) {
    return { ...r, answer: NOT_FOUND, citations: [], sources: [], unknown: true, grounded: true, pages: [], warnings: [] };
  }
  // Cite the pages that state the answer: a rule's pages, a policy's own page. Fall back to every source.
  const byName = new Map(Object.values(g.nodes).map((n) => [nameKey(n.name), n]));
  const pageIds = new Set();
  for (const c of r.citations) {
    const n = byName.get(nameKey(c));
    if (!n) continue;
    if (["rule", "process"].includes(n.type)) n.sources.forEach((s) => pageIds.add(s));
    else if (n.type === "policy") n.sources.filter((s) => nameKey(g.docs[s]?.title || "") === nameKey(n.name)).forEach((s) => pageIds.add(s));
  }
  if (pageIds.size) r.sources = r.sources.filter((s) => pageIds.has(s.id));
  const stale = new Map(stalePages(g, today, maxDays).map((p) => [p.id, p]));
  const conflictNames = new Map(conflicts(g).map((c) => [nameKey(c.name), c]));
  const warnings = [];
  for (const s of r.sources) if (stale.has(s.id)) warnings.push(`"${s.title}" may be out of date: ${stale.get(s.id).reason}`);
  for (const c of r.citations) {
    const k = conflictNames.get(nameKey(c));
    if (k) warnings.push(`Possible conflict, needs a human: pages disagree on "${k.name}" (${k.pages.map((p) => `${p.title}: ${p.value}`).join("; ")}).`);
  }
  return { ...r, pages: r.sources.map((s) => s.title), warnings };
}
