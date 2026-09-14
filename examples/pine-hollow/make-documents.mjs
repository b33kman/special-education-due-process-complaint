// Regenerates the synthetic Pine Hollow documents from scratch. Every name,
// date and figure below is fiction. The district, the school, the staff and
// the address do not exist.
//
//   npm install --no-save --no-package-lock pdf-lib && node make-documents.mjs
//
// Writes four PDFs into ./documents. Uses pdf-lib only here — the skill
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

await render('01_IEP_Pine_Hollow_2025-08-21.pdf', [
  H1('PINE HOLLOW COUNTY SCHOOLS'),
  H1('INDIVIDUALIZED EDUCATION PROGRAM'),
  H2('Student information'),
  P('Student: Okafor, Maya    Date of Birth: 04/19/2013    Grade: 7    Student ID: PH-208114'),
  P('Address: 72 Laurel Court, Pine Hollow, NC 27999'),
  P('Parent: Grace Okafor    Phone: (555) 010-2088    Email: grace.okafor@example.com'),
  P('School: Cedar Ridge Middle School    LEA: Pine Hollow County Schools'),
  P('Eligibility Category: Speech or Language Impairment    Initial Eligibility Date: 02/14/2020'),
  P('IEP Meeting Date: 08/21/2025    Meeting Purpose: Annual Review    Duration of IEP: 08/21/2025 to 08/20/2026'),
  H2('Present level of academic and functional performance'),
  P('Speech-Language: On the CELF-5 administered 05/06/2025, Maya obtained a Core Language Score of 71 (2nd percentile). Expressive Language Index 68; Receptive Language Index 79. In class, Maya produces sentences of four to six words, omits verb tense markers, and does not retell a paragraph-length passage in sequence. Teacher report: Maya does not raise her hand and gives one-word answers when called on.'),
  P('Parent input: The parent reports that Maya has become reluctant to speak in class and at home about school. The parent asks that speech-language therapy remain at the current level and that the district assess written expression, which was not assessed in May 2025.'),
  H2('Annual goals'),
  P('Goal 1 - Expressive Language. By 08/20/2026, given a picture sequence, Maya will retell a four-event narrative using complete sentences with correct past-tense verb forms in 4 of 5 trials, as measured by SLP data collection. Baseline (05/2025): 1 of 5 trials.'),
  P('Goal 2 - Classroom Participation. By 08/20/2026, Maya will respond to a teacher question with a complete sentence of five or more words in 8 of 10 opportunities across two class periods, as measured by teacher tally. Baseline: 2 of 10.'),
  H2('Special education and related services'),
  P('Speech-Language Therapy: 60 minutes per week, individual, provided by a licensed speech-language pathologist in the speech room, 08/21/2025 to 08/20/2026.'),
  P('Specially Designed Instruction - Written Expression: 45 minutes per week, small group, provided by an EC teacher in the resource room, 08/21/2025 to 08/20/2026.'),
  H2('Least restrictive environment'),
  P('Maya will be in the regular education setting for 92% of the school day. Removal is limited to speech-language therapy and resource instruction.'),
  '---',
  H2('IEP team'),
  P('Grace Okafor (Parent); Daniel Whitfield (LEA Representative, Assistant Principal); Ana Lucero, M.S., CCC-SLP (Speech-Language Pathologist); Robert Chen (EC Teacher); Kim Aldana (Regular Education Teacher, English Language Arts).'),
  H2('Prior written notice of the IEP team decisions'),
  P('The IEP team proposes to continue speech-language therapy at 60 minutes per week and to add 45 minutes per week of specially designed instruction in written expression. The team declined the parent\'s request to reevaluate written expression, on the basis that the 05/06/2025 evaluation is current and the added instruction addresses the concern. The parent may request an independent educational evaluation if the parent disagrees with the district\'s evaluation.'),
  P('The parent signed the IEP on 08/21/2025 and wrote: "I agree with the services. I still want written expression tested."'),
])

await render('02_Speech_Language_Service_Log_2025-2026.pdf', [
  H1('PINE HOLLOW COUNTY SCHOOLS - RELATED SERVICE LOG'),
  P('Student: Maya Okafor    Student ID: PH-208114    Service: Speech-Language Therapy'),
  P('IEP requirement: 60 minutes per week, individual, speech room (IEP dated 08/21/2025)'),
  P('Provider: Ana Lucero, M.S., CCC-SLP    Log period: 08/25/2025 through 01/30/2026'),
  H2('Sessions'),
  P('Week of 08/25/2025: 60 minutes, individual. Week of 09/01/2025: 60 minutes, individual. Week of 09/08/2025: 60 minutes, individual. Week of 09/15/2025: 60 minutes, individual.'),
  P('Week of 09/22/2025: 30 minutes, group of 3 (provider caseload reassigned; individual slot unavailable). Week of 09/29/2025: 30 minutes, group of 3. Week of 10/06/2025: 30 minutes, group of 3. Week of 10/13/2025: 30 minutes, group of 3.'),
  P('Week of 10/20/2025: 30 minutes, group of 3. Week of 10/27/2025: 0 (provider absent; no make-up scheduled). Week of 11/03/2025: 30 minutes, group of 3. Week of 11/10/2025: 30 minutes, group of 3.'),
  P('Week of 11/17/2025: 30 minutes, group of 3. Week of 11/24/2025: 0 (holiday week). Week of 12/01/2025: 30 minutes, group of 3. Week of 12/08/2025: 30 minutes, group of 3. Week of 12/15/2025: 30 minutes, group of 3. Week of 12/22/2025: 30 minutes, group of 3 (school in session 12/22-12/23).'),
  P('Week of 01/05/2026: 30 minutes, group of 3. Week of 01/12/2026: 30 minutes, group of 3. Week of 01/19/2026: 0 (provider absent; no make-up scheduled). Week of 01/26/2026: 30 minutes, group of 3.'),
  H2('Summary'),
  P('Weeks in period: 22. Weeks at 60 minutes individual: 4. Weeks at 30 minutes group: 15. Weeks with no service: 3. Total minutes delivered: 690. Total minutes required by the IEP for 22 weeks: 1,320.'),
  P('Note: Individual sessions ended the week of 09/22/2025 when the provider\'s caseload was reassigned. The IEP was not amended.'),
])

await render('03_Prior_Written_Notice_2025-12-04.pdf', [
  H1('PINE HOLLOW COUNTY SCHOOLS - PRIOR WRITTEN NOTICE'),
  P('Date: December 4, 2025    Student: Maya Okafor    Date of Birth: 04/19/2013    School: Cedar Ridge Middle School'),
  P('To: Grace Okafor, 72 Laurel Court, Pine Hollow, NC 27999'),
  H2('Action refused'),
  P('On November 10, 2025 the parent requested, in writing, an independent educational evaluation in the areas of speech-language and written expression at public expense, stating disagreement with the evaluation dated May 6, 2025. The district declines to fund an independent educational evaluation.'),
  H2('Explanation'),
  P('The district considers the May 6, 2025 evaluation to be appropriate. The district will conduct its own assessment of written expression during the spring 2026 reevaluation window.'),
  H2('Other options considered'),
  P('Funding an independent evaluation in speech-language only. Rejected because the district evaluation in that area is current.'),
  H2('Evaluation procedures, records and reports relied upon'),
  P('Speech-language evaluation dated May 6, 2025 (A. Lucero); IEP dated August 21, 2025; classroom work samples.'),
  H2('Procedural safeguards'),
  P('A copy of the Handbook on Parents\' Rights is enclosed. If you disagree with this decision you may request mediation, a facilitated IEP meeting, or a due process hearing through the North Carolina Office of Administrative Hearings.'),
  P('Daniel Whitfield, Assistant Principal, for Pine Hollow County Schools'),
])

await render('04_Correspondence_Nov2025-Feb2026.pdf', [
  H1('CORRESPONDENCE - OKAFOR / PINE HOLLOW COUNTY SCHOOLS'),
  H2('From: Grace Okafor    To: Daniel Whitfield    Date: November 10, 2025    Subject: Request for independent educational evaluation - Maya Okafor'),
  P('Mr. Whitfield, I disagree with the district\'s evaluation of May 6, 2025. It did not test written expression, and Maya\'s language scores do not match what I see at home. I am requesting an independent educational evaluation in speech-language and written expression at public expense. Please let me know the district\'s criteria and the next steps. Grace Okafor'),
  H2('From: Grace Okafor    To: Daniel Whitfield    Date: January 14, 2026    Subject: Speech therapy minutes - Maya Okafor'),
  P('Mr. Whitfield, Maya tells me her speech sessions are now with two other students and are half as long. Her IEP says 60 minutes a week, individual. Please send me the service log and tell me when individual sessions will resume. Grace Okafor'),
  H2('From: Daniel Whitfield    To: Grace Okafor    Date: January 21, 2026    Subject: RE: Speech therapy minutes - Maya Okafor'),
  P('Ms. Okafor, the speech-language service log is attached. Ms. Lucero\'s caseload was reassigned in September and individual sessions have not been available since. We expect to post a second SLP position this spring. Regards, Daniel Whitfield'),
  H2('From: Grace Okafor    To: Daniel Whitfield    Date: February 9, 2026    Subject: RE: Speech therapy minutes - Maya Okafor'),
  P('Mr. Whitfield, the log shows 690 minutes delivered against 1,320 required. I am asking the district to make up the missed minutes and to restore individual sessions now, not in the spring. I also have not received a response about the independent evaluation beyond the December 4 notice. Grace Okafor'),
])

console.log('done')
