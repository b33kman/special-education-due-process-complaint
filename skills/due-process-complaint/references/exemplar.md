# The exemplar: `complaint.md`

Write the complaint as `<case>/complaint.md` in exactly this form. The front matter becomes the caption; the sections print in this order as a pleading — the forum's name, a bracketed caption, consecutively numbered double-spaced paragraphs, the signature block, the certificate of service. Do not number paragraphs or sections yourself; `render.mjs` does. `check.mjs` refuses a complaint whose sections are missing or out of order.

The sections, in order (the bracketed ones only when they apply):

1. `## Introduction`
2. `## Contact and residence information`
3. [`## Statement of facts`] — the chronology, one dated event per paragraph, oldest first
4. `## Statement of the problems` — one `### A. Heading` per claim, the regulation in italics beneath it
5. `## Proposed resolution` — a lead-in, then one `(a)` line per remedy
6. [`## Requests concerning the hearing`] — mediation, an expedited hearing, an interpreter, accommodations, only when asked for
7. [`## Additional information required in <State>`] — only for what the state requires that the sections above do not already carry
8. `## Signature`
9. `## Certificate of service`

The people, district and facts below are invented. Take the form and the voice from it, nothing else.

---

```markdown
---
forum: Office of Administrative Hearings
state: California
county:
petitioner: AVERY MORENO, a minor, by and through the parent, LENA MORENO
respondent: CEDAR VALLEY UNIFIED SCHOOL DISTRICT
date: May 4, 2026
student: Avery Moreno
address: 220 Birch Lane, Lakeview, CA 95000
school: Lakeview Elementary School
status: draft
---

## Introduction

Petitioner Avery Moreno (“Student”) is a student who is eligible for special education and related services under the category of Specific Learning Disability, and who attends Lakeview Elementary School in the Cedar Valley Unified School District (“District”). This due process complaint is brought on Student’s behalf by the parent, Lena Moreno (“Parent”), who is self-represented.

The District has denied Student a free appropriate public education (“FAPE”) by failing to provide an individualized education program (“IEP”) adequate to Student’s needs; and by failing to implement the services the IEP requires. Petitioner requests an impartial due process hearing on the problems stated in this complaint.

## Contact and residence information

*34 C.F.R. § 300.508(b)(1)–(3).*

Student was born on February 9, 2016, resides with the Parent at 220 Birch Lane, Lakeview, CA 95000, and is enrolled at Lakeview Elementary School. The Parent may be reached at lena.moreno@example.com and (555) 010-2231.

## Statement of facts

On September 15, 2025, the IEP team adopted an annual math goal of 80% accuracy on grade-level multi-step word problems.

In the week of October 20, 2025, the District’s service log records no specialized academic instruction in math, noting “teacher on leave; no substitute.”

On January 30, 2026, the District’s progress report recorded 42% accuracy and stated that Student was “not on track” to meet the goal.

## Statement of the problems

### A. Failure to provide an adequate individualized education program

*34 C.F.R. §§ 300.320, 300.324.*

The IEP dated September 15, 2025 provides an annual math goal of 80% accuracy on grade-level multi-step word problems. Its present levels record 38% accuracy on the same measure.

The District’s progress reports dated November 21, 2025 and January 30, 2026 recorded 40% and 42% accuracy, and the January 30, 2026 report states that Student was “not on track” to meet the goal.

### B. Failure to implement the services the IEP requires

*34 C.F.R. § 300.323.*

The IEP dated September 15, 2025 provides 150 minutes per week of specialized academic instruction in math. The District’s service log for September 15, 2025 to January 30, 2026 records 18 instructional weeks and 9 weeks with no specialized academic instruction in math.

## Proposed resolution

*34 C.F.R. § 300.508(b)(6).*

The Parent proposes the following resolution:

(a) convene an IEP team meeting within 30 days to revise the math goal based on current assessment data;

(b) provide compensatory specialized academic instruction in math for the weeks the service log records with no instruction; and

(c) provide the Parent the service log each month.

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

The Parent certifies that on the date written below a true and complete copy of this Due Process Complaint Notice was served on the Cedar Valley Unified School District and the Office of Administrative Hearings, by the method indicated below.

Method of service:   [  ] U.S. mail   [  ] Hand delivery   [  ] Other: ____________________

Name and address of each person served: ________________________________________

Dated: ______________________

______________________________
Lena Moreno
Self-represented (pro se)
```

---

## What to notice

- **Every paragraph of the facts and the problems is a fact with a date, a figure, a document or a specific act.** Nothing is characterised and nothing is computed: not "9 of 18 weeks — half the time", not "no measurable progress", not an age worked out from the date of birth. State the figures the documents give.
- **Documents are named and dated in the prose** ("The District's progress reports dated November 21, 2025 and January 30, 2026"). No page cites on the complaint.
- **Quotations are short and exact**, only where the document's own words are the fact.
- **Nothing concludes inside the facts.** The introduction's one sentence names the claims; the regulation under each heading does the rest.
- **A week is pleaded as a week** ("In the week of September 22, 2025"), a month as a month ("In November 2025").
- **When counsel files**: the introduction ends "Petitioner and the Parent are represented by [name] of [firm]."; the signature block carries the attorney's name, "Attorney for Petitioner and the Parent", the bar number and jurisdiction, the firm, its address, telephone and email; counsel's reservation of the right to seek attorneys' fees and costs under 20 U.S.C. § 1415(i)(3)(B) follows the lettered remedies as its own paragraph; "Counsel for Petitioner and the Parent certifies" opens the certificate.
- **Where the state's form puts the county in the caption** (North Carolina's does), fill in `county:`; it prints at the upper left of the caption. Where it names the respondent in a particular way ("___ Board of Education"), use that in `respondent:`.
- **The certificate names everyone the state's own form or statute says is served** — the district, and where required the state agency or the hearing office itself (California's hearing office says it is served too).
