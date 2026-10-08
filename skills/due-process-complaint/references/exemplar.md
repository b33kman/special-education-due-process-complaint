# The exemplar: `complaint.md`

Write the complaint as `<case>/complaint.md` in exactly this form. The front matter becomes the
caption; the sections print in this order as a pleading, then a page break, then the Attorney Review
Notes.

`check.mjs` refuses a complaint whose sections are missing or out of order, so the order below is
not a suggestion.

## The sections, in order

The bracketed ones print only when they apply.

1. `## Preliminary statement`
2. `## Required information` — the § 300.508(b)(1)–(3) elements as a table, each row saying what
   requires it. A row the federal rule does not require (a date of birth, a parent's telephone
   number) says so: it is there because the filing office's form asks for it. For a homeless child
   the contact information and the school are § 300.508(b)(4) instead.
3. `## Jurisdiction, timeliness and burden`
4. `## Statement of facts` — the chronology, one dated event per paragraph, oldest first
5. `## Statement of the problems` — one `### A. Heading` per claim, the regulation in italics beneath
6. [`## Pendency`]
7. `## Proposed resolution` — a lead-in, then one `(a)` line per remedy
8. [`## Requests concerning the hearing`] — mediation, an expedited hearing, an interpreter,
   accommodations, only when asked for
9. [`## Additional information required in <State>`] — only what the state requires that the
   sections above do not already carry
10. [`## Reservation of rights`]
11. `## Signature`
12. `## Certificate of service`
13. `## Review Notes – Remove Before Filing` — after a page break. Where an attorney or a legal
    aid organization is filing it is `## Attorney Review Notes – Attorney Work Product – Remove
    Before Filing` instead; a parent, student or advocate holds no attorney work product, and
    `check.mjs` refuses the wrong heading for the filer.

## Three markers the renderer reads

**A paragraph label, `[#name]`.** Start a fact paragraph with it, then write `[#name]` wherever a
claim or the pendency section means that paragraph's number. `render.mjs` prints the number;
`check.mjs` refuses a label that points nowhere, a label used twice, and a pointer written anywhere
but a claim or pendency. Lowercase letters and hyphens only. **State each fact once** and point to
it; an issue restated is an issue the District can say you pleaded two ways.

**A source, `[@stem, p. N]`.** Put it at the end of every fact paragraph. `stem` is the start of the
document's name as it sits in `<case>/documents/`; `check.mjs` resolves it against `work/text/`,
refuses a document that is not there, and refuses a page the document does not have. It prints as
`(p. N)`, because the prose already names the document. Where a fact comes from the person rather
than a document, write `[@statement]` and say so in the sentence — "The Parent reports", "Counsel
states". `check.mjs` requires the reporting phrase.

**A flag.** `[MISSING-1: …]`, `[CONFLICT-2: …]`, `[VERIFY-3: …]`, `[COUNSEL-4: …]`, or a bare
`[COUNSEL-4]` where a quantity is the person's to supply. Numbered in sequence within each kind from
1, no gaps, each number used once. Under twelve words inside the pleading; the full explanation goes
in the Attorney Review Notes under the same number, and `check.mjs` refuses a marker the notes do
not explain. **While any flag is open the document renders as `complaint.DRAFT.docx`**, marked
DRAFT — NOT FOR FILING, so nothing half-answered is filed by mistake. Every flag is resolved before
the complaint is final: a `[COUNSEL-#]` placeholder is a blank nobody has filled, and it prints.

A flag is how an unsupported fact reaches the page. Write the fact, flag what is missing, and let the
person resolve it. What you must never do is write it unflagged.

---

The people, district and facts below are invented. Take the form and the voice from it, nothing
else.

```markdown
---
forum: Office of Administrative Hearings
state: California
circuit: 9th
county:
filer: parent
petitioner: AVERY MORENO, a minor, by and through the parent, LENA MORENO
respondent: CEDAR VALLEY UNIFIED SCHOOL DISTRICT
date: May 4, 2026
student: Avery Moreno
address: 220 Birch Lane, Lakeview, CA 95000
school: Lakeview Elementary School
status: draft
---

## Preliminary statement

Petitioner Avery Moreno (“Student”) is a student eligible for special education and related
services under the category of Specific Learning Disability, and attends Lakeview Elementary School
in the Cedar Valley Unified School District (“District”). This due process complaint is brought on
Student’s behalf by the parent, Lena Moreno (“Parent”), who is self-represented.

The District has denied Student a free appropriate public education (“FAPE”) by failing to provide
an individualized education program (“IEP”) adequate to Student’s needs; by failing to implement the
services the IEP requires; and by failing to revise the IEP when its own progress reports recorded
that Student was not on track. Petitioner requests an impartial due process hearing on the problems
stated in this complaint.

## Required information

*The elements 34 C.F.R. § 300.508(b)(1)–(3) requires, with the further details the filing office asks for.*

| Element | As provided | Required by |
|---|---|---|
| Name of the child | Avery Moreno | § 300.508(b)(1) |
| Address of the child’s residence | 220 Birch Lane, Lakeview, CA 95000 | § 300.508(b)(2) |
| Name of the school the child attends | Lakeview Elementary School | § 300.508(b)(3) |
| Date of birth | February 9, 2016 | the filing office’s form |
| Contact for the Parent | lena.moreno@example.com, (555) 010-2231 | the filing office’s form |

## Jurisdiction, timeliness and burden

A parent may file a due process complaint on any matter relating to the identification, evaluation
or educational placement of a child with a disability, or the provision of a free appropriate public
education. 34 C.F.R. § 300.507(a)(1). The complaint must allege a violation that occurred not more
than two years before the date the parent knew or should have known about the alleged action, unless
the State has an explicit time limitation. 34 C.F.R. § 300.507(a)(2). The earliest event pleaded
below is September 15, 2025, within that period.

Student resides in the District, which is the local educational agency responsible for providing a
free appropriate public education. 34 C.F.R. § 300.101.

[VERIFY-1: burden of proof allocation in California not confirmed]

## Statement of facts

[#goal] On September 15, 2025, the IEP team adopted an annual math goal of 80% accuracy on
grade-level multi-step word problems. The IEP’s present levels record 38% accuracy on the same
measure. [@01_IEP_Cedar_Valley, p. 4]

[#services] The IEP dated September 15, 2025 provides 150 minutes per week of specialized academic
instruction in math, delivered in a small group by a credentialed special education teacher.
[@01_IEP_Cedar_Valley, p. 7]

[#leave] In the week of October 20, 2025, the District’s service log records no specialized academic
instruction in math, noting “teacher on leave; no substitute.” [@03_Service_Log, p. 2]

[#progress] The District’s progress reports dated November 21, 2025 and January 30, 2026 recorded
40% and 42% accuracy, and the January 30, 2026 report states that Student was “not on track” to meet
the goal. [@02_Progress_Reports, p. 1]

[#log] The District’s service log for September 15, 2025 to January 30, 2026 records 18 instructional
weeks and 9 weeks with no specialized academic instruction in math. [@03_Service_Log, p. 3]

[#pwn] In the prior written notice dated February 6, 2026 the District declined to revise the math
goal, stating that “the current goal remains appropriate and the team will continue to monitor
progress.” [@04_Prior_Written_Notice, p. 1]

[#asked] On February 20, 2026, the Parent wrote asking the District to reconvene the team and revise
the goal, and received no reply. The Parent reports that she telephoned the school twice in March
2026 and was told the case manager would call back. [@statement]

## Statement of the problems

### A. Failure to provide a free appropriate public education

*34 C.F.R. §§ 300.101, 300.320, 300.324.*

An IEP must be reasonably calculated to enable a child to make progress appropriate in light of the
child’s circumstances. *Endrew F. ex rel. Joseph F. v. Douglas Cnty. Sch. Dist. RE-1*, 580 U.S. 386,
399 (2017).

Student’s accuracy has moved from 38% to 42% against an annual goal of 80%, and the District’s own
January 30, 2026 report states that Student was “not on track” to meet it (paragraphs [#goal] and
[#progress]). The District answered that “the current goal remains appropriate and the team will
continue to monitor progress” (paragraph [#pwn]). Continued monitoring is what produced the two
reports already in the record, and the District proposed no change to the goal, the services or the
way progress is measured. Student has had no appropriate program for the 2025–2026 school year.

### B. Failure to implement the services the IEP requires

*34 C.F.R. § 300.323.*

A district must make the special education and related services available in accordance with the
child’s IEP. 34 C.F.R. § 300.323(c)(2).

The IEP requires 150 minutes a week of specialized academic instruction in math. The District’s own
service log records 9 of the 18 weeks in the period with none of it delivered, and for the week of
October 20, 2025 gives the reason: “teacher on leave; no substitute” (paragraphs [#services],
[#leave] and [#log]). A staffing vacancy is the District’s to solve, and it offered no make-up
instruction. Student lost instruction the IEP required in half the weeks of the period.

### C. Failure to reconvene or revise the IEP

*34 C.F.R. § 300.324(b).*

The IEP team must revise the IEP as appropriate to address any lack of expected progress toward the
annual goals. 34 C.F.R. § 300.324(b)(1)(ii)(A).

Two progress reports recorded accuracy far below the goal and the second said Student was not on
track (paragraph [#progress]). The District declined to revise the goal (paragraph [#pwn]) and did
not answer the Parent’s written request to reconvene (paragraph [#asked]). The lack of expected
progress was on the District’s own documents, and the team did not act on it.

## Pendency

Student’s current educational placement is the program described in the IEP dated September 15, 2025
(paragraph [#services]). Petitioner requests that Student remain in that placement during the
pendency of these proceedings. 34 C.F.R. § 300.518(a).

## Proposed resolution

*34 C.F.R. § 300.508(b)(6).*

The Parent proposes the following resolution:

(a) convene an IEP team meeting within 30 days to revise the math goal based on current assessment
data, and to revise the services and the way progress is measured (claim A; 34 C.F.R.
§ 300.324(b));

(b) provide compensatory specialized academic instruction in math for the 9 weeks the District’s
service log for September 15, 2025 to January 30, 2026 records with no specialized academic
instruction, at 150 minutes per week, being 1,350 minutes (claim B; 34 C.F.R. § 300.323); and

(c) provide the Parent the service log each month for the remainder of the IEP’s term (claim B).

## Reservation of rights

Petitioner reserves the right to amend this complaint, to raise additional issues disclosed by
documents not yet produced, and to seek any other relief the hearing officer is authorized to grant.

## Signature

Dated: ______________________

Respectfully submitted,

______________________________
Lena Moreno
Parent of Avery Moreno
Self-represented (pro se)
220 Birch Lane
Lakeview, CA 95000
(555) 010-2231
lena.moreno@example.com

## Certificate of service

The Parent certifies that on the date written below a true and complete copy of this Due Process
Complaint Notice was served on each office named below, by the method indicated below.

Method of service:   [  ] U.S. mail   [  ] Hand delivery   [  ] Other: ____________________

Served on:

Superintendent, Cedar Valley Unified School District, 1400 Valley Road, Lakeview, CA 95000

Special Education Division, Office of Administrative Hearings, 2349 Gateway Oaks Drive, Suite 200,
Sacramento, CA 95833

Dated: ______________________

______________________________
Lena Moreno
Self-represented (pro se)

## Review Notes – Remove Before Filing

### Flagged issues

- **VERIFY-1** — Which party bears the burden of proof in a California special education due
  process hearing is not confirmed. No subsection is named here because none was opened in this
  session, and naming one unread is what the rule against guessing a subsection forbids. Find the
  provision in the California Education Code, read it, and amend the Jurisdiction, timeliness and
  burden section.

### Citations

| Authority | Tier | Pin cite | Quoted |
|---|---|---|---|
| 34 C.F.R. §§ 300.101, 300.320, 300.323, 300.324, 300.507, 300.508, 300.518 | 1 | n/a | no |
| *Endrew F.*, 580 U.S. 386, 399 (2017) | 1 | listed | no |

### Adverse authority and expected defenses

- The District will rely on its February 6, 2026 prior written notice to argue the goal was
  appropriate and that monitoring was the agreed course. The complaint answers this at claim A.
- No Ninth Circuit authority was confirmed in this session. The circuit's standard for a material
  failure to implement is unconfirmed and is not cited.

### Arithmetic

| What | Inputs | Computation | Result |
|---|---|---|---|
| Weeks with no math instruction | 18 instructional weeks (service log, p. 3); 9 weeks with none (service log, p. 3) | 9 | 9 weeks |
| Compensatory minutes owed | 9 weeks (service log, p. 3); 150 minutes per week (IEP, p. 7) | 9 * 150 | 1350 minutes |

### Verification checklist

- [ ] Forum, hearing body, caption and required copies
- [ ] Filing date and limitations cutoff
- [ ] School years and IEPs challenged
- [ ] Residence and who holds educational rights
- [ ] Current school
- [ ] Service logs and make-up counts
- [ ] Compensatory quantities
- [ ] Pendency
- [ ] Every statutory, regulatory and case citation
- [ ] Signature block and service list
```

---

## What to notice

**A claim is an argument, in four moves.** State the rule with its authority. Apply it to the facts
by paragraph number. **Answer the reason the District gave in the record** — its prior written
notice, its email, its meeting note. Name the harm. Write it as pleading prose, never with
memo-style subheadings like "Rule" or "Rebuttal". Claim A above does all four in three paragraphs.

**Answer only what the District actually said.** A defense it has not raised goes in the Attorney
Review Notes, not the pleading.

**The chronology tells what happened; the claim says what was wrong with it.** If a sentence of a
claim could be moved into the Statement of Facts unchanged, it is a repetition rather than an
argument. A claim that is only a list of paragraph numbers says nothing, and the check refuses it.

**Nothing concludes inside the facts, and no legal citation appears there.** Facts cite documents.
The claims carry the law.

**The District's own words are quoted** wherever they are the evidence — a refusal, an admission, an
instruction, a description of what happened — short, exact, and with the document named. A fact the
District wrote itself is stronger quoted than paraphrased.

**Arithmetic is done, shown and confirmed.** A computed figure may appear in the pleading only if it
is a `Result` in the arithmetic table, every input traces to a document, and the computation is
right. `check.mjs` recomputes the table. The person confirms it before the complaint is final.

**A remedy names its claim, its authority and its quantity**, and the quantity rests on a method
that matches the period and the extent of the violation. Never double-count across claims. Where the
quantity is the person's to choose, write `[COUNSEL-#]`.

**A figure the complaint works out is written in digits, and only in digits.** `check.mjs` reads
digits; a number spelled as a word is invisible to it. One draft said its three measurements "move
four words per minute across five months" — the movement was two and the span three months and
twenty days, and nothing caught it, because "four" and "five" are words. Where a document spells a
figure, the complaint spells it as the document does and claims nothing from it. Where the complaint
computes one, it is digits, and it is a `Result` in the arithmetic table.

**A log's own annotations are pleaded with the figure they qualify.** Where a service log records a
week as "0 (holiday week)" or "45 (minimum day schedule)", the complaint says so. Counting that week
at the full required amount, and leaving the annotation out, puts the school calendar inside the
compensatory demand and hands the District the arithmetic.

**Credit what was delivered.** Where the District delivered the wrong thing rather than nothing — a
group session where the programme says individual — a remedy for the full required amount ignores
what the student received. Say which measure the remedy uses, plead one measure and not two, and put
the alternative in the review notes.

**A parent's words inside a District document are the parent's.** An IEP's "Parent input" or "Parent
concerns" block, a signature-page exception, a parent's quoted email: all of those are the person
speaking, recorded by the District. Attribute them to the Parent. The District's own admission is what
the District wrote in its own voice, and only that carries a part of a claim about what the District
did.

**Dates in full** ("October 14, 2025"), and figures exactly as the documents give them. A week is
pleaded as a week ("in the week of September 22, 2025"), a month as a month ("in November 2025").

**When counsel files**: the preliminary statement ends "Petitioner and the Parent are represented by
[name] of [firm]."; the signature block carries counsel's name, "Attorney for Petitioner and the
Parent", the bar number and jurisdiction, the firm, its address, telephone and email; a reservation
of the right to seek attorneys' fees and costs under 20 U.S.C. § 1415(i)(3)(B) goes in the
Reservation of rights section; "Counsel for Petitioner and the Parent certifies" opens the
certificate.

**Where the state's form puts the county in the caption** (North Carolina's does), fill in `county:`;
it prints at the upper left. Where it names the respondent in a particular way ("___ Board of
Education"), use that in `respondent:`.

**The certificate prints each office served, with its address** — the district's office always, the
**State educational agency always** (§ 300.508(a)(2): the party filing "must forward a copy of the
due process complaint to the SEA"), and the hearing office where that is a different body. In most
states the complaint is filed with the SEA, so one line covers both; where it is filed with a
separate hearings office, as in California and North Carolina, the SEA needs its own line. Each is
copied exactly from `filing-instructions.md`, one to a line, office then address, and `check.mjs`
refuses one that file does not give. The person filing fills in only the method and the date.

**Tables, only in four places**: the required-information block, a score trend, a service log, and
the arithmetic table in the notes.
