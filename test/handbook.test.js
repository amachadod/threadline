import { test } from "node:test";
import assert from "node:assert/strict";
import { getConfig } from "../src/config.js";
import { buildBrain } from "../src/build.js";
import { pageMeta, stalePages, conflicts, askHandbook, NOT_FOUND } from "../src/handbook.js";
import { renderReport } from "../src/report.js";
import { loadExample, exampleRoot, fakeExtract, fakeAnswer } from "../scripts/examples.js";

const today = "2026-10-31";
async function handbook() {
  const { extractions, answers } = loadExample("handbook");
  const root = exampleRoot("handbook");
  const { graph } = await buildBrain({ root, config: { ...getConfig({}), root, defaultLens: "handbook", dryRun: true }, extract: fakeExtract(extractions), now: new Date(`${today}T09:00:00Z`), log: () => {} });
  return { g: graph, answers };
}

test("handbook: reads owner and last-edited date from Notion exports and --- headers", () => {
  assert.deepEqual(pageMeta("# Expenses\n\nOwner: Finance team\nLast edited time: August 14, 2026 11:02 AM\n\nText"), { owner: "Finance team", lastEdited: "2026-08-14" });
  assert.deepEqual(pageMeta("---\nowner: Ops\nlast_edited: 2025-01-02\n---\n# Page"), { owner: "Ops", lastEdited: "2025-01-02" });
  assert.deepEqual(pageMeta("# No properties here"), { owner: null, lastEdited: null });
});

test("handbook: flags pages not edited for longer than the limit, and the limit is configurable", async () => {
  const { g } = await handbook();
  assert.deepEqual(stalePages(g, today, 180).map((p) => p.title), ["Travel policy", "Customer success handbook"]);
  assert.match(stalePages(g, today, 180)[0].reason, /Not edited for \d+ days \(limit 180\)/);
  assert.ok(stalePages(g, today, 120).some((p) => p.title === "Meeting etiquette"));
  assert.equal(stalePages(g, today, 2000).length, 0);
});

test("handbook: rules two pages state differently are flagged as a possible conflict, needs a human", async () => {
  const { g } = await handbook();
  const c = conflicts(g);
  assert.deepEqual(c.map((x) => x.name), ["First response time", "Home office budget"]);
  assert.ok(c.every((x) => x.label === "possible conflict, needs a human"));
  assert.deepEqual(c[1].pages.map((p) => p.value).sort(), ["€300 per year", "€500 per year"]);
  const report = renderReport(g, today, 180);
  assert.match(report, /## Handbook: possibly out of date/);
  assert.match(report, /\*\*Home office budget\*\*: \[\[Remote work\]\] says €500 per year; \[\[Expenses\]\] says €300 per year/);
});

test("handbook: every answer cites its pages, and warns about stale pages and conflicts", async () => {
  const { g, answers } = await handbook();
  for (const q of answers.filter((a) => !a.unknown)) {
    const r = await askHandbook(g, q.question, fakeAnswer(answers), { today });
    assert.ok(r.citations.length > 0 && r.pages.length > 0, q.question);
  }
  const r = await askHandbook(g, "How fast should we reply to a customer?", fakeAnswer(answers), { today });
  assert.deepEqual(r.pages.sort(), ["Customer success handbook", "Support playbook"]);
  assert.ok(r.warnings.some((w) => /may be out of date/.test(w)));
  assert.ok(r.warnings.some((w) => /Possible conflict, needs a human/.test(w)));
});

test("handbook: no invention when the handbook doesn't say", async () => {
  const { g, answers } = await handbook();
  const r = await askHandbook(g, "What is the parental leave policy?", fakeAnswer(answers), { today });
  assert.equal(r.answer, NOT_FOUND);
  assert.deepEqual(r.pages, []);
  // An answer that cites nothing it was given is replaced too, even if it sounds confident.
  const guess = async () => ({ answer: "Parental leave is 20 weeks.", citations: [], unknown: false });
  const g2 = await askHandbook(g, "What is the parental leave policy?", guess, { today });
  assert.equal(g2.answer, NOT_FOUND);
  const made = async () => ({ answer: "It is 20 weeks.", citations: ["A page that doesn't exist"], unknown: false });
  assert.equal((await askHandbook(g, "home office budget", made, { today })).answer, NOT_FOUND);
});
