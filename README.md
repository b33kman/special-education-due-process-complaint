# dpc-complaint

A Claude Code skill that drafts an IDEA special-education **due process complaint** from a folder of school documents — IEPs, evaluations, prior written notices, progress reports, service logs, emails — for any US state, with every sentence traced to a page in those documents or to a statement the person filing made. It delivers the complaint as a **PDF to file** and a **Word file to edit**, in the form of a pleading a lawyer files.

It is built for the people who actually file these: special-education attorneys, legal-aid organizations, advocates, and parents. It is not legal advice and it does not decide which claims a file supports. It reads, verifies, drafts from what was confirmed, and shows its sources.

## What you get

For a case folder holding the documents, the skill produces:

| File | What it is |
|---|---|
| `complaint.pdf` | The complaint, to file: the forum's name over a bracketed caption, then consecutively numbered double-spaced paragraphs — introduction, contact and residence information (name, date of birth, address, school), the statement of facts (the confirmed chronology, oldest first), the statement of the problems (one lettered section per claim, the regulation under each heading), the proposed resolution (each remedy its own lettered sub-paragraph, counsel's fees reservation after them), any requests concerning the hearing, any state-required items — then the signature block and the certificate of service. Letter, one-inch margins, Times 12, page numbers. |
| `complaint.docx` | The same document as a Word file, for any editing the signer wants before filing. |
| `complaint.md` | The same text, plain. |
| `sources.md` | Every paragraph of the complaint, keyed by its number, with what it rests on: the document, page and verbatim words for each reading; the person's own statements; the web page, quotation and access date for each fact about the state's procedure — and a list of every sentence, date or figure that rests on the person's statement and on no document. |
| `verification-report.md` | What was checked and what passed: readings verified on their page, confirmations, the draft gate's rounds, the state quotations checked against their pages, the validator's findings, a *How to file* section for the state (where the original goes, who is served and whether service comes first, the channels, the form, the window), and a status line — **FINAL** or **DRAFT — NOT FOR FILING**. |

While anything blocks FINAL, all three copies of the complaint carry **DRAFT — NOT FOR FILING** at their head, so a draft cannot be filed by mistake.

## How it keeps facts honest

The skill is a procedure plus eleven small scripts and a shared helper, and the scripts are the part that cannot be talked out of a rule:

1. **Read.** `pdf-text.mjs` turns each PDF into per-page text and keeps the inventory the model fills in (kind, date, title).
2. **Extract, verbatim.** The model reads each document against a schema (`references/extraction-schema.json`) and records each value exactly as the page writes it, with the page number.
3. **Verify.** `verify-readings.mjs` checks every reading against the page text. A paraphrase, a "corrected" date, a wrong page number, or a figure that is only the tail of the page's figure is refused; a value too short to prove anything on its own ("7", "NC", "2025", a ZIP code) must come with the words around it.
4. **Confirm.** The person decides each reading — confirm, correct, or reject. `confirm.mjs` records it. A correction is allowed only to a reading the verifier found on its page. Nothing unconfirmed can be cited.
5. **Verify the state's procedure.** Which body the complaint is captioned before, who gets the original and the copy, whether service comes before filing, the filing channels, the limitations window, whether the state requires a form or extra contents — each verified on the web during the run and recorded with its URL, access date and a quotation of the page's own words (`references/state-research.md`; `fetch-text.mjs` reads a page or a PDF into text). Then `verify-state.mjs` checks every quotation against the page it cites, exactly as readings are checked: a "quotation" that is not on the page supports nothing. A 51-state research table ships as the starting point; it is never the authority.
6. **Draft, tagged.** Every sentence of the statement of the problems ends with the ids of the sources it rests on. `check-draft.mjs` refuses any sentence whose dates, figures or quotations are not in the sources it cites, and enforces the pleading rules: third person, no legal conclusions, no citations in the facts, no advice, no outcome language, no given names, no arithmetic in digits or in words, no repetition. The same gate holds the chronology — each event's date must be written in a source the event names — and the remedies, in the person's own words, to the same rules, and it names every sentence that rests on the person's statement alone.
7. **Assemble, validate, render, report.** `run-gates.mjs` composes the complaint from fixed wording and confirmed data, checks every element 34 C.F.R. § 300.508(b) requires, checks that every caption fact prints its confirmed reading, that every state-required item has an entry, and that the state block and its quotations verified, checks the limitations window, renders the PDF and the Word file, and writes the files above. The deliverables of the previous run are removed first, so nothing stale survives a run that stops.

The gates are tested by breaking them: `tests/gates.test.mjs` copies the worked examples, changes one thing a model could plausibly get wrong (an invented date, a date in the wrong form, a paraphrased reading, a first-person remedy, a missing ZIP code, an unsourced limitations window, a state quotation that is not on its page, an event whose date no source states), and asserts the script refuses it with an error rather than a warning; a few pin the printed form, and the PDF and Word files are read back.

## Install

Requires [Claude Code](https://claude.com/claude-code) and Node 20 or later.

**As a plugin (the simplest route).** In Claude Code:

```
/plugin marketplace add b33kman/dpc-complaint
/plugin install dpc-complaint@dpc-complaint
```

Then install the three script dependencies once. Claude Code keeps a copy of each installed plugin version under `~/.claude/plugins/`; this installs into every copy it finds, and has to be run again after a plugin update (each version is a new copy):

```bash
for d in $(find ~/.claude/plugins -type d -path '*/skills/dpc-complaint/scripts' -not -path '*/node_modules/*'); do (cd "$d" && npm install); done
```

**As a personal skill (all your projects), from a clone:**

```bash
git clone https://github.com/b33kman/dpc-complaint.git
cd dpc-complaint && npm run setup
ln -s "$(pwd)/skills/dpc-complaint" ~/.claude/skills/dpc-complaint
```

**As a project skill:** copy or link `skills/dpc-complaint` into your project's `.claude/skills/` and run `npm install` in its `scripts/` folder.

Then, in Claude Code, ask for a due process complaint from a folder of PDFs. The skill triggers on that request; you can also invoke it directly — `/dpc-complaint:dpc-complaint` when installed as a plugin (plugin skills carry the plugin's name), `/dpc-complaint` when installed as a personal or project skill.

## Which model to run it with

Extraction and drafting are where the quality lives. Run this skill with **the most capable Claude model available to you, at the highest effort setting** — as of this writing (September 2026) that is Claude Fable 5.1, or Opus 5. Do not run it on a small or fast model: a reading the verifier refuses and a draft the gate refuses cost more in rounds than a stronger model costs in tokens. Check the current model lineup in your Claude Code settings; names move.

A run is not quick. Reading every page verbatim and verifying the state's procedure on the web are the long parts; the gates themselves take seconds.

## Using it

Put the documents in a folder:

```
my-case/
  documents/
    IEP_2025-09-08.pdf
    Progress_Reports.pdf
    ...
```

Then, in Claude Code: *"Draft a due process complaint from the documents in `my-case/`. The state is California and I'm filing pro se."* The skill asks what it needs in short screens — one purpose each, never more than three questions, buttons for the closed choices — first before reading (who is filing, the state and the filing date, the signer's details, mediation, an interpreter) and again once the readings are confirmed (who the documents name and whether that is who is filing, the four statements of fact, the claims, the relief and its quantities, the chronology). It asks a parent in plain words and an attorney in the terms of art, and it asks an attorney the attorney's questions: whether to reserve attorneys' fees and costs under 20 U.S.C. § 1415(i)(3)(B) (a court awards them, so the complaint reserves the right in its own paragraph after the remedies), how the respondent should be captioned where the state's form names a board, whether a claim outside the catalogue needs its own heading and regulation or a catalogue heading needs rewording, whether a discipline case should ask for an expedited hearing. Anything you answer up front — including "confirm every reading that checks out against the page; I'll review the sources" — is taken and not asked again, so an attorney who supplies everything in the first message gets a complete run with no questions. The output is the PDF and the Word file, every run; there is nothing to choose.

Two worked examples ship, each a complete run on invented documents — the PDFs, every intermediate file in `work/` (the readings, the state pages as fetched, the checks), and the deliverables. `examples/river-oak/` is a parent filing pro se in California; `examples/pine-hollow/` is an attorney filing in North Carolina, where the window is one year, the form puts the county in the caption and names a Board of Education as respondent, and a copy goes to the state agency. Each has a README that walks through the run. To regenerate either set of PDFs from its source: `cd examples/<name> && npm install --no-save --no-package-lock pdf-lib && node make-documents.mjs` (the PDFs change byte for byte; their text does not).

## What it will not do

- It will not choose your claims. It lists what a complaint of this kind may plead and one sentence on what each turns on; you choose.
- It will not say how the complaint will fare, in the document or in chat.
- It will not fill a gap in the record. If no document and no statement of yours supports a fact, the complaint says less — and it tells you which sentences rest on your statement alone.
- It will not take a filing address, a limitations period or a forum from memory, and it will not quote a state's page it has not checked. Each is verified on the web during the run, and if it cannot be, the complaint stays a DRAFT and the report says which item.
- It does not read scans well. A page with no text layer must be read by eye, and readings from it are marked unverifiable in the report.
- It signs for two kinds of filer: an attorney, or the parent pro se. A lay advocate who helps a parent is not a signer and is not named on the pleading. It captions an adult student without "a minor" and says that IDEA rights may have transferred; who the petitioner is then is the signer's decision.

## Confidentiality

The documents stay on the machine running the skill. What leaves it is the model provider's normal traffic and the state-procedure web requests, which carry only the page's URL and name no student. Anyone using this on a client's file should be satisfied that their model provider's terms fit their confidentiality obligations. That judgment is theirs.

**Never commit a real case folder.** The `.gitignore` excludes every `work/` folder and every PDF anywhere in the repository except under `examples/`; keep live case folders outside the repository altogether. The examples are fiction.

## Testing

```bash
cd skills/dpc-complaint/scripts && npm install
cd ../../.. && node --test tests/*.test.mjs
```

Each test breaks a worked example in one way and asserts the gate refuses it with an error (or warns, where a warning is the right answer); the run prints the count. Both examples are exercised, the grader is run over both, and the PDF and Word files are read back. All pass on Node 22.

**Evaluation.** `skills/dpc-complaint/evals/` holds two end-to-end prompts (the two worked examples, with every answer supplied up front) and a grader (`grade.mjs`) that scores a run on fourteen checks: every date and figure in the statement is in the documents or the person's own statement, third person, no given name, no citations or conclusions in the facts, no outcome language, the forum right for the state, the state's procedure sourced to official pages with access dates, the North Carolina one-year window found and the out-of-window event flagged. On 2026-09-14, with Claude Fable 5.1 at the highest effort, two runs with the skill scored 14/14 and 14/14 and reached FINAL; the same prompts with no skill scored 8/14 and 11/14 (re-scored with the current grader after a section-heading regex in it was corrected). What the no-skill runs got wrong is instructive: they verified state law from primary sources on their own and wrote careful complaints, but computed figures the documents do not state (a 2,935-minute shortfall), wrote a computed deadline as a date, put regulation and case citations and legal conclusions inside the facts, and used the student's name in the body — the pleading conventions the gates exist to hold. The gates spend about a third more tokens than an unassisted run and finish sooner. The four grading files are in `skills/dpc-complaint/evals/results/`.

## Layout

```
.claude-plugin/          plugin and marketplace manifests
skills/dpc-complaint/
  SKILL.md               the procedure Claude follows
  references/            the exemplar, the drafting rules, the form of the pleading, the extraction schema,
                         the claims and relief catalogues, the state research procedure and the 51-state
                         table, the posture
  scripts/               the gates and the renderer (Node; three dependencies: pdfjs-dist, docx, pdf-lib)
  templates/             the shapes of the case files, each field explained
  evals/                 the eval prompts, their assertions, the grader, and the graded results
examples/river-oak/      a complete worked example on invented documents (California, pro se)
examples/pine-hollow/    a second complete worked example (North Carolina, counsel); both are also the evals' fixtures
tests/                   the gate tests
```

## Provenance

The exemplar, the drafting rules, the extraction schema, the claims and relief catalogues, and the state research table are derived from Sped DPC, a due-process drafting product built by Beekman One LLC, released here so that the procedure can be used and inspected on its own.

## License

*(To be chosen by the author before publication.)*

## Disclaimer

This software prepares a document from information you supply and confirm. It is not a law firm, does not provide legal advice, and creates no attorney–client relationship. The person who signs and files the complaint is responsible for it.
