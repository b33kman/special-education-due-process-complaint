# Due Process Complaint Drafter

**A Claude Code plugin that drafts an IDEA special education due process complaint from a folder of school documents** — IEPs, evaluations, prior written notices, progress reports, service logs, emails — for any US state and the District of Columbia.

Claude reads every page, confirms the facts with the person filing, looks up the state's filing procedure on its official pages, and drafts a complaint in the form of a pleading. A script checks that every date, figure and quotation in it is in the documents or in the person's own words; a fresh reviewer checks the rest. The result is a **PDF to file** and a **Word file to edit**, with filing instructions for the state.

It is built for the people who file these: special education attorneys, legal aid organizations, advocates, and parents filing on their own. It is not legal advice, it does not decide which claims a file supports, and it says nothing about how a complaint will fare.

## What you get

For a case folder holding the documents:

| File | What it is |
|---|---|
| `complaint.pdf` | The complaint, to file: the forum's name over a bracketed caption, then consecutively numbered, double-spaced paragraphs — introduction, contact and residence information, statement of facts, statement of the problems (one lettered section per claim, the regulation under each heading), proposed resolution — the signature block and the certificate of service. Letter, one-inch margins, Times 12, page numbers. |
| `complaint.docx` | The same document as a Word file, to edit before filing. |
| `complaint.md` | The complaint's source text: what Claude drafted and the script checked. |
| `filing-instructions.md` | How to file in that state — where the complaint goes, how it may be sent, who is served and when, the time limit — each point with the official page it came from. |
| `statement.md` | The person's own account, in their words. |

Until the complaint passes the check and is marked final, it is written as `complaint.DRAFT.pdf` and `complaint.DRAFT.docx` with **DRAFT — NOT FOR FILING** at the top, so a draft cannot be filed by mistake.

## How it works

1. **Ask** who is filing (a parent, or an attorney), the state and the filing date.
2. **Read** every PDF page by page (`pdf-text.mjs`).
3. **Confirm** the facts the complaint will rest on with the person — names, address, school, events and dates, each with its page — and take their own account in their words.
4. **Look up the state's procedure** on its official due process filing page — listed, with the office's contacts, for all 50 states and DC in [STATES.md](STATES.md).
5. **Draft** `complaint.md` in the form of `references/exemplar.md`.
6. **Check** it (`check.mjs`): every date, figure and quotation must be in the documents or the person's statement; the required elements must be there; the sections must follow the form. Then **review** it for everything else (`references/review.md`) and fix what is found.
7. **Render** the PDF and the Word file (`render.mjs`) and hand them over with the filing instructions.

## Install

Requires [Claude Code](https://claude.com/claude-code) and Node 20 or later.

**As a plugin.** In Claude Code:

```
/plugin marketplace add b33kman/special-education-due-process-complaint
/plugin install due-process-complaint@due-process-complaint
```

Claude Code installs the three script dependencies (`pdfjs-dist`, `docx`, `pdf-lib`) with the plugin.

**As a personal skill, from a clone:**

```bash
git clone https://github.com/b33kman/special-education-due-process-complaint.git
cd special-education-due-process-complaint && npm install
ln -s "$(pwd)/skills/due-process-complaint" ~/.claude/skills/due-process-complaint
```

Then ask Claude Code for a due process complaint from a folder of PDFs. The skill starts on that request; you can also call it directly — `/due-process-complaint:due-process-complaint` as a plugin, `/due-process-complaint` as a personal skill. Run it with the most capable Claude model available to you, at the highest effort setting: reading and drafting are where the quality is.

## Updating

**If you installed the plugin**, turn on automatic updates once: run `/plugin`, open **Marketplaces**, choose `due-process-complaint`, and select **Enable auto-update**. Claude Code then checks for a new version in the background after it starts; run `/reload-plugins` when it tells you an update is ready, or it loads the next time you start Claude Code. Automatic updates are off by default for marketplaces outside Anthropic's own.

To update by hand instead, run `/plugin marketplace update due-process-complaint`, then install the plugin again.

**If you installed from a clone**, run `git pull` in the repository folder, then `npm install`.

What changed in each version is in [CHANGELOG.md](CHANGELOG.md); each version is also published as a [GitHub release](https://github.com/b33kman/special-education-due-process-complaint/releases), so watching the repository for releases tells you when there is a new one.

## Using it

Put the documents in a folder:

```
my-case/
  documents/
    IEP_2025-09-08.pdf
    Progress_Reports.pdf
    ...
```

Then: *"Draft a due process complaint from the documents in `my-case/`. The state is California and I'm filing pro se."*

Two worked examples ship, each on invented documents: `examples/river-oak/` (California, a parent filing pro se) and `examples/pine-hollow/` (North Carolina, an attorney filing, with the county in the caption and a one-year time limit).

## What it will not do

- Choose the claims or the relief. The person filing decides.
- Say how the complaint will fare, in the document or in chat.
- Fill a gap in the record. If no document and no statement supports a fact, the complaint says less.
- Take a filing address or a time limit from memory. They come from the state's official pages, every run.

## Confidentiality

The documents stay on the machine running the skill; what leaves it is the model provider's normal traffic and the state-procedure web requests, which name no student. Anyone using this on a client's file should be satisfied that their model provider's terms fit their confidentiality obligations. **Never commit a real case folder**: the `.gitignore` excludes every `work/` folder and every PDF outside `examples/`. The examples are fiction.

## Frequently asked questions

**What is a special education due process complaint?**
A written complaint that starts a due process hearing under the Individuals with Disabilities Education Act (IDEA). A parent or a public agency may file one on any matter relating to a child's identification, evaluation or educational placement, or the provision of a free appropriate public education (34 C.F.R. § 300.507(a)). The hearing officer decides the dispute after a hearing; the complaint sets out what the hearing is about.

**What must a due process complaint contain?**
Six things, under 34 C.F.R. § 300.508(b): the child's name; the address of the child's residence; the name of the child's school; for a homeless child, available contact information and the school; a description of the problem, including the facts relating to it; and a proposed resolution to the extent known. Some states require more. This skill will not render a complaint as final while one is missing.

**How long does a family have to file?**
Under 34 C.F.R. § 300.507(a)(2), two years from the date the parent or agency knew or should have known about the action the complaint is about, unless the state has its own explicit time limit. A few states do: the research table bundled here records one year for Alaska, North Carolina and Wisconsin and three years for Kentucky. The skill looks up the filing state's window on its official pages every run and points out events older than it; whether an exception applies is the signer's judgment.

**Where is a due process complaint filed?**
It depends on the state. In many it goes to the state education agency; in some to a separate hearings office (California and North Carolina, for example); in others to the school district, with a copy to the state (Illinois and Arizona, for example). The other party always gets a copy (34 C.F.R. § 300.508(a)), and some offices accept a complaint only after the district has been served — California's does. **[STATES.md](STATES.md) lists the office, the official filing page, the contacts and the time limit for every state and DC.** The skill opens the state's official page on every run and writes filing instructions with the source of each point.

**Is it legal advice? Will it tell me whether the case is strong?**
No. It drafts from the documents and the facts the person filing confirms, and it does not choose claims or predict outcomes. The person who signs the complaint is responsible for it.

**Who is it for?**
Special education attorneys and legal aid organizations drafting for clients, advocates helping families, and parents filing on their own (pro se). It asks an attorney the attorney's questions and a parent in plain words; the pleading is the same either way.

**What does it need to run?**
Claude Code, Node 20 or later, and web access for the state procedure step. It works on PDFs with a text layer; a scanned page with no text layer has to be read by eye.

**How does it keep errors out of the complaint?**
Two ways. A script refuses any date, figure or quotation that is not in the documents or in the person's own statement, a missing required element, and a complaint that does not follow the form. Then the draft is reviewed, by a fresh subagent where possible, for what a script cannot catch — fidelity to the pages, the state's own rules, consistency, legal posture, completeness and the rendered files — and the errors are fixed before the complaint is final. Until then it is written only as `complaint.DRAFT.pdf`.

## Testing

```bash
npm install && npm test
```

Each test breaks a worked example in one way — an invented date, a figure that is only the tail of the real one, a quotation not on the page, a missing school, a section out of order — and asserts the check refuses it, and that a draft is never rendered under the name of the file to file.

## Layout

```
.claude-plugin/          plugin and marketplace manifests
skills/due-process-complaint/
  SKILL.md               the procedure Claude follows
  references/            the exemplar (form and voice), the review checklist, the state table (STATES.md, readable)
  scripts/               pdf-text.mjs, check.mjs, render.mjs
examples/                two complete worked examples on invented documents
tests/                   the tests
STATES.md                where to file in each state: office, official page, contacts, time limit
```

## Provenance

The exemplar and the state research table are derived from Sped DPC, a due process drafting product built by Beekman One LLC, released here so the procedure can be used and inspected on its own.

## License

[MIT](LICENSE). The worked examples are fiction; the state research is a starting point, not legal authority — confirm every value on the state's official page before relying on it.

## Disclaimer

This software prepares a document from information you supply and confirm. It is not a law firm, does not provide legal advice, and creates no attorney–client relationship. The person who signs and files the complaint is responsible for it.
