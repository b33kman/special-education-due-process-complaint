# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` — Claude Code delivers an update to installed plugins only when that number changes — and is published as a GitHub release.

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
