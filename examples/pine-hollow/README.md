# Worked example: Okafor v. Pine Hollow County Board of Education (North Carolina, counsel)

Everything here is invented. The student, the parent, the district, the school, the staff, the attorney, the address and every date and figure were written for this example by `make-documents.mjs`, and the four PDFs in `documents/` are regenerated from that file:

```bash
npm install --no-save --no-package-lock pdf-lib && node make-documents.mjs
```

The case: a seventh-grader whose IEP requires 60 minutes a week of individual speech-language therapy; from late September the district delivered 30 minutes a week in a group of three and never amended the IEP; the parent asked in writing for an independent evaluation, the district refused it in a prior written notice and did not file for a hearing. An attorney files in North Carolina, where the window is **one year** and the forum is the Office of Administrative Hearings.

This example began as the with-skill run from the skill's own evaluation (`skills/dpc-complaint/evals/`): a fresh model instance was handed the skill and the eval prompt and produced the readings, the state research, the case file and the statement without a person in the loop — the prompt supplied every answer, including the authority to confirm every reading that verified. It has since been rebuilt with the current scripts, and counsel's later choices are recorded in `work/case.json`: the respondent captioned as the **Board of Education** (the form's convention, `student.respondent`), the **county** in the caption (`student.county`), and the reservation of attorneys' fees. The state quotations were rewritten as the pages' own words when the skill began checking them.

## What is in the folder

| Path | Written by | What it is |
|---|---|---|
| `documents/*.pdf` | `make-documents.mjs` | The IEP (2 pages), the speech-language service log, the prior written notice refusing the IEE, the correspondence. |
| `work/text/*.json` | `pdf-text.mjs` | Per-page text. |
| `work/documents.json` | `pdf-text.mjs`, then the model | The inventory: the notice is `pwn` and `iee`, the correspondence `correspondence` and `iee`, with each document's date and a title. |
| `work/readings.json` | the model | 112 readings, each verbatim from its page: identity fields from every document, the IEP's services, goals and present levels, the log's weekly lines and summary, the notice's action, reasons and options, each email's date and words. |
| `work/readings.verified.json` | `verify-readings.mjs` | 112 of 112 verified on their page. |
| `work/confirmed.json` | counsel, via `confirm.mjs --all-verified --by "Renée Castillo"` | The confirmation record. |
| `work/state.json` | the model, from the web | North Carolina's procedure from nine official sources — OAH's petition form H-06E (a Word file, converted to text) and its page, N.C. Gen. Stat. §§ 115C-109.6 and 115C-107.2 at ncleg.gov, DPI's dispute-resolution page and its July 2026 procedural-safeguards handbook, OAH's filing, FAQ and contact pages — each with URL, access date and quotation. Window: **12 months** (§ 115C-109.6(b)). Original to OAH at 1711 New Hope Church Road, Raleigh; a copy to the superintendent and a copy to DPI. No form is required; H-06E is offered. |
| `work/state-text/S1.txt … S9.txt`, `work/state-check.json` | `fetch-text.mjs` (and `textutil`, for the form), `verify-state.mjs` | Each source's page as text, and the check that every quotation is on its page: 9 of 9. |
| `work/case.json` | counsel's answers and the confirmed readings | Caption facts (each citing a reading), the respondent and the county counsel supplied, the represented signature block, the four statements of fact, two claims, three relief items and the fees reservation, the chronology, and the five North Carolina requirements mapped to where the pleading meets them. |
| `work/statement.annotated.md` | the model | The statement of the problems, 532 words, every sentence tagged; with the chronology and the relief the gate checks 913 words, 0 errors. One sentence rests on counsel's statement alone — "The District did not file for a hearing." — and `sources.md` lists it under *What rests on counsel's statement alone*. |
| `complaint.pdf`, `complaint.docx`, `complaint.md`, `sources.md`, `verification-report.md` | the gates | The deliverables. Status **FINAL**, with two warnings. |

## The two warnings, and why they are right

- **`outside-limitations`** — the district's evaluation of May 6, 2025 is more than 12 months before the June 1, 2026 filing date. The validator says so, names North Carolina's rule and its sources, and decides nothing: whether an exception reaches it is counsel's judgment. A skill that assumed the federal two years would have said nothing.
- **`filing-date-past`** — the example is dated June 1, 2026 and the gates were last run after that. On a live file the date is set to the real filing date.

## How it was run

```bash
S=skills/dpc-complaint/scripts
node $S/pdf-text.mjs examples/pine-hollow
# the model classified each document into work/documents.json and wrote work/readings.json from work/text/
node $S/verify-readings.mjs examples/pine-hollow    # 112 verified
node $S/confirm.mjs examples/pine-hollow --all-verified --by "Renée Castillo"
# the model verified North Carolina's procedure on the web and wrote work/state.json;
# the Word form was converted with textutil and saved as work/state-text/S1.txt
node $S/verify-state.mjs examples/pine-hollow       # 9 of 9 quotations on their pages
# the model wrote work/case.json and work/statement.annotated.md
node $S/check-draft.mjs examples/pine-hollow        # 0 errors, 1 warning (a sentence from counsel's statement)
node $S/run-gates.mjs examples/pine-hollow          # FINAL, 2 warnings
```

## Things worth noticing

- The caption carries a third line, **COUNTY OF PINE HOLLOW**, because Form H-06E puts the county in the caption and OAH assigns the hearing region from it; and the respondent is the **Pine Hollow County Board of Education**, the body the form names, while the introduction still says the student attends school "in the Pine Hollow County Schools". Both are counsel's entries (`"source": "typed"`), and `sources.md` says so.
- The certificate of service names the superintendent **and** the North Carolina Department of Public Instruction with its mailing address, because `state.json` → `serviceRecipients` says the state requires simultaneous service on DPI's designated person, with the statute quoted. Two official pages give DPI two mailing addresses; `state.json` → `notes` records both, which was followed and why, and the report's *How to file* carries the note.
- The five things North Carolina's form asks for beyond the federal six are each accounted for in `case.json` → `additionalContents`: the county (the caption), the birthdate (section II), the petitioner's telephone and address (section II and the signature block) and the certificate of service are marked `met`, and only the form's category of dispute prints, as section VI.
- The introduction says the parent "is represented by Renée Castillo of Castillo Education Law PLLC"; the signature block carries the firm and "Bar No. 61042 (North Carolina)"; the reservation of attorneys' fees follows the lettered remedies as its own paragraph; "self-represented" appears nowhere.
- Section IV states the log's figures — 22 weeks, 4 at 60 minutes, 15 at 30, 3 with none, 690 delivered, 1,320 required — and never the subtraction between them.
