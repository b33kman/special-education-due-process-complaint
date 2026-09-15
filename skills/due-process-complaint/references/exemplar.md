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
petitioner: JORDAN RIVERA, a minor, by and through the parent, DANA RIVERA
respondent: RIVER OAK UNIFIED SCHOOL DISTRICT
date: April 17, 2026
student: Jordan Rivera
address: 1418 Alder Street, Willow Creek, CA 95833
school: Willow Creek Elementary School
status: draft
---

## Introduction

Petitioner Jordan Rivera (“Student”) is an 8-year-old student who is eligible for special education and related services under the category of Autism, and who attends Willow Creek Elementary School in the River Oak Unified School District (“District”). This due process complaint is brought on Student’s behalf by the parent, Dana Rivera (“Parent”), who is self-represented.

The District has denied Student a free appropriate public education (“FAPE”) by failing to provide an individualized education program (“IEP”) adequate to Student’s needs; and by failing to implement the services the IEP requires. Petitioner requests an impartial due process hearing on the problems stated in this complaint.

## Contact and residence information

*34 C.F.R. § 300.508(b)(1)–(3).*

Student was born on November 3, 2017, resides with the Parent at 1418 Alder Street, Willow Creek, CA 95833, and is enrolled at Willow Creek Elementary School. The Parent may be reached at dana.r@example.com and (555) 010-4471.

## Statement of facts

On September 8, 2025, the IEP team adopted an annual reading goal of 60 words per minute with 90% accuracy, carried forward from the March 11, 2024 IEP.

On October 6, 2025, the small-group reading block was discontinued when the reading intervention position became vacant.

On March 6, 2026, the District’s progress report recorded 23 words per minute and stated that the goal was not met.

## Statement of the problems

### A. Failure to provide an adequate individualized education program

*34 C.F.R. §§ 300.320, 300.324.*

The IEP dated September 8, 2025 provides an annual reading goal that Student “will increase oral reading fluency to 60 words per minute with 90% accuracy.” The IEP dated March 11, 2024 had set the same goal at 60 words per minute.

The District’s progress reports dated November 14, 2025, January 23, 2026 and March 6, 2026 recorded 21, 24 and 23 words per minute, and the March 6, 2026 report states that the goal was “not met.”

### B. Failure to implement the services the IEP requires

*34 C.F.R. § 300.323.*

The IEP dated September 8, 2025 provides 240 minutes per week of specialized academic instruction in reading in a small-group setting. The District’s service delivery log for September 8, 2025 to February 27, 2026 records 24 instructional weeks, 4 weeks at the full 240 minutes, and an average of 95 minutes per week.

## Proposed resolution

*34 C.F.R. § 300.508(b)(6).*

The Parent proposes the following resolution:

(a) convene an IEP team meeting within 15 days to adopt measurable reading goals based on current assessment data;

(b) provide compensatory specialized academic instruction equal to the minutes not delivered from October 6, 2025 through February 27, 2026; and

(c) implement the IEP as written, with quarterly service logs provided to the Parent.

## Signature

Dated: ______________________

Respectfully submitted,

______________________________
Dana Rivera
Parent of Jordan Rivera
Self-represented (pro se)
1418 Alder Street
Willow Creek, CA 95833
(555) 010-4471
dana.r@example.com

## Certificate of service

The Parent certifies that on the date written below a true and complete copy of this Due Process Complaint Notice was served on the River Oak Unified School District, by the method indicated below.

Method of service:   [  ] U.S. mail   [  ] Hand delivery   [  ] Other: ____________________

Name and address of each person served: ________________________________________

Dated: ______________________

______________________________
Dana Rivera
Self-represented (pro se)
```

---

## What to notice

- **Every paragraph of the facts and the problems is a fact with a date, a figure, a document or a specific act.** Nothing is characterised and nothing is computed: not "a shortfall of 145 minutes per week", not "no measurable progress". State the figures the documents give.
- **Documents are named and dated in the prose** ("The District's progress reports dated November 14, 2025, January 23, 2026 and March 6, 2026"). No page cites on the complaint.
- **Quotations are short and exact**, only where the document's own words are the fact.
- **Nothing concludes inside the facts.** The introduction's one sentence names the claims; the regulation under each heading does the rest.
- **A week is pleaded as a week** ("In the week of September 22, 2025"), a month as a month ("In November 2025").
- **When counsel files**: the introduction ends "Petitioner and the Parent are represented by [name] of [firm]."; the signature block carries the attorney's name, "Attorney for Petitioner and the Parent", the bar number and jurisdiction, the firm, its address, telephone and email; counsel's reservation of the right to seek attorneys' fees and costs under 20 U.S.C. § 1415(i)(3)(B) follows the lettered remedies as its own paragraph; "Counsel for Petitioner and the Parent certifies" opens the certificate.
- **Where the state's form puts the county in the caption** (North Carolina's does), fill in `county:`; it prints at the upper left of the caption. Where it names the respondent in a particular way ("___ Board of Education"), use that in `respondent:`.
- **The certificate names everyone the state's own form or statute says is served** — the district, and where required the state agency or the hearing office itself.
