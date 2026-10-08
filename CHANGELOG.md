# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` — installed plugins are updated only when that number changes — and is published as a GitHub release.

## 2.0.0 — 2026-10-08

The procedure now does what the owner's own Copilot Operating Guide for Word does, on all fifty states and the District of Columbia. Twelve changes, each decided against that guide.

- **Case law.** `references/authorities.md` is new: three tiers of trust, the Supreme Court cases that bind everywhere with their pin cites, a Second Circuit block that applies in Connecticut, New York and Vermont and nowhere else, and the rule for every other circuit — research it, then cite it with a `[VERIFY-#]` flag, no quotation and no pin cite, until its text has been read in the session. **No citation is written that was not confirmed.** Where one cannot be confirmed on the open web, the person is offered the route of connecting a legal research service. Every state row now carries the `circuit` whose decisions bind it, so the binding law is read from data rather than recalled.
- **Who is filing is asked first**, and the answer sets the register of the questions, the signature block, the fee reservation, the voice of the cover letter and the heading on the review notes. The reading, the claims, the research, the audit and the form of the pleading are the same for everyone.
- **A fourteen-check audit before anything is handed over** (`references/audit.md`), carrying the guide's eleven and adding consistency, posture and a read of the rendered PDF. `check.mjs` still runs first and still refuses: the audit is what a program cannot read, not a replacement for one.
- **An unsupported fact is written and flagged, not dropped.** `[MISSING-#]`, `[CONFLICT-#]`, `[VERIFY-#]` and `[COUNSEL-#]`, numbered in sequence within each kind, under twelve words in the pleading, each explained in the review notes. The check refuses a flag the notes do not explain, and **while any flag is open the files render as `complaint.DRAFT.*`** — so write-and-flag never produces something filable by accident.
- **The arithmetic is done, shown and confirmed.** Every count, total and day span goes in a four-column table in the review notes with its inputs and its result. `check.mjs` **recomputes the table**, traces every input to a document or to a row above it, and permits a computed figure in the pleading only because the table computes it. The person is shown the table and asked to confirm it. A District total is never adopted unchecked.
- **The sections are the guide's**: preliminary statement, required information as a table, jurisdiction and timeliness and burden, statement of facts, statement of the problems, pendency, proposed resolution, hearing requests, state additions, reservation of rights, signature, certificate of service, then a page break and the review notes.
- **The claims are the guide's fifteen, plus the two it does not carry** — transition services and removal without the required protections — for eighteen in all, each with the parts it turns on and the regulation it goes under. Nothing was dropped to adopt the list.
- **Each claim is an argument in four moves**: the rule with its authority, the facts by paragraph number, **the answer to the reason the District gave in the record**, and the harm. The check refuses a claim that says nothing of its own and a claim that ties to no paragraph.
- **A source is machine-checked.** A fact paragraph ends with `[@stem, p. N]`, which prints as `(p. N)`; the check resolves the stem against the folder and refuses a document that is not there, a page it does not have, a fact with no source at all, and a fact passed off as the person's own words without saying so.
- **Documents that disagree have a rule**: the latest-dated document is the student's current status unless the person says otherwise, and where a document and the person's statement conflict the statement is pleaded and `[CONFLICT-#]` is flagged. No conflicted fact is ever stated as established.
- **The filing instructions and the cover letter are both asked about**, each on its own, before the handover.
- **The burden of proof is researched, not assumed.** It is set by federal law and reassigned by some states, so the section that names it must read the filing state's own text first. One state's allocation is never carried into another state's complaint.

**The complaint is a Word document.** `render.mjs` writes `complaint.docx`; a PDF is offered once the
complaint is final and written with `--pdf`. Some offices take a PDF, some want the editable
document, and a portal may ask for either. `--pdf` is also how the pleading gets looked at as a page
before handover, which is a check nothing else makes.

**The review notes are not in the complaint it renders for filing.** An adversarial read of the
shipped PDFs found them inside `complaint.pdf`: the petitioner's own list of the District's best
arguments, the admission that the circuit standard and the burden of proof were never confirmed, and
in one example "choose one and do not plead both". A page break and a heading saying "Remove Before
Filing" are an instruction to a human, not a guard. While the complaint is a draft the notes stay in
it, behind the banner, where they get read and acted on; once it is final they are written beside it
as `review-notes.md`.

**What four adversarial reviewers found after the work above, all reproduced before being fixed:**

- The citation guard keyed on volume and reporter alone, so a fabricated case name on a real citation
  passed. It compares the name and the first page now, reads the italic regulation line it had been
  skipping, and knows the state reporters, so a fabricated state case is caught by the citation rule
  rather than by the figure check with a message about an unsourced number.
- `[@law]` blanked every quotation in its paragraph, which made it a general escape. It blanks
  nothing now: a quotation it covers is listed for the audit, the paragraph must carry a numbered
  citation, and a paragraph attributing its words to a document is refused.
- The arithmetic table's computation was free of its own inputs, so `1160 * 3` legitimised 3,480 in
  the pleading. Every number in a computation is now one of that row's inputs or a result above it,
  a comment cannot sit inside one, and the result must lead with its number. The limitations-cutoff
  row is gone: a table of digits cannot express a calendar cutoff, and `2026 - 2 | 2024` certified a
  year while saying nothing about the day.
- The date rule read only "Month D, YYYY" with the full month name, so "Sept. 8, 2024" and
  "12/2/2026" were never checked against anything.
- A citation list stopped at its first item, and a statute written in words ("Education Code
  section 56505") was not stripped at all, so their numbers read as figures about the child.
- A figure with a unit matched only by its bare number — "15 days" against "09/15/2025" — passed
  silently. It still passes, because refusing every such figure would refuse correct ones, but it is
  reported now.
- `references/exemplar.md` declared `filer: parent` and headed its notes "Attorney Work Product",
  which `check.mjs` refuses for a parent. Every complaint written from the exemplar would have been
  refused on that line. A test now runs the exemplar's own document through the real parser.
- The Word file's properties said "Un-named", the writer's default, which a reader sees in File >
  Info on a filed pleading.

**Ten citations, each verified against primary text:**

- § 300.502(b)(3) was cited for reimbursement of a parent-obtained independent evaluation. (b)(3) is
  the provision that **denies** public expense once the agency prevails; the route is
  § 300.502(b)(2)(ii).
- `claims.md` stated as settled that a request for a functional behavior assessment is a request for
  an evaluation. The Second Circuit held the opposite in *D.S. v. Trumbull*, which this file makes
  Tier 1 for Connecticut, New York and Vermont.
- *Trumbull* carried no adverse-authority parenthetical, which `authorities.md` itself requires.
- *Carter*'s pin cite was 15; the holding is at 14.
- § 300.507(a)(1) was quoted and is not quotable as written; it is paraphrased.
- The required-information table claimed § 300.508(b)(1)–(3) for a date of birth and a parent
  contact. That provision is the name, the address of residence and the school; each row now says
  what asks for it.
- § 300.111 (child find) and § 300.301 (initial evaluations) led a claim pleading a reevaluation.
- Claim 2's range swept in §§ 300.119 and 300.120, which are SEA duties.
- 34 C.F.R. § 300.508(a)(2) requires a copy to the State educational agency in every state and
  nothing carried it. `filing-instructions.md` must now answer who the SEA is.
- `audit.md` said the notes heading is "exactly" the attorney one while `SKILL.md` pointed at
  `audit.md` for the parent variant.

**Both worked examples were redrafted again** against a hostile read. River Oak's compensatory demand
had counted five weeks its own log attributes to the school calendar — a minimum day, a school
closure, a two-day week and two holidays — so about 30% of the figure was the calendar rather than
the vacancy; those weeks are disclosed and excluded, and the figure is 2,445 rather than 3,480. Pine
Hollow asked for 1,080 individual minutes while crediting none of the 450 group minutes delivered,
which with the restoration remedy would have given more therapy than the program ever required; it
asks for the 570-minute shortfall, delivered individually, and the alternative measure is in the
notes with the reason it is not pleaded. Pine Hollow had also pleaded the Parent's own IEP input as a
District record and then relied on it as a District admission, which was claim A's load-bearing fact.
Both reservations of rights asked for what § 300.508(d)(3) and § 300.511(d) do not allow, and Pine
Hollow reserved attorneys' fees without saying that a court, not a hearing officer, awards them.

**Rules the owner's guide carries and this skill had not:** § 7's confidentiality rules; § 8's
"continue from the last numbered paragraph" where a reply is cut off; § 9's `[VERIFY-#]` on a forum
that could not be confirmed; and the `--- page N ---` format a hand-transcribed document needs before
it can be cited by page. Three drafting rules were added from the hostile read: a figure the complaint
works out is written in digits, because a number spelled as a word is invisible to the check; a log's
own annotations are pleaded with the figure they qualify; and a parent's words inside a District
document are the parent's.

Smaller things from the same work:

- A parent's review notes are headed **Review Notes – Remove Before Filing**; only an attorney's or a legal aid organization's are attorney work product, and the check holds the heading to the filer. A claim of privilege nobody holds is a false claim.
- A case name is set in italic in both the PDF and the Word file, and a lone asterisk is a multiplication sign rather than emphasis.
- The renderer draws tables, bullet lists and checklists, and keeps a point and a half of slack in every column: pdf-lib measures a line from the standard-font metrics and a viewer draws it from its own, and the two disagree by up to about 1% — enough to put a long bold line past the right margin.
- `references/review.md` is folded into `references/audit.md`.
- Both worked examples are redrafted to the new form, with their review notes, their recomputed arithmetic, and the honest statement in each that no circuit authority was confirmed. Neither cites a case it did not verify.
- The test suite is rewritten: 58 tests, each breaking one thing a model could plausibly get wrong, and 39 mutations of the new assertions were run against them. All 39 were killed.

## 1.0.18 — 2026-09-18

- **What each claim turns on is written down, with its regulation** (`references/claims.md`), and the procedure reads it before recommending. Testing 1.0.17 on invented files found the rule sound but the legal reading loose: one run left out a transition claim because it measured the 16th birthday against the IEP meeting instead of the IEP's whole term, and another miscounted a records delay. The file states each claim's parts and the rules they rest on, each quoted from the regulation: transition services "not later than the first IEP to be in effect when the child turns 16"; records "in no case more than 45 days after the request has been made"; the 60-day initial evaluation; the 10-day manifestation determination; § 300.513(a)(2)'s three effects for a procedural claim.
- **Something that did not happen is not, by itself, a fact for a claim.** A notice the person never received, or a reply that never came, supports a recommendation only where a document records it. The person can still add the claim themselves. This is the same rule the Sped DPC app applies.
- **Claims are asked four to a question, in as many questions as it takes.** 1.0.17 said the four-option limit never limits claims, and one run read that as licence to print ten options in one message. Nothing is left out to fit, and nothing is crammed in.
- **For a procedural claim the person chooses, they are asked what it affected**, in their own words, into `statement.md`, because a hearing officer can find a denial of FAPE on a procedural violation only on one of those three effects.
- `.codex-plugin/plugin.json` and `CITATION.cff` carry the version again; 1.0.17 bumped only the Claude manifest, so ChatGPT and Codex installs never received it.

## 1.0.17 — 2026-09-18

- **Recommend every claim the documents support, by a rule, never a number.** "Recommend the claims the documents support strongly, usually no more than four" became: recommend every claim the documents or the person's own words give a fact for, in each part it turns on, and no other; the number may be none, one or seven. Where nothing is supported, say that it is about what the documents show, not about the case, and offer the full list. Relief follows the same rule.

## 1.0.16 — 2026-09-16

- **The school district's office and address are found for you, and printed on the certificate of service.** Most people filing don't know which office of the district to send it to, or where, and the procedure used to ask them. It now looks up the office the state names — or the one the district names for due process requests, otherwise the superintendent's office — on the district's own website, checks it against the letterhead on the district's documents, and writes it into `filing-instructions.md` under its own heading with the page it came from.
- **The certificate lists every office served, with its address**, under "Served on:". The person fills in only the method and the date. The check refuses a certificate that names nobody, leaves out the district's office, or gives an office or address that `filing-instructions.md` doesn't — an address the research never found is as invented as a date no document gives.
- **STATES.md says who in the district receives the complaint, and in what order**, for each state. It used to say "Copy to the school district: yes" on all 51 rows, which told the reader nothing — and in 16 of the 51 the district receives the complaint itself, not a copy.
- An attorney's cover letter is copied to the district's office where that is a different office from the one the complaint is filed with.

## 1.0.15 — 2026-09-16

- **The cover letter is asked about, instead of being offered in passing.** It was the last sentence of the procedure, after the files had been handed over — so in practice nobody was ever asked. It is now a question of its own, put before the handover and waited on like every other choice, because once the files are announced the work reads as finished and a question after that gets dropped.
- **The cover letter is written for whoever signs it.** A parent or student filing on their own gets plain words in the first person; an attorney gets a transmittal letter with the caption, what is enclosed and on whose behalf, who else was served and how, and a request for acknowledgment.

## 1.0.14 — 2026-09-15

An adversarial review of the last three releases. Every finding below was reproduced by running the shipped scripts before it was fixed.

- **Fixed: the check accepted the very shape it was written to refuse.** 1.0.12's claim test counted the commas between paragraph pointers as words, so a long enough list of numbers passed while a short, fully substantive claim was refused — the reverse of its purpose. It now counts only what a claim says in its own words, and a claim of one solid sentence passes.
- **Fixed: a paragraph pointer written into a remedy printed as a number.** Three places said pointers belong to the claims and nothing enforced it. A label is now defined in the statement of facts and pointed to from a claim, and the check refuses one written anywhere else.
- **Fixed: a stray `[#label]` in the signature or the certificate of service printed literally on the filed PDF.** It is refused now.
- **Fixed: a space the PDF extractor leaves before a semicolon no longer refuses the district's own words.** pdf.js ends a text item at a font change, so an extracted line can read "on leave ; no substitute" and a correct quotation was rejected with no way forward — and 1.0.13 asks for far more quotations. Closing up that space is the only latitude given: a quotation that runs two of the page's own words together is still refused.
- **Both worked examples are redrafted to the current rules** — labelled chronologies, claims that argue rather than re-tell, and remedies that name their figures and the document that gives them. They were written before 1.0.11 and demonstrated none of it.
- The model complaint's claims no longer restate, nearly word for word, the paragraphs they point at.

## 1.0.13 — 2026-09-15

- **The District's own words are quoted.** Where a refusal, an admission or a description of what happened is in an email, a prior written notice, a service log or a teacher's note, the complaint quotes it, short and word for word, with the document named. One run produced a complaint with no quotations at all.
- **The facts are confirmed in short groups**, six events at a time, each with its document and page, with a pause after each — instead of one block of facts that gets a glance and a "confirm". What happened that was never written down is asked on its own.
- **A remedy names its own figures** (the 24 sessions owed, the 150 minutes a week), and never points the reader to a paragraph number. Paragraph pointers belong to the claims.
- The page's time estimate is roughly fifteen minutes for a folder of seven documents.

## 1.0.12 — 2026-09-15

- **Fixed: each claim was reduced to a list of paragraph numbers.** 1.0.11 told the AI to point at the facts instead of repeating them, and it pointed without saying anything. A claim now says what the problem is — what the district did or failed to do, with its dates, figures and quoted words — and ends by pointing to the chronology paragraphs that carry the rest. The check refuses a claim that only lists numbers.

## 1.0.11 — 2026-09-15

- **Works in ChatGPT.** Tested in the ChatGPT desktop app; the README has an "Install in ChatGPT" section, and a `.codex-plugin/plugin.json` gives ChatGPT the plugin's name and description. The skill's instructions no longer assume Claude.
- **Nothing to install.** The three scripts are now self-contained files built from `src/`, so they run on Node.js 20 or later without `npm install`, wherever package installs are blocked.
- **The person decides, and the AI waits.** A third rule: stop at each question and wait for the answer, and mark the complaint final only after the person has confirmed the facts and chosen the claims and relief. (In a ChatGPT test, the AI finished a complaint without asking.) Where an app has no checkboxes, the choices come as a short numbered list.
- **Each fact stated once.** A fact paragraph can start with a label, `[#consent]`; a claim points to its facts with the label, which prints as the paragraph number, instead of repeating them. The check refuses a label that points nowhere.
- **Fixed: long claim headings, regulation lines and signature lines ran off the page.** They now wrap inside the margins, with a test.
- Descriptions say "IEP, school documents and other important information"; the banner and share image name both Claude and ChatGPT.

## 1.0.10 — 2026-09-15

- The state's filing rules start from the bundled table. Claude confirms the address, email or fax and the time limit on the state's official filing page, reads the state's form only where there is one, and says which details it could not confirm if the page won't load, instead of researching every state from scratch.
- A new share image for the repository.

## 1.0.9 — 2026-09-15

- Renamed to the Due Process Complaint Writer. The GitHub page is now "Special Education Due Process Complaint Writer", led by the terms people search for, with new answers on the due process complaint notice, model forms, using AI, and cost.
- In Cowork and Claude Code, the state's filing rules are looked up by a subagent as soon as the state is known, while Claude reads the documents.
- Install with the skills CLI: `npx skills add b33kman/special-education-due-process-complaint`.

## 1.0.8 — 2026-09-15

- Claims and relief: Claude recommends the ones with strong support, usually no more than four. When more than four have strong support, it says so and offers every one of them as checkboxes; "Add another" still shows the rest.

## 1.0.7 — 2026-09-15

- Claims and relief are offered as one checkbox question each, never as a typed list: no more than four recommended items — the claims the documents support best, then the remedies that fit the chosen claims — with a last box, "Add another", that shows the rest four at a time.

## 1.0.6 — 2026-09-15

- More questions up front, kept quick with buttons and checkboxes: who holds the child's education rights (including a student of 18 or older), whether an advocate is helping, and whether an earlier complaint, hearing or settlement covers the same issues.
- Before drafting: whether a document is missing, and what happened that was never written down.
- Asked only when the documents point to it: discipline, a private school placement and repayment, keeping the current placement during the case (stay-put), and contact information when there is no stable address.
- Claims and relief are offered as one screen of checkboxes, each with one line of what the documents show.
- Where the state's form asks: mediation, and an interpreter or accommodations at the hearing.
- At hand-over, an offer of a one-page cover letter.

## 1.0.5 — 2026-09-15

- When Claude offers claims to choose from, it shows what the documents say for each and no longer says which ones the record supports.
- An attorney is asked whether to reserve the right to seek attorneys' fees and costs, instead of the paragraph being added automatically.
- README: install steps with pictures of each screen in the Claude app; the examples open the finished complaint PDF.

## 1.0.4 — 2026-09-15

- Works in Claude's Chat and Cowork, not only Claude Code: the skill sets itself up in the sandbox (copies its scripts, installs their three packages), uses the documents attached to the chat, and hands back the finished files to download.
- README written for Chat and Cowork users: turn on code execution, add the plugin from Customize with the repository address, attach the documents, download the complaint.
- A skill ZIP on each release, for uploading through Customize → Skills.

## 1.0.3 — 2026-09-15

- Written for the Claude desktop app: the README installs the plugin from Customize → Plugins → Add marketplace with the repository address, uses the Code tab with the case folder, and explains each step in plain words.
- When Node.js is missing, the skill tells the person how to install it, in plain words.

## 1.0.2 — 2026-09-15

From a full run of the skill on a new case:

- The check accepts a period or comma inside a closing quotation mark, and shows the whole quotation when it refuses one.
- A figure with a unit ("15 days") is traced with its unit, so the list of what rests on the person's statement is complete.
- A long forum name wraps inside the caption's margins; a row of checkboxes breaks only between items.
- The skill checks the planned filing date against today, reads official pages' own text rather than a web tool's summary, and asks the person for anything the state's form wants that the documents don't give.
- The exemplar is a different invented case from the worked examples and follows its own rules; no computed ages on the complaints.

## 1.0.1 — 2026-09-15

- `check.mjs` runs correctly when the skill is reached through a symlink (the personal-skill install); before, it printed nothing.
- The skill runs its scripts from `${CLAUDE_SKILL_DIR}` without a permission prompt for each, and recovers when the plugin's dependencies were not installed.
- Scanned pages and documents that are not PDFs are transcribed into `work/text/`, so the check reads them.
- The skill says where to put the case folder.
- A clearer README: install in three steps, how to check it worked, troubleshooting, and pictures of the result.

## 1.0.0 — 2026-09-15

First public release.

- Drafts an IDEA special education due process complaint from a folder of school documents, for any US state and the District of Columbia, as a PDF to file and a Word file to edit.
- Checks every date, figure and quotation in the complaint against the documents and the person's own statement, the required elements, and the approved form; the draft is reviewed for errors before it is final, and a draft is never named as the file to file.
- Looks up the state's filing procedure on its official filing page every run; [STATES.md](STATES.md) lists the office, official page, contacts and time limit for all 50 states and DC.
- Two worked examples on invented documents: California (pro se) and North Carolina (counsel).
- MIT license.
