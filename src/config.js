// Reads settings from environment variables. See .env.example for what each one does.
import { readFileSync, existsSync } from "node:fs";

// Tiny .env loader so the project has zero dependencies.
export function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function getConfig(env = process.env) {
  return {
    anthropicKey: env.ANTHROPIC_API_KEY || "",
    model: env.CLAUDE_MODEL || "claude-sonnet-5-5",
    root: env.THREADLINE_ROOT || process.cwd(),
    defaultLens: env.DEFAULT_LENS || "business",
    dryRun: env.DRY_RUN === "true",
    force: env.FORCE_REBUILD === "true",
    maxChunk: Number(env.MAX_CHUNK_CHARS || 15000),
    githubToken: env.GITHUB_TOKEN || "",
    githubRepo: env.GITHUB_REPOSITORY || "",
  };
}
