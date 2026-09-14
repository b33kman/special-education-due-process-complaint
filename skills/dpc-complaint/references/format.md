# The form of the complaint

`scripts/assemble.mjs` produces the complaint in one fixed form — the form of a pleading a lawyer files — and nothing in the run changes it. This page states that form, so the person signing knows what to expect and so anyone reading the output can see at once whether it is right. The two worked examples (`examples/*/complaint.html`) are the form realised; open one in a browser and print it to see the pages.

## Page

Letter, one-inch margins, Times New Roman 12 point, black on white, a page number centred in the bottom margin. Nothing else on the page: no letterhead, no logo, no footer text, and — as a rule of the skill — nothing naming the software.

## Order

1. The forum's name, centred, bold, capitals, two lines ("BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS" / "STATE OF CALIFORNIA"). The first line comes from the verified state block (`captionAgency`), never from memory.
2. The caption, in two columns divided by an L-shaped rule:

   ```
   In the Matter of:                              │  Case No. ____________
                                                  │
   JORDAN RIVERA, a minor, by and through         │  DUE PROCESS COMPLAINT NOTICE
   the parent, DANA RIVERA,                       │
                               Petitioner,        │  20 U.S.C. § 1415(b)(7)
                                                  │  34 C.F.R. § 300.508
           v.                                     │
                                                  │  Date: April 17, 2026
   RIVER OAK UNIFIED SCHOOL DISTRICT,             │
                               Respondent.        │
   ───────────────────────────────────────────────┘
   ```

   The parties' names are in capitals; the rest of each party line is not. The respondent is the district as the documents name it, unless the person chose otherwise (`case.json` → `student.respondent`).
3. **I. INTRODUCTION** — who Student is, from the caption facts; then the one sentence that names the claims, in the fixed wording of `claims.json`.
4. **II. CONTACT AND RESIDENCE INFORMATION** — the home address and how to reach the Parent.
5. **III. STATEMENT OF THE PROBLEMS** — one lettered subsection per claim, its fixed heading in bold, the regulation beneath it in italics, then the facts.
6. **IV. PROPOSED RESOLUTION** — one paragraph of lettered clauses, in the person's own words.
7. **V. ADDITIONAL INFORMATION REQUIRED IN [STATE]** — only where the state requires something beyond the federal six, one numbered item each.
8. The closing: "Dated: ________" at the left margin; on the right half of the page, "Respectfully submitted," a signature line, and the signer's block — name, capacity, bar number and jurisdiction, firm, street, city and ZIP, telephone, email for counsel; name, "Parent of [Student]", "Self-represented (pro se)", address, telephone, email for a parent.
9. **CERTIFICATE OF SERVICE** — who was served, from the verified state block; the method; "Dated" and a second signature line.

## Paragraphs and headings

- Every paragraph from the introduction through section V is numbered consecutively, the number at the margin, the text half an inch in, wrapped lines back at the margin. Double-spaced. Left-aligned (justified text with a long email address in it leaves rivers).
- Section headings are centred, bold, capitals; subsection headings bold, left. The regulation under a heading is the only citation in the document outside the caption.
- The caption, headings, signature block and certificate are single-spaced.
- No footnotes, no exhibits list, no table of contents, no "WHEREFORE" clause. A due process complaint notice is short; the exemplar is under 600 words and the examples are about 900.

## What prints and what does not

- The complaint carries no tags, no page cites, no source ids. Those are in `sources.md`, which the person signing reads beside it.
- A state-required item that no document can fill prints as a blank line; the reason it is blank goes in the item's `note` and reaches the report, not the pleading.
- A placeholder (a claim with no facts under it, no relief entered) prints highlighted so it cannot be missed, and the validator refuses FINAL while one exists.

## Printing and editing

`complaint.html` prints from any browser (Print → Save as PDF, Letter, default margins; the page's own margins and page numbers apply). Microsoft Word opens the `.html` directly if the signer wants to edit before filing; `complaint.md` is the same text for anyone who prefers plain text. Edit the pleading by hand only after the gates have passed, and remember that a hand edit is not traced in `sources.md`.
