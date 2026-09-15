# The form of the complaint

`scripts/assemble.mjs` composes the complaint in one fixed form — the form of a pleading a lawyer files — and `scripts/render.mjs` sets it as **`complaint.pdf`** (to file), **`complaint.docx`** (to edit in Word, in the same form) and **`complaint.md`** (the same text, plain). Nothing in the run changes the form. This page states it, so the person signing knows what to expect and so anyone reading the output can see at once whether it is right. The two worked examples (`examples/*/complaint.pdf`) are the form realised.

## Page

Letter, one-inch margins, Times New Roman 12 point, black on white, a page number centred in the bottom margin. Nothing else on the page: no letterhead, no logo, no footer text, and — as a rule of the skill — nothing naming the software.

**While the validator has not passed the document**, every form carries one extra line at its head, bold and centred: **DRAFT — NOT FOR FILING**. It disappears when the status is FINAL. A draft cannot be filed by mistake.

## Order

1. The forum's name, centred, bold, capitals, two lines ("BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS" / "STATE OF CALIFORNIA"). The first line comes from the verified state block (`captionAgency`), never from memory. Where the state's form puts the county in the caption (North Carolina's "COUNTY OF ___"), a third line carries it, from `case.json` → `student.county`.
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

   The parties' names are in capitals; the rest of each party line is not. "a minor" prints only for a student under 18 on the filing date; an adult student is captioned without it, and the validator warns that IDEA rights may have transferred (34 C.F.R. § 300.520). The respondent is the district as the documents name it, unless the person chose otherwise (`case.json` → `student.respondent` — a Board of Education where the state's form names one).
3. **I. INTRODUCTION** — who Student is, from the caption facts; then the one sentence that names the claims, in the fixed wording of `claims.json` (or the person's own, where they reworded a claim).
4. **II. CONTACT AND RESIDENCE INFORMATION** — under the recital *34 C.F.R. § 300.508(b)(1)–(3)* — the date of birth, the home address, the school, and how to reach the Parent. For a student with no fixed address the recital is *§ 300.508(b)(1), (4)* and the paragraph gives the contact information and the school instead.
5. **III. STATEMENT OF FACTS** — the confirmed chronology, one numbered paragraph per event, oldest first, each beginning "On <date>," (or "In <month year>,") and each gated, date included, against the sources it names.
6. **IV. STATEMENT OF THE PROBLEMS** — one lettered subsection per claim, its heading in bold, the regulation beneath it in italics, then the facts relating to that problem and, for a procedural claim, what it cost the student or the Parent's participation.
7. **V. PROPOSED RESOLUTION** — a one-line lead-in ("The Parent proposes the following resolution:"), then each remedy as its own lettered sub-paragraph — (a), (b), (c) … — indented under it, in the person's own words, each ending with a semicolon and the last with a period. A single remedy is one sentence. On a represented filing, counsel's reservation of the right to seek attorneys' fees follows the lettered list as its own numbered paragraph, in the fixed sentence unless counsel gave their own: *"The Parent reserves the right to seek reasonable attorneys' fees and costs under 20 U.S.C. § 1415(i)(3)(B)."* A reservation is not a remedy the district can grant at the resolution session, so it is not lettered among them.
8. **VI. REQUESTS CONCERNING THE HEARING** — only where asked for: mediation requested (or declined) under § 300.506, an expedited hearing under § 300.532(c) with a discipline claim, an interpreter, accommodations. One numbered paragraph each, fixed wording; typed text in them is held to the pleading's voice.
9. **VII. ADDITIONAL INFORMATION REQUIRED IN [STATE]** — only where the state requires something beyond the federal six that the pleading does not already carry, one numbered item each. An item the fixed form already states (the date of birth in II, the county in the caption) is recorded as `met` in `case.json` and prints nothing here. (Where a section is absent the numerals close up.)
10. The closing: "Dated: ________" at the left margin; on the right half of the page, "Respectfully submitted," a signature line, and the signer's block — name, capacity, bar number and jurisdiction (or the label the jurisdiction uses), firm, street, city and ZIP, telephone, email for counsel; name, "Parent of [Student]", "Self-represented (pro se)", address (or the contact information, for a student with no fixed address), telephone, email for a parent. When two parents file, the caption says "by and through the parents," the defined term is "Parents", and the pro se block carries a signature line for each. A lay advocate is not a signer: the parent signs, and the advocate's help is not stated on the pleading.
11. **CERTIFICATE OF SERVICE** — who was served, from the verified state block (`serviceRecipients`: the district's superintendent, and the state agency where the state requires a copy — never the forum, since filing is not service); then "Method of service:   [  ] U.S. mail   [  ] Hand delivery   [  ] Other: ____", "Dated" and a second signature line.

## Paragraphs and headings

- Every paragraph from the introduction through the last numbered section is numbered consecutively, the number at the margin, the text half an inch in, wrapped lines back at the margin. Double-spaced. Left-aligned. A paragraph is never split to leave one line alone on a page.
- Section headings are centred, bold, capitals; subsection headings bold, left; a heading is never left alone at the foot of a page. The regulation under a heading is the only citation in the document outside the caption and the resolution.
- The caption, the certificate and the signature blocks are single-spaced. The closing and the certificate are kept together on a page.
- No footnotes, no exhibits list, no table of contents, no "WHEREFORE" clause. A due process complaint notice is short; the exemplar is about 650 words and the examples run about 1,000–1,400.

## What prints and what does not

- The complaint carries no tags, no page cites, no source ids. Those are in `sources.md`, which the person signing reads beside it, keyed by paragraph number.
- A state-required item that no document can fill prints as a blank line; the reason it is blank goes in the item's `note` and reaches the report, not the pleading.
- A placeholder (a claim with no facts under it, no relief entered) prints highlighted so it cannot be missed, and the validator refuses FINAL while one exists — so the DRAFT line is at the head of the document as well.

## The three files

`complaint.pdf` is what is filed: set with the PDF's standard Times font, so it opens the same everywhere. A character that font cannot set (a name in a non-Latin script) prints as "?" and the renderer says so; the Word file carries it as written. `complaint.docx` opens in Word, Pages or LibreOffice for any editing the signer wants before filing; it is the same form (the caption is a two-cell table, the paragraphs are double-spaced with a half-inch tab, the page number is a footer field). Edit by hand only after the gates have passed, and remember that a hand edit is not traced in `sources.md`.
