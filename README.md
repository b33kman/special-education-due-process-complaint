# Due Process Complaint Drafter

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/b33kman/special-education-due-process-complaint)](https://github.com/b33kman/special-education-due-process-complaint/releases)
[![Claude plugin](https://img.shields.io/badge/Claude-plugin-d97757)](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)

**A free plugin for Claude that writes a special education due process complaint from your school documents.**

Give Claude the IEPs, evaluations, prior written notices, progress reports, service logs and emails. It reads every page, checks the facts with you, looks up how to file in your state, and gives you the complaint as a **PDF to file** and a **Word file to edit**. It works for all 50 states and the District of Columbia.

It is for parents filing on their own, advocates, special education attorneys and legal aid organizations. It is not legal advice.

<p align="center">
  <a href="examples/river-oak/complaint.pdf"><img src="docs/images/complaint-first-page.png" alt="The first page of a finished due process complaint" width="460"></a>
  <br>
  <a href="examples/river-oak/complaint.pdf"><b>See a finished complaint (PDF)</b></a><br>
  <sub>Made-up people and documents.</sub>
</p>

## What you need

- The **Claude app**
- A **paid Claude plan**: Pro, Max, Team or Enterprise

## Install the plugin

You only do this once.

### Step 1. Click **Customize**, then **Plugins**

Open the Claude app. In the left sidebar, click **Customize**. At the top of the page, click **Plugins**.

Check that **Chat** is selected at the top of the sidebar (the speech-bubble icon), not **Code** (`</>`). A plugin added in Code doesn't show up in Chat.

<img src="docs/images/install-1-customize.png" alt="The Claude app with Customize selected in the left sidebar and the Plugins tab selected" width="720">

### Step 2. Click **Add**, then **Add marketplace**

The **Add** button is at the top right.

<img src="docs/images/install-2-add-marketplace.png" alt="The Add button opened, showing Add marketplace at the top of the menu" width="420">

### Step 3. Click **Add from a repository**

<img src="docs/images/install-3-from-repository.png" alt="The Add marketplace window with Add from a repository selected" width="580">

### Step 4. Paste the address, then click **Sync**

Copy this address and paste it into the **URL** box:

```
https://github.com/b33kman/special-education-due-process-complaint
```

Leave **Sync automatically** on, then click **Sync**.

<img src="docs/images/install-4-paste-and-sync.png" alt="The address pasted into the URL box, Sync automatically turned on, and the Sync button" width="580">

### Step 5. Click **Add** next to **Due Process Complaint Drafter**

<img src="docs/images/install-5-add.png" alt="Due Process Complaint Drafter in the plugin list with its Add button" width="700">

If a yellow message says *"Auto-sync requires the Claude GitHub App to have access to this repository,"* close it. The plugin still installs.

### Step 6. Check that the switch is blue

Click **Due Process Complaint Drafter** to open its page. A blue switch at the top right means it's on. You're done.

<img src="docs/images/install-6-done.png" alt="The Due Process Complaint Drafter page with its switch turned on" width="700">

## Write your first complaint

1. **Start a new chat.** Click **New** in the left sidebar.
2. **Attach your documents.** Drag the PDFs into the message box. Each file can be up to 30 MB.
3. **Say what you want.** For example:

   > Draft a due process complaint from these documents. The state is California and I'm the parent, filing on my own.

4. **Answer Claude's questions.** It shows you the facts it found and the page each came from, and asks you to confirm them. You choose the problems to raise and what you want the school to do.
5. **Download your files** when it's finished:
   - **complaint.pdf** — the complaint to file
   - **complaint.docx** — the same complaint, to edit in Word
   - **filing-instructions.md** — where and how to file in your state

Until every check passes, the files are named **complaint.DRAFT** and marked **DRAFT — NOT FOR FILING**, so a draft can't be filed by mistake.

For the best results, choose the most capable Claude model the app offers.

## See finished complaints

Both examples use made-up people and documents.

- **[California, a parent filing on their own (PDF)](examples/river-oak/complaint.pdf)**
- **[North Carolina, an attorney filing (PDF)](examples/pine-hollow/complaint.pdf)**

**Where to file in every state:** [STATES.md](STATES.md) lists the office that takes due process complaints in each state, its official page, its contacts and the time limit.

## If something goes wrong

- **The plugin shows up in Code but not in Chat.** It was added in Code, which keeps its own list of plugins. Select **Chat** at the top of the sidebar and do the install steps again.
- **You don't see the plugin after Step 4.** Check that the address was pasted exactly, then close and reopen the app.
- **Claude says it can't run code or create files.** Open **Settings → Capabilities** and turn on **Code execution and file creation**, then start a new chat. On a Team or Enterprise plan, ask your administrator.
- **Claude says it can't install packages.** Your organization has limited Claude's internet access. Ask your administrator to allow **package managers** in **Organization settings → Capabilities**.
- **A document is a scan, a photo or an email.** Attach it anyway and tell Claude. It types it out word for word so it can be checked like the rest.
- **Still stuck?** [Tell us what you see](https://github.com/b33kman/special-education-due-process-complaint/issues).

## Updating

In Step 4 you left **Sync automatically** on. Claude says that keeps the plugin up to date when it changes here. Each new version is listed on the [Releases page](https://github.com/b33kman/special-education-due-process-complaint/releases).

## What it will not do

- Choose the claims or what to ask for. You decide.
- Say whether the complaint will win.
- Fill a gap. If no document and nothing you said supports a fact, the complaint leaves it out.
- Guess a filing address or deadline. It looks them up on your state's official pages every time.

## Privacy

The documents you attach go to Claude like any other attachment, under your Claude plan's terms. The plugin doesn't send them anywhere else. It looks up your state's filing pages on the web, and those lookups don't name the student. If you're an attorney using it on a client's file, make sure Claude's terms fit your confidentiality duties.

## Frequently asked questions

**What is a special education due process complaint?**
A written complaint that starts a due process hearing under the Individuals with Disabilities Education Act (IDEA). A parent or a public agency may file one on any matter relating to a child's identification, evaluation or educational placement, or the provision of a free appropriate public education (34 C.F.R. § 300.507(a)). A hearing officer decides the dispute after a hearing; the complaint sets out what the hearing is about.

**What must a due process complaint contain?**
Under 34 C.F.R. § 300.508(b): the child's name; the address of the child's residence; the name of the child's school; for a homeless child, available contact information and the school; a description of the problem, including the facts relating to it; and a proposed resolution to the extent known. Some states require more. The plugin won't produce a final complaint while one is missing.

**How long does a family have to file?**
Under 34 C.F.R. § 300.507(a)(2), two years from the date the parent or agency knew or should have known about the action the complaint is about, unless the state has its own time limit. A few do: the table bundled here records one year for Alaska, North Carolina and Wisconsin and three years for Kentucky. The plugin looks up the filing state's time limit on its official pages every time and points out events older than it; whether an exception applies is for the person signing to decide.

**Where is a due process complaint filed?**
It depends on the state. In many it goes to the state education agency; in some to a separate hearings office (California and North Carolina, for example); in others to the school district, with a copy to the state (Illinois and Arizona, for example). The other party always gets a copy (34 C.F.R. § 300.508(a)), and some offices accept a complaint only after the district has been served. **[STATES.md](STATES.md) lists the office, the official filing page, the contacts and the time limit for every state and DC.**

**Is it legal advice? Will it tell me whether the case is strong?**
No. It drafts from the documents and the facts you confirm. It does not choose claims or predict outcomes. The person who signs the complaint is responsible for it.

**Who is it for?**
Parents filing on their own (pro se), advocates helping families, and special education attorneys and legal aid organizations drafting for clients. It asks a parent in plain words and an attorney in legal terms; the complaint follows the same form either way.

**How does it keep errors out of the complaint?**
Two ways. First, a check refuses any date, number or quotation that isn't in the documents or in what you told it, and any complaint missing a required part. Then the draft is reviewed for everything a check can't catch, and the errors are fixed before the complaint is final.

<details>
<summary><b>For developers and Claude Code users</b></summary>

### Install in Claude Code (terminal)

Start `claude`, then type:

```
/plugin marketplace add b33kman/special-education-due-process-complaint
/plugin install due-process-complaint@due-process-complaint
```

Choose **User scope** when asked. Node.js 20 or later must be installed first; Claude Code installs the plugin's packages with it. To update: `/plugin marketplace update due-process-complaint`, or turn on auto-update in `/plugin` → **Marketplaces**.

### Upload the skill instead

Download `due-process-complaint-skill.zip` from the [latest release](https://github.com/b33kman/special-education-due-process-complaint/releases/latest), then in Claude open **Customize → Skills** and upload the ZIP. It won't update by itself.

### As a personal skill, from a clone

```bash
git clone https://github.com/b33kman/special-education-due-process-complaint.git
cd special-education-due-process-complaint && npm install
ln -s "$(pwd)/skills/due-process-complaint" ~/.claude/skills/due-process-complaint
```

To update: `git pull`, then `npm install`. What changed in each version is in [CHANGELOG.md](CHANGELOG.md).

### How it works

Claude reads the PDFs, confirms the facts with the person filing, looks up the state's procedure on its official pages, and drafts `complaint.md`. `check.mjs` refuses any date, figure or quotation not in the documents or the person's statement, a missing required element, and sections out of order. The draft is then reviewed against `references/review.md`, by a fresh subagent where available. `render.mjs` sets the pleading as PDF and Word, named DRAFT unless the complaint is final and passes the check.

Each worked example in [`examples/`](examples/) has its documents, the person's statement, the filing instructions and the finished complaint.

### Testing

```bash
npm install && npm test
```

Each test breaks a worked example in one way (an invented date, a figure that is only the tail of the real one, a quotation not on the page, a missing school, a section out of order) and asserts the check refuses it, and that a draft is never given the name of the file to file.

### Layout

```
.claude-plugin/          plugin and marketplace manifests
skills/due-process-complaint/
  SKILL.md               the procedure Claude follows
  references/            the exemplar (form and voice), the review checklist, the state table
  scripts/               pdf-text.mjs, check.mjs, render.mjs
examples/                two complete worked examples on invented documents
tests/                   the tests
docs/images/             the pictures on this page
CHANGELOG.md             what changed in each version
STATES.md                where to file in each state: office, official page, contacts, time limit
```

**Never commit a real case folder.** The `.gitignore` excludes every `work/` folder and every PDF outside `examples/`.

### Provenance

The exemplar and the state research table are derived from Sped DPC, a due process drafting product built by Beekman One LLC, released here so the procedure can be used and inspected on its own.

</details>

## License

[MIT](LICENSE). The examples are fiction. The state research is a starting point, not legal authority: confirm every detail on the state's official page before relying on it.

## Disclaimer

This software prepares a document from information you supply and confirm. It is not a law firm, does not provide legal advice, and creates no attorney–client relationship. The person who signs and files the complaint is responsible for it.
