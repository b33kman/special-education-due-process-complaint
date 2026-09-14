// Regenerates the synthetic River Oak documents from scratch, so nobody has
// to take on faith that they are invented. Every name, date and figure below
// is fiction, written to match the skill's exemplar (references/exemplar.md).
//
//   npm install --no-save --no-package-lock pdf-lib && node make-documents.mjs
//
// Writes five PDFs into ./documents. Uses pdf-lib only here — the skill
// itself never needs it.

import { PDFDocument, StandardFonts } from 'pdf-lib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'documents')
mkdirSync(out, { recursive: true })

async function render(file, blocks) {
  const pdf = await PDFDocument.create()
  const roman = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const W = 612, H = 792, M = 72, width = W - 2 * M
  let page = pdf.addPage([W, H])
  let y = H - M
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M }
  for (const b of blocks) {
    if (b === '---') { newPage(); continue }
    const font = b.bold ? bold : roman
    const size = b.size ?? 11
    const lead = size * 1.35
    const words = b.text.split(/\s+/)
    let line = ''
    const lines = []
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(trial, size) > width && line) { lines.push(line); line = w } else line = trial
    }
    if (line) lines.push(line)
    if (y - lines.length * lead < M) newPage()
    for (const l of lines) { page.drawText(l, { x: M, y: y - size, size, font }); y -= lead }
    y -= b.gap ?? 6
  }
  writeFileSync(join(out, file), await pdf.save())
  console.log('wrote', file, pdf.getPageCount(), 'page(s)')
}

const H1 = (text) => ({ text, bold: true, size: 14, gap: 10 })
const H2 = (text) => ({ text, bold: true, size: 11, gap: 4 })
const P = (text) => ({ text })

await render('01_IEP_River_Oak_2025-09-08.pdf', [
  H1('RIVER OAK UNIFIED SCHOOL DISTRICT'),
  H1('INDIVIDUALIZED EDUCATION PROGRAM (IEP)'),
  H2('Student information'),
  P('Student Name: Rivera, Jordan    Date of Birth: 11/03/2017    Grade: 3    Student ID: 4471-0093'),
  P('Home Address: 1418 Alder Street, Willow Creek, CA 95833'),
  P('Parent/Guardian: Dana Rivera (Mother)    Phone: (555) 010-4471    Email: dana.r@example.com'),
  P('School of Attendance: Willow Creek Elementary School    District of Residence: River Oak Unified School District'),
  P('Primary Disability: Autism    Date of Initial Eligibility: 03/11/2024    Date of Prior IEP: 03/11/2024'),
  P('IEP Meeting Date: 09/08/2025    Meeting Type: Annual Review    Next Annual Review: 09/07/2026    Next Triennial: 03/10/2027'),
  H2('Present levels of academic achievement and functional performance'),
  P('Reading: On the DIBELS 8 Oral Reading Fluency measure administered 08/29/2025, Jordan read 22 words per minute on a first-grade passage with 86% accuracy. Jordan decodes consonant-vowel-consonant words and most high-frequency words but does not yet apply vowel-team or silent-e patterns. The end-of-second-grade benchmark on this measure is 87 words per minute. Listening comprehension is at grade level; Jordan answers literal and inferential questions about text read aloud with 90% accuracy.'),
  P('Parent concerns: The parent states that the reading goal has not changed since the 03/11/2024 IEP and that Jordan has made little measurable progress toward it. The parent requests a revised goal and more intensive reading instruction.'),
  H2('Annual goals'),
  P('Goal 1 - Reading Fluency. By 09/07/2026, Jordan will increase oral reading fluency to 60 words per minute with 90% accuracy on a first-grade passage, as measured by DIBELS 8 ORF probes administered at the end of each reporting period. Baseline (08/29/2025): 22 words per minute. Note: goal carried forward from the 03/11/2024 IEP with the baseline updated.'),
  P('Goal 2 - Communication. By 09/07/2026, Jordan will initiate a conversational exchange with a peer and maintain it for three turns in 4 of 5 opportunities, as measured by SLP data collection. Baseline: 1-2 turns with adult prompting.'),
  H2('Special education and related services'),
  P('Specialized Academic Instruction - Reading: 240 minutes per week, delivered in a small-group setting of no more than 4 students by a credentialed special education teacher, in the Special Education Classroom, from 09/08/2025 to 09/07/2026.'),
  P('Speech and Language Services: 60 minutes per week, group, provided by a speech-language pathologist, from 09/08/2025 to 09/07/2026.'),
  H2('Educational setting'),
  P('Jordan will participate in the general education classroom for 85% of the instructional day and will receive specialized academic instruction in a special education classroom for 15% of the instructional day. Placement: general education classroom with pull-out specialized academic instruction at Willow Creek Elementary School.'),
  H2('Parent consent'),
  P('The parent consented to the IEP on 09/08/2025 with the following exception noted in writing: "I do not agree that the reading goal is appropriate. I am asking for a goal based on Jordan\'s current level and for more intensive reading instruction."'),
  P('IEP Team: Dana Rivera (Parent); Marcus Ellison (Administrator/District Representative); Priya Nair (Special Education Teacher); Tom Okada (General Education Teacher); Lena Ford, M.S., CCC-SLP (Speech-Language Pathologist).'),
])

await render('02_Progress_Reports_2025-2026.pdf', [
  H1('RIVER OAK UNIFIED SCHOOL DISTRICT - IEP PROGRESS REPORT'),
  P('Student: Jordan Rivera    Date of Birth: 11/03/2017    Grade: 3    School: Willow Creek Elementary School'),
  P('IEP in effect: 09/08/2025    Reporting periods: 11/14/2025, 01/23/2026, 03/06/2026, 06/05/2026'),
  H2('Goal 1 - Reading Fluency'),
  P('Goal: By 09/07/2026, Jordan will increase oral reading fluency to 60 words per minute with 90% accuracy on a first-grade passage.'),
  P('Progress report dated 11/14/2025: 21 words per minute, 88% accuracy (DIBELS 8 ORF, first-grade passage). Progressing slowly. Small-group reading instruction has been provided within the general education classroom this period. (P. Nair)'),
  P('Progress report dated 01/23/2026: 24 words per minute, 90% accuracy. Progressing slowly. Jordan continues to guess at words from the first letter. (P. Nair)'),
  P('Progress report dated 03/06/2026: 23 words per minute, 89% accuracy. Goal not met. Recommend continuing the goal. (P. Nair)'),
  H2('Goal 2 - Communication'),
  P('Progress report dated 11/14/2025: 2 turns with one prompt in 3 of 5 opportunities. Progressing. (L. Ford)'),
  P('Progress report dated 01/23/2026: 3 turns with one prompt in 3 of 5 opportunities. Progressing. (L. Ford)'),
  P('Progress report dated 03/06/2026: 3 turns without prompting in 4 of 5 opportunities. Goal met. (L. Ford)'),
])

await render('03_SAI_Service_Delivery_Log_Sep2025-Feb2026.pdf', [
  H1('RIVER OAK UNIFIED SCHOOL DISTRICT - SERVICE DELIVERY LOG'),
  P('Student: Jordan Rivera    Student ID: 4471-0093    Service: Specialized Academic Instruction - Reading'),
  P('IEP mandate: 240 minutes per week, small group (no more than 4), Special Education Classroom (IEP dated 09/08/2025).'),
  P('Log period: 09/08/2025 - 02/27/2026    Provider: Priya Nair, Education Specialist'),
  H2('Minutes delivered by week'),
  P('Week of 09/08/2025: 240. Week of 09/15/2025: 240. Week of 09/22/2025: 240. Week of 09/29/2025: 240.'),
  P('Week of 10/06/2025: 90 (small-group reading block discontinued pending staffing; SAI provided in the general education classroom during available periods). Week of 10/13/2025: 100. Week of 10/20/2025: 60. Week of 10/27/2025: 75.'),
  P('Week of 11/03/2025: 60. Week of 11/10/2025: 75. Week of 11/17/2025: 45 (minimum day schedule). Week of 11/24/2025: 0 (school closed 11/26-11/28; no sessions logged 11/24-11/25).'),
  P('Week of 12/01/2025: 100. Week of 12/08/2025: 60. Week of 12/15/2025: 75. Week of 12/22/2025: 30 (two-day week before winter recess). Week of 12/29/2025: winter recess, excluded.'),
  P('Week of 01/05/2026: 60. Week of 01/12/2026: 100. Week of 01/19/2026: 45 (holiday 01/19). Week of 01/26/2026: 75.'),
  P('Week of 02/02/2026: 60. Week of 02/09/2026: 100. Week of 02/16/2026: 45 (holiday 02/16). Week of 02/23/2026: 65.'),
  H2('Summary'),
  P('Instructional weeks logged: 24. Weeks at the full 240 minutes: 4. Average minutes delivered per week across the period: 95. Weeks below 240 minutes: 20.'),
  P('Note: The small-group reading block was discontinued on 10/06/2025 when the reading intervention position became vacant. The position remained unfilled as of 02/27/2026.'),
])

await render('04_Prior_Written_Notice_2026-03-12.pdf', [
  H1('RIVER OAK UNIFIED SCHOOL DISTRICT - PRIOR WRITTEN NOTICE'),
  P('Date of notice: March 12, 2026    Student: Jordan Rivera    Date of Birth: 11/03/2017    School: Willow Creek Elementary School'),
  P('Parent: Dana Rivera, 1418 Alder Street, Willow Creek, CA 95833'),
  P('IEP team meeting date: March 12, 2026 (parent-requested review)'),
  H2('1. Action refused'),
  P('The parent requested that the annual reading fluency goal (Goal 1 of the IEP dated September 8, 2025) be revised. The IEP team declined to revise the goal.'),
  H2('2. Explanation'),
  P('The team determined that the goal remains appropriate and that Jordan is making progress toward it, as reflected in the progress reports dated November 14, 2025, January 23, 2026 and March 6, 2026. The team will review the goal at the annual review in September 2026.'),
  H2('3. Other matters discussed'),
  P('The parent requested a reevaluation of Jordan\'s reading skills in writing on December 2, 2025. The District will provide an assessment plan.'),
  P('The parent raised the delivery of specialized academic instruction. The District acknowledges that the small-group reading block was discontinued in October 2025 owing to staffing and that specialized academic instruction has since been provided within the general education classroom. Compensatory services were not proposed at this meeting.'),
  H2('4. Evaluation procedures, records and reports relied upon'),
  P('IEP dated September 8, 2025; progress reports dated November 14, 2025, January 23, 2026 and March 6, 2026; teacher report (T. Okada); education specialist report (P. Nair).'),
  H2('5. Procedural safeguards'),
  P('A copy of the Notice of Procedural Safeguards is enclosed. You may request mediation or a due process hearing through the Office of Administrative Hearings.'),
  P('Marcus Ellison, Director of Special Education, River Oak Unified School District'),
])

await render('05_Correspondence_Dec2025-Apr2026.pdf', [
  H1('CORRESPONDENCE - RIVERA / RIVER OAK UNIFIED SCHOOL DISTRICT'),
  H2('From: Dana Rivera    To: Marcus Ellison    Date: December 2, 2025    Subject: Request for reevaluation - Jordan Rivera'),
  P('Dear Mr. Ellison, I am requesting in writing a reevaluation of Jordan\'s reading skills, including a full assessment of his phonological processing and decoding. His progress report of November 14, 2025 shows 21 words per minute, which is below where he started in August. Please send me the assessment plan. Thank you, Dana Rivera'),
  H2('From: Marcus Ellison    To: Dana Rivera    Date: December 4, 2025    Subject: RE: Request for reevaluation - Jordan Rivera'),
  P('Ms. Rivera, thank you for your request. The District will prepare an assessment plan for your consent within the required timeline. Regards, Marcus Ellison'),
  H2('From: Dana Rivera    To: Marcus Ellison    Date: March 14, 2026    Subject: Request to revise reading goal - Jordan Rivera'),
  P('Dear Mr. Ellison, following the meeting on March 12, I am requesting in writing that Jordan\'s reading fluency goal be revised based on his current level, and that the District provide the assessment plan I requested on December 2, 2025, which I have not received. Please respond in writing. Dana Rivera'),
  H2('From: Dana Rivera    To: Marcus Ellison    Date: April 2, 2026    Subject: RE: Request to revise reading goal - Jordan Rivera'),
  P('Mr. Ellison, I have not received a response to my March 14 request, and I still have not received an assessment plan. Dana Rivera'),
])

console.log('done')
