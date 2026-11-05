// npm run demo
// Builds the two example brains with the real code and a fake Claude, then asks them questions.
import { getConfig } from "../src/config.js";
import { buildBrain } from "../src/build.js";
import { ask, formatAnswer } from "../src/ask.js";
import { analyse } from "../src/report.js";
import { BRAINS, loadExample, exampleRoot, fakeExtract, fakeAnswer } from "./examples.js";

const now = new Date("2026-10-31T09:00:00Z");
for (const brain of BRAINS) {
  const { extractions, answers } = loadExample(brain);
  const root = exampleRoot(brain);
  const config = { ...getConfig({}), root, defaultLens: brain };
  const { graph } = await buildBrain({ root, config, extract: fakeExtract(extractions), now });
  const a = analyse(graph, "2026-10-31");
  console.log(`\n━━ ${brain} brain · written to ${root}/brain`);
  console.log(`   Most connected: ${a.hubs.slice(0, 4).map((n) => `${n.name} (${n.links})`).join(", ")}`);
  console.log(`   Links to check: ${a.review.length} · Documents with warnings: ${a.flagged.map((d) => d.title).join(", ") || "none"}`);
  for (const q of answers) {
    const r = await ask(graph, q.question, fakeAnswer(answers));
    console.log(`\n   Q: ${q.question}\n   ${formatAnswer(r).split("\n").join("\n   ")}`);
  }
}
console.log("\nOpen any brain/ folder above in Obsidian to explore the notes.");
