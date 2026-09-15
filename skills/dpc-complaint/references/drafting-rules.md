# Drafting rules for the statement of the problems

These are the rules `scripts/check-draft.mjs` enforces. Read them before writing `work/statement.annotated.md`, and read the exemplar (`exemplar.md`) for the voice. A draft that breaks a rule is refused by the script, so writing to the rules the first time is the fast path.

## The format of the annotated draft

```
A.
On February 10, 2026, the IEP team adopted an annual reading fluency goal of 75 words correct per minute on a Grade 2 passage. [R14]
The prior IEP, dated February 11, 2025, had set the same goal at 70 words correct per minute; the report notes the goal was "not achieved." [R14][R9]

B.
The IEP dated February 11, 2025 required speech-language therapy 2 times per week for 30 minutes. [R31]
```

- One line per paragraph. A blank line between paragraphs.
- A letter line (`A.`, `B.`, …) for each claim in `case.json`, in the same order, with no heading text — the claim's fixed filing heading is printed by the assembler.
- **Every sentence ends with a tag group**: the sources it rests on. `[R12]` a confirmed reading, `[F2]` one of counsel's four facts, `[E3]` a chronology event, `[S1]` a state source. A sentence can cite several. A sentence with no tag is refused.
- Do not write the introduction, the parties, the relief, the signature block or the certificate. The assembler composes those from `case.json` and fixed wording.

## What every sentence must satisfy

1. **Every date is in a cited source.** "March 12, 2026" may appear only if a reading, fact or event the sentence cites contains that date (in any written form). Write dates in full — "October 14, 2025", never "10/14/2025" — in the draft; the source may write it either way.
2. **Every figure is in a cited source.** Minutes, sessions, percentages, scores, counts, dollar amounts. If the source says "forty-five" write "forty-five"; if it says "45" you may write "45". Arithmetic you do yourself ("a shortfall of 28 sessions") is a figure not in any source and is refused — state the two figures the source gives and let the reader subtract, or cite a source that states the result. A form or test code ("Form H-06E", "CELF-5") is a name, not a figure, and is not checked.
3. **Every quotation is verbatim** from a cited reading or fact, curly or straight quotes. Quote short — a phrase, a goal's wording — only where the document's own words are the fact.
4. **Third person, always.** "Student", "the Parent" (or "the Parents", when two file), "the District", "the IEP team". Never I, me, my, we, our, you, your — outside a quotation.
5. **Never the given names.** The caption defines Student and the Parent; the body uses those. A third party keeps their name (a teacher, an evaluator).
6. **No legal conclusions in the facts.** Not "violated", "denied FAPE", "in violation of", "failed to comply", "predetermined", "least restrictive environment", "materially deviated", "discriminated", "unlawful". State what happened; the regulation under the heading and the reader do the rest.
7. **No citations in the facts.** No "34 C.F.R.", "§", "U.S.C.", "IDEA", case names, state code sections. They print under the headings.
8. **No outcome language.** Nothing about what a hearing officer would find, the strength of the case, odds, or value.
9. **No advice, no address to a reader.** Not "the Parent should", "we recommend", "is entitled to".
10. **No characterisation.** Not "egregious", "blatant", "deliberately", "knowingly". If the document says the district "acknowledged" something, say that; do not add intent.
11. **Finish every sentence.** No trailing "…" outside a quotation.
12. **Say each thing once.** A later sentence that repeats an earlier one with no new figure or quotation is refused. A citation to the same document for a new fact is fine.
13. **Every claim's section says what happened and when.** A section with no full date is flagged; a hearing officer needs when.
14. **Nothing the sources do not say.** No inferred motive, no "the District knew", no event no source records. Where the account has a gap, the gap stays.

## How to write it

- Work claim by claim. For each, list the confirmed readings, facts and events that bear on it; write from them and only them.
- Lead with the operative document and its date ("The IEP dated February 10, 2026 provides for…"), then what the records show happened ("Encounter attendance records for September 4, 2025 to June 16, 2026 record 45 sessions held of 73 scheduled…"), then any request and response ("On March 3, 2026 the Parent asked in writing for…; the District replied on…").
- Prefer the document's figure to a characterisation of it: "11 of 20 words" beats "poor decoding".
- The person's own facts ([F1]–[F4]) are the account in their words; they can carry dates and figures the documents do not, and the report will say those rest on their statement alone.
- Length follows the file, not a target. One to four paragraphs per claim, each a fact with its date or figure, nothing said twice; a file with more documents supports more sentences, never longer ones. The exemplar's statement is short because its file is.

## The loop

1. Write `work/statement.annotated.md`.
2. Run `node scripts/check-draft.mjs <case>`.
3. For every error, rewrite that sentence from its sources — do not delete the tag to silence the check, and do not add a source the sentence does not rest on.
4. Run again. Stop only at 0 errors. Three rounds is normal; if a sentence cannot be made to pass, the fact it states is not in the sources and it goes.
