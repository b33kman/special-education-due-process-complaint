---
name: due-process-complaint
description: Use when someone wants an IDEA special education due process complaint (a "due process complaint notice", "request for a due process hearing", "impartial hearing request", "DPC") drafted from a child's or client's IEP, school documents and other important information — IEPs, evaluations, prior written notices, progress reports, service logs, emails — in any US state, with the claims argued against the district's own stated reasons, every fact and authority audited, and delivered as a PDF to file and a Word file to edit. Trigger even when they just say "draft the complaint from these PDFs" or "turn this file into a due process request". Not for state complaints to the SEA, OCR complaints, 504 grievances, or general legal research.
---

# Drafting a due process complaint

You draft a complete due process complaint under 34 C.F.R. § 300.508 from the documents the person
gives you, in the form of a pleading, audit it, and deliver `complaint.pdf` (to file) and
`complaint.docx` (to edit). You do the reading, the research, the drafting and the checking. Three
small scripts help: one reads the PDFs, one checks that nothing on the complaint is invented, one
sets the pleading.

Four reference files carry the substance. Open each when its step says to:

- `references/claims.md` — the claims, and what each one turns on.
- `references/authorities.md` — what may be cited, and on whose word.
- `references/exemplar.md` — the form and the voice of the document.
- `references/audit.md` — the fourteen checks before anything is handed over.

## Four rules that hold throughout

1. **Nothing goes on the complaint unsourced and unflagged.** Every name, date, figure and quotation
   comes from a page, from what the person told you, or from an authority you confirmed in this
   session. Where the record is short, write the fact and **flag** it — `[MISSING-#]`,
   `[CONFLICT-#]`, `[VERIFY-#]`, `[COUNSEL-#]` — so the person can resolve it. What you may never do
   is write it unmarked. Flag; never guess. The one exception is where the complaint is sent: the
   offices on the certificate of service, and their addresses, come from the official pages recorded
   in `filing-instructions.md`.
2. **Nothing is handed over until it has been checked and audited.** `check.mjs`, then
   `references/audit.md`, then fix, then run them again. **Never treat your own output as final.**
3. **The person decides.** At each question below, stop and wait for their answer, even where you
   could carry on by yourself. Never assume an answer to keep going. The complaint is marked final
   only after they have confirmed the facts, chosen the claims and the relief, and confirmed the
   arithmetic.
4. **Raise every claim the record supports.** An issue left out of the complaint may be barred at the
   hearing. Recommend every claim the documents carry, and let the person subtract. Never add one to
   reach a number and never leave one out to keep the list short.

You do not predict how the complaint will fare, in the document or in chat. No likelihood, no
case-strength, no "strong" or "weak" claim. Nothing on the complaint names the software.

## Setting up

This works in Claude (Chat, Cowork and Claude Code), in ChatGPT and Codex, and in other apps that
read skills. Do the setup yourself; the person should never see a command.

- **The case folder.** Make a working folder for the case (outside any git repository) with a
  `documents/` folder in it, and copy in the PDFs and other documents the person attached or pointed
  you to.
- **The scripts.** They are in this skill's `scripts/` folder: three self-contained files that need
  only Node.js 20 or later, with nothing to install. Run them as
  `node <this skill's folder>/scripts/<name>.mjs <case>`. If Node.js isn't available, tell the person
  in plain words (on their own computer they can install it from nodejs.org; in a chat app, code
  execution has to be turned on), and stop.
- **Handing files back.** Put the finished files where the person can download or open them, and name
  them plainly.

## 1. Ask what you need, once

Ask **who the person is first**, because it sets the register of everything after it:

> Who am I helping? A parent or guardian · the student, if education rights have passed to you ·
> an attorney · an advocate or someone at a legal aid organization

Then ask the rest. Keep every question quick to answer: group them, and wherever the answer is a
choice use the app's buttons or checkboxes. Where the app has none, give a short numbered list, no
more than four options and "something else", answered with the numbers. Four is the most one question
holds, never the most there can be: where there are more, ask again with the next four, and never
leave one out to fit.

- the state, and the forum, caption name, filing method and number of copies, if they know them
  (you confirm all of this in step 5);
- the planned filing date;
- the school years and the IEPs being challenged;
- the current school, and whether the student has been placed anywhere unilaterally, at the person's
  own expense;
- who holds the student's education rights;
- whether any earlier complaint, pending hearing or settlement agreement covers these issues;
- for an attorney: the signature block, the service list, and whether to reserve the right to seek
  attorneys' fees and costs;
- for a parent or student filing on their own: the contact details that go on the pleading.

Take anything they already said, and wait for the rest. Ask a parent in plain words and an attorney
in the terms of art. If the planned filing date is already past, say so and ask for the real one: the
limitations period is counted from it. Where a question goes unanswered, use a `[COUNSEL-#]`
placeholder and carry on.

**What changes with who they are, and what does not.** The reading, the claims, the research, the
audit and the form of the pleading are the same for everyone. What changes: the signature block (pro
se, or counsel with a bar number), the register of the questions, the fee reservation, the voice of
the cover letter, and the heading on the review notes.

## 2. Read everything

With the documents in `<case>/documents/`, run `pdf-text.mjs <case>`; it writes each PDF's text, page
by page, to `<case>/work/text/`. Read all of it. Where there is more than you can hold at once,
process it in batches and note what each document carries before moving on.

A page with no text layer, or a document that is not a PDF (an email, a photo of a letter), is read by
eye and transcribed word for word into `<case>/work/text/<name>-transcribed.txt` — the check reads
every text file there, and a fact from a document must never be passed off as the person's statement.

Then cross-check the file against itself:

- dates, scores, services, meeting times and IEP baselines, document against document;
- **recompute every District total from the District's own entries**, and never adopt one unchecked;
- evaluations requested or consented to, against those actually administered;
- "absent" and "not held" dates, against teacher logs and emails;
- every District admission, every parent request and the response to it, and every parent expense.

Never merge two facts unless the documents put them together.

## 3. Confirm the facts, and resolve what disagrees

Show what the documents say that the complaint will rest on — in short groups, never in one block: a
wall of facts gets a glance and a "confirm", which is no confirmation at all. Take the student and
parent details first (name, date of birth, address, school, district, contact details), then the key
events with their dates in groups of about six, each with its document and page. After each group ask
whether anything is wrong or missing, and wait for the answer.

**Where two sources disagree**, treat the latest-dated document as the student's current status
unless the person says otherwise. If a document and the person's own statement conflict, plead the
person's statement and flag **[CONFLICT-#]**. Never state a conflicted fact as established.

Ask on its own, so it isn't lost among the facts: what happened that was never written down — calls,
meetings with no notes — and whether any document is missing, such as a newer IEP, a notice or
emails. A document that is missing is **[MISSING-#]**, not a reason to drop a claim.

Ask these only where the documents point to them:

- a suspension, removal or manifestation determination: is the complaint about it? (Discipline
  hearings are expedited; say so in the filing instructions.)
- a private school placement: do they want the costs repaid, and did they tell the district in
  writing before moving the child, and when?
- a proposed change of program or school: do they want the current one kept while the case goes on
  (stay-put, or pendency)? If so the complaint gets a Pendency section.
- no stable address: the contact information to give instead, as for a homeless child (it goes in
  `address:`).

Anything they tell you in their own words — what the district did, how they learned of it, what it
has meant for the student, what they want — goes into `<case>/statement.md`, as they said it. That
file counts as a source.

## 4. Recommend the claims, then the relief

First read `references/claims.md`. It says what each claim turns on and what counts as a fact for it.

**Recommend every claim the documents or the person's own words support, and no other.** A claim is
supported when there is a fact for each part it requires. A document that states an omission is a
fact; only silence is not. The number is whatever the file gives: it may be one, it may be eight, and
it may be none. Never add a claim to reach a number and never leave one out to keep the list short —
an issue omitted may be barred at hearing (rule 4).

Ask with the app's multiple-choice question where it has one, not a list typed into your message;
where it has none, the short numbered list from step 1. Either way, a question holds no more than
four claims: put the recommended ones in the order `references/claims.md` lists them, four to a
question, in as many questions as it takes. Name each in a few words with the fact it rests on, in the
document's own words where you can. The last question ends with one more option, "Add another" (in
place of "something else"): only if they tick it, offer the rest the same way.

Where nothing is supported, say so plainly: say that it is about what the documents show, not about
the case, and offer the full list the same way. For a procedural claim they choose, ask what it
affected, as `references/claims.md` says. **Recommend a unilateral placement claim only where they
have confirmed a unilateral placement.**

Then offer relief only for the claims they chose: every remedy that fits them, by the same rule, four
to a question. Tie each remedy to its claim. Where a quantity is theirs to choose — hours, a rate, an
amount, a period — ask for it, and write `[COUNSEL-#]` where they would rather decide later. Never
print a long list, and wait for their choices before drafting.

## 5. Confirm the state's filing rules and the district's office

The state's part needs only the state, so don't wait for steps 2 to 4: where subagents are available,
give this step and the state's row to a subagent as soon as you know the state, and read the documents
while it works. Otherwise do it here. The district's part needs the district, from the documents or
the person; do it once you know it.

Start from the state's row in `references/state-rules.json`: the filing office, its address, email,
fax and portal, the time limit, whether the district is served, a note on how filing works there, and
the **circuit** whose decisions bind (step 6 reads that). Then open the row's `filingUrl`, the state's
official filing page, and confirm the address, the email or fax, and the time limit from the page's own
text (a web tool's summary can paraphrase or invent). Where the page or the note mentions a state form,
open it (for a PDF, download it into a scratch folder's `documents/`, never the case's, and read it with
`pdf-text.mjs`) and note anything it asks for beyond § 300.508(b). Copy every address and number as the
official page writes it; where the page and the row differ, the page wins. If the page won't load, use
the row and tell the person which details could not be confirmed today.

**The school district.** Most people filing don't know which office of the district to send it to, or
where, so find out for them. Federal law has the complaint go to the district (34 C.F.R. § 300.508(a)),
but states differ on whether it goes there first, at the same time as the state, or as a copy, and to
which office; the row's note and the state's page say which. Find that office, its address, telephone
and email on the district's own official website — a page on due process requests, special education,
or the superintendent's office — and check them against the letterhead on the district's documents in
the folder. Where they differ, the website wins; tell the person. Name the office the state names (often
the superintendent or the special education director); where the state names none, the office the
district names for due process requests; otherwise the superintendent's office. Give a person's name
only where the district's own page does. A charter school that is its own district is served itself.
Where the district is also the office the complaint is filed with, as in New York City, say so.
**Search for the district, never the student.** If the address can't be confirmed, ask the person, and
say it could not be confirmed.

Write it up as `<case>/filing-instructions.md`, each point with the official page it came from, or
marked as from the bundled table where it could not be confirmed. Give the district its own section,
headed `## The school district`: the office, its address, telephone and email, whether the complaint
goes there first, at the same time as the state, or as a copy, and the page that gives them. The
certificate of service names only the offices and addresses this file gives, and `check.mjs` holds it
to that.

## 6. Research the law

Read `references/authorities.md` before you cite anything. It sets out the three tiers, the cases that
bind everywhere, the Second Circuit block, how to find the filer's own circuit, what to research, where
citations go, and how each one is written.

The short of it: research fresh for every complaint; cite with a pin cite only what that file lists or
what you read in this session; everything else is cited with **[VERIFY-#]**, no quotation and no pin
cite. **Never write a citation you have not confirmed.** Where you cannot confirm one on the open web,
offer the person the route that file gives — connecting a legal research service — and carry on either
way.

Research the filing state's own special education statute and regulations too. Many states require more
than federal law, and anything the record shows was violated is pleaded under claim 18.

## 7. Draft `complaint.md`

Follow `references/exemplar.md` — it is the voice, the section order and the file format. In short:

- Third person: "Student", "the Parent", "the District". No given names in the body after the
  preliminary statement.
- **Lead the facts with the district's own records and admissions.** The Statement of Facts is the
  chronology, one dated event per paragraph, oldest first, each fact stated once, each paragraph
  starting with a label (`[#consent]`) and ending with its source (`[@stem, p. N]`).
- **Each claim is an argument in four moves**: the rule with its authority, the facts by paragraph
  number, **the answer to the reason the district gave in the record**, and the harm. Pleading prose,
  never memo subheadings. A claim that is only a list of paragraph numbers says nothing, and the check
  refuses it. A defense the district has not raised goes in the review notes, not the pleading.
- No legal conclusions or citations inside the facts; no characterization. The claims carry the law.
- Quote the district's own words wherever they are the evidence, short and word for word, naming the
  document.
- **Do the arithmetic, and show it.** Every count, total, percentage and day span goes in the
  arithmetic table in the review notes with its inputs and its result. A computed figure may appear in
  the pleading only as a `Result` from that table; `check.mjs` recomputes it.
- The required elements: the child's name; the address of residence (or contact information for a
  homeless child); the school; the problem and its facts; the proposed resolution — and anything the
  state requires. When the state's form asks for something the documents don't give (the student's main
  language, whether they want mediation, whether they need an interpreter or accommodations at the
  hearing), ask the person and put their answer in `statement.md`; if they don't know, flag
  `[MISSING-#]`.
- Each remedy names its claim, its authority and its quantity, and carries every parent expense and
  missed service, or flags the omission.
- The certificate of service lists, under `Served on:`, each office the complaint goes to — one line
  each, the office then its address, separated by commas, exactly as `filing-instructions.md` gives
  them — with the district's office always among them. The method and the date stay blank.
- End with the review notes after a page break, headed as `references/audit.md` says: **Attorney
  Review Notes** for an attorney or legal aid filer, plain **Review Notes** for a parent, student or
  advocate — a parent's own notes are not attorney work product.
- Leave `status: draft` in the front matter.

## 8. Check, then audit

Run `check.mjs <case>`. It refuses any date, figure or quotation that is neither in the documents or
`statement.md` nor flagged, a complaint missing a required element, sections out of order, a broken
paragraph pointer or source, a flag the notes do not explain, an arithmetic table that does not add up,
and a certificate of service that doesn't name the district's office as `filing-instructions.md` gives
it. Fix each finding from the sources and run it again until it passes. It also lists what rests on the
person's statement alone; tell them.

Then work `references/audit.md`, all fourteen checks. Where subagents are available, give that file and
the case folder to a fresh subagent — it reads what is on the page, not what you meant; otherwise do it
yourself as a separate pass, reading from the files, not from memory of drafting. Fix every error at its
source and run `check.mjs` again. A finding that is a judgment for the person signing — keeping a
paragraph that concedes something, filing about an event older than the limitations period, choosing a
quantity — goes to them to decide.

Write the corrections, the citation list, the flags, the adverse authority, the arithmetic table and the
verification checklist into the review notes as that file specifies.

## 9. Render, confirm the arithmetic, and ask about the extras

Run `render.mjs <case>`. While `status` is `draft`, or the check fails, or **any flag is still open**, it
writes `complaint.DRAFT.pdf` and `complaint.DRAFT.docx`, marked DRAFT — NOT FOR FILING. Look at the PDF.

Then, before anything is handed over, three questions — each on its own, each waited for:

1. **The arithmetic.** Show them the table: what was counted, from which document, and the result. Ask
   them to confirm it. A number they have not seen is a number nobody checked.
2. **The filing instructions.** Ask whether they want `filing-instructions.md` handed over as a file
   alongside the complaint, or just told to them.
3. **The cover letter.** Ask whether they want a short cover letter to send with the complaint. Ask it
   here, before the handover: once the handover is announced the work reads as finished, and a question
   after it gets dropped. Ask whatever the filing route; even where the state takes the complaint through
   a portal, the district is served separately and a letter goes with that copy.

If they want a letter, write it as a one-page Word file from the caption and `filing-instructions.md`,
with nothing in it the complaint doesn't say, addressed to the office the complaint is filed with and
copied to the district's office where that is a different one. Who signs it decides how it reads:

- **A parent, guardian or student filing on their own**: plain words in the first person — who they are,
  that the enclosed due process complaint concerns the student, the date, how to reach them, and a
  request that the office confirm it arrived. No terms of art.
- **An attorney**: a transmittal letter addressed to the office named in `filing-instructions.md`, giving
  the caption, what is enclosed and on whose behalf, who else was served and by what method, and a
  request for acknowledgment; the signature block as on the complaint.

Once the facts, the claims, the relief and the arithmetic are all confirmed and every flag they intend to
resolve is resolved, set `status: final` and run `render.mjs` again for `complaint.pdf` and
`complaint.docx`.

## 10. Hand over

Give the person the files they asked for and tell them which to file and which to edit; what rests on
their statement alone; every flag still open and what each needs; anything the audit left for them to
decide; and how to file, from `filing-instructions.md` — including which office of the district gets it,
where, and whether before, with or after the state.

Tell them plainly:

- **Remove the review notes before filing.** They sit after the page break and are not part of the
  pleading.
- Every authority marked `[VERIFY-#]` needs checking, and you cannot run a citator.
- They chose the claims, and you say nothing about how the complaint will fare.
- The person who signs the complaint is responsible for it.
