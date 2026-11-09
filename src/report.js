// brain/REPORT.md: the summary page. What's most connected, what's coming up, what to check.
import { degree } from "./graph.js";
import { stalePages, conflicts } from "./handbook.js";

const DATED = new Set(["deadline", "decision", "milestone", "goal", "project", "plan", "campaign"]);

export function analyse(g, today, staleDays = 180) {
  const deg = degree(g);
  const nodes = Object.values(g.nodes);
  const hubs = nodes.map((n) => ({ ...n, links: deg[n.id] || 0 })).sort((a, b) => b.links - a.links || a.name.localeCompare(b.name)).slice(0, 8);
  const upcoming = nodes.filter((n) => n.date && n.date >= today && DATED.has(n.type)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  const review = g.edges.filter((e) => e.kind !== "stated").map((e) => ({ ...e, fromName: g.nodes[e.from].name, toName: g.nodes[e.to].name }));
  const flagged = Object.entries(g.docs).filter(([, d]) => d.flags.length).map(([id, d]) => ({ id, ...d }));
  const dropped = Object.values(g.docs).reduce((s, d) => s + (d.dropped || 0), 0);
  const singleSource = nodes.filter((n) => n.sources.length === 1).length;
  const handbook = Object.values(g.docs).some((d) => d.lens === "handbook");
  const stale = handbook ? stalePages(g, today, staleDays) : [];
  const conflict = handbook ? conflicts(g) : [];
  return { hubs, upcoming, review, flagged, dropped, singleSource, handbook, stale, conflicts: conflict, staleDays, counts: { notes: nodes.length, links: g.edges.length, docs: Object.keys(g.docs).length } };
}

export function renderReport(g, today, staleDays = 180) {
  const a = analyse(g, today, staleDays);
  const L = [
    "# Report",
    "",
    `${a.counts.notes} notes, ${a.counts.links} links, built from ${a.counts.docs} documents. Updated ${g.updated?.slice(0, 10) || today}.`,
    "",
    "## Most connected",
    ...a.hubs.map((n) => `- [[${n.name}]] · ${n.type} · ${n.links} links`),
    "",
    "## Coming up",
    ...(a.upcoming.length ? a.upcoming.map((n) => `- ${n.date} · [[${n.name}]] (${n.type})`) : ["- Nothing dated ahead."]),
    "",
    "## Check these links",
    "These weren't stated outright. Confirm or correct them in the notes.",
    ...(a.review.length ? a.review.map((e) => `- [[${e.fromName}]] ${e.relation.replace(/_/g, " ")} [[${e.toName}]] · _${e.kind}_ · "${e.evidence}"`) : ["- Nothing to check."]),
    "",
    "## Documents with warnings",
    ...(a.flagged.length ? a.flagged.map((d) => `- [[${d.name}]]: ${d.flags.join("; ")}`) : ["- None."]),
    "",
    ...(a.handbook ? [
      "## Handbook: possibly out of date",
      `Pages not edited for more than ${a.staleDays} days. Ask the owner to check them.`,
      ...(a.stale.length ? a.stale.map((p) => `- [[${p.title}]]${p.owner ? ` · owner: ${p.owner}` : ""} · ${p.reason}`) : ["- None."]),
      "",
      "## Handbook: possible conflicts, need a human",
      "Two pages give a different answer for the same rule. Threadline doesn't pick one.",
      ...(a.conflicts.length ? a.conflicts.map((c) => `- **${c.name}**: ${c.pages.map((p) => `[[${p.title}]] says ${p.value}`).join("; ")}`) : ["- None."]),
      "",
    ] : []),
    `${a.dropped} suggested links were thrown away because their quote wasn't in the document or they pointed at nothing. ${a.singleSource} notes come from a single document.`,
    "",
  ];
  return L.join("\n");
}
