---
name: due-process-complaint
description: Use when someone wants an IDEA special education due process complaint (a "due process complaint notice", "request for a due process hearing", "impartial hearing request", "DPC") drafted from a child's or client's IEP, school documents and other important information — IEPs, evaluations, prior written notices, progress reports, service logs, emails — in any US state, delivered as a PDF to file and a Word file to edit. Trigger even when they just say "draft the complaint from these PDFs" or "turn this file into a due process request". Not for state complaints to the SEA, OCR complaints, 504 grievances, or general legal research.
---

# Drafting a due process complaint

You draft a complete due process complaint under 34 C.F.R. § 300.508 from the documents the person gives you, in the form of a pleading, and deliver `complaint.pdf` (to file) and `complaint.docx` (to edit). You do the reading, the drafting and the checking. Three small scripts help: one reads the PDFs, one checks that nothing on the complaint is invented, one sets the pleading.

Three rules hold throughout:

1. **Nothing goes on the complaint that is not in the documents or in the person's own words.** Every name, date, figure and quotation comes from a page or from what they told you. Where the record is silent, the complaint says less.
2. **Nothing is handed over until it has been checked for errors and corrected.**
3. **The person decides.** At each question below, stop and wait for their answer, even where you could carry on by yourself; never assume an answer to keep going. The complaint is marked final only after they have confirmed the facts and chosen the claims and relief.

You do not give legal advice. The person chooses the claims and the relief; you never predict how a complaint will fare, in the document or in chat. Nothing on the complaint names the software.

## Setting up

This works in Claude (Chat, Cowork and Claude Code), in ChatGPT and Codex, and in other apps that read skills. Do the setup yourself; the person should never see a command.

- **The case folder.** Make a working folder for the case (outside any git repository) with a `documents/` folder in it, and copy in the PDFs and other documents the person attached or pointed you to.
- **The scripts.** They are in this skill's `scripts/` folder: three self-contained files that need only Node.js 20 or later, with nothing to install. Run them as `node <this skill's folder>/scripts/<name>.mjs <case>`. If Node.js isn't available, tell the person in plain words (on their own computer they can install it from nodejs.org; in a chat app, code execution has to be turned on), and stop.
- **Handing files back.** Put the finished files where the person can download or open them, and name them plainly.

## 1. Ask what you need, briefly

Keep every question quick to answer: group them, and wherever the answer is a choice use the app's buttons or checkboxes. Where the app has none, give a short numbered list, no more than four options and "something else", answered with the numbers. In a short message or two, ask:

- who is filing and their relationship to the child — a parent, guardian, foster or surrogate parent, or the student, if education rights have passed to them at the age of majority (then the student is the petitioner);
- whether an attorney represents them, or someone else, such as an advocate, is helping (an advocate who isn't a lawyer doesn't sign as counsel; the person filing signs);
- the state, and the planned filing date;
- whether any earlier complaint, pending hearing or settlement agreement covers these issues;
- for an attorney: the signature block, and whether to reserve the right to seek attorneys' fees and costs.

Take anything they already said, and wait for the rest. Ask a parent in plain words and an attorney in the terms of art. If the planned filing date is already past, say so and ask for the real one: the time limit is counted from it.

## 2. Read everything

With the documents in `<case>/documents/`, run `pdf-text.mjs <case>`; it writes each PDF's text, page by page, to `<case>/work/text/`. Read all of it. A page with no text layer, or a document that is not a PDF (an email, a photo of a letter), is read by eye and transcribed word for word into `<case>/work/text/<name>-transcribed.txt` — the check reads every text file there, and a fact from a document must never be passed off as the person's statement.

## 3. Confirm the facts with the person

Show them what the documents say that the complaint will rest on: the student's name, date of birth, address, school and district; the parent's name and contact details; and the key events with their dates, each with its document and page. Wait while they confirm or correct. Ask too whether anything is missing — a newer IEP, a notice, emails — and what happened that was never written down, such as calls or meetings with no notes.

Ask these only where the documents point to them:

- a suspension, removal or manifestation determination: is the complaint about it? (Discipline hearings are expedited; say so in the filing instructions.)
- a private school placement: do they want the costs repaid, and did they tell the district in writing before moving the child, and when?
- a proposed change of program or school: do they want the current one kept while the case goes on (stay-put, or pendency)?
- no stable address: the contact information to give instead, as for a homeless child (it goes in `address:`).

Then ask them to choose the claims, and then the relief, each as one checkbox question: the app's multiple-choice question where it has one, not a list typed into your message; where it has none, the same short list, numbered. Recommend the claims the documents support strongly, usually no more than four. If more than four have strong support, say so in one line and offer every one of them as checkboxes, across more than one question if one won't hold them all. Name each in a few words with its key fact in a few more, and make the last box "Add another": only if they tick it, offer the rest the same way. Offer relief only for the claims they chose, the remedies that fit them best, by the same rule. Never print a long list, and wait for their choices before drafting.

Anything they tell you in their own words — what the district did, how they learned of it, what it has meant for the student, what they want — goes into `<case>/statement.md`, as they said it. That file counts as a source.

## 4. Confirm the state's filing rules

This step needs only the state, so don't wait for steps 2 and 3: where subagents are available, give this step and the state's row to a subagent as soon as you know the state, and read the documents and confirm the facts while it works. Otherwise do it here.

Start from the state's row in `references/state-rules.json`: the filing office, its address, email, fax and portal, the time limit, whether the district is served, and a note on how filing works there. Then open the row's `filingUrl`, the state's official filing page, and confirm the address, the email or fax, and the time limit from the page's own text (a web tool's summary can paraphrase or invent). Where the page or the note mentions a state form, open it (for a PDF, download it into a scratch folder's `documents/`, never the case's, and read it with `pdf-text.mjs`) and note anything it asks for beyond § 300.508(b). Copy every address and number as the official page writes it; where the page and the row differ, the page wins. If the page won't load, use the row and tell the person which details could not be confirmed today.

Write it up as `<case>/filing-instructions.md`, each point with the official page it came from, or marked as from the bundled table where it could not be confirmed.

## 5. Draft `complaint.md`

Follow `references/exemplar.md` — it is both the voice and the file format (front matter for the caption, then the sections). In short:

- Third person: "Student", "the Parent", "the District". No given names in the body after the introduction.
- The statement of facts is the chronology, one dated event per paragraph, oldest first, each fact stated once. Start each fact paragraph a claim will point to with a short label: `[#consent]` (lowercase words and hyphens). The statement of the problems has one lettered section per claim the person chose, with the regulation in italics under its heading, then one sentence pointing to its facts instead of repeating them: "The facts at paragraphs [#consent], [#delay] and [#report] bear on this problem." `render.mjs` prints each label as that paragraph's number.
- Dates in full ("October 14, 2025"), figures exactly as the documents give them, quotations short and word for word. No arithmetic ("a shortfall of 28 sessions", "less than half"): state the figures and let the reader compare.
- Facts only. No legal conclusions ("violated", "denied FAPE") inside the facts, no characterisation, no citations except under the headings.
- The required elements: the child's name; the address of residence (or contact information for a homeless child); the school; the problem and its facts; the proposed resolution — and anything the state requires. When the state's form asks for something the documents don't give (the district's address, the student's main language, whether they want mediation, whether they need an interpreter or accommodations at the hearing), ask the person and put their answer in `statement.md`; if they don't know, leave a blank line and tell them.
- Leave `status: draft` in the front matter.

## 6. Check, then review

Run `check.mjs <case>`. It refuses any date, figure or quotation that is not in the documents or `statement.md`, and a complaint missing a required element. Fix each finding from the sources and run it again until it passes. It also lists what rests on the person's statement alone; tell them.

Then review the draft for everything a script cannot catch, using `references/review.md`. Where subagents are available, give the review to a fresh subagent with the case folder and that file — it reads what is on the page, not what you meant; otherwise do it yourself as a separate pass, reading from the files, not from memory of drafting. Fix every error it finds at its source and run `check.mjs` again. A finding that is a judgment for the person signing — keeping a paragraph that concedes something, filing about an event older than the time limit — goes to them to decide.

## 7. Render and hand over

Once the person has confirmed the facts and chosen the claims and relief (rule 3), set `status: final` and run `render.mjs <case>`. It writes `complaint.pdf` and `complaint.docx` only when the check passes on a final complaint; otherwise it writes `complaint.DRAFT.pdf` and `complaint.DRAFT.docx`, marked DRAFT — NOT FOR FILING. Look at the PDF before handing it over.

Give the person `complaint.pdf`, `complaint.docx` and `filing-instructions.md` to download, and tell them which file to file and which to edit; what rests on their statement alone; anything the review left for them to decide; and how to file, from `filing-instructions.md`. Say that they chose the claims and that you say nothing about how the complaint will fare.

Offer a short cover letter to send with it to the hearing office and the district. If they want one, write it as a one-page Word file from the caption and `filing-instructions.md`, with nothing in it the complaint doesn't say.
