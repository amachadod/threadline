// The brain itself: a graph of notes (nodes) and links (edges), rebuilt document by document.
// Every fact remembers which document it came from, so removing or editing a document
// removes or updates exactly what it contributed.
import { nameKey, slug } from "./text.js";

export const emptyGraph = () => ({ version: 1, updated: null, nodes: {}, edges: [], docs: {} });

function findNode(g, name, aliases = []) {
  const keys = new Set([name, ...aliases].map(nameKey));
  return Object.values(g.nodes).find((n) => [n.name, ...n.aliases].some((x) => keys.has(nameKey(x))));
}

function uniqueId(g, name) {
  let id = slug(name), i = 2;
  while (g.nodes[id]) id = `${slug(name)}-${i++}`;
  return id;
}

// Recompute a node's shown fields from its sources, in document order, so builds are repeatable.
function refresh(n) {
  const order = Object.keys(n.contrib).sort();
  const aliases = new Set();
  n.summary = ""; n.date = null; n.value = null;
  // The newest summary wins, unless it's much shorter than what we already know ("Mentor." vs a full sentence).
  const longest = Math.max(0, ...order.map((d) => (n.contrib[d].summary || "").length));
  for (const d of order) {
    const c = n.contrib[d];
    if (c.summary && c.summary.length >= longest * 0.5) n.summary = c.summary;
    if (c.date) n.date = c.date;
    if (c.value) n.value = c.value;
    (c.aliases || []).forEach((a) => aliases.add(a));
  }
  n.aliases = [...aliases].filter((a) => nameKey(a) !== nameKey(n.name));
  n.sources = order;
}

export function removeDoc(g, docId, keep = new Set()) {
  g.edges = g.edges.filter((e) => e.source !== docId);
  for (const n of Object.values(g.nodes)) {
    if (!n.contrib[docId]) continue;
    delete n.contrib[docId];
    refresh(n);
  }
  delete g.docs[docId];
  prune(g, keep);
}

// Notes with no source left disappear, unless you confirmed them or wrote your own notes in them.
export function prune(g, keep = new Set()) {
  for (const [id, n] of Object.entries(g.nodes)) {
    if (!n.sources.length && !keep.has(id)) delete g.nodes[id];
  }
  g.edges = g.edges.filter((e) => g.nodes[e.from] && g.nodes[e.to]);
}

export function addDoc(g, doc, lens, result) {
  g.docs[doc.id] = {
    title: doc.title, name: doc.name, lens: lens.id, hash: doc.hash,
    flags: [...doc.flags, ...(result.suspicious ? [`Suspicious: ${result.reason}`] : [])],
    entities: result.entities.length, links: result.links.length,
    dropped: result.dropped.length, droppedWhy: result.dropped.slice(0, 20),
  };
  const idFor = new Map();
  for (const e of result.entities) {
    let n = findNode(g, e.name, e.aliases);
    if (!n) {
      const id = uniqueId(g, e.name);
      n = g.nodes[id] = { id, name: e.name, type: e.type, lens: lens.id, aliases: [], summary: "", date: null, value: null, sources: [], contrib: {} };
    }
    n.contrib[doc.id] = { summary: e.summary, date: e.date, value: e.value, aliases: e.aliases };
    refresh(n);
    idFor.set(nameKey(e.name), n.id);
    e.aliases.forEach((a) => idFor.set(nameKey(a), n.id));
  }
  for (const l of result.links) {
    const from = idFor.get(nameKey(l.from)) || findNode(g, l.from)?.id;
    const to = idFor.get(nameKey(l.to)) || findNode(g, l.to)?.id;
    if (!from || !to || from === to) continue;
    g.edges.push({ from, to, relation: l.relation, kind: l.kind, evidence: l.evidence, source: doc.id });
  }
}

export const degree = (g) => {
  const d = {};
  for (const e of g.edges) { d[e.from] = (d[e.from] || 0) + 1; d[e.to] = (d[e.to] || 0) + 1; }
  return d;
};

export const neighbours = (g, id) => g.edges.filter((e) => e.from === id || e.to === id);
