# Due Process Complaint Drafter

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/b33kman/special-education-due-process-complaint)](https://github.com/b33kman/special-education-due-process-complaint/releases)
[![Claude plugin](https://img.shields.io/badge/Claude-plugin-d97757)](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)

**A Claude plugin that drafts an IDEA special education due process complaint from a folder of school documents** — IEPs, evaluations, prior written notices, progress reports, service logs, emails — for any US state and the District of Columbia.

Attach the documents in a Claude chat. It reads every page, confirms the facts with you, looks up your state's filing rules on the official state page, drafts the complaint in the form of a pleading, checks every date, figure and quotation against the documents, and hands you a **PDF to file** and a **Word file to edit**, with instructions for filing in your state.

Built for special education attorneys, legal aid organizations, advocates, and parents filing on their own. It is not legal advice, it does not decide which claims to bring, and it says nothing about how a complaint will fare.

<p align="center">
  <img src="docs/images/complaint-first-page.png" alt="The first page of a complaint drafted by the plugin: the forum's name, a bracketed caption naming the student, parent and school district, and numbered, double-spaced paragraphs" width="460">
  <br>
  <sub>The first page of a finished complaint, from the <a href="examples/river-oak/">California example</a> (invented people and documents).</sub>
</p>

## Install in two steps

For the **Claude app** — Chat or Cowork, on the web or the desktop app — on a paid Claude plan (Pro, Max, Team or Enterprise). No terminal, nothing to install on your computer.

### 1. Add the plugin

<p align="center">
  <img src="docs/images/install-steps.svg" alt="In Claude: 1. Open Customize in the left sidebar, then Plugins. 2. Click + and choose Add marketplace, from a repository. 3. Paste https://github.com/b33kman/special-education-due-process-complaint. 4. Find Due Process Complaint Drafter and click Install." width="760">
</p>

1. Open **Customize** in the left sidebar and go to the **Plugins** tab. (In Cowork, open the **Cowork** tab first, then **Customize**.) Don't add it from the **Code** tab: Code keeps its own list of plugins, so a plugin added there doesn't appear in Chat or Cowork.
2. Click **+**, then **Add marketplace**, and choose to add it from a repository.
3. Paste this address and confirm:

   ```
   https://github.com/b33kman/special-education-due-process-complaint
   ```

4. Click **Browse plugins**, find **Due Process Complaint Drafter**, and click **Install**.

### 2. Turn on updates

In the same **Plugins** screen, turn on automatic updates for this marketplace if the app offers it, so you always have the latest version. See [Updating](#updating).

## Draft your first complaint

1. **Start a new chat** (or a new Cowork task).

2. **Attach the documents** — IEPs, evaluations, prior written notices, progress reports, service logs, letters and emails. Drag the PDFs into the message box or use the attach button. Each file can be up to 30 MB.

3. **Ask for the complaint** in your own words, for example:

   > Draft a due process complaint from these documents. The state is California and I'm the parent, filing on my own.

4. **Answer Claude's questions.** It shows you the facts it found, with the page each came from, and asks you to confirm them. It asks you to choose the problems to raise and what you want the school to do. It does not choose for you.

5. **Download your files** when it's finished:
   - **`complaint.pdf`** — the complaint to file
   - **`complaint.docx`** — the same complaint, to edit in Word
   - **`filing-instructions.md`** — where and how to file in your state, with the official pages

   Until everything checks out, the files are named `complaint.DRAFT.pdf` and marked **DRAFT — NOT FOR FILING**, so a draft can't be filed by mistake.

Use the most capable Claude model the app offers: careful reading is where the quality comes from.

```mermaid
flowchart LR
    A["Your documents<br>(PDFs)"] --> B["Claude reads<br>every page"]
    B --> C["You confirm<br>the facts"]
    C --> D["Your state's official<br>filing page"]
    D --> E["Draft<br>complaint"]
    E --> F{{"Fact check<br>and review"}}
    F -- "errors: fix" --> E
    F -- "passes" --> G["complaint.pdf<br>complaint.docx<br>filing instructions"]
```

## What you get

| File | What it is |
|---|---|
| `complaint.pdf` | The complaint, to file: the forum's name over a bracketed caption, then numbered, double-spaced paragraphs — introduction, contact and residence information, statement of facts, statement of the problems (one lettered section per claim, the regulation under each heading), proposed resolution — the signature block and the certificate of service. Letter, one-inch margins, Times 12, page numbers. |
| `complaint.docx` | The same document as a Word file, to edit before filing. |
| `filing-instructions.md` | How to file in that state — where the complaint goes, how it may be sent, who is served and when, the time limit — each point with the official page it came from. |
| `complaint.md` | The complaint's source text, as drafted and checked. |
| `statement.md` | Your own account, in your words. |

Until the complaint passes the check and is marked final, it is written as `complaint.DRAFT.pdf` and `complaint.DRAFT.docx` with **DRAFT — NOT FOR FILING** at the top, so a draft can't be filed by mistake.

**Where to file in every state:** [STATES.md](STATES.md) lists the office that receives due process complaints, its official filing page, contacts and time limit for all 50 states and DC.

## If something goes wrong

- **Claude says it can't run code or create files.** That setting is on by default, but it can be switched off: open **Settings → Capabilities**, turn on **Code execution and file creation**, start a new chat, and ask again. On a Team or Enterprise plan, your administrator controls it.
- **Claude says it can't install packages or reach the package registry.** Your organization has limited Claude's network access. Ask your administrator to allow **package managers** for code execution (Organization settings → Capabilities).
- **You can't find the plugin in Browse plugins.** Check that the address in step 1 was pasted exactly, then refresh the page or reopen the app.
- **It shows up in the Code tab but not in Chat or Cowork.** It was added from the Code tab, which keeps its own plugin list. Add it again from **Customize → Plugins**, as in step 1. To check it's there, type **/** in the message box in Chat or Cowork; the skill appears in the list.
- **A document is a scan or a photo, or isn't a PDF** (an email, a picture of a letter). Attach it anyway and tell Claude; it reads it and types it out word for word so it can be checked like the rest.
- **Still stuck?** [Open an issue](https://github.com/b33kman/special-education-due-process-complaint/issues) and describe what you see.

## Updating

When a new version comes out, the Claude app can update the plugin for you: in **Customize** → **Plugins**, turn on automatic updates for this marketplace if the option is there. Otherwise, open the marketplace there and refresh or update it.

In the terminal version of Claude Code, turn it on with `/plugin` → **Marketplaces** → `due-process-complaint` → **Enable auto-update**, or update by hand with `/plugin marketplace update due-process-complaint`. If you installed from a clone, run `git pull` and then `npm install`.

What changed in each version is in [CHANGELOG.md](CHANGELOG.md); each version is also a [GitHub release](https://github.com/b33kman/special-education-due-process-complaint/releases), so watching the repository for releases tells you when there is a new one.

## Other ways to install

**Upload the skill instead of adding the plugin.** Download `due-process-complaint-skill.zip` from the [latest release](https://github.com/b33kman/special-education-due-process-complaint/releases/latest), then in Claude open **Customize → Skills**, choose **Upload a skill**, and select the ZIP. You won't get automatic updates this way.

**In Claude Code (the coding tool), in the terminal** — start `claude`, then type:

```
/plugin marketplace add b33kman/special-education-due-process-complaint
/plugin install due-process-complaint@due-process-complaint
```

Choose **User scope** when asked. Node.js 20 or later must be installed on your computer first; Claude Code installs the plugin's packages with it.

**As a personal skill for Claude Code, from a clone:**

```bash
git clone https://github.com/b33kman/special-education-due-process-complaint.git
cd special-education-due-process-complaint && npm install
ln -s "$(pwd)/skills/due-process-complaint" ~/.claude/skills/due-process-complaint
```

## Examples

Two complete worked examples on invented documents, each with the documents, the person's statement, the filing instructions and the finished complaint:

- [`examples/river-oak/`](examples/river-oak/) — California, a parent filing on her own.
- [`examples/pine-hollow/`](examples/pine-hollow/) — North Carolina, an attorney filing, with the county in the caption and a one-year time limit.

## What it will not do

- Choose the claims or the relief. The person filing decides.
- Say how the complaint will fare, in the document or in chat.
- Fill a gap in the record. If no document and no statement supports a fact, the complaint says less.
- Take a filing address or a time limit from memory. They come from the state's official pages, every run.

## Confidentiality

The documents stay on the machine running the skill; what leaves it is the model provider's normal traffic and the state-procedure web requests, which name no student. Anyone using this on a client's file should be satisfied that their model provider's terms fit their confidentiality obligations. **Never commit a real case folder**: the `.gitignore` excludes every `work/` folder and every PDF outside `examples/`. The examples are fiction.

## Frequently asked questions

**What is a special education due process complaint?**
A written complaint that starts a due process hearing under the Individuals with Disabilities Education Act (IDEA). A parent or a public agency may file one on any matter relating to a child's identification, evaluation or educational placement, or the provision of a free appropriate public education (34 C.F.R. § 300.507(a)). The hearing officer decides the dispute after a hearing; the complaint sets out what the hearing is about.

**What must a due process complaint contain?**
Six things, under 34 C.F.R. § 300.508(b): the child's name; the address of the child's residence; the name of the child's school; for a homeless child, available contact information and the school; a description of the problem, including the facts relating to it; and a proposed resolution to the extent known. Some states require more. This skill will not render a complaint as final while one is missing.

**How long does a family have to file?**
Under 34 C.F.R. § 300.507(a)(2), two years from the date the parent or agency knew or should have known about the action the complaint is about, unless the state has its own explicit time limit. A few states do: the research table bundled here records one year for Alaska, North Carolina and Wisconsin and three years for Kentucky. The skill looks up the filing state's window on its official pages every run and points out events older than it; whether an exception applies is the signer's judgment.

**Where is a due process complaint filed?**
It depends on the state. In many it goes to the state education agency; in some to a separate hearings office (California and North Carolina, for example); in others to the school district, with a copy to the state (Illinois and Arizona, for example). The other party always gets a copy (34 C.F.R. § 300.508(a)), and some offices accept a complaint only after the district has been served — California's does. **[STATES.md](STATES.md) lists the office, the official filing page, the contacts and the time limit for every state and DC.** The skill opens the state's official page on every run and writes filing instructions with the source of each point.

**Is it legal advice? Will it tell me whether the case is strong?**
No. It drafts from the documents and the facts the person filing confirms, and it does not choose claims or predict outcomes. The person who signs the complaint is responsible for it.

**Who is it for?**
Special education attorneys and legal aid organizations drafting for clients, advocates helping families, and parents filing on their own (pro se). It asks an attorney the attorney's questions and a parent in plain words; the pleading is the same either way.

**What does it need to run?**
A paid Claude plan, in Chat or Cowork (or Claude Code). The code execution it relies on is on by default. It reads PDFs; a scanned page, a photo or an email is read and typed out by Claude so it can be checked too.

**How does it keep errors out of the complaint?**
Two ways. A script refuses any date, figure or quotation that is not in the documents or in the person's own statement, a missing required element, and a complaint that does not follow the form. Then the draft is reviewed, by a fresh subagent where possible, for what a script cannot catch — fidelity to the pages, the state's own rules, consistency, legal posture, completeness and the rendered files — and the errors are fixed before the complaint is final. Until then it is written only as `complaint.DRAFT.pdf`.

## Testing

```bash
npm install && npm test
```

Each test breaks a worked example in one way — an invented date, a figure that is only the tail of the real one, a quotation not on the page, a missing school, a section out of order — and asserts the check refuses it, and that a draft is never rendered under the name of the file to file.

## Layout

```
.claude-plugin/          plugin and marketplace manifests
skills/due-process-complaint/
  SKILL.md               the procedure Claude follows
  references/            the exemplar (form and voice), the review checklist, the state table (STATES.md, readable)
  scripts/               pdf-text.mjs, check.mjs, render.mjs
examples/                two complete worked examples on invented documents
tests/                   the tests
docs/images/             the pictures on this page
CHANGELOG.md             what changed in each version
STATES.md                where to file in each state: office, official page, contacts, time limit
```

## Provenance

The exemplar and the state research table are derived from Sped DPC, a due process drafting product built by Beekman One LLC, released here so the procedure can be used and inspected on its own.

## License

[MIT](LICENSE). The worked examples are fiction; the state research is a starting point, not legal authority — confirm every value on the state's official page before relying on it.

## Disclaimer

This software prepares a document from information you supply and confirm. It is not a law firm, does not provide legal advice, and creates no attorney–client relationship. The person who signs and files the complaint is responsible for it.
