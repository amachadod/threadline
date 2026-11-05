// Never trust model output blindly. Every rule here is also a test.
import { KINDS } from "./claude.js";
import { quoteIsIn, nameKey } from "./text.js";

const isDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * raw: Claude's answer for one document. text: the cleaned document. lens: its lens.
 * existing: entities already in the brain (other documents can be linked to).
 * Returns { entities, links, suspicious, reason, dropped: [{link, why}] }
 */
export function validateExtraction(raw, text, lens, existing = []) {
  const dropped = [];
  if (raw?.suspicious === true) {
    // A document that tries to instruct the AI contributes nothing.
    return { entities: [], links: [], suspicious: true, reason: clean(raw.suspicious_reason || "Tries to give instructions to an AI", 200), dropped };
  }
  const entities = [];
  const seen = new Map();
  for (const e of raw?.entities || []) {
    const name = clean(e?.name, 120);
    const type = String(e?.type || "").toLowerCase().replace(/\s+/g, "_");
    if (!name || !lens.types.includes(type)) { if (name) dropped.push({ item: name, why: `type "${e?.type}" is not in the ${lens.name} lens` }); continue; }
    const key = nameKey(name);
    if (seen.has(key)) continue;
    const ent = {
      name, type,
      summary: clean(e.summary, 400),
      aliases: [...new Set((e.aliases || []).map((a) => clean(a, 80)).filter((a) => a && nameKey(a) !== key))],
      date: isDate(e.date) ? e.date : null,
      value: e.value ? clean(e.value, 60) : null,
    };
    seen.set(key, ent);
    ent.aliases.forEach((a) => seen.set(nameKey(a), ent));
    entities.push(ent);
  }
  // Links may point at things from this document or things already in the brain.
  const known = new Map(seen);
  for (const x of existing) {
    known.set(nameKey(x.name), x);
    (x.aliases || []).forEach((a) => known.set(nameKey(a), x));
  }
  const links = [];
  const linkKeys = new Set();
  for (const l of raw?.links || []) {
    const from = known.get(nameKey(l?.from)), to = known.get(nameKey(l?.to));
    const label = `${l?.from} → ${l?.to}`;
    if (!from || !to) { dropped.push({ item: label, why: "points to something that isn't in the brain" }); continue; }
    if (from === to) { dropped.push({ item: label, why: "links a note to itself" }); continue; }
    const evidence = clean(l.evidence, 300);
    // The key safeguard: a link only survives if its quote really is in the document.
    if (!quoteIsIn(evidence, text)) { dropped.push({ item: label, why: "quote not found in the document" }); continue; }
    const relation = String(l.relation || "related_to").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "related_to";
    const kind = KINDS.includes(l.kind) ? l.kind : "unclear";
    const k = `${nameKey(from.name)}|${relation}|${nameKey(to.name)}`;
    if (linkKeys.has(k)) continue;
    linkKeys.add(k);
    links.push({ from: from.name, to: to.name, relation, kind, evidence });
  }
  return { entities, links, suspicious: false, reason: null, dropped };
}

export function validateAnswer(raw, allowedNames) {
  const allowed = new Map(allowedNames.map((n) => [nameKey(n), n]));
  const citations = [...new Set((raw?.citations || []).map((c) => allowed.get(nameKey(c))).filter(Boolean))];
  const unknown = raw?.unknown === true;
  return {
    answer: clean(raw?.answer, 2000) || "No answer.",
    citations,
    unknown,
    // An answer that cites nothing it was given is not trustworthy.
    grounded: unknown || citations.length > 0,
  };
}
