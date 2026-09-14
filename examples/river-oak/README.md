# Worked example: Rivera v. River Oak Unified School District (California, pro se)

Everything here is invented. The student, the parent, the district, the school, the staff, the address and every date and figure were written for this example by `make-documents.mjs`, and the five PDFs in `documents/` are regenerated from that file:

```bash
npm install --no-save pdf-lib && node make-documents.mjs
```

The case: a third-grader with an IEP whose reading goal was carried forward unchanged from the prior year, whose small-group reading instruction stopped in October when a position went vacant, and whose parent asked for a reevaluation in December and never received an assessment plan. The parent files in California, self-represented.

## What is in the folder

| Path | Written by | What it is |
|---|---|---|
| `documents/*.pdf` | `make-documents.mjs` | The IEP (2 pages), the progress reports, the service delivery log, the prior written notice, the correspondence. |
| `work/text/*.json`, `work/documents.json` | `pdf-text.mjs` | Per-page text and the inventory (kinds, date, title). |
| `work/readings.json` | the model | 51 readings, each verbatim from its page: identity fields, the IEP's goal and services, the progress figures, the log's totals, the notice's reasons, each email's date and words. |
| `work/readings.verified.json` | `verify-readings.mjs` | 51 of 51 verified on their page. |
| `work/decisions.json` → `work/confirmed.json` | the parent, via `confirm.mjs --all-verified --by "Dana Rivera"` | The confirmation record. |
| `work/state.json` | the model, from the web | California's procedure: six sources (OAH's request page, OAH's procedural-safeguards notice, CDE's dispute-resolution page, Education Code §§ 56502 and 56505, OAH's Special Education Division page), each with URL, access date and quotation; nine fields, each citing its sources. |
| `work/case.json` | the parent's answers and the confirmed readings | Caption facts (each citing a reading), representation, the four statements of fact, three claims, four relief items, ten dated events. |
| `work/statement.annotated.md` | the model | The statement of the problems, 441 words, every sentence tagged. `check-draft.mjs` passed it with 0 errors and 0 warnings. |
| `work/check-draft.json`, `work/provenance.json`, `work/validation.json`, `work/gates.log` | the gates | What each gate found. |
| `complaint.md`, `complaint.html` | `assemble.mjs` | The complaint. Status **FINAL**, with one warning: `filing-date-past`, because the example is dated April 17, 2026 and the gates were last run after that. On a live file the date is set to the real filing date. |
| `sources.md` | `report.mjs` | Every paragraph with its sources. |
| `verification-report.md` | `report.mjs` | What was checked. |

## How it was run

The skill's steps, in order, with the parent's answers supplied in the prompt:

```bash
S=skills/dpc-complaint/scripts
node $S/pdf-text.mjs examples/river-oak            # 5 documents, 6 pages, no image-only pages
# the model wrote work/documents.json and work/readings.json from work/text/
node $S/verify-readings.mjs examples/river-oak     # 51 verified
node $S/confirm.mjs examples/river-oak --all-verified --by "Dana Rivera"
# the model verified California's procedure on the web and wrote work/state.json
# the model wrote work/case.json and work/statement.annotated.md
node $S/check-draft.mjs examples/river-oak         # 0 errors, 0 warnings
node $S/run-gates.mjs examples/river-oak           # FINAL
```

To re-run the back half yourself, from the repository root:

```bash
node skills/dpc-complaint/scripts/run-gates.mjs examples/river-oak
```

It rewrites the four deliverables from `work/` and appends a line to `work/gates.log`.

## Things worth noticing in the output

- The caption reads *BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS, STATE OF CALIFORNIA*, not *BEFORE THE CALIFORNIA DEPARTMENT OF EDUCATION*, because `state.json` says who hears these cases and cites OAH and CDE for it.
- The certificate of service names the Office of Administrative Hearings and the Superintendent of the District, from `state.json` → `serviceRecipients`.
- Section III states figures the documents state — 4 of 24 weeks, an average of 95 minutes, 20 weeks below 240 — and never the arithmetic between them. `tests/gates.test.mjs` shows what happens when a sentence adds "a shortfall of 145 minutes per week": the gate refuses it.
- The introduction gives the student's age and eligibility date from readings; the Parent's statements (`case.json` → `facts`) are not quoted in the complaint, they informed the claims and relief the parent chose.
