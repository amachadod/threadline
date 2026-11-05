// Asking the brain a question: find the relevant notes by following the map, then let Claude
// answer from those notes only, and check that its sources really exist.
import { nameKey } from "./text.js";
import { degree, neighbours } from "./graph.js";
import { validateAnswer } from "./validate.js";

const STOP = new Set("a an and are at be by can de did do does for from had has have how i in is it la las los me my of on or our que the their them there they this to was we what when where which who why will with you your el en es por para".split(" "));
const words = (s) => nameKey(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));

// Pick the notes that match the question, then add their direct neighbours: the "map" part.
export function retrieve(g, question, { seeds = 6, max = 16 } = {}) {
  const q = new Set(words(question));
  const deg = degree(g);
  const scored = Object.values(g.nodes).map((n) => {
    const nameWords = new Set(words([n.name, ...n.aliases].join(" ")));
    const sumWords = new Set(words(n.summary));
    let s = 0;
    for (const w of q) { if (nameWords.has(w)) s += 3; else if (sumWords.has(w)) s += 1; }
    return { n, s: s + (s ? (deg[n.id] || 0) * 0.05 : 0) };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const picked = new Map(scored.slice(0, seeds).map((x) => [x.n.id, x.n]));
  // Follow the links up to two steps out, closest first, until there's enough context.
  let frontier = [...picked.keys()];
  for (let hop = 0; hop < 2 && picked.size < max; hop++) {
    const next = [];
    for (const id of frontier) {
      for (const e of neighbours(g, id)) {
        if (picked.size >= max) break;
        const other = e.from === id ? e.to : e.from;
        if (!picked.has(other)) { picked.set(other, g.nodes[other]); next.push(other); }
      }
    }
    frontier = next;
  }
  return [...picked.values()];
}

export function contextFor(g, nodes) {
  const ids = new Set(nodes.map((n) => n.id));
  return nodes.map((n) => {
    const rel = neighbours(g, n.id).filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) =>
      `  - ${g.nodes[e.from].name} ${e.relation} ${g.nodes[e.to].name} [${e.kind}] "${e.evidence}" (${g.docs[e.source]?.title || e.source})`);
    return [`## ${n.name} (${n.type})`, n.summary, n.date ? `Date: ${n.date}` : "", n.value ? `Amount: ${n.value}` : "",
      `Sources: ${n.sources.map((s) => g.docs[s]?.title || s).join("; ") || "none"}`, ...rel].filter(Boolean).join("\n");
  }).join("\n\n");
}

export async function ask(g, question, answerFn) {
  const nodes = retrieve(g, question);
  if (!nodes.length) return { answer: "Nothing in the brain matches that question yet.", citations: [], unknown: true, grounded: true, notes: [], sources: [] };
  const raw = await answerFn(question, contextFor(g, nodes));
  const v = validateAnswer(raw, nodes.map((n) => n.name));
  const cited = nodes.filter((n) => v.citations.includes(n.name));
  const sources = [...new Set(cited.flatMap((n) => n.sources))].map((s) => ({ id: s, title: g.docs[s]?.title || s }));
  return { ...v, notes: nodes.map((n) => n.name), sources };
}

export function formatAnswer(r) {
  const lines = [r.answer, ""];
  if (!r.grounded) lines.push("_This answer doesn't cite any note, so treat it with care._", "");
  if (r.citations.length) lines.push("**From these notes:** " + r.citations.map((c) => `[[${c}]]`).join(", "));
  if (r.sources.length) lines.push("**Documents:** " + r.sources.map((s) => s.title).join("; "));
  return lines.join("\n");
}
