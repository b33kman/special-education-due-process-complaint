# The post-draft audit

Run this after `check.mjs` passes and before you hand anything over (step 7). `check.mjs` is a
program: it catches an unsourced date, figure or quotation, a missing required element, a section out
of order, a broken paragraph pointer, and an arithmetic table that does not add up. This audit
catches what a program cannot read.

Work every check. Fix what the record supports, flag the rest, and write both down in the Attorney
Review Notes. Read from the sources — the pages in `work/text/`, `statement.md`,
`filing-instructions.md`, the official pages you opened — never from memory of drafting.

Where subagents are available, give this file and the case folder to a fresh one. It reads what is
on the page rather than what you meant.

**Never treat your own output as final.** Then run `check.mjs` again, because a fix can break it.

## 1. Fact check

- Every factual sentence carries a source citation: the document and its date or page, or the
  person's own words.
- Every date and number matches its source.
- Statements of fact in the Preliminary Statement, the claims, and the relief match the Statement of
  Facts and are no stronger than their sources.
- No status fact is assumed. Placement, enrolment, notice, payment, consent, attendance, who holds
  educational rights, the filing date and counsel's details are never inferred.

## 2. Arithmetic check

- Recompute every count, total, percentage and day span.
- Every one appears in the arithmetic table, with its inputs and its result.
- Every input traces to a document or to `statement.md`.
- Never adopt the District's own total unchecked. Recompute it from its own entries and say so where
  the two differ.

The table lives in the Attorney Review Notes and takes exactly these four columns, because
`check.mjs` reads it:

| What | Inputs | Computation | Result |
|---|---|---|---|
| Weeks below the required minutes | 24 instructional weeks (service log, p. 3); 4 weeks at 240 minutes (service log, p. 3) | 24 - 4 | 20 weeks |

`Computation` holds digits and `+ - * / ( ) .` and nothing else. `Result` leads with the number.
A figure that appears in the pleading and in no document has to be a `Result` in this table, or
`check.mjs` refuses it.

**Show the person the table and ask them to confirm it** before the complaint is final (step 7).
A number they have not seen is a number nobody checked.

## 3. Citation verification

- List every authority with its tier (`references/authorities.md` § 1).
- Confirm each case is in § 2 of that file **and applies to this filer's circuit**, or that you read
  its text in this session. Otherwise flag **[VERIFY-#]**.
- Confirm the holding matches the proposition you cited it for, and is no broader.
- Confirm the pin cite, the decision date and the reporter citation.
- Confirm the case applies to the issue it is cited under.
- Confirm whether each case is precedential, and which party prevailed.
- **Flag** every case whose current validity you could not confirm, with **[VERIFY-#]**, and list
  it in the notes for the person's own citator check. You cannot run a citator; do not imply that
  you did. The flag is what matters: while it is open the complaint renders as a draft, so an
  unconfirmed authority cannot leave as a filable document.

## 4. Regulatory verification

- Confirm each C.F.R. subsection exists, or flag **[VERIFY-#]**.
- Confirm each state regulation exists against the state's own official text, or flag it.
- Confirm the rule applies to the issue, the setting and the student.
- Confirm no subsection is misquoted or outdated.

## 5. Statutory verification

- Confirm each federal and state statutory subsection exists, or flag **[VERIFY-#]**.
- Confirm the statute applies to the issue.
- Confirm no subsection is misapplied or misquoted.

## 6. Adverse authority check

- Identify authority that runs against each claim.
- Identify conflicting hearing officer or review officer decisions in the filing state.
- Identify recent decisions that supersede older ones.
- Flag conflicts with **[VERIFY-#]**, and list them in the Attorney Review Notes.

Adverse authority goes in the notes, never in the pleading.

## 7. Misapplication check

Look for:

- A rule cited for a setting, a student or an age it does not cover.
- The wrong procedural standard.
- The wrong burden of proof — and remember it is state-dependent
  (`references/authorities.md` § 5).
- The wrong least-restrictive-environment test.
- The wrong standard for the relief asked for.

## 8. Quote accuracy check

- Confirm every quotation word for word against text you have in this session.
- Remove any quotation you cannot confirm.
- Replace an incorrect quotation with the correct language.

## 9. Date accuracy check

- Confirm every record date: meetings, evaluations, notices, requests, removals, logs.
- Confirm every decision date on a cited authority.
- Confirm the filing date and the limitations cutoff. **The cutoff does not go in the arithmetic
  table**: that table holds digits and operators, and a date cutoff is calendar arithmetic it
  cannot express — a row reading `2026 - 2 | 2024` certifies a year and says nothing about the day.
  State the cutoff in the notes in words, with the filing date it was measured from and the
  provision that sets the period, for the person to confirm.
- Correct any date attributed to the wrong document.

## 10. Coverage check

- Every claim in `references/claims.md` was tested against the record.
- Every claim the person chose has a lettered section, and every section is a claim they chose.
- Every claim, every parent expense, every missed service and every period without required
  services has matching relief, or the omission is flagged.
- **Every reason the District gave in the record is answered** — each prior written notice, each
  email, each meeting note that explains what it did.
- Nothing in the pleading concedes what a claim contests.

## 11. Relief authority check

- Confirm the hearing officer can grant each item asked for.
- Cite the right authority for each, and remove the wrong one.
- Note that a court, not the hearing officer, awards attorneys' fees
  (20 U.S.C. § 1415(i)(3)(B)).
- Confirm no quantity is double-counted across two claims.
- Confirm each quantity rests on a stated method that matches the period and the extent of the
  violation.

## 12. Consistency check

Names, defined terms, dates, parties and figures agree across the caption, the required-information
block, the body, the relief, the pendency section, the signature block and the certificate. The
filer named in the front matter matches the signature block: a `parent` filer signs pro se, an
`attorney` filer signs as counsel.

## 13. Posture check

- No prediction of how the complaint will fare, in the document or in chat. No case-strength, no
  likelihood, no "strong" or "weak" claim.
- No legal conclusion inside the Statement of Facts, and no characterization.
- Each claim's heading fits the facts under it.
- Events older than the filing state's limitations period are pointed out to the person, with
  34 C.F.R. § 300.507(a)(2) named, and nothing said about whether an exception applies. That is the
  person's decision and a hearing officer's to make.

## 14. The rendered document

`render.mjs <case> --pdf` writes the same document as a PDF. **Open it and read it**, because this is
the check nothing else makes: the Word file is the deliverable, but a PDF is what you can look at.
Nothing missing, cut off, reordered or garbled; the caption intact; the tables aligned; page numbers
present; no heading stranded at the foot of a page; and, on a draft, the page break before the review
notes in place. Nothing on the document names the software, its properties included.

Do this while the complaint is still a draft, when there is something to be done about what you find.

## Reporting what you find

Report each error with where it is and what the source actually says. Fix errors at their source —
`complaint.md`, `statement.md`, `filing-instructions.md` — never in the rendered file. A judgment
that belongs to the person signing is theirs to decide: keeping a paragraph that concedes
something, filing about an event older than the limitations period, choosing a quantity. Never
settle one yourself.

## The Attorney Review Notes

The complaint ends, after a page break, with a section headed for whoever is filing. An attorney or
a legal aid organization:

```
## Attorney Review Notes – Attorney Work Product – Remove Before Filing
```

A parent, guardian, student or advocate:

```
## Review Notes – Remove Before Filing
```

A parent holds no attorney work product, and a claim of privilege nobody holds is a false claim on a
filed document. `check.mjs` refuses the wrong heading for the declared filer.

**They are not in the complaint it renders for filing.** While the complaint is a draft they sit
inside it, behind the DRAFT banner, which is where they get read and acted on. Once it is final
`render.mjs` leaves them out of `complaint.pdf` and `complaint.docx` and writes them beside it as
`review-notes.md`. A page break and a heading saying "Remove Before Filing" are an instruction to a
human, and what is in these notes is the person's own account of what the District will argue.

It contains these lists. **Omit any list that is empty.** Never describe an authority as verified
unless you read its text in this session.

- Corrections made.
- Citations, each with its tier, whether its pin cite is confirmed, and whether it is quoted.
- Flagged issues, by marker number, in full.
- Adverse authorities, and the defenses the District is expected to raise.
- Quotations corrected.
- Dates corrected.
- Statutory and regulatory subsections corrected.
- The arithmetic table (§ 2).
- The verification checklist, below.

The pleading above the page break carries only the Section 3 markers. Every note, every explanation
and every piece of work product sits below it.

## The verification checklist

End the notes with a checklist for the person signing, covering:

- The forum, the hearing body, the caption and the copies required.
- The filing date and the limitations cutoff.
- The school years and the IEPs challenged.
- The residence, and who holds educational rights.
- The current school.
- Any private placement, the notice given, and the placement's own details — only where confirmed.
- The service logs and the make-up counts.
- The compensatory claims and their quantities.
- Pendency.
- Any request for an independent educational evaluation, and reimbursement.
- Every statutory, regulatory and case citation.
- The signature block and the service list.
