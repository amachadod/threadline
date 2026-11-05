// npm run ask -- "When does Valle de Bravo open?"
// Or, in GitHub Actions, answers an issue labelled "ask" (.github/workflows/ask.yml).
import { readFileSync } from "node:fs";
import { loadDotEnv, getConfig } from "../src/config.js";
import { loadGraph } from "../src/build.js";
import { ask, formatAnswer } from "../src/ask.js";
import { answerWithClaude } from "../src/claude.js";
import { questionFromEvent, postComment } from "../src/github.js";

loadDotEnv();
const config = getConfig();
const answerFn = answerWithClaude({ apiKey: config.anthropicKey, model: config.model });

try {
  const g = loadGraph(config.root);
  if (process.argv.includes("--issue")) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const q = questionFromEvent(event, process.env.GITHUB_REPOSITORY_OWNER);
    if (!q.ok) { console.log(`Not answering: ${q.why}`); process.exit(0); }
    const r = await ask(g, q.question, answerFn);
    await postComment({ repo: config.githubRepo, token: config.githubToken, number: q.number,
      body: `${formatAnswer(r)}\n\n<sub>Answered by Threadline from ${r.notes.length} notes. It only uses this repository's documents.</sub>` });
    console.log(`Answered issue #${q.number} using ${r.notes.length} notes.`);
  } else {
    const question = process.argv.slice(2).join(" ").trim();
    if (!question) { console.error('Ask a question: npm run ask -- "your question"'); process.exit(1); }
    console.log("\n" + formatAnswer(await ask(g, question, answerFn)) + "\n");
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
