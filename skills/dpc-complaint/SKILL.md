---
name: dpc-complaint
description: Use when someone wants an IDEA special-education due process complaint (a "due process complaint notice", "impartial hearing request", "DPC", or "request for a due process hearing") drafted from a client's or child's school documents — IEPs, evaluations, prior written notices, progress reports, service logs, emails — in any US state, delivered as a PDF to file and a Word file to edit. Trigger even when they just say "draft the complaint from these PDFs", "turn this file into a due process request", or ask what a due process complaint has to contain. Not for state complaints to the SEA, OCR complaints, 504 grievances, or general legal research.
---

# Drafting a due process complaint from the documents

## What this skill produces, and the one rule under it

A complete due process complaint notice under 34 C.F.R. § 300.508(b), captioned for the right forum in the filing state, in the form of a filed pleading — **`complaint.pdf`** to file and **`complaint.docx`** to edit, plus `complaint.md`, the same text plain — with a statement of facts and a statement of the problems in which **every sentence is traced to a page in the documents or to a statement the person drafting made**; a `sources.md` that lists those traces paragraph by paragraph; and a `verification-report.md` that says what was checked, the status, and how to file in that state. The person who signs reads the report and the sources beside the complaint, and files.

The rule: **nothing reaches the complaint that was not either read off a page and confirmed by the person, or typed by the person.** Not a date, not a figure, not a quotation, not a filing address, not a quotation from a state's website. The scripts in `scripts/` enforce this; the steps below exist to feed them. If a fact is not in the sources, the complaint says less. That is the correct outcome, not a failure. And until every gate passes, every copy of the document carries **DRAFT — NOT FOR FILING** at its head.

Read `references/posture.md` first if you have not: it says what this skill must never do (choose claims, predict outcomes, invent facts, apply a legal standard inside the facts).

## Requirements

- Node 20 or later. Once, in the skill folder: `cd scripts && npm install` (three dependencies: `pdfjs-dist` to read PDFs, `docx` and `pdf-lib` to write the Word file and the PDF).
- Web access, for the state-procedure step. Without it the complaint stays a DRAFT.
- The most capable model available at the highest effort setting. Extraction and drafting are where quality lives; a cheaper model here produces readings the verifier refuses and drafts the gate refuses, and costs more in rounds than it saves.

Every script takes the case folder as its argument and prints its own usage line with no arguments. Run them from the skill folder or by full path: `node <skill>/scripts/<name>.mjs <case folder>`.

## The case folder

```
<case>/
  documents/           the PDFs (the person supplies these; nothing else goes here)
  work/                everything the skill writes on the way
    text/<doc>.json      per-page text (pdf-text.mjs)
    documents.json       inventory: kinds, date, title per document (you fill these in; kept on a re-run)
    readings.json        what was read, verbatim, with page (you write this)
    readings.verified.json  each reading checked against its page (verify-readings.mjs)
    decisions.json       the person's decision per reading, when they decided reading by reading (you write this from what they said)
    confirmed.json       the confirmation record (confirm.mjs)
    state.json           the filing state's procedure, each fact with its web source (you write this)
    state-text/<S>.txt   each state source's page as text (fetch-text.mjs --out; the verifier reads these)
    state-check.json     each state quotation checked against its page (verify-state.mjs)
    case.json            the intake: names, address, who signs, facts, claims, relief, chronology, hearing requests
    statement.annotated.md  the statement of the problems, every sentence tagged
    check-draft.json, complaint.json, provenance.json, validation.json, gates.log
  complaint.pdf, complaint.docx, complaint.md, sources.md, verification-report.md   the deliverables
```

Shapes for `readings.json`, `decisions.json`, `case.json` and `state.json` are in `templates/`, each with an `_about` that explains every field. Copy, do not improvise, and delete the sample entries you do not fill.

## The conversation

The person is a parent filing alone, an attorney filing for one, or an advocate helping a parent who will sign for herself. The first screen establishes which, and from then on speak to them as who they are: plain words and a one-phrase gloss on each term of art for a parent ("prior written notice — the district's written reasons for what it decided"), the terms themselves for counsel. The pleading does not change register — it is the same document either way; the signature block, certificate and introduction tell the forum who filed it.

Ask in **short screens, one purpose each, never more than three questions on a screen.** A wall of ten questions is where people give up or answer the wrong one. Two kinds of screen:

- **Closed choices** go through the `AskUserQuestion` tool, which draws the options as buttons: up to three questions per call, two to four options each, the default first. It cannot take a typed value except through its "Other" option, and it cannot show a list longer than four — a list of claims or remedies is numbered in a plain message and the person replies with numbers.
- **Typed answers** — a name, a date, a signature block, the four facts — are asked in a plain message, one purpose per message; a signature block is one item with several lines, not seven questions.

**Skip every question already answered**, in any order: an attorney's opening message often carries the state, who signs, the claims, the relief and "confirm every reading that verifies", and then there is no round one at all. An authorisation given up front counts for the whole run. Every choice has a default, stated.

## The steps

### 0. Round one — before anything is read

**Screen 1 — who is filing** (buttons, one question): *the parent, without a lawyer* · *an attorney for the parent* · *an advocate helping the parent* (the parent signs, self-represented; the advocate is not named on the pleading). This decides the register, the signature block, and whether the fees question is asked.

**Screen 2 — where** (typed, one message, up to three questions): the state the complaint is filed in; where the documents are, if not already given; the planned filing date (default: today — a date already past is reported as a warning so nothing is filed stale). Mention that a photographed scan with no text layer can be read only by eye.

**Screen 3 — the signer.**
- Counsel: one message asking for the signature block as one item — name, bar (or registration) number and jurisdiction, firm, firm address, phone, email. Then buttons, two questions: *reserve the right to seek attorneys' fees and costs under 20 U.S.C. § 1415(i)(3)(B)?* (Yes, in the standard sentence · Yes, in wording I will give · No — fees are awarded by a court to a prevailing parent, not by the hearing officer, so the complaint reserves the right, in its own paragraph after the remedies; default: yes) and *how many parents petition?* (One · Two — then the second parent's name, typed).
- A parent: nothing about names or address yet — the documents supply them and step 5 confirms them. Buttons, two questions: *is a second parent filing with you?* (No · Yes — then that parent's name, typed) and *does your child have a fixed home address?* (Yes · No — then the contact information to use and the school, typed; the pleading gives those instead of an address, § 300.508(b)(4)).

**Screen 4 — the hearing** (buttons, two questions): *request mediation with the complaint?* (Not stated · Request it · Decline it — mediation under § 300.506 is available in every state; default: not stated) and *an interpreter or an accommodation for the hearing?* (None · Yes — then which language or what, typed; parents especially). The child's name prints in full: § 300.508(b)(1) requires it, so there is no initials option.

Then anything they have already decided — the claims, the relief, the four facts — take it now, and round two shrinks.

Write the answers into `work/case.json` as you go (`templates/case.json`). Anything typed by the person carries `"source": "typed"`; anything from a document carries the reading id. Set `runMeta` to the model id and effort that is running. `representation.type` is `"pro-se"` (with `"counsel": null`) or `"counsel"`.

### 1. Read the documents into text

`node scripts/pdf-text.mjs <case>`. It writes per-page text and `work/documents.json`. If it reports pages with no text layer, those pages must be read by eye (open the PDF with Read); a reading from them verifies as `unverifiable-image`, which counts as a failure unless verify-readings is run with `--allow-image-pages` — use that flag only when you have read the page yourself, and say so in the report. Re-running pdf-text after adding a document keeps the inventory you wrote.

### 2. Classify, then extract — verbatim, with the page

For each document, open its text (`work/text/<doc>.json`) and:

- Decide which kind or kinds it is, from `references/extraction-schema.json` → `kinds`. A document can be several: a packet of a meeting notice, a prior written notice and an attendance summary; a notice that refuses an independent evaluation is `pwn` and `iee`; an IEP whose last page is the team's own notice is `iep`, with that page read as `iep.teamNotes`. Write `kinds`, `documentDate` and a one-line `title` into `work/documents.json` — the validator warns about a document left unclassified. `documentDate` is the date the document carries as its own; for a compilation or a thread, its first and last dates ("December 2, 2025 – April 2, 2026").
- Read the fields those kinds ask for, plus the identity fields every document is asked (`identity` in the schema), once per document. **Quote each value exactly as the page writes it and record the page.** The next step checks every reading against the page text; a paraphrase, a "corrected" date, a value assembled from two places, or a wrong page number is refused. Read a passage once: where two kinds ask for the same words, file it under the kind whose purpose the document serves. When a document lists several items for one field (each IEP service line, each goal a progress report measures, each email in a thread), each is its own reading — but a long table is not read row by row: read its summary lines, the first row where something changes, and the rows the draft may cite. The person can open the page for the rest.
- A value shorter than five characters, or a bare number shorter than eight — a grade, a state, a short first name, a year, a ZIP code — carries a `context`: the words around it on the page ("Grade: 7", "Willow Creek, CA 95833"). The verifier refuses it otherwise, because "7" and "2025" are on almost every page and finding them proves nothing.
- The `note` field is not a source. If a phrase may be cited in the draft, it goes in the `value`.
- Read what matters to a complaint: the operative documents' dates, services, goals and placement; what was requested, when, and what was answered; what was delivered against what was required; the evaluations' findings and recommendations; the parent's stated concerns and the district's stated reasons. Skip boilerplate.
- Do not read from a document that is only described inside another document. An email that says what the IEP provides is correspondence; its words are the email's.
- If the identity readings disagree across documents — two students' names, two dates of birth — stop and ask which file this is before going on.

Write `work/readings.json` (`templates/readings.json`). Ids are `R1`, `R2`, … and never reused.

Then `node scripts/verify-readings.mjs <case>`. Fix or delete every reading it refuses and run it again until it passes. Do not confirm anything before it passes.

### 3. The confirmation gate — the person decides, reading by reading

One screen first (buttons): "*N* readings verified on their pages. *Confirm them all* — you review them afterwards in `sources.md`, and any you reject then is taken out and the gates run again — or *go through them document by document*?" Take "all" only if they choose it — including when they chose it in their opening message. Otherwise one document per screen: a table of id, page, field, value, and the note if any, with identical readings across documents folded into one row ("in 4 documents" — the decision is recorded for each of their ids) so a ten-document file does not become a two-hundred-row table; they confirm, correct or reject each. Record what they said in `work/decisions.json` and run:

- `node scripts/confirm.mjs <case> --decisions`, or
- `node scripts/confirm.mjs <case> --all-verified --by "<their name>"` when they said to confirm all verified readings.

A correction is an edit to a reading that *is* on the page; a reading the verifier could not find is deleted, or its value is typed into `case.json` as `"typed"` — it cannot be edited into existence. This is the one step that cannot be automated away. A reading the person did not confirm cannot be cited in the draft (the gate refuses it) and cannot be a caption fact (the validator refuses it). If they reject a reading that the draft needs, the draft says less.

### 4. The filing state: verify the procedure on the web, with sources

Follow `references/state-research.md` exactly. Start from the bundled row in `references/state-rules.json`, open its source and the state agency's current pages with `node scripts/fetch-text.mjs <url> --out work/state-text/<S>.txt` (it reads HTML and PDF alike; `--insecure` if the sandbox's certificate store cannot verify a state site; a form served as a Word file is converted with `textutil -convert txt` on a Mac and saved to that path), and write `work/state.json` (`templates/state.json`): nine fields, each with `sources` pointing at entries that carry a URL, an access date and a quotation of the page's own words. Then `node scripts/verify-state.mjs <case>`: every quotation is checked against its page, exactly as readings are; fix any it refuses and run it again until all verify.

Where the state requires anything beyond the six federal elements — a county, a student ID, a birth date, a request for mediation, an interpreter — record each under `additionalContents` and give each an entry, numbered by `requirement`, in `case.json` → `additionalContents`: what prints, or `met` naming where the pleading already states it. An item no document can fill (a county of residence nobody typed) may be left blank; the validator reports it as a warning so the person fills it by hand before filing. What prints is the item's `text`; the reason it is blank goes in its `note`.

Never take a filing address, a limitations window, a required form, or the forum's name from memory or from the bundled table alone. A field with no source, or a source whose quotation is not on its page, keeps the complaint a DRAFT, and the report names it.

### 5. Caption facts, from confirmed readings

Fill `case.json` → `student` and `parent` from confirmed identity readings: name parts, date of birth, the five address parts, school, district, eligibility category and date, the parent's phone and email; a second parent's name under `parent.second`. Each value cites its reading and prints as the reading reads — a value that differs from its reading is refused (edit the reading at the gate, or type it). Where two documents disagree, show both and let the person choose. Then one screen (buttons): "*The documents name the parent as Dana Rivera and the student as Jordan Rivera. Is that who is filing, and for whom?*" (Yes · No — I'll give the right names). Anything the documents do not carry — the parent's phone or email, most often — ask for, typed.

The respondent prints as the district line the documents carry unless the state's form names it otherwise (a Board of Education) or counsel chooses otherwise (a city-wide agency, a county office): record `student.respondent` with its source — a reading if a document names it, `"typed"` if the person or the form supplies it. Ask counsel; for a parent, follow the form where the state has one, else the district as read. Where the form puts the county in the caption, record `student.county` the same way. An incomplete address is a blocking finding: ask for what is missing rather than guessing a ZIP code. A student who will be 18 or older on the filing date is captioned without "a minor" and the validator warns that IDEA rights may have transferred; tell the person, and let them decide who the petitioner is.

### 6. Round two — the drafting decisions, with the readings on the table

**Screen 5 — the four facts, in the person's own words.** *What the district did, or failed to do* · *How the Parent learned of it* · *Effect on the student* · *Relief sought*. Ask them in the reader's voice — a parent: "How did you learn of it?", "What has this meant for your child?"; counsel: "How did the client learn of it?" — one message, four short prompts, and store the answers under the neutral labels in `templates/case.json`. Offer to propose each from the confirmed readings for them to edit and approve ("I can draft these four from the documents; you edit, and nothing goes in that you have not approved"); if they accept a proposal, keep the reading ids in the text and mark the fact `"proposed": true`. Their answers are sources for the draft, so a date in them may be written into the complaint on their authority — and the gate warns, and `sources.md` lists, every sentence, date or figure that rests on their statement and on no document.

**Screen 6 — the claims.** `references/claims.json` as a numbered list in a message, each with its `turnsOn` sentence (for a parent, in plain words); they reply with numbers. They choose; you never recommend, and "which should I pick?" gets the list and what each turns on. A problem not on the list: they give its heading (and counsel the regulation), stored as `{ "id": "other", "heading", "clause", "cfr" }`; counsel who wants a catalogue heading or clause reworded gives the words, stored on the claim as `heading`, `clause` or `cfr`. If `discipline` is chosen, ask (buttons) whether to request an expedited hearing (§ 300.532(c); default: no). For a procedural claim, ask for the impact statement — how the failure impeded the student's education or the parent's participation — with its reading ids.

**Screen 7 — the relief.** From the fourth fact, propose the list: each remedy matched to `references/relief.json`, in the person's words, as a numbered list; they confirm, edit, or add from the catalogue (numbered). Ask only for what the fourth fact does not settle — a quantity, a period, an evaluation's kind. Each remedy's `sources` are the fourth fact (`F4`) and any readings it rests on; the gate holds each remedy's words to the pleading rules and to those sources. Two options are marked as beyond a hearing officer's usual authority; say so if they pick one, and keep it only if they insist. Counsel's fees reservation was decided at screen 3 and needs nothing more.

**Screen 8 — the chronology.** Propose the dated events from confirmed date readings and their requests and responses, as a list; they confirm, edit or add, each with its sources. It prints as the Statement of Facts, one numbered paragraph per event, oldest first, so write each event as a sentence that reads after "On <date>," ("the IEP team adopted an annual reading goal of 60 words per minute", "the District's progress report recorded 21 words per minute"). The draft gate holds each to the same rules as the statement — its date and its figures in the sources it names, no conclusions — and the limitations check runs over these. An event whose date no source states cannot be printed; if the person knows the date and no document has it, their own statement (F1–F4) must say it, and the report will say it rests on that.

**Screen 9** — any state-required item from step 4 that needs a value typed.

Write it all into `case.json`.

### 7. Draft the statement of the problems — tagged, then gated

Read `references/exemplar.md` for the voice and `references/drafting-rules.md` for the rules, then write `work/statement.annotated.md`: one lettered section per claim, in order; paragraphs of one to three sentences; **every sentence ending with the tags of the sources it rests on**. Write from the sources and nothing else. Third person; no legal conclusions; no citations; no given names; dates written in full; figures exactly as the sources give them, with their units.

Then loop:

```
node scripts/check-draft.mjs <case>
```

For each error, rewrite that sentence from its sources. Do not delete a tag to silence a finding and do not add a tag to a sentence the source does not support. Run again. Stop only at zero errors — three rounds is normal. A sentence that cannot be made to pass states something the sources do not, and it goes. The same run checks the chronology, the relief and any typed hearing text.

### 8. Assemble, validate, render, report — one command

```
node scripts/run-gates.mjs <case>
```

It runs the draft gate, composes the complaint from `case.json` and the fixed wording, validates every § 300.508(b) element and every caption fact's source, checks the state block and its quotations and the limitations window, renders `complaint.pdf`, `complaint.docx` and `complaint.md`, and writes `sources.md` and `verification-report.md`. The status line says `status: FINAL` or `status: DRAFT — NOT FOR FILING`; a draft's three files carry that line at their head. If DRAFT, read `verification-report.md`, fix what it names (usually a missing caption fact, an unsourced state field, a state item with no entry, or a claim with no facts under it), and run it again. The deliverables of the last run are removed at the start of each run, so nothing stale survives a run that stops.

The complaint's form is fixed — a pleading with a bracketed caption and numbered double-spaced paragraphs: introduction, contact and residence information (with the date of birth), the statement of facts (the chronology), the statement of the problems (one section per claim), the proposed resolution (each remedy its own lettered sub-paragraph, counsel's fees reservation after them), any requests concerning the hearing, any state-required items, the signature block and the certificate of service — and is described in `references/format.md`. The renderer produces it; do not restyle or reorder it by hand, and do not put tags, page cites or explanations into the pleading's text.

### 9. Hand it over, honestly

Tell the person: the status; where the five files are and which to file (`complaint.pdf`) and which to edit (`complaint.docx`); how many readings were confirmed and how many the draft cites; what rests on their own statement rather than a document (the list in `sources.md`); every warning the validator raised (an event outside the limitations window, a filing date already past, an item left blank, a procedural claim without an impact statement, relief outside the usual authority, an adult student); and the filing instructions, which `verification-report.md` sets out under *How to file* (where the original goes, who is served and whether service comes before filing, the channels, any form). For a parent, add what happens after filing as the state's own sources describe it — the resolution session, the district's window to challenge sufficiency — in plain words and with no prediction. Say what the skill did not do: it did not decide which claims the file supports and it says nothing about how the complaint will fare.

## What not to do, and why

| Temptation | Why it is refused |
|---|---|
| Tidy a reading — fix the date format, expand an abbreviation, join two lines | The verifier compares against the page. A reading that is not on the page is not evidence, and a "fixed" date is how a wrong date gets filed. |
| Draft first and tag later | The tags are how the checks know what a sentence rests on. Tagged after the fact, they get attached to whatever is nearest. Write from the sources. |
| Write "a shortfall of 28 sessions", or "less than half", when the sources say 45 held of 73 | Arithmetic is a figure no source states, in digits or in words. State the two figures; the reader subtracts. If the record states the result (it often does — "owed: 24"), cite that. |
| Fill a gap from what usually happens | An invented step in a chronology is the one thing a signed pleading cannot survive. The gap stays; the report says the record is silent. |
| Give an event a date no source states | The date prints at the head of a numbered paragraph. The gate checks it like any other date. |
| Paraphrase a state's web page into a "quotation" | The verifier checks the words against the page. A filing address or a limitations window rests on those words; if they are not on the page, the value rests on nothing. |
| Answer "which claims should I bring?" | That is the person's judgment. Give the list and what each turns on. |
| Say the complaint is strong, or what a hearing officer will do | Outcome language is refused by the gate and is not the skill's to say anywhere, including in chat. |
| Caption "BEFORE THE [STATE EDUCATION AGENCY]" in every state | In some states the forum is a hearings office or the district itself. Step 4 decides from sources. |
| Skip the confirmation because the person is in a hurry | It is the only step that turns a reading into evidence. Offer the one-answer "confirm all verified" instead. |
| Ask ten questions in one message | People stop answering, or answer the wrong one. One purpose per screen, three questions at most, defaults stated. |
| Hand over a draft as if it were final | The DRAFT line at the head of the document is there so it cannot be filed by mistake; say what blocks FINAL. |

## Quick reference

```
node scripts/pdf-text.mjs <case>                       # 1  PDFs → per-page text + inventory
node scripts/verify-readings.mjs <case> [--allow-image-pages]   # 2  every reading on its page, or refused
node scripts/confirm.mjs <case> --decisions            # 3  the person's decisions → confirmed.json
node scripts/confirm.mjs <case> --all-verified --by "Name"
node scripts/fetch-text.mjs <url> --out work/state-text/S1.txt  # 4  a state page or PDF, verbatim
node scripts/verify-state.mjs <case> [--offline]       # 4  every state quotation on its page, or refused
node scripts/check-draft.mjs <case>                    # 7  the statement gate (loop to 0 errors)
node scripts/run-gates.mjs <case>                      # 8  check → assemble → validate → render → report
```

References: `references/exemplar.md` (the voice), `references/drafting-rules.md` (the gate's rules), `references/format.md` (the form of the pleading and its three files), `references/extraction-schema.json` (what to read), `references/claims.json`, `references/relief.json`, `references/state-research.md` + `references/state-rules.json` (the state), `references/posture.md` (what the skill is not).
