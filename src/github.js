// Ask from GitHub: open an issue with the "ask" label and Threadline replies with a comment.
// Only the repository owner's questions are answered, so strangers can't use your brain or your API key.

export function questionFromEvent(event, owner) {
  const issue = event?.issue;
  if (!issue) return { ok: false, why: "Not an issue event." };
  const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name).toLowerCase());
  if (!labels.includes("ask")) return { ok: false, why: "Issue has no 'ask' label." };
  if (!owner || issue.user?.login?.toLowerCase() !== owner.toLowerCase()) return { ok: false, why: "Only the repository owner can ask." };
  const question = [issue.title, issue.body].filter(Boolean).join("\n\n").trim().slice(0, 2000);
  if (!question) return { ok: false, why: "Empty question." };
  return { ok: true, question, number: issue.number };
}

export async function postComment({ repo, token, number, body, fetchImpl = fetch }) {
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are needed to reply.");
  const res = await fetchImpl(`https://api.github.com/repos/${repo}/issues/${number}/comments`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json", "x-github-api-version": "2022-11-28" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status} posting the answer.`);
}
