// npm run build
// Reads new or changed documents in inbox/ and updates the brain in brain/.
// GitHub Actions runs this every time you add documents (.github/workflows/build-brain.yml).
import { loadDotEnv, getConfig } from "../src/config.js";
import { buildBrain } from "../src/build.js";
import { extractWithClaude } from "../src/claude.js";

loadDotEnv();
const config = getConfig();
try {
  const { stats } = await buildBrain({ root: config.root, config, extract: extractWithClaude({ apiKey: config.anthropicKey, model: config.model }) });
  if (stats.errors) process.exitCode = 1;
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
