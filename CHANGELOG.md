# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` — installed plugins are updated only when that number changes — and is published as a GitHub release.

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
