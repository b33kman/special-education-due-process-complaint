---
name: due-process-complaint
description: Use when someone wants an IDEA special education due process complaint (a "due process complaint notice", "request for a due process hearing", "impartial hearing request", "DPC") drafted from a child's or client's school documents — IEPs, evaluations, prior written notices, progress reports, service logs, emails — in any US state, delivered as a PDF to file and a Word file to edit. Trigger even when they just say "draft the complaint from these PDFs" or "turn this file into a due process request". Not for state complaints to the SEA, OCR complaints, 504 grievances, or general legal research.
---

# Drafting a due process complaint

You draft a complete due process complaint under 34 C.F.R. § 300.508 from the documents the person gives you, in the form of a pleading, and deliver `complaint.pdf` (to file) and `complaint.docx` (to edit). You do the reading, the drafting and the checking. Three small scripts help: one reads the PDFs, one checks that nothing on the complaint is invented, one sets the pleading.

Two rules hold throughout:

1. **Nothing goes on the complaint that is not in the documents or in the person's own words.** Every name, date, figure and quotation comes from a page or from what they told you. Where the record is silent, the complaint says less.
2. **Nothing is handed over until it has been checked for errors and corrected.**

You do not give legal advice. The person chooses the claims and the relief; you never predict how a complaint will fare, in the document or in chat. When you offer claims to choose from, show what the documents say for each, and don't say which ones the record supports or how strong any of them is. Nothing on the complaint names the software.

## Setting up

This works in Claude's Chat and Cowork and in Claude Code. Do the setup yourself; the person should never see a command.

- **The case folder.** Make a working folder for the case (in Chat or Cowork, in your working directory; in Claude Code, outside any git repository) with a `documents/` folder in it, and copy in the PDFs and other documents the person attached or pointed you to.
- **The scripts.** They are in this skill's `scripts/` folder and need Node.js 20 or later with three packages. Copy the `scripts/` folder into the case folder (`<case>/scripts/`), run `npm install --ignore-scripts` there once, and run the scripts from that copy: `node <case>/scripts/<name>.mjs <case>`. In Claude Code, where the plugin's own copy already has its packages, you can run them in place. If npm cannot reach the package registry (some organisations turn network access off), tell the person in plain words that an administrator needs to allow package installation for Claude's code execution, and stop.
- **Handing files back.** Put the finished files where the person can download them — in Chat and Cowork, wherever this environment offers created files for download — and name them plainly.

## 1. Ask what you need, briefly

In a short message or two (buttons for closed choices where available): who is filing (a parent on their own, or an attorney), the state, the planned filing date, and — for an attorney — the signature block and whether to reserve the right to seek attorneys' fees and costs. Take anything they already said. Ask a parent in plain words and an attorney in the terms of art. If the planned filing date is already past, say so and ask for the real one: the time limit is counted from it.

## 2. Read everything

With the documents in `<case>/documents/`, run `pdf-text.mjs <case>`; it writes each PDF's text, page by page, to `<case>/work/text/`. Read all of it. A page with no text layer, or a document that is not a PDF (an email, a photo of a letter), is read by eye and transcribed word for word into `<case>/work/text/<name>-transcribed.txt` — the check reads every text file there, and a fact from a document must never be passed off as the person's statement.

## 3. Confirm the facts with the person

Show them what the documents say that the complaint will rest on: the student's name, date of birth, address, school and district; the parent's name and contact details; and the key events with their dates, each with its document and page. They confirm or correct. Anything they tell you in their own words — what the district did, how they learned of it, what it has meant for the student, what they want — goes into `<case>/statement.md`, as they said it. That file counts as a source.

## 4. Verify the state's procedure

Open the state's official due process filing page — the `filingUrl` for the state in `references/state-rules.json`, whose row also has the office's contacts and a `filingNote` of what the research found — and look up: who the complaint is filed with and at what address; how it may be sent (mail, fax, email, portal); who must be served, and whether before filing; the time limit for filing; and whether the state has a form, and what its caption and contents require. Read the state education agency's page and the statute too. Use only official sources, and copy every address and number as the page writes it — from the page's own text: a web tool's summary can paraphrase or invent, so read the full page, and an official PDF's own text (download it into a scratch folder's `documents/` and run `pdf-text.mjs` on it where you can). Where two official pages disagree, follow the receiving office's own page and say so.

Write it up as `<case>/filing-instructions.md`, each point with the URL it came from.

## 5. Draft `complaint.md`

Follow `references/exemplar.md` — it is both the voice and the file format (front matter for the caption, then the sections). In short:

- Third person: "Student", "the Parent", "the District". No given names in the body after the introduction.
- The statement of facts is the chronology, one dated event per paragraph, oldest first. The statement of the problems has one lettered section per claim the person chose, with the regulation in italics under its heading, then the facts that bear on it.
- Dates in full ("October 14, 2025"), figures exactly as the documents give them, quotations short and word for word. No arithmetic ("a shortfall of 28 sessions", "less than half"): state the figures and let the reader compare.
- Facts only. No legal conclusions ("violated", "denied FAPE") inside the facts, no characterisation, no citations except under the headings.
- The required elements: the child's name; the address of residence (or contact information for a homeless child); the school; the problem and its facts; the proposed resolution — and anything the state requires. When the state's form asks for something the documents don't give (the district's address, the student's main language), ask the person and put their answer in `statement.md`; if they don't know, leave a blank line and tell them.
- Leave `status: draft` in the front matter.

## 6. Check, then review

Run `check.mjs <case>`. It refuses any date, figure or quotation that is not in the documents or `statement.md`, and a complaint missing a required element. Fix each finding from the sources and run it again until it passes. It also lists what rests on the person's statement alone; tell them.

Then review the draft for everything a script cannot catch, using `references/review.md`. Give the review to a fresh subagent with the case folder and that file where subagents are available (Cowork, Claude Code) — it reads what is on the page, not what you meant; otherwise do it yourself as a separate pass, reading from the files, not from memory of drafting. Fix every error it finds at its source and run `check.mjs` again. A finding that is a judgment for the person signing — keeping a paragraph that concedes something, filing about an event older than the time limit — goes to them to decide.

## 7. Render and hand over

Set `status: final` and run `render.mjs <case>`. It writes `complaint.pdf` and `complaint.docx` only when the check passes on a final complaint; otherwise it writes `complaint.DRAFT.pdf` and `complaint.DRAFT.docx`, marked DRAFT — NOT FOR FILING. Look at the PDF before handing it over.

Give the person `complaint.pdf`, `complaint.docx` and `filing-instructions.md` to download, and tell them which file to file and which to edit; what rests on their statement alone; anything the review left for them to decide; and how to file, from `filing-instructions.md`. Say that you did not decide which claims the file supports and that you say nothing about how the complaint will fare.
