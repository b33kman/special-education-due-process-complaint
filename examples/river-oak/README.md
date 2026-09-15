# Worked example: Rivera v. River Oak Unified School District (California, pro se)

Everything here is invented. The student, the parent, the district, the school, the staff, the address and every date and figure were written for this example by `make-documents.mjs`, and the five PDFs in `documents/` are regenerated from that file:

```bash
npm install --no-save --no-package-lock pdf-lib && node make-documents.mjs
```

(Regenerating rewrites the PDFs byte for byte — their text is identical — so `git status` shows them changed.)

The case: a third-grader with an IEP whose reading goal was carried forward unchanged from the prior year, whose small-group reading instruction stopped in October when a position went vacant, and whose parent asked for a reevaluation in December and never received an assessment plan. The parent files in California, self-represented.

## What is in the folder

| Path | Written by | What it is |
|---|---|---|
| `documents/*.pdf` | `make-documents.mjs` | The IEP (2 pages), the progress reports, the service delivery log, the prior written notice, the correspondence. |
| `work/text/*.json` | `pdf-text.mjs` | Per-page text. |
| `work/documents.json` | `pdf-text.mjs`, then the model | The inventory: pages and bytes from the script; the kind, date and title of each document from the model's reading of it (step 2). |
| `work/readings.json` | the model | 51 readings, each verbatim from its page: identity fields, the IEP's goal and services, the progress figures, the log's totals, the notice's reasons, each email's date and words. Short values (the ZIP code, a four-letter name) carry the words around them. |
| `work/readings.verified.json` | `verify-readings.mjs` | 51 of 51 verified on their page. |
| `work/confirmed.json` | the parent, via `confirm.mjs --all-verified --by "Dana Rivera"` | The confirmation record. |
| `work/state.json` | the model, from the web | California's procedure: seven sources (OAH's request page, OAH's procedural-safeguards notice, CDE's dispute-resolution page, Education Code §§ 56502 and 56505, OAH's Special Education Division page, OAH's filing-and-serving page), each with URL, access date and a quotation of the page's own words; nine fields, each citing its sources. |
| `work/state-text/S1.txt … S7.txt`, `work/state-check.json` | `fetch-text.mjs`, `verify-state.mjs` | Each source's page as text, and the check that every quotation is on its page: 7 of 7. |
| `work/case.json` | the parent's answers and the confirmed readings | Caption facts (each citing a reading), representation, the four statements of fact, three claims, four relief items (each citing the parent's own statement of the relief and the readings it rests on), ten dated events. |
| `work/statement.annotated.md` | the model | The statement of the problems, 441 words, every sentence tagged. `check-draft.mjs` passes it with 0 errors; with the chronology and the relief, which the same gate checks, it checks 639 words. |
| `work/check-draft.json`, `work/complaint.json`, `work/provenance.json`, `work/validation.json`, `work/gates.log` | the gates | What each gate found, and the composed document. |
| `complaint.pdf`, `complaint.docx`, `complaint.md` | `render.mjs` | The complaint — to file, to edit, and plain. Status **FINAL**, with one warning: `filing-date-past`, because the example is dated April 17, 2026 and the gates were last run after that. On a live file the date is set to the real filing date. |
| `sources.md` | `report.mjs` | Every paragraph with its sources, keyed by paragraph number, and what rests on the parent's statement alone. |
| `verification-report.md` | `report.mjs` | What was checked, and how to file in California. |

## How it was run

The skill's steps, in order, with the parent's answers supplied in the prompt:

```bash
S=skills/dpc-complaint/scripts
node $S/pdf-text.mjs examples/river-oak            # 5 documents, 6 pages, no image-only pages
# the model classified each document into work/documents.json and wrote work/readings.json from work/text/
node $S/verify-readings.mjs examples/river-oak     # 51 verified
node $S/confirm.mjs examples/river-oak --all-verified --by "Dana Rivera"
# the model verified California's procedure on the web (fetch-text.mjs --out work/state-text/S#.txt) and wrote work/state.json
node $S/verify-state.mjs examples/river-oak        # 7 of 7 quotations on their pages
# the model wrote work/case.json and work/statement.annotated.md
node $S/check-draft.mjs examples/river-oak         # 0 errors, 1 warning (a figure from the parent's statement)
node $S/run-gates.mjs examples/river-oak           # FINAL
```

To re-run the back half yourself on a copy, from the repository root: `npm run example`. Running `run-gates.mjs` on the example folder itself rewrites its deliverables in place (the run date changes and a line is appended to `work/gates.log`).

## Things worth noticing in the output

- The caption reads *BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS / STATE OF CALIFORNIA*, not *BEFORE THE CALIFORNIA DEPARTMENT OF EDUCATION*, because `state.json` says who hears these cases and cites OAH and CDE for it.
- The certificate of service names only the Superintendent of the District. The request is *filed* with OAH; it is *served* on the district, and OAH's own page says it accepts a filing only after the district has been served and a proof of service is included — the report's *How to file* says so, and the CDE page's fax number is noted but not followed, because the receiving office's page wins.
- Section IV states figures the documents state — 4 of 24 weeks, an average of 95 minutes, 20 weeks below 240 — and never the arithmetic between them. `tests/gates.test.mjs` shows what happens when a sentence adds "a shortfall of 145 minutes per week", or "less than half": the gate refuses both.
- Remedy (a) asks for a meeting "within 15 days". No document says 15 days; the parent's own statement of the relief does, and `sources.md` lists that figure under *What rests on the Parent's statement alone*.
- The introduction gives the student's age and eligibility date from readings; the parent's statements (`case.json` → `facts`) are not quoted in the complaint — they informed the claims and relief the parent chose, and the relief cites them.
