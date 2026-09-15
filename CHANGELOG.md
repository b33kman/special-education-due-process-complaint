# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` — Claude Code delivers an update to installed plugins only when that number changes — and is published as a GitHub release.

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
