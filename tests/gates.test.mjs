// The gates have to be able to fail. Each test copies the worked example,
// breaks one thing a model could plausibly get wrong, and asserts the
// script refuses it with the finding it should. Run from the repo root:
//
//   node --test tests/
//
// Needs `npm install` to have been run once in skills/dpc-complaint/scripts.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const scripts = join(root, 'skills', 'dpc-complaint', 'scripts')
const example = join(root, 'examples', 'river-oak')

function freshCase() {
  const dir = mkdtempSync(join(tmpdir(), 'dpc-gates-'))
  cpSync(join(example, 'documents'), join(dir, 'documents'), { recursive: true })
  cpSync(join(example, 'work'), join(dir, 'work'), { recursive: true })
  return dir
}
const run = (script, dir, ...args) => {
  const r = spawnSync(process.execPath, [join(scripts, `${script}.mjs`), dir, ...args], { encoding: 'utf8' })
  return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }
}
const json = (dir, name) => JSON.parse(readFileSync(join(dir, 'work', name), 'utf8'))
const save = (dir, name, value) => writeFileSync(join(dir, 'work', name), JSON.stringify(value, null, 2))
const text = (dir, name) => readFileSync(join(dir, 'work', name), 'utf8')
const saveText = (dir, name, value) => writeFileSync(join(dir, 'work', name), value)

test('the example passes every gate as shipped', () => {
  const dir = freshCase()
  assert.equal(run('pdf-text', dir).code, 0)
  assert.equal(run('verify-readings', dir).code, 0)
  assert.equal(run('check-draft', dir).code, 0)
  const gates = run('run-gates', dir)
  assert.equal(gates.code, 0, gates.out)
  assert.match(gates.out, /status: FINAL/)
  rmSync(dir, { recursive: true, force: true })
})

// ─── verify-readings ───────────────────────────────────────────────────
test('a reading that paraphrases the page is refused', () => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  readings.find((r) => r.id === 'R22').value = 'Jordan will increase oral reading fluency to 65 words per minute'
  save(dir, 'readings.json', readings)
  const r = run('verify-readings', dir)
  assert.equal(r.code, 1)
  assert.match(r.out, /R22 .* not-found/)
  rmSync(dir, { recursive: true, force: true })
})

test('a reading with the wrong page number is refused and told where the text is', () => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  readings.find((r) => r.id === 'R25').page = 1
  save(dir, 'readings.json', readings)
  const r = run('verify-readings', dir)
  assert.equal(r.code, 1)
  assert.match(r.out, /R25 .* wrong-page — the text is on page 2/)
  rmSync(dir, { recursive: true, force: true })
})

test('a reading shorter than four characters must carry the words around it', () => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  delete readings.find((r) => r.id === 'R4').context
  save(dir, 'readings.json', readings)
  const r = run('verify-readings', dir)
  assert.equal(r.code, 1)
  assert.match(r.out, /R4 .* invalid — a value of fewer than 4 characters needs a "context"/)
  rmSync(dir, { recursive: true, force: true })
})

test('a short reading whose context is not on the page is refused', () => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  readings.find((r) => r.id === 'R4').context = 'Grade: 3 (retained)'
  save(dir, 'readings.json', readings)
  const r = run('verify-readings', dir)
  assert.equal(r.code, 1)
  assert.match(r.out, /R4 .* not-found/)
  rmSync(dir, { recursive: true, force: true })
})

test('a date "corrected" into another format is refused', () => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  readings.find((r) => r.id === 'R18').value = 'September 8, 2025'
  save(dir, 'readings.json', readings)
  assert.equal(run('verify-readings', dir).code, 1)
  rmSync(dir, { recursive: true, force: true })
})

// ─── confirm ───────────────────────────────────────────────────────────
test('confirm refuses to confirm a reading the verifier did not pass', () => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  readings.push({ id: 'R99', docId: '02_Progress_Reports_2025-2026', page: 1, field: 'progress.narrative', value: 'Progress report dated 04/30/2026: 40 words per minute.' })
  save(dir, 'readings.json', readings)
  run('verify-readings', dir)
  save(dir, 'decisions.json', { R99: 'confirmed' })
  const r = run('confirm', dir, '--decisions')
  assert.equal(r.code, 1)
  assert.match(r.out, /R99 cannot be confirmed/)
  rmSync(dir, { recursive: true, force: true })
})

// ─── check-draft ───────────────────────────────────────────────────────
const draftCase = (mutate) => {
  const dir = freshCase()
  saveText(dir, 'statement.annotated.md', mutate(text(dir, 'statement.annotated.md')))
  return dir
}
const expectDraftError = (dir, code) => {
  const r = run('check-draft', dir)
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, new RegExp(`\\[${code}\\]`), r.out)
  rmSync(dir, { recursive: true, force: true })
}

test('an invented date is refused', () => {
  expectDraftError(draftCase((s) => s.replace('On March 12, 2026 the IEP team declined', 'On March 19, 2026 the IEP team declined')), 'date-not-in-sources')
})
test('an invented figure is refused', () => {
  expectDraftError(draftCase((s) => s.replace('an average of 95 minutes', 'an average of 85 minutes')), 'number-not-in-sources')
})
test('arithmetic the sources do not state is refused', () => {
  expectDraftError(draftCase((s) => s.replace('and 20 weeks below 240 minutes. [R34][R35]', 'and 20 weeks below 240 minutes, a shortfall of 145 minutes per week. [R34][R35]')), 'number-not-in-sources')
})
test('a form code is a name, not a figure', () => {
  const dir = draftCase((s) => s.replace('recommends continuing it. [R29][R30][R31]', 'recommends continuing it, on the District\'s Form PH-77. [R29][R30][R31]'))
  const r = run('check-draft', dir)
  assert.equal(r.code, 0, r.out)
  rmSync(dir, { recursive: true, force: true })
})
test('a sentence with no source tag is refused', () => {
  expectDraftError(draftCase((s) => s + '\nThe District never answered the Parent.\n'), 'untagged')
})
test('a tag naming no reading is refused', () => {
  expectDraftError(draftCase((s) => s.replace('[R48][R49][R50][R51]', '[R48][R49][R50][R77]')), 'unknown-tag')
})
test('a rejected reading cannot be cited', () => {
  const dir = draftCase((s) => s)
  const confirmed = json(dir, 'confirmed.json')
  confirmed.find((r) => r.id === 'R35').status = 'rejected'
  save(dir, 'confirmed.json', confirmed)
  expectDraftError(dir, 'unconfirmed-source')
})
test('a quotation not word for word in a reading is refused', () => {
  expectDraftError(draftCase((s) => s.replace('recommends continuing it. [R29][R30][R31]', 'recommends "continuing the current goal with fidelity." [R29][R30][R31]')), 'quote-not-in-sources')
})
test('first person is refused', () => {
  expectDraftError(draftCase((s) => s.replace('The Parent requested revision in writing', 'I requested revision in writing')), 'voice')
})
test('a legal conclusion is refused', () => {
  expectDraftError(draftCase((s) => s.replace('The log records that the small-group', 'In violation of the IEP, the log records that the small-group')), 'legal-standard')
})
test('a citation inside the facts is refused', () => {
  expectDraftError(draftCase((s) => s.replace('The September 8, 2025 IEP provides for', 'Under 34 C.F.R. § 300.323, the September 8, 2025 IEP provides for')), 'citation')
})
test('outcome language is refused', () => {
  expectDraftError(draftCase((s) => s.replace('recommends continuing it. [R29][R30][R31]', 'recommends continuing it, and a hearing officer would likely find the goal inadequate. [R29][R30][R31]')), 'outcome')
})
test("the student's given name is refused", () => {
  expectDraftError(draftCase((s) => s.replace('providing that Student will increase', 'providing that Jordan will increase')), 'named')
})
test('a repeated sentence is refused', () => {
  expectDraftError(draftCase((s) => s.replace('On December 4, 2025 the District wrote that it would prepare an assessment plan for the Parent\'s consent within the required timeline. [R46][R47]', 'On December 4, 2025 the District wrote that it would prepare an assessment plan for the Parent\'s consent within the required timeline. [R46][R47] On December 4, 2025 the District wrote that an assessment plan would be prepared for the Parent\'s consent within the required timeline. [R46][R47]')), 'repetition')
})
test('a chronology entry is held to the same rules as the statement', () => {
  const dir = freshCase()
  const c = json(dir, 'case.json')
  c.events.push({ id: 'E11', date: '2026-04-09', what: 'The District held an IEP meeting on April 9, 2026 without the Parent.', sources: ['R39'] })
  save(dir, 'case.json', c)
  const r = run('check-draft', dir)
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, /\[date-not-in-sources\][^\n]*\n[^\n]*Facts \(E11\)/)
  rmSync(dir, { recursive: true, force: true })
})
test('a chronology entry with no source is refused before it can print', () => {
  const dir = validateCase((c) => { c.events.push({ id: 'E11', date: '2026-04-09', what: 'The District did nothing further about the assessment plan.', sources: [] }) })
  const r = run('run-gates', dir)
  assert.notEqual(r.code, 0, r.out)
  assert.match(r.out, /\[untagged\][^\n]*\n[^\n]*Facts \(E11\)/)
  assert.match(r.out, /Stopped at check-draft/)
  rmSync(dir, { recursive: true, force: true })
})
test('the statement of facts prints the chronology in date order, and the date of birth prints with the address', () => {
  const dir = validateCase((c) => { const [first, ...rest] = c.events; c.events = [...rest, first] })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  const complaint = readFileSync(join(dir, 'complaint.md'), 'utf8')
  assert.match(complaint, /## III\. Statement of facts\n\n4\. On September 8, 2025, the IEP team adopted the annual reading fluency goal/)
  assert.match(complaint, /On October 6, 2025, the small-group reading block was discontinued/)
  assert.match(complaint, /## IV\. Statement of the problems/)
  assert.match(complaint, /3\. Student was born on November 3, 2017, resides with the Parent at 1418 Alder Street/)
  assert.ok(complaint.indexOf('On September 8, 2025, the IEP team') < complaint.indexOf('On October 6, 2025, the small-group'), 'facts in date order')
  rmSync(dir, { recursive: true, force: true })
})
test('several remedies print as lettered sub-paragraphs under a lead-in; one remedy is a sentence', () => {
  const dir = validateCase(null)
  assert.equal(run('run-gates', dir).code, 0)
  const complaint = readFileSync(join(dir, 'complaint.md'), 'utf8')
  assert.match(complaint, /\d+\. The Parent proposes the following resolution:\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(a\) convene an IEP team meeting within 15 days[^\n]*;\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(b\) fund an independent educational evaluation[^\n]*;\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(c\) provide compensatory[^\n]*; and\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(d\) implement the IEP as written[^\n]*\.\n/)
  const html = readFileSync(join(dir, 'complaint.html'), 'utf8')
  assert.match(html, /<p class="relief"><span class="l">\(a\)<\/span>convene an IEP team meeting/)
  rmSync(dir, { recursive: true, force: true })
  const one = validateCase((c) => { c.relief = c.relief.slice(1, 2) })
  assert.equal(run('run-gates', one).code, 0)
  assert.match(readFileSync(join(one, 'complaint.md'), 'utf8'), /\d+\. The Parent proposes the following resolution: fund an independent educational evaluation in reading and written expression\.\n/)
  rmSync(one, { recursive: true, force: true })
})
test("counsel's fees reservation prints as the last remedy in its fixed wording, and warns on a pro se filing", () => {
  const counsel = { type: 'counsel', counsel: { name: 'A. Example', barNumber: '12345', barJurisdiction: 'California', firmName: 'Example LLP', firmAddress: '1 Main Street, Sacramento, CA 95814', firmPhone: '(555) 010-0000', firmEmail: 'a@example.com' } }
  const dir = validateCase((c) => { c.representation = counsel; c.relief.push({ id: 'attorneys-fees', detail: '', sources: [] }) })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.doesNotMatch(r.out, /relief-counsel-only/)
  assert.match(readFileSync(join(dir, 'complaint.md'), 'utf8'), /\(e\) Reservation of the Parent’s right to seek reasonable attorneys’ fees and costs under 20 U\.S\.C\. § 1415\(i\)\(3\)\(B\)\.\n/)
  rmSync(dir, { recursive: true, force: true })
  const proSe = validateCase((c) => { c.relief.push({ id: 'attorneys-fees', detail: '', sources: [] }) })
  const r2 = run('run-gates', proSe)
  assert.equal(r2.code, 0, r2.out)
  assert.match(r2.out, /\[relief-counsel-only\]/)
  rmSync(proSe, { recursive: true, force: true })
})
test('requests concerning the hearing print only when asked for, and an expedited request without a discipline claim warns', () => {
  const dir = validateCase((c) => { c.mediation = 'requested'; c.expedited = true; c.hearing = { interpreter: { value: 'Spanish', source: 'typed' }, accommodations: null } })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /\[expedited-without-discipline\]/)
  const complaint = readFileSync(join(dir, 'complaint.md'), 'utf8')
  assert.match(complaint, /## VI\. Requests concerning the hearing\n\n\d+\. The Parent requests mediation under 34 C\.F\.R\. § 300\.506 concurrently with this due process complaint\.\n\n\d+\. The Parent requests an expedited due process hearing under 34 C\.F\.R\. § 300\.532\(c\)\.\n\n\d+\. The Parent requires an interpreter for the hearing \(Spanish\)\.\n/)
  rmSync(dir, { recursive: true, force: true })
  const none = validateCase(null)
  run('run-gates', none)
  assert.doesNotMatch(readFileSync(join(none, 'complaint.md'), 'utf8'), /Requests concerning the hearing/)
  rmSync(none, { recursive: true, force: true })
})
test('two parents file together: the caption, the defined term, the verbs and two signature lines', () => {
  const dir = validateCase((c) => { c.parent.second = { first: { value: 'Sam', source: 'typed' }, last: { value: 'Rivera', source: 'typed' } } })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  const complaint = readFileSync(join(dir, 'complaint.md'), 'utf8')
  assert.match(complaint, /JORDAN RIVERA, a minor, by and through the parents, DANA RIVERA AND SAM RIVERA,/)
  assert.match(complaint, /by the parents, Dana Rivera and Sam Rivera \(“Parents”\), who are self-represented/)
  assert.match(complaint, /resides with the Parents at/)
  assert.match(complaint, /The Parents propose the following resolution:/)
  assert.match(complaint, /The Parents certify that on the date/)
  assert.match(complaint, /Dana Rivera\n\nParent of Jordan Rivera\n\n______+\n\nSam Rivera\n\nParent of Jordan Rivera\n\nSelf-represented \(pro se\)/)
  assert.match(readFileSync(join(dir, 'sources.md'), 'utf8'), /## The Parents’ statements of fact/)
  rmSync(dir, { recursive: true, force: true })
})
test("a claim outside the catalogue prints the person's heading and regulation, and blocks without a heading", () => {
  const dir = validateCase((c) => { c.claims.push({ id: 'other', heading: 'Failure to provide the Parent a copy of the assessment plan', clause: 'failing to provide the Parent a copy of the assessment plan', cfr: 'Cal. Educ. Code § 56321', isProcedural: false }) })
  const sectionD = '\nD.\nOn August 29, 2025 Student read 22 words per minute on a first-grade passage with 86% accuracy on the DIBELS 8 measure. [R19]\n'
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md') + sectionD)
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  const complaint = readFileSync(join(dir, 'complaint.md'), 'utf8')
  assert.match(complaint, /### D\. Failure to provide the Parent a copy of the assessment plan\n\n\*Cal\. Educ\. Code § 56321\.\*/)
  assert.match(complaint, /and by failing to provide the Parent a copy of the assessment plan\./)
  rmSync(dir, { recursive: true, force: true })
  const bare = validateCase((c) => { c.claims.push({ id: 'other' }) })
  saveText(bare, 'statement.annotated.md', text(bare, 'statement.annotated.md') + sectionD)
  const r2 = run('run-gates', bare)
  assert.notEqual(r2.code, 0)
  assert.match(r2.out, /claim "other" carries no heading/)
  rmSync(bare, { recursive: true, force: true })
})
test('a section missing for a claim is refused', () => {
  expectDraftError(draftCase((s) => s.slice(0, s.indexOf('C.'))), 'sections')
})

// ─── validate (through run-gates) ──────────────────────────────────────
const validateCase = (mutateCase, mutateState) => {
  const dir = freshCase()
  if (mutateCase) { const c = json(dir, 'case.json'); mutateCase(c); save(dir, 'case.json', c) }
  if (mutateState) { const st = json(dir, 'state.json'); mutateState(st); save(dir, 'state.json', st) }
  return dir
}
const expectBlocking = (dir, code) => {
  const r = run('run-gates', dir)
  assert.notEqual(r.code, 0, r.out)
  assert.match(r.out, new RegExp(`\\[${code}\\]`), r.out)
  assert.match(r.out, /DRAFT — NOT FOR FILING/)
  rmSync(dir, { recursive: true, force: true })
}

test('a missing ZIP code blocks', () => {
  expectBlocking(validateCase((c) => { c.student.address.postalCode = null }), 'missing')
})
test('a caption fact with no source blocks', () => {
  expectBlocking(validateCase((c) => { c.student.school = { value: 'Willow Creek Elementary School' } }), 'unsourced')
})
test('a caption fact citing an unconfirmed reading blocks', () => {
  const dir = validateCase((c) => { c.student.dob = { value: '11/03/2017', source: 'R3' } })
  const confirmed = json(dir, 'confirmed.json')
  confirmed.find((r) => r.id === 'R3').status = 'rejected'
  save(dir, 'confirmed.json', confirmed)
  expectBlocking(dir, 'unconfirmed')
})
test('a state field with no web source blocks', () => {
  expectBlocking(validateCase(null, (st) => { st.limitationsMonths = { value: 24, sources: [] } }), 'state-unsourced')
})
test('no relief blocks', () => {
  expectBlocking(validateCase((c) => { c.relief = [] }), 'resolution-missing')
})
test('a claim with no facts under it blocks with a placeholder', () => {
  const dir = validateCase((c) => { c.claims.push({ id: 'esy', impact: null }) })
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md') + '\nD.\n')
  expectBlocking(dir, 'placeholder')
})
test("an attorney signature without a bar number blocks", () => {
  expectBlocking(validateCase((c) => { c.representation = { type: 'counsel', counsel: { name: 'A. Example', barNumber: '', firmName: 'Example LLP', firmAddress: '1 Main St' } } }), 'signature-incomplete')
})
test('a state-required item with a figure not in its sources blocks', () => {
  expectBlocking(validateCase((c) => { c.additionalContents = [{ heading: 'Student ID', text: '4471-0094', sources: ['R5'] }] }), 'number-not-in-sources')
})
test('an event outside the limitations window is a warning that names the state rule, not a block', () => {
  const dir = validateCase((c) => { c.events.push({ id: 'E11', date: '2023-01-10', what: 'An old event.', sources: ['R17'] }) })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /\[outside-limitations\] event E11 .* the window is 24 months \(California’s rule as stated at .*56505/)
  assert.match(r.out, /status: FINAL/)
  rmSync(dir, { recursive: true, force: true })
})
test('a planned filing date already past is a warning; a future one is not', () => {
  const past = validateCase(null)
  const r1 = run('run-gates', past)
  assert.equal(r1.code, 0, r1.out)
  assert.match(r1.out, /\[filing-date-past\] the planned filing date 2026-04-17 is earlier than today/)
  rmSync(past, { recursive: true, force: true })
  const future = validateCase((c) => { c.filingDate = '2099-01-01' })
  const r2 = run('run-gates', future)
  assert.equal(r2.code, 0, r2.out)
  assert.doesNotMatch(r2.out, /filing-date-past/)
  rmSync(future, { recursive: true, force: true })
})
test('a state-required item left blank is a warning, and FINAL says so', () => {
  const dir = validateCase((c) => { c.additionalContents = [{ heading: 'County of residence', text: '____________', sources: ['S1'] }] })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /\[blank-item\] state-required item 1 \(County of residence\) is left blank/)
  assert.match(r.out, /status: FINAL/)
  rmSync(dir, { recursive: true, force: true })
})
test('a chosen respondent prints in the caption with its source, and an unsourced one blocks', () => {
  const dir = validateCase((c) => { c.student.respondent = { value: 'River Oak Unified School District Board of Education', source: 'typed' } })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  const complaint = readFileSync(join(dir, 'complaint.md'), 'utf8')
  assert.match(complaint, /RIVER OAK UNIFIED SCHOOL DISTRICT BOARD OF EDUCATION,\n/)
  assert.match(complaint, /for which the River Oak Unified School District Board of Education is the responsible local educational agency and the respondent here/)
  rmSync(dir, { recursive: true, force: true })
  expectBlocking(validateCase((c) => { c.student.respondent = { value: 'Some Board' } }), 'unsourced')
})
test('a pro se report never calls the parent counsel, and tells her how to file', () => {
  const dir = validateCase(null)
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  for (const f of ['sources.md', 'verification-report.md']) {
    const text = readFileSync(join(dir, f), 'utf8')
    assert.doesNotMatch(text, /\bcounsel/i, `${f} says counsel`)
  }
  const report = readFileSync(join(dir, 'verification-report.md'), 'utf8')
  assert.match(report, /## How to file in California/)
  assert.match(report, /\*\*Address:\*\* Office of Administrative Hearings, Attention: Special Education Division, 2349 Gateway Oaks Drive/)
  assert.match(report, /\*\*Required beyond § 300\.508\(b\):\*\* nothing beyond 34 C\.F\.R\. § 300\.508\(b\)/)
  assert.match(readFileSync(join(dir, 'sources.md'), 'utf8'), /## The Parent’s statements of fact/)
  rmSync(dir, { recursive: true, force: true })
})
test('a home address in another state is a warning', () => {
  const dir = validateCase((c) => { c.student.address.state = { value: 'NV', source: 'counsel' } })
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /\[filing-state-mismatch\]/)
  rmSync(dir, { recursive: true, force: true })
})
