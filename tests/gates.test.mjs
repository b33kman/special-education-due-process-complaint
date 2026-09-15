// The gates have to be able to fail. Each test copies a worked example,
// breaks one thing a model could plausibly get wrong, and asserts the
// script refuses it with the finding it should — an ERROR (✗), not a
// warning (!) — or, where a warning is the right answer, that the run still
// passes and says so. A few pin the printed form. Run from the repo root:
//
//   node --test tests/*.test.mjs
//
// Needs `npm install` to have been run once in skills/dpc-complaint/scripts.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const scripts = join(root, 'skills', 'dpc-complaint', 'scripts')
const example = join(root, 'examples', 'river-oak')
const counselExample = join(root, 'examples', 'pine-hollow')

function freshCase(from = example) {
  const dir = mkdtempSync(join(tmpdir(), 'dpc-gates-'))
  cpSync(join(from, 'documents'), join(dir, 'documents'), { recursive: true })
  cpSync(join(from, 'work'), join(dir, 'work'), { recursive: true })
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
const deliverable = (dir, name) => readFileSync(join(dir, name), 'utf8')
// An error line reads "✗ [code]"; a warning line reads "! [code]". A guard
// that only looked for "[code]" could not tell the two apart.
const error = (out, code) => assert.match(out, new RegExp(`✗ \\[${code}\\]`), `expected an error [${code}] in:\n${out}`)
const warning = (out, code) => assert.match(out, new RegExp(`! \\[${code}\\]`), `expected a warning [${code}] in:\n${out}`)
const noFinding = (out, code) => assert.doesNotMatch(out, new RegExp(`\\[${code}\\]`), `unexpected [${code}] in:\n${out}`)

// One entry of a .docx (a zip), by name, read through the central directory.
function zipEntry(buf, name) {
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    const nameLen = buf.readUInt16LE(off + 28), extraLen = buf.readUInt16LE(off + 30), commentLen = buf.readUInt16LE(off + 32)
    const entryName = buf.toString('utf8', off + 46, off + 46 + nameLen)
    const method = buf.readUInt16LE(off + 10), compSize = buf.readUInt32LE(off + 20), localOff = buf.readUInt32LE(off + 42)
    if (entryName === name) {
      const start = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28)
      const data = buf.subarray(start, start + compSize)
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8')
    }
    off += 46 + nameLen + extraLen + commentLen
  }
  return null
}
const docxXml = (dir, entry = 'word/document.xml') => zipEntry(readFileSync(join(dir, 'complaint.docx')), entry)
const pdfjs = await import(pathToFileURL(join(scripts, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href)
async function pdfPages(dir) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'complaint.pdf'))), useSystemFonts: true, isEvalSupported: false }).promise
  const pages = []
  for (let n = 1; n <= doc.numPages; n++) pages.push((await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' '))
  return pages
}

// ─── The examples as shipped ───────────────────────────────────────────
test('the pro se example passes every gate as shipped and renders the three files', async () => {
  const dir = freshCase()
  assert.equal(run('pdf-text', dir).code, 0)
  assert.equal(run('verify-readings', dir).code, 0)
  assert.equal(run('verify-state', dir, '--offline').code, 0)
  const gates = run('run-gates', dir)
  assert.equal(gates.code, 0, gates.out)
  assert.match(gates.out, /status: FINAL/)
  assert.match(gates.out, /All gates passed/)
  for (const f of ['complaint.pdf', 'complaint.docx', 'complaint.md', 'sources.md', 'verification-report.md']) assert.ok(existsSync(join(dir, f)), `${f} missing`)
  assert.ok(!existsSync(join(dir, 'complaint.html')), 'no HTML is produced')
  const pages = await pdfPages(dir)
  assert.ok(pages.length >= 4, `${pages.length} pages`)
  assert.match(pages[0], /BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS/)
  assert.match(pages[0], /STATE OF CALIFORNIA/)
  assert.match(pages[0], /Petitioner,/)
  assert.match(pages.at(-1), /CERTIFICATE OF SERVICE/)
  assert.doesNotMatch(pages.join(' '), /DRAFT — NOT FOR FILING/)
  const xml = docxXml(dir)
  assert.match(xml, /<w:tbl>/, 'the caption is a table')
  assert.match(xml, /BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS/)
  assert.match(xml, /Respectfully submitted,/)
  assert.match(docxXml(dir, 'word/footer1.xml') ?? '', /PAGE/, 'a page-number field in the footer')
  assert.doesNotMatch(deliverable(dir, 'complaint.md'), /DRAFT — NOT FOR FILING/)
  rmSync(dir, { recursive: true, force: true })
})

test('the counsel example passes with exactly its two warnings, and prints the county, the board, the reservation and the state item', () => {
  const dir = freshCase(counselExample)
  assert.equal(run('verify-state', dir, '--offline').code, 0)
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /status: FINAL/)
  warning(r.out, 'filing-date-past')
  warning(r.out, 'outside-limitations')
  noFinding(r.out, 'blank-item')
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /^BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS\n\nSTATE OF NORTH CAROLINA\n\nCOUNTY OF PINE HOLLOW\n/)
  assert.match(complaint, /PINE HOLLOW COUNTY BOARD OF EDUCATION,\n/)
  assert.match(complaint, /&nbsp;&nbsp;&nbsp;&nbsp;\(c\) restoration of individual speech-language therapy[^\n]*\.\n\n\d+\. The Parent reserves the right to seek reasonable attorneys’ fees and costs under 20 U\.S\.C\. § 1415\(i\)\(3\)\(B\)\.\n/)
  assert.match(complaint, /## VI\. Additional information required in North Carolina\n\n\d+\. Basis of the petition/)
  assert.doesNotMatch(complaint, /County of the student/)
  assert.match(complaint, /served on the Superintendent of the Pine Hollow County Board of Education and the North Carolina Department of Public Instruction, 6356 Mail Service Center/)
  assert.match(complaint, /Bar No\. 61042 \(North Carolina\)/)
  const sources = deliverable(dir, 'sources.md')
  assert.match(sources, /## What rests on counsel’s statement alone\n\n[\s\S]*The District did not file for a hearing/)
  assert.match(sources, /typed: entered by counsel; not read from any document/)
  rmSync(dir, { recursive: true, force: true })
})

// ─── verify-readings ───────────────────────────────────────────────────
const readingsCase = (mutate) => {
  const dir = freshCase()
  run('pdf-text', dir)
  const readings = json(dir, 'readings.json')
  mutate(readings)
  save(dir, 'readings.json', readings)
  return dir
}
const expectReadingRefused = (dir, pattern) => {
  const r = run('verify-readings', dir)
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, pattern, r.out)
  rmSync(dir, { recursive: true, force: true })
}
test('a reading that paraphrases the page is refused', () => {
  expectReadingRefused(readingsCase((rs) => { rs.find((r) => r.id === 'R22').value = 'Jordan will increase oral reading fluency to 65 words per minute' }), /R22 .* not-found/)
})
test('a reading with the wrong page number is refused and told where the text is', () => {
  expectReadingRefused(readingsCase((rs) => { rs.find((r) => r.id === 'R25').page = 1 }), /R25 .* wrong-page — the text is on page 2/)
})
test('a reading shorter than five characters must carry the words around it', () => {
  expectReadingRefused(readingsCase((rs) => { delete rs.find((r) => r.id === 'R4').context }), /R4 .* invalid — a value of fewer than 5 characters, or a bare number of fewer than 8, needs a "context"/)
})
test('a bare number — a year — must carry its context too', () => {
  expectReadingRefused(readingsCase((rs) => { rs.push({ id: 'R99', docId: '01_IEP_River_Oak_2025-09-08', page: 1, field: 'iep.date', value: '2025' }) }), /R99 .* invalid — a value of fewer than 5 characters, or a bare number/)
})
test('a short reading whose context is not on the page is refused', () => {
  expectReadingRefused(readingsCase((rs) => { rs.find((r) => r.id === 'R4').context = 'Grade: 3 (retained)' }), /R4 .* not-found/)
})
test('a date "corrected" into another format is refused', () => {
  expectReadingRefused(readingsCase((rs) => { rs.find((r) => r.id === 'R18').value = 'September 8, 2025' }), /R18 .* not-found/)
})
test('a figure that is the tail of the page’s figure does not verify ("40 minutes" on a page that says "240 minutes")', () => {
  expectReadingRefused(readingsCase((rs) => { rs.push({ id: 'R99', docId: '01_IEP_River_Oak_2025-09-08', page: 1, field: 'iep.services', value: '40 minutes per week, delivered in a small-group setting' }) }), /R99 .* not-found/)
})

// ─── confirm ───────────────────────────────────────────────────────────
test('confirm refuses to confirm, or to edit, a reading the verifier did not find', () => {
  const dir = readingsCase((rs) => { rs.push({ id: 'R99', docId: '02_Progress_Reports_2025-2026', page: 1, field: 'progress.narrative', value: 'Progress report dated 04/30/2026: 40 words per minute.' }) })
  run('verify-readings', dir)
  save(dir, 'decisions.json', { R99: 'confirmed' })
  const r = run('confirm', dir, '--decisions')
  assert.equal(r.code, 1)
  assert.match(r.out, /R99 cannot be confirmed/)
  save(dir, 'decisions.json', { R99: { edit: 'Progress report dated 04/30/2026: 40 words per minute.' } })
  const r2 = run('confirm', dir, '--decisions')
  assert.equal(r2.code, 1)
  assert.match(r2.out, /R99 cannot be edited: verification status is not-found/)
  rmSync(dir, { recursive: true, force: true })
})

// ─── check-draft ───────────────────────────────────────────────────────
const draftCase = (mutate) => {
  const dir = freshCase()
  saveText(dir, 'statement.annotated.md', mutate(text(dir, 'statement.annotated.md')))
  return dir
}
const caseWith = (mutateCase) => {
  const dir = freshCase()
  const c = json(dir, 'case.json')
  mutateCase(c)
  save(dir, 'case.json', c)
  return dir
}
const expectDraftError = (dir, code, where) => {
  const r = run('check-draft', dir)
  assert.equal(r.code, 1, r.out)
  error(r.out, code)
  // `where` is looked for on the finding's line or the one under it (the sentence).
  if (where) assert.match(r.out, new RegExp(`\\[${code}\\][^\\n]*(?:\\n[^\\n]*)?${where}`), r.out)
  rmSync(dir, { recursive: true, force: true })
}
const expectDraftPasses = (dir) => {
  const r = run('check-draft', dir)
  assert.equal(r.code, 0, r.out)
  rmSync(dir, { recursive: true, force: true })
  return r.out
}

test('an invented date is refused', () => {
  expectDraftError(draftCase((s) => s.replace('On March 12, 2026 the IEP team declined', 'On March 19, 2026 the IEP team declined')), 'date-not-in-sources')
})
test('a date written in another form is refused as a date, not passed as a figure', () => {
  expectDraftError(draftCase((s) => s.replace('On March 12, 2026 the IEP team declined', 'On Mar. 12, 2025 the IEP team declined')), 'date-form')
})
test('a month no source states is refused', () => {
  expectDraftError(draftCase((s) => s.replace('On March 12, 2026 the IEP team declined', 'In February 2026 the IEP team declined')), 'month-not-in-sources')
})
test('an invented figure is refused', () => {
  expectDraftError(draftCase((s) => s.replace('an average of 95 minutes', 'an average of 85 minutes')), 'number-not-in-sources')
})
test('a figure with a unit the source does not give is refused', () => {
  expectDraftError(draftCase((s) => s.replace('an average of 95 minutes', 'an average of 95% of the minutes')), 'number-not-in-sources')
})
test('arithmetic the sources do not state is refused', () => {
  expectDraftError(draftCase((s) => s.replace('and 20 weeks below 240 minutes. [R34][R35]', 'and 20 weeks below 240 minutes, a shortfall of 145 minutes per week. [R34][R35]')), 'number-not-in-sources')
})
test('arithmetic in words is refused', () => {
  expectDraftError(draftCase((s) => s.replace('and 20 weeks below 240 minutes. [R34][R35]', 'and 20 weeks below 240 minutes, less than half of the minutes required. [R34][R35]')), 'arithmetic-in-words')
})
test('a form code is a name, not a figure', () => {
  expectDraftPasses(draftCase((s) => s.replace('recommends continuing it. [R29][R30][R31]', 'recommends continuing it, on the District\'s Form PH-77. [R29][R30][R31]')))
})
test('a sentence with no source tag is refused', () => {
  expectDraftError(draftCase((s) => s + '\nThe District never answered the Parent.\n'), 'untagged')
})
test('a sentence that trails off is refused', () => {
  expectDraftError(draftCase((s) => s + '\nThe District never answered the Parent… [R1]\n'), 'unfinished')
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
test('a confirmed reading the verifier did not find on its page cannot be cited', () => {
  const dir = draftCase((s) => s)
  const confirmed = json(dir, 'confirmed.json')
  confirmed.find((r) => r.id === 'R35').verification = 'not-found'
  save(dir, 'confirmed.json', confirmed)
  expectDraftError(dir, 'unconfirmed-source', 'verification not-found')
})
test('a quotation not word for word in a reading is refused', () => {
  expectDraftError(draftCase((s) => s.replace('recommends continuing it. [R29][R30][R31]', 'recommends "continuing the current goal with fidelity." [R29][R30][R31]')), 'quote-not-in-sources')
})
test('a quotation in single quotes is checked too', () => {
  expectDraftError(draftCase((s) => s.replace('recommends continuing it. [R29][R30][R31]', "recommends 'continuing the current goal with fidelity' for the year. [R29][R30][R31]")), 'quote-not-in-sources')
})
test('first person is refused', () => {
  expectDraftError(draftCase((s) => s.replace('The Parent requested revision in writing', 'I requested revision in writing')), 'voice')
})
test('advice to the reader is refused', () => {
  expectDraftError(draftCase((s) => s.replace('The Parent requested revision in writing', 'The Parent should request revision in writing')), 'advice')
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
test('a student named after a month is not named by a date', () => {
  const out = expectDraftPasses(caseWith((c) => { c.student.first = { value: 'March', source: 'typed' } }))
  noFinding(out, 'named')
})
test('a repeated sentence is refused', () => {
  expectDraftError(draftCase((s) => s.replace('On December 4, 2025 the District wrote that it would prepare an assessment plan for the Parent\'s consent within the required timeline. [R46][R47]', 'On December 4, 2025 the District wrote that it would prepare an assessment plan for the Parent\'s consent within the required timeline. [R46][R47] On December 4, 2025 the District wrote that an assessment plan would be prepared for the Parent\'s consent within the required timeline. [R46][R47]')), 'repetition')
})
test('a section missing for a claim is refused', () => {
  expectDraftError(draftCase((s) => s.slice(0, s.indexOf('C.'))), 'sections')
})
test('the same claim twice is refused', () => {
  const dir = caseWith((c) => { c.claims.push({ id: 'inadequate-iep', impact: null }) })
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md') + '\nD.\nOn August 29, 2025 Student read 22 words per minute on a first-grade passage with 86% accuracy on the DIBELS 8 measure. [R19]\n')
  expectDraftError(dir, 'duplicate-claim')
})
test('the same event id twice is refused', () => {
  expectDraftError(caseWith((c) => { c.events.push({ ...c.events[0] }) }), 'duplicate-event')
})
test('a chronology entry is held to the same rules as the statement', () => {
  expectDraftError(caseWith((c) => { c.events.push({ id: 'E11', date: '2026-04-09', what: 'The District held an IEP meeting on April 9, 2026 without the Parent.', sources: ['R39'] }) }), 'date-not-in-sources', 'Facts \\(E11\\)')
})
test("an event's date must be written in the sources the event names", () => {
  expectDraftError(caseWith((c) => { c.events.push({ id: 'E11', date: '2026-04-09', what: 'The District held a further IEP meeting without the Parent.', sources: ['R39'] }) }), 'event-date-not-in-sources', 'Facts \\(E11\\)')
})
test('an event whose date is in its sources lends the date to a sentence that cites it; an unverified one does not', () => {
  const ok = caseWith((c) => { c.events.push({ id: 'E11', date: '2026-03-12', what: 'The Parent kept notes of the meeting.', sources: ['R39'] }) })
  saveText(ok, 'statement.annotated.md', text(ok, 'statement.annotated.md') + '\nOn March 12, 2026 the Parent kept notes of the meeting. [E11]\n')
  expectDraftPasses(ok)
  const bad = caseWith((c) => { c.events.push({ id: 'E11', date: '2026-04-09', what: 'The Parent kept notes of the meeting.', sources: ['R39'] }) })
  saveText(bad, 'statement.annotated.md', text(bad, 'statement.annotated.md') + '\nOn April 9, 2026 the Parent kept notes of the meeting. [E11]\n')
  const r = run('check-draft', bad)
  assert.equal(r.code, 1, r.out)
  error(r.out, 'event-date-not-in-sources')
  error(r.out, 'date-not-in-sources')
  rmSync(bad, { recursive: true, force: true })
})
test('a chronology entry with no source is refused before it can print', () => {
  const dir = caseWith((c) => { c.events.push({ id: 'E11', date: '2026-04-09', what: 'The District did nothing further about the assessment plan.', sources: [] }) })
  const r = run('run-gates', dir)
  assert.notEqual(r.code, 0, r.out)
  assert.match(r.out, /\[untagged\][^\n]*\n[^\n]*Facts \(E11\)/)
  assert.match(r.out, /Stopped at check-draft/)
  rmSync(dir, { recursive: true, force: true })
})
test('a remedy is held to the pleading rules and to its sources', () => {
  const r = run('check-draft', caseWith((c) => { c.relief[0].detail = "convene an IEP team meeting within 15 days because the District violated my son Jordan's IEP"; c.relief[0].sources = ['F4'] }))
  assert.equal(r.code, 1, r.out)
  error(r.out, 'legal-standard')
  error(r.out, 'voice')
  error(r.out, 'named')
  assert.match(r.out, /Relief \(iep-meeting\)/)
  expectDraftError(caseWith((c) => { c.relief[0].detail = 'convene an IEP team meeting within 3 days'; c.relief[0].sources = ['F4', 'R22'] }), 'number-not-in-sources', 'Relief \\(iep-meeting\\)')
  expectDraftError(caseWith((c) => { c.relief[0].sources = [] }), 'untagged', 'Relief \\(iep-meeting\\)')
})
test('typed hearing text is held to the pleading’s voice', () => {
  expectDraftError(caseWith((c) => { c.hearing = { interpreter: null, accommodations: { value: 'I need a quiet room because the District violated my rights', source: 'typed' } } }), 'voice', 'Hearing \\(accommodations\\)')
})
test('a sentence that rests on the person’s statement alone passes with a warning that names it, and the report lists it', () => {
  const dir = draftCase((s) => s + '\nThe Parent kept every email the District sent. [F2]\n')
  const r = run('check-draft', dir)
  assert.equal(r.code, 0, r.out)
  warning(r.out, 'rests-on-statement')
  assert.match(r.out, /rests on the person's own statement alone \(fact F2\)/)
  run('run-gates', dir)
  assert.match(deliverable(dir, 'sources.md'), /## What rests on the Parent’s statement alone\n\n[\s\S]*The Parent kept every email the District sent/)
  rmSync(dir, { recursive: true, force: true })
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
  error(r.out, code)
  assert.match(r.out, /DRAFT — NOT FOR FILING/)
  rmSync(dir, { recursive: true, force: true })
}
const expectFinal = (dir, ...warnings) => {
  const r = run('run-gates', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /status: FINAL/)
  for (const w of warnings) warning(r.out, w)
  return r.out
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
test('a caption fact citing a reading the verifier did not find blocks', () => {
  const dir = validateCase(null)
  const verified = json(dir, 'readings.verified.json')
  verified.find((r) => r.id === 'R14').verification = { status: 'wrong-page' }
  save(dir, 'readings.verified.json', verified)
  expectBlocking(dir, 'unverified-reading')
})
test('a caption value that differs from the reading it cites blocks', () => {
  expectBlocking(validateCase((c) => { c.student.school = { value: 'Willow Creek Academy', source: 'R14' } }), 'differs-from-reading')
})
test('the retired "counsel" source label is not a source', () => {
  expectBlocking(validateCase((c) => { c.student.address.state = { value: 'NV', source: 'counsel' } }), 'unconfirmed')
})
test('a state field with no web source blocks', () => {
  expectBlocking(validateCase(null, (st) => { st.limitationsMonths = { value: 24, sources: [] } }), 'state-unsourced')
})
test('a limitations window written as text blocks; a non-ISO filing date blocks', () => {
  expectBlocking(validateCase(null, (st) => { st.limitationsMonths = { value: '24 months', sources: ['S5'] } }), 'state-invalid')
  expectBlocking(validateCase((c) => { c.filingDate = 'April 17, 2026' }), 'filing-date-invalid')
})
test('state quotations must have been checked against their pages, and a quotation edited afterwards is noticed', () => {
  const unchecked = validateCase(null)
  rmSync(join(unchecked, 'work', 'state-check.json'))
  expectBlocking(unchecked, 'state-unverified')
  expectBlocking(validateCase(null, (st) => { st.sources[0].quote = 'words that are not on the page' }), 'state-check-stale')
})
test('a state quotation that is not on its page is refused by verify-state, and blocks', () => {
  const dir = validateCase(null, (st) => { st.sources[0].quote = 'Complaints are accepted by carrier pigeon at the front desk.' })
  const v = run('verify-state', dir, '--offline')
  assert.equal(v.code, 1, v.out)
  assert.match(v.out, /✗ S1 quote-not-on-page/)
  expectBlocking(dir, 'state-quote-unverified')
})
test('verify-state refuses a source with no saved page text when offline', () => {
  const dir = validateCase(null, (st) => { st.sources.push({ id: 'S9', title: 'Another page', url: 'https://example.invalid/page', accessed: '2026-09-14', quote: 'anything' }) })
  const v = run('verify-state', dir, '--offline')
  assert.equal(v.code, 1, v.out)
  assert.match(v.out, /✗ S9 no-text/)
  rmSync(dir, { recursive: true, force: true })
})
test('a state-required item with no entry blocks; an item the pleading already states prints nothing', () => {
  expectBlocking(validateCase(null, (st) => { st.additionalContents.value = ['the county of the student’s residence'] }), 'state-item-missing')
  const met = validateCase((c) => { c.additionalContents = [{ requirement: 1, heading: 'County', met: 'the caption', sources: ['S1'] }] }, (st) => { st.additionalContents.value = ['the county of the student’s residence'] })
  expectFinal(met)
  assert.doesNotMatch(deliverable(met, 'complaint.md'), /Additional information required/)
  rmSync(met, { recursive: true, force: true })
})
test('no relief blocks; a free-text remedy with no text blocks', () => {
  expectBlocking(validateCase((c) => { c.relief = [] }), 'resolution-missing')
  expectBlocking(validateCase((c) => { c.relief.push({ id: 'other', detail: '', sources: [] }) }), 'relief-detail-missing')
})
test('a claim with no facts under it blocks with a placeholder', () => {
  const dir = validateCase((c) => { c.claims.push({ id: 'esy', impact: null }) })
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md') + '\nD.\n')
  expectBlocking(dir, 'placeholder')
})
test('no claims blocks; a statement with no dated fact blocks', () => {
  const none = validateCase((c) => { c.claims = [] })
  saveText(none, 'statement.annotated.md', '')
  expectBlocking(none, 'no-claims')
  const undated = validateCase(null)
  saveText(undated, 'statement.annotated.md', 'A.\nThe District did not answer the Parent. [F1]\n\nB.\nThe District did not reply. [F1]\n\nC.\nThe District stayed silent. [F1]\n')
  expectBlocking(undated, 'no-dated-facts')
})
test("an attorney signature without a bar number blocks", () => {
  expectBlocking(validateCase((c) => { c.representation = { type: 'counsel', counsel: { name: 'A. Example', barNumber: '', firmName: 'Example LLP', firmAddress: '1 Main St' } } }), 'signature-incomplete')
})
test('a state-required item with a figure not in its sources blocks; one with a quotation not in its sources blocks', () => {
  expectBlocking(validateCase((c) => { c.additionalContents = [{ heading: 'Student ID', text: '4471-0094', sources: ['R5'] }] }), 'number-not-in-sources')
  expectBlocking(validateCase((c) => { c.additionalContents = [{ heading: 'Position', text: 'The District wrote that it "will never fund an outside evaluation"', sources: ['R5'] }] }), 'quote-not-in-sources')
})
test('an event with no readable date blocks', () => {
  expectBlocking(validateCase((c) => { c.events[0].date = null }), 'event-undated')
})
test('a pleading that names the software blocks', () => {
  const dir = validateCase(null)
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md') + '\nThis complaint was generated by software for the Parent. [R1]\n')
  expectBlocking(dir, 'software-named')
})
test('check-draft must have passed on the current statement and case file', () => {
  const dir = validateCase(null)
  assert.equal(run('check-draft', dir).code, 0)
  assert.equal(run('assemble', dir).code, 0)
  const c = json(dir, 'case.json'); c.facts.F1.answer += ' And more.'; save(dir, 'case.json', c)
  const r = run('validate', dir)
  assert.equal(r.code, 1, r.out)
  error(r.out, 'gates-not-passed')
  rmSync(dir, { recursive: true, force: true })
})
test('an event outside the limitations window is a warning that names the state rule, not a block', () => {
  const out = expectFinal(validateCase((c) => { c.events.push({ id: 'E11', date: '2024-03-11', what: 'Student was found eligible for special education.', sources: ['R17'] }) }), 'outside-limitations')
  assert.match(out, /\[outside-limitations\] event E11 .* the window is 24 months \(California’s rule as stated at .*56505/)
})
test('a planned filing date already past is a warning; a future one is not', () => {
  const past = validateCase(null)
  expectFinal(past, 'filing-date-past')
  rmSync(past, { recursive: true, force: true })
  const future = validateCase((c) => { c.filingDate = '2099-01-01' })
  const out = expectFinal(future)
  noFinding(out, 'filing-date-past')
  rmSync(future, { recursive: true, force: true })
})
test('a state-required item left blank is a warning, and FINAL says so', () => {
  const dir = validateCase((c) => { c.additionalContents = [{ requirement: 1, heading: 'County of residence', text: '____________', sources: ['S1'] }] }, (st) => { st.additionalContents.value = ['the county'] })
  const out = expectFinal(dir, 'blank-item')
  assert.match(out, /\[blank-item\] state-required item 1 \(County of residence\) is left blank/)
  rmSync(dir, { recursive: true, force: true })
})
test('a garbage mediation value is a warning; an expedited request without a discipline claim is a warning', () => {
  const dir = validateCase((c) => { c.mediation = 'maybe'; c.expedited = true })
  expectFinal(dir, 'mediation-unset', 'expedited-without-discipline')
  assert.doesNotMatch(deliverable(dir, 'complaint.md'), /mediation/)
  rmSync(dir, { recursive: true, force: true })
})
test('a document left unclassified is a warning, and pdf-text keeps the inventory on a re-run', () => {
  const dir = validateCase(null)
  const docs = json(dir, 'documents.json')
  docs[0].kinds = []
  save(dir, 'documents.json', docs)
  expectFinal(dir, 'document-unclassified')
  const again = json(dir, 'documents.json')
  again[0].kinds = ['iep']; again[0].title = 'kept'
  save(dir, 'documents.json', again)
  assert.equal(run('pdf-text', dir).code, 0)
  assert.deepEqual(json(dir, 'documents.json')[0].kinds, ['iep'])
  assert.equal(json(dir, 'documents.json')[0].title, 'kept')
  rmSync(dir, { recursive: true, force: true })
})
test('a chosen respondent prints in the caption with its source, and an unsourced one blocks', () => {
  const dir = validateCase((c) => { c.student.respondent = { value: 'River Oak Unified School District Board of Education', source: 'typed' } })
  expectFinal(dir)
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /RIVER OAK UNIFIED SCHOOL DISTRICT BOARD OF EDUCATION,\n/)
  assert.match(complaint, /for which the River Oak Unified School District Board of Education is the responsible local educational agency and the respondent here/)
  assert.match(deliverable(dir, 'sources.md'), /typed: entered by the Parent; not read from any document/)
  rmSync(dir, { recursive: true, force: true })
  expectBlocking(validateCase((c) => { c.student.respondent = { value: 'Some Board' } }), 'unsourced')
})
test('a county prints as a third caption line', () => {
  const dir = validateCase((c) => { c.student.county = { value: 'Sacramento', source: 'typed' } })
  expectFinal(dir)
  assert.match(deliverable(dir, 'complaint.md'), /^BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS\n\nSTATE OF CALIFORNIA\n\nCOUNTY OF SACRAMENTO\n/)
  rmSync(dir, { recursive: true, force: true })
})
test('a student who is an adult on the filing date is captioned without "a minor", with a warning', () => {
  const dir = validateCase((c) => { c.student.dob = { value: '11/03/2005', source: 'typed' } })
  expectFinal(dir, 'adult-student')
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /JORDAN RIVERA, by and through the parent, DANA RIVERA,/)
  assert.doesNotMatch(complaint, /a minor/)
  assert.match(complaint, /is a 20-year-old student/)
  rmSync(dir, { recursive: true, force: true })
})
test('a state block with no name still captions the state by its name', () => {
  const dir = validateCase(null, (st) => { delete st.name })
  expectFinal(dir)
  assert.match(deliverable(dir, 'complaint.md'), /STATE OF CALIFORNIA/)
  assert.match(deliverable(dir, 'verification-report.md'), /## How to file in California/)
  rmSync(dir, { recursive: true, force: true })
})
test('a catalogue claim reworded by the person prints their heading, marked as typed', () => {
  const dir = validateCase((c) => { c.claims[0].heading = 'Failure to revise an annual reading goal Student had not met'; c.claims[0].clause = 'failing to revise an annual reading goal Student had not met' })
  expectFinal(dir)
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /### A\. Failure to revise an annual reading goal Student had not met\n\n\*34 C\.F\.R\. §§ 300\.320, 300\.324\.\*/)
  assert.match(complaint, /by failing to revise an annual reading goal Student had not met; by failing to implement/)
  assert.match(deliverable(dir, 'sources.md'), /A\. Failure to revise an annual reading goal Student had not met\n  - claim:inadequate-iep[^\n]*\n  - typed: entered by the Parent/)
  rmSync(dir, { recursive: true, force: true })
})
test('the statement of facts prints the chronology in date order, and the date of birth prints with the address', () => {
  const dir = validateCase((c) => { const [first, ...rest] = c.events; c.events = [...rest, first] })
  expectFinal(dir)
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /## III\. Statement of facts\n\n4\. On September 8, 2025, the IEP team adopted the annual reading fluency goal/)
  assert.match(complaint, /On October 6, 2025, the small-group reading block was discontinued/)
  assert.match(complaint, /## IV\. Statement of the problems/)
  assert.match(complaint, /3\. Student was born on November 3, 2017, resides with the Parent at 1418 Alder Street/)
  assert.ok(complaint.indexOf('On September 8, 2025, the IEP team') < complaint.indexOf('On October 6, 2025, the small-group'), 'facts in date order')
  assert.match(deliverable(dir, 'sources.md'), /\*\*\[¶ 3\]\*\* Student was born on November 3, 2017/)
  rmSync(dir, { recursive: true, force: true })
})
test('several remedies print as lettered sub-paragraphs under a lead-in; one remedy is a sentence', () => {
  const dir = validateCase(null)
  expectFinal(dir)
  assert.match(deliverable(dir, 'complaint.md'), /\d+\. The Parent proposes the following resolution:\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(a\) convene an IEP team meeting within 15 days[^\n]*;\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(b\) fund an independent educational evaluation[^\n]*;\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(c\) provide compensatory[^\n]*; and\n\n&nbsp;&nbsp;&nbsp;&nbsp;\(d\) implement the IEP as written[^\n]*\.\n/)
  rmSync(dir, { recursive: true, force: true })
  const one = validateCase((c) => { c.relief = c.relief.slice(1, 2) })
  expectFinal(one)
  assert.match(deliverable(one, 'complaint.md'), /\d+\. The Parent proposes the following resolution: fund an independent educational evaluation in reading and written expression\.\n/)
  rmSync(one, { recursive: true, force: true })
})
test("counsel's fees reservation prints after the remedies as its own paragraph wherever it is listed, and warns on a pro se filing", () => {
  const counsel = { type: 'counsel', counsel: { name: 'A. Example', barNumber: '12345', barJurisdiction: 'California', firmName: 'Example LLP', firmAddress: '1 Main Street, Sacramento, CA 95814', firmPhone: '(555) 010-0000', firmEmail: 'a@example.com' } }
  const dir = validateCase((c) => { c.representation = counsel; c.relief.unshift({ id: 'attorneys-fees', detail: '', sources: [] }) })
  const out = expectFinal(dir)
  noFinding(out, 'relief-counsel-only')
  assert.match(deliverable(dir, 'complaint.md'), /\(a\) convene an IEP team meeting[\s\S]*\(d\) implement the IEP as written[^\n]*\.\n\n\d+\. The Parent reserves the right to seek reasonable attorneys’ fees and costs under 20 U\.S\.C\. § 1415\(i\)\(3\)\(B\)\.\n/)
  rmSync(dir, { recursive: true, force: true })
  const own = validateCase((c) => { c.representation = counsel; c.relief.push({ id: 'attorneys-fees', detail: 'Petitioner reserves all rights to attorneys’ fees and costs under 20 U.S.C. § 1415(i)(3)', sources: [] }) })
  expectFinal(own)
  assert.match(deliverable(own, 'complaint.md'), /\d+\. Petitioner reserves all rights to attorneys’ fees and costs under 20 U\.S\.C\. § 1415\(i\)\(3\)\.\n/)
  rmSync(own, { recursive: true, force: true })
  const proSe = validateCase((c) => { c.relief.push({ id: 'attorneys-fees', detail: '', sources: [] }) })
  expectFinal(proSe, 'relief-counsel-only')
  rmSync(proSe, { recursive: true, force: true })
  expectBlocking(validateCase((c) => { c.relief = [{ id: 'attorneys-fees', detail: '', sources: [] }] }), 'resolution-missing')
})
test('requests concerning the hearing print only when asked for', () => {
  const dir = validateCase((c) => { c.mediation = 'requested'; c.hearing = { interpreter: { value: 'Spanish', source: 'typed' }, accommodations: null } })
  expectFinal(dir)
  assert.match(deliverable(dir, 'complaint.md'), /## VI\. Requests concerning the hearing\n\n\d+\. The Parent requests mediation under 34 C\.F\.R\. § 300\.506 concurrently with this due process complaint\.\n\n\d+\. The Parent requires an interpreter for the hearing \(Spanish\)\.\n/)
  rmSync(dir, { recursive: true, force: true })
  const none = validateCase(null)
  run('run-gates', none)
  assert.doesNotMatch(deliverable(none, 'complaint.md'), /Requests concerning the hearing/)
  rmSync(none, { recursive: true, force: true })
})
test('two parents file together: the caption, the defined term, the verbs and two signature lines', () => {
  const dir = validateCase((c) => { c.parent.second = { first: { value: 'Sam', source: 'typed' }, last: { value: 'Rivera', source: 'typed' } } })
  expectFinal(dir)
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /JORDAN RIVERA, a minor, by and through the parents, DANA RIVERA AND SAM RIVERA,/)
  assert.match(complaint, /by the parents, Dana Rivera and Sam Rivera \(“Parents”\), who are self-represented/)
  assert.match(complaint, /resides with the Parents at/)
  assert.match(complaint, /The Parents propose the following resolution:/)
  assert.match(complaint, /The Parents certify that on the date/)
  assert.match(complaint, /Dana Rivera\n\nParent of Jordan Rivera\n\n______+\n\nSam Rivera\n\nParent of Jordan Rivera\n\nSelf-represented \(pro se\)/)
  assert.match(deliverable(dir, 'sources.md'), /## The Parents’ statements of fact/)
  rmSync(dir, { recursive: true, force: true })
})
test('a student with no fixed address: the contact information prints in section II and the signature block, under the (b)(4) recital', () => {
  const dir = validateCase((c) => { c.student.homeless = true; c.student.homelessContact = { value: 'c/o Willow Creek Family Shelter, (555) 010-4471', source: 'typed' } })
  expectFinal(dir)
  const complaint = deliverable(dir, 'complaint.md')
  assert.match(complaint, /\*34 C\.F\.R\. § 300\.508\(b\)\(1\), \(4\)\.\*\n\n3\. Student was born on November 3, 2017, does not have a fixed address, and is enrolled at Willow Creek Elementary School\. The Parent may be reached at c\/o Willow Creek Family Shelter/)
  assert.match(complaint, /Self-represented \(pro se\)\n\nc\/o Willow Creek Family Shelter, \(555\) 010-4471\n/)
  assert.doesNotMatch(complaint, /1418 Alder Street/)
  rmSync(dir, { recursive: true, force: true })
  expectBlocking(validateCase((c) => { c.student.homeless = true; c.student.homelessContact = null }), 'missing')
})
test("a claim outside the catalogue prints the person's heading and regulation, and blocks without a heading", () => {
  const dir = validateCase((c) => { c.claims.push({ id: 'other', heading: 'Failure to provide the Parent a copy of the assessment plan', clause: 'failing to provide the Parent a copy of the assessment plan', cfr: 'Cal. Educ. Code § 56321', isProcedural: false }) })
  const sectionD = '\nD.\nOn August 29, 2025 Student read 22 words per minute on a first-grade passage with 86% accuracy on the DIBELS 8 measure. [R19]\n'
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md') + sectionD)
  expectFinal(dir)
  const complaint = deliverable(dir, 'complaint.md')
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
test('a pro se report never calls the parent counsel, and tells her how to file and to serve first', () => {
  const dir = validateCase(null)
  expectFinal(dir)
  for (const f of ['sources.md', 'verification-report.md']) assert.doesNotMatch(deliverable(dir, f), /\bcounsel/i, `${f} says counsel`)
  const report = deliverable(dir, 'verification-report.md')
  assert.match(report, /## How to file in California/)
  assert.match(report, /\*\*Address:\*\* Special Education Division, Office of Administrative Hearings, 2349 Gateway Oaks Drive/)
  assert.match(report, /\*\*Serve:\*\* the Superintendent of the River Oak Unified School District/)
  assert.match(report, /\*\*Required beyond § 300\.508\(b\):\*\* nothing beyond 34 C\.F\.R\. § 300\.508\(b\)/)
  assert.match(report, /7 of 7 quotations verified on their pages/)
  assert.match(deliverable(dir, 'sources.md'), /## The Parent’s statements of fact/)
  rmSync(dir, { recursive: true, force: true })
})
test('a home address in another state is a warning', () => {
  expectFinal(validateCase((c) => { c.student.address.state = { value: 'NV', source: 'typed' } }), 'filing-state-mismatch')
})

// ─── render and run-gates ──────────────────────────────────────────────
test('a draft carries DRAFT — NOT FOR FILING at the head of all three files', async () => {
  const dir = validateCase((c) => { c.student.address.postalCode = null })
  const r = run('run-gates', dir)
  assert.notEqual(r.code, 0)
  assert.match(deliverable(dir, 'complaint.md'), /^\*\*DRAFT — NOT FOR FILING\*\*/)
  assert.match((await pdfPages(dir))[0], /DRAFT — NOT FOR FILING/)
  assert.match(docxXml(dir), /DRAFT — NOT FOR FILING/)
  rmSync(dir, { recursive: true, force: true })
})
test('a run that stops leaves no deliverable from an earlier FINAL run behind', () => {
  const dir = validateCase(null)
  expectFinal(dir)
  assert.ok(existsSync(join(dir, 'complaint.pdf')))
  saveText(dir, 'statement.annotated.md', text(dir, 'statement.annotated.md').replace('an average of 95 minutes', 'an average of 85 minutes'))
  const r = run('run-gates', dir)
  assert.match(r.out, /Stopped at check-draft/)
  for (const f of ['complaint.pdf', 'complaint.docx', 'complaint.md', 'sources.md', 'verification-report.md']) assert.ok(!existsSync(join(dir, f)), `${f} left behind`)
  rmSync(dir, { recursive: true, force: true })
})

// ─── the evaluation grader ─────────────────────────────────────────────
test('the grader scores both shipped examples 14 of 14', () => {
  for (const [ex, id] of [[example, 1], [counselExample, 2]]) {
    const runDir = mkdtempSync(join(tmpdir(), 'dpc-grade-'))
    cpSync(ex, join(runDir, 'outputs'), { recursive: true })
    const r = spawnSync(process.execPath, [join(root, 'skills', 'dpc-complaint', 'evals', 'grade.mjs'), runDir, '--eval', String(id), '--asked', 'no'], { encoding: 'utf8' })
    assert.match((r.stdout ?? '') + (r.stderr ?? ''), /14\/14 passed/, (r.stdout ?? '') + (r.stderr ?? ''))
    rmSync(runDir, { recursive: true, force: true })
  }
})

// ─── every script explains itself ──────────────────────────────────────
test('every script prints its usage with no arguments', () => {
  for (const s of ['pdf-text', 'verify-readings', 'confirm', 'verify-state', 'check-draft', 'assemble', 'validate', 'render', 'report', 'run-gates', 'fetch-text']) {
    const r = spawnSync(process.execPath, [join(scripts, `${s}.mjs`)], { encoding: 'utf8' })
    assert.equal(r.status, 2, s)
    assert.match(r.stderr, new RegExp(`^usage: node scripts/${s}\\.mjs `), s)
  }
})
