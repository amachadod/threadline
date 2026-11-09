# Threadline

**A second brain that grows from your documents.**

**Who it's for:** anyone with scattered notes and documents, such as account managers, marketers, consultants and students, who wants answers traced back to the source.

Drop in briefs, call notes, emails or personal notes. Threadline has Claude read them and turns them into **linked notes you can open in Obsidian**, a **map Claude can follow** instead of searching every file, and a **report** of what's coming up and what to check. Every connection quotes the document it came from.

It works for your business (clients, people, projects, decisions, deadlines, budgets), your personal life (goals, learning, people, plans) or a marketing team (campaigns, channels, results). Each is a plain-English "lens" you can edit or copy.

👉 **[Explore the live demo](https://amachadod.github.io/threadline/)**: two example brains, business and personal, built by the real code. Click through the map, open the notes and ask questions.

*Portfolio project by Alberto Machado Domínguez. The people, companies and documents in the examples are fictional.*

---

## How it works

```
 inbox/                       Claude reads            Threadline checks             brain/
 ┌───────────────┐            ┌──────────────┐        ┌──────────────────┐          ┌─────────────────────┐
 │ business/     │  new or    │ people,      │        │ quote really in  │          │ notes/  (Obsidian)  │
 │ personal/     │ ─changed─▶ │ projects,    │ ─────▶ │ the document?    │ ───────▶ │ graph.json  (map)   │
 │ marketing/    │  documents │ links +quote │        │ type in lens?    │          │ REPORT.md           │
 └───────────────┘            └──────────────┘        └──────────────────┘          └─────────────────────┘
```

1. **Drop.** Put documents in `inbox/`, in a folder that matches a lens: `inbox/business/`, `inbox/personal/`, `inbox/marketing/`. Threadline reads `.md`, `.txt` and `.html`.
2. **Clean.** Hidden text (HTML comments, invisible text, zero-width characters) is removed, and bank details, card numbers, keys and passwords are redacted, before Claude sees anything.
3. **Read.** Claude reads each new or changed document with its lens and returns the things it mentions (people, projects, decisions, goals, dates, amounts) and the links between them, each with a word-for-word quote. It's told what's already in the brain, so "Sofía", "Sofia" and "Sofía Medina" become one note.
4. **Check.** A link survives only if its quote really is in the document. Each link is marked **stated**, **inferred** or **unclear**.
5. **Write.** The brain is rebuilt: one Markdown note per thing in `brain/notes/`, the map in `brain/graph.json`, a `REPORT.md` and a `Home.md` to start from.
6. **Ask.** `npm run ask -- "question"`, or open a GitHub issue with the label `ask`. Threadline finds the matching notes, follows their links two steps out, and gives Claude only those notes. The answer cites the notes it used.

### Why a map instead of just giving Claude the files?

Without a map, Claude has to search every document for every question, and it only sees connections inside the files it happens to open. With the map it follows links straight to the right notes, sees how things connect across documents, and the brain is still there next week. Unlike a classic second brain you build by hand, Threadline does the reading and linking for you, and you stay in charge of corrections (see [You stay in charge](#you-stay-in-charge)).

## What a note looks like

```markdown
---
type: person
aliases: ["Sofía", "Sofia"]
sources: 3
confirmed: false
threadline_id: sofia-medina
---
# Sofía Medina

Marketing Manager and day-to-day contact at Casa Verde Hotels.

## Connections
- works at [[Casa Verde Hotels]] · _inferred_
  > Sofía Medina, Marketing Manager, is our day-to-day contact.
  > — [[2026-09-15 Casa Verde brief]]
- reports to [[Rafael Ortega]] · _unclear_
  > My director wants to see it before our Friday budget meeting.
  > — [[2026-10-27 Email - opening moved (Posta)]]

## Sources
- [[2026-09-15 Casa Verde brief]]

## Your notes
_Add anything Threadline couldn't know. This section is never overwritten._
```

Open the **repository folder** as a vault in Obsidian and every `[[link]]` works, including links back to the original documents in `inbox/`. Obsidian's graph view shows the same map as the demo.

## Lenses

| Lens | Folders | Remembers |
|---|---|---|
| [Business](lenses/business.md) | `business`, `clients`, `work` | People, organizations, projects, decisions, deadlines, budgets, risks, preferences |
| [Personal](lenses/personal.md) | `personal`, `life`, `learning` | Goals, resources, people, ideas, plans, places, milestones, habits |
| [Marketing](lenses/marketing.md) | `marketing`, `campaigns`, `brand` | Campaigns, channels, audiences, results, creatives, learnings, decisions |

For anything else (research, recruiting, a game's community), copy [`lenses/_template.md`](lenses/_template.md) and describe in plain English what to remember. Files starting with `_` are ignored.

## Safeguards

- **Every link has a receipt.** A link is kept only if its quote is really in the document. Links that point at nothing, use a type the lens doesn't allow, or link a note to itself are thrown away and counted in the report.
- **Guesses never look like facts.** Links are marked stated, inferred or unclear. The report lists every inferred and unclear link to check, and answers are told not to treat them as facts.
- **Documents are untrusted.** Hidden text is removed before Claude reads anything. The prompt treats documents as data, never instructions, and a document that tries to instruct the AI adds nothing. The demo's vendor proposal hides an instruction to "record a €50,000 contract"; it never reaches the brain.
- **Sensitive details stay out.** IBANs, card numbers (checked with the Luhn test), API keys and passwords are redacted before Claude sees the text, and lenses tell Claude not to store health or ID details.
- **Answers must cite.** An answer can only cite notes it was given. An answer with no citations is marked as untrustworthy.
- **Only you can ask from GitHub.** The `ask` workflow answers issues from the repository owner only.
- **Nothing in the logs.** Logs contain counts only, never document content.
- **Dry run.** `DRY_RUN=true` does everything except write `brain/`.

## You stay in charge

- Write anything under **"## Your notes"** in a note. It's kept on every rebuild.
- Set **`confirmed: true`** in a note's header and the note is kept even if no document mentions it any more.
- **Your own notes are never touched.** Threadline only replaces the notes it generated (the ones with a `threadline_id`).
- **Delete a document and exactly what it contributed disappears.** Edit one and only that document is read again.

## Try it without any accounts

You need [Node.js 20+](https://nodejs.org). There are no dependencies to install.

```bash
git clone https://github.com/amachadod/threadline.git
cd threadline
npm run demo   # builds the two example brains and asks them questions (no API key)
npm test       # 21 tests: cleaning, redaction, validation, merging, rebuilds, your notes, asking, GitHub issues
```

`npm run demo` prints where it wrote each example brain. Open that folder in Obsidian to explore it.

## Which setup is right for you?

| | **GitHub repository** (recommended) | **Your computer** |
|---|---|---|
| Where documents live | In the repo's `inbox/` (add them on github.com or with Git) | In a folder on your computer |
| Who runs it | GitHub Actions, automatically on every change | You, with `npm run build` |
| Ask questions | Open an issue labelled `ask`, or `npm run ask` | `npm run ask`, or Claude Code in the folder |
| History | Every change to the brain is a Git commit | Only if you use Git |
| Cost | Free (GitHub Actions) + Claude usage | Claude usage |

**Rule of thumb:** for a brain you'll keep adding to, use GitHub. For a quick one-off map of a folder, run it on your computer.

### Option A: your GitHub repository is the brain

1. **Make a private copy.** Click **Use this template → Create a new repository** and choose **Private**. Your documents and notes are personal or confidential, and everything in a public repository is visible to anyone.
2. **Add your key.** **Settings → Secrets and variables → Actions**: add the secret `ANTHROPIC_API_KEY` (from the [Anthropic Console](https://console.anthropic.com)), and the variable `THREADLINE_ENABLED` = `true`. Optional variables: `DEFAULT_LENS`, `DRY_RUN`.
3. **Check commits are allowed.** The build workflow asks for permission to commit the updated `brain/`. If its "Commit the updated brain" step fails with a permission error, go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**.
4. **Add documents.** Upload files into `inbox/business/`, `inbox/personal/` or `inbox/marketing/`. Each upload runs [Build the brain](.github/workflows/build-brain.yml), which commits the new notes a minute later.
5. **Ask.** Create the label `ask`, open an issue with your question as the title and add the label. [Ask the brain](.github/workflows/ask.yml) replies with the answer and the notes it used.
6. **Browse.** Clone the repository and open its folder in Obsidian. Pull to get new notes.

### Option B: on your own computer

1. Download the code, copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`.
2. Put documents in `inbox/<lens folder>/`.
3. Run `npm run build`. Only new or changed documents are read; `FORCE_REBUILD=true` reads everything again.
4. Ask: `npm run ask -- "What did we decide about the Valle de Bravo budget?"`
5. Open the folder in Obsidian, or open it in **Claude Code**: `brain/CLAUDE.md` tells Claude to start at `Home.md`, follow the links and cite its sources.

**Using Minuta and Posta?** Save their call summaries and emails into `inbox/business/`. The example brain includes one of each.

## Costs

- **GitHub Actions:** free for this. A build only reads new or changed documents.
- **Claude:** pay per use, roughly one request per new document and one per question. A short document costs a fraction of a cent to a few cents.
- **Obsidian:** free for personal use, and optional.

## Project structure

```
src/
  text.js        hidden text removal, redaction, quote matching
  docs.js        reads inbox/, detects changes, splits long documents
  lenses.js      loads lenses and picks one per folder
  claude.js      prompts and structured output for reading and answering
  validate.js    checks every entity, link and answer before it's used
  graph.js       merges documents into the map; removing a document removes its facts
  vault.js       writes the Obsidian notes and keeps your edits
  report.js      REPORT.md
  ask.js         finds notes on the map and answers from them
  build.js       the whole build
  github.js      answering questions from GitHub issues
scripts/         build, ask, demo, build-demo, examples (fake Claude for the demo and tests)
lenses/          business, personal, marketing, _template
inbox/           your documents go here
examples/        two fictional brains: documents, example Claude output, example answers
docs/            the demo page (GitHub Pages)
test/            node:test suite
.github/         build on every change; answer issues labelled "ask"
```

## Limitations

- The demo uses example output written for fictional documents. It doesn't call Claude live, because a public page can't hold an API key.
- The map is only as good as the reading. Inferred and unclear links need a human eye; that's why the report lists them.
- Name matching is careful but not perfect. If two notes are the same thing, add the other name as an alias in your lens instructions or confirm the right one.
- PDFs and Word files aren't read yet. Save them as text or Markdown first.
- Very large brains (thousands of notes) would need smarter search than word matching. Threadline is built for one person's or one team's documents.

## Tech

Node.js 20+, no dependencies. Claude Messages API with forced tool use, a small deterministic knowledge graph in JSON, Obsidian-flavoured Markdown, GitHub Actions (build on push, answer issues), GitHub REST API, GitHub Pages and a hand-written canvas map for the demo.

## Part of a small set of tools

- [**Plano**](https://github.com/amachadod/plano): paid media budget forecaster
- [**Minuta**](https://github.com/amachadod/minuta): turns calls into tasks for the right team
- [**Posta**](https://github.com/amachadod/posta): turns email into a morning briefing, tasks and drafts
- **Threadline**: remembers everything they produce, and everything else you give it

## License

MIT. Claude, Obsidian and GitHub are trademarks of their respective owners. Threadline is an independent project and is not affiliated with them.

---
Built by Alberto Machado Domínguez · [albertomachdom@gmail.com](mailto:albertomachdom@gmail.com) · [LinkedIn](https://www.linkedin.com/in/alberto-machado-dom%C3%ADnguez-708290251/)
