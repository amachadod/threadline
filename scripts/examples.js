// Runs the example brains (examples/business, examples/personal, examples/handbook) through the real Threadline code,
// with a fake Claude that returns the saved example answers. No API key needed.
import { readFileSync, mkdtempSync, cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const here = new URL("../", import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(here, p), "utf8"));

export const BRAINS = ["business", "personal", "handbook"];
export const loadExample = (brain) => ({
  extractions: read(`examples/${brain}/extractions.json`),
  answers: read(`examples/${brain}/answers.json`).questions,
});

// A throwaway copy of the repo layout (inbox + lenses) to build an example brain in.
export function exampleRoot(brain) {
  const root = mkdtempSync(join(tmpdir(), `threadline-${brain}-`));
  cpSync(join(here, `examples/${brain}/inbox`), join(root, "inbox"), { recursive: true });
  cpSync(join(here, "lenses"), join(root, "lenses"), { recursive: true });
  return root;
}

export const fakeExtract = (extractions) => async (doc) => {
  const x = extractions[doc.id];
  if (!x) throw new Error(`No example extraction for ${doc.id}`);
  return x;
};

export const fakeAnswer = (answers) => async (question) =>
  answers.find((a) => a.question === question) || { answer: "No example answer for this question.", citations: [], unknown: true };
