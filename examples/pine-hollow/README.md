# Worked example: Okafor v. Pine Hollow County Schools (North Carolina, counsel)

Everything here is invented. The student, the parent, the district, the school, the staff, the attorney, the address and every date and figure were written for this example by `make-documents.mjs`, and the four PDFs in `documents/` are regenerated from that file:

```bash
npm install --no-save --no-package-lock pdf-lib && node make-documents.mjs
```

The case: a seventh-grader whose IEP requires 60 minutes a week of individual speech-language therapy; from late September the district delivered 30 minutes a week in a group of three and never amended the IEP; the parent asked in writing for an independent evaluation, the district refused it in a prior written notice and did not file for a hearing. An attorney files in North Carolina, where the window is **one year** and the forum is the Office of Administrative Hearings.

This example is the with-skill run from the skill's own evaluation (`skills/dpc-complaint/evals/`), rebuilt with the current scripts: a fresh model instance was handed the skill and this prompt and produced everything in `work/` without a person in the loop — the prompt supplied every answer, including the authority to confirm every reading that verified. It is kept exactly as that run wrote it, apart from the three short readings that now carry a `context` (the verifier began requiring one after this run) and the source label `typed`.

## What is in the folder

| Path | Written by | What it is |
|---|---|---|
| `documents/*.pdf` | `make-documents.mjs` | The IEP (2 pages), the speech-language service log, the prior written notice refusing the IEE, the correspondence. |
| `work/text/*.json`, `work/documents.json` | `pdf-text.mjs` | Per-page text and the inventory: the notice is `pwn` and `iee`, the correspondence `correspondence` and `iee`. |
| `work/readings.json` | the model | 112 readings, each verbatim from its page: identity fields from every document, the IEP's services, goals and present levels, the log's weekly lines and summary, the notice's action, reasons and options, each email's date and words. |
| `work/readings.verified.json` | `verify-readings.mjs` | 112 of 112 verified on their page. |
| `work/confirmed.json` | counsel, via `confirm.mjs --all-verified --by "Renée Castillo"` | The confirmation record. |
| `work/state.json` | the model, from the web | North Carolina's procedure from nine official sources — OAH's petition form H-06E and its page, N.C. Gen. Stat. §§ 115C-109.6 and 115C-107.2 at ncleg.gov, DPI's dispute-resolution page and its July 2026 procedural-safeguards handbook, OAH's filing, FAQ and contact pages — each with URL, access date and quotation. Window: **12 months** (§ 115C-109.6(b)). Original to OAH at 1711 New Hope Church Road, Raleigh; a copy to the superintendent and a copy to DPI. No form is required; H-06E is offered. |
| `work/case.json` | counsel's answers and the confirmed readings | Caption facts (each citing a reading), the represented signature block, the four statements of fact, two claims, three relief items, the chronology, and three North Carolina items for section V: the county of residence (left blank — no document states it), the date of birth, and the form's category of dispute. |
| `work/statement.annotated.md` | the model | The statement of the problems, 532 words, every sentence tagged; `check-draft.mjs` passed it with 0 errors. One sentence rests on counsel's statement alone — "The District did not file for a hearing." — and the report says so. |
| `complaint.md`, `complaint.html`, `sources.md`, `verification-report.md` | the gates | The deliverables. Status **FINAL**, with three warnings. |

## The three warnings, and why they are right

- **`outside-limitations`** — the district's evaluation of May 6, 2025 is more than 12 months before the June 1, 2026 filing date. The validator says so, names North Carolina's rule and its sources, and decides nothing: whether an exception reaches it is counsel's judgment. A skill that assumed the federal two years would have said nothing.
- **`blank-item`** — the county of residence prints as a blank line under section V because no document states it. The reason is in the item's `note`, which the warning and the report carry; the pleading shows only the blank, and counsel fills it in.
- **`filing-date-past`** — the example is dated June 1, 2026 and the gates were last run after that. On a live file the date is set to the real filing date.

## How it was run

```bash
S=skills/dpc-complaint/scripts
node $S/pdf-text.mjs examples/pine-hollow
# the model wrote work/documents.json and work/readings.json from work/text/
node $S/verify-readings.mjs examples/pine-hollow    # 112 verified
node $S/confirm.mjs examples/pine-hollow --all-verified --by "Renée Castillo"
# the model verified North Carolina's procedure on the web and wrote work/state.json
# the model wrote work/case.json and work/statement.annotated.md
node $S/check-draft.mjs examples/pine-hollow        # 0 errors
node $S/run-gates.mjs examples/pine-hollow          # FINAL, 3 warnings
```

## Things worth noticing

- The certificate of service names the superintendent **and** the North Carolina Department of Public Instruction with its mailing address, because `state.json` → `serviceRecipients` says the state requires a copy to DPI, with the statute quoted.
- The introduction says the parent "is represented by Renée Castillo of Castillo Education Law PLLC"; the signature block carries the firm and "Bar No. 61042 (North Carolina)"; "self-represented" appears nowhere.
- Section III states the log's figures — 22 weeks, 4 at 60 minutes, 15 at 30, 3 with none, 690 delivered, 1,320 required — and never the subtraction between them.
- The North Carolina form's caption conventions ("COUNTY OF ___", a Board of Education as respondent) are recorded in `state.json` → `notes` for counsel to consider; the skill does not put a state's form conventions into the caption on its own. If counsel wants the Board of Education named, `case.json` → `student.respondent` prints it.
