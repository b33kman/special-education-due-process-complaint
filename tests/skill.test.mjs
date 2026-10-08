// The check has to be able to fail. Each test copies a worked example, breaks
// one thing a model could plausibly get wrong, and asserts check.mjs refuses
// it — or that render.mjs will not name the result for filing.
//
//   npm install && npm test   (after editing src/, npm run build first)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { inflateRawSync } from 'node:zlib'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const scripts = join(root, 'skills', 'due-process-complaint', 'scripts')
const examples = { proSe: join(root, 'examples', 'river-oak'), counsel: join(root, 'examples', 'pine-hollow') }
const pdfjs = await import(pathToFileURL(join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href)

const run = (script, dir) => {
  const r = spawnSync(process.execPath, [join(scripts, `${script}.mjs`), ...(dir ? [dir] : [])], { encoding: 'utf8' })
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
function copy(from = examples.proSe, edit) {
  const dir = mkdtempSync(join(tmpdir(), 'due-process-'))
  for (const f of ['documents', 'complaint.md', 'statement.md', 'filing-instructions.md']) cpSync(join(from, f), join(dir, f), { recursive: true })
  assert.equal(run('pdf-text', dir).code, 0)
  if (edit) writeFileSync(join(dir, 'complaint.md'), edit(readFileSync(join(dir, 'complaint.md'), 'utf8')))
  return dir
}
function refused(edit, pattern, from) {
  const dir = copy(from, edit)
  const r = run('check', dir)
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, pattern)
  rmSync(dir, { recursive: true, force: true })
}
function passes(edit, from) {
  const dir = copy(from, edit)
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  rmSync(dir, { recursive: true, force: true })
  return r.out
}
const once = (from, to) => (md) => {
  assert.ok(md.includes(from), `the example no longer contains: ${from}`)
  return md.replace(from, to)
}
const chain = (...edits) => (md) => edits.reduce((m, edit) => edit(m), md)
/** Put a flag in the pleading and its explanation in the review notes. */
const withFlag = (marker, explanation = marker) => chain(
  once('Student resides in the District', `[${marker}] Student resides in the District`),
  once('### Citations', `### Flagged issues\n\n- **${explanation}** — the full explanation, which lives here rather than in the pleading.\n\n### Citations`),
)
async function pageText(file, n) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false }).promise
  return (await (await doc.getPage(n < 0 ? doc.numPages : n)).getTextContent()).items.map((i) => i.str).join(' ')
}
/** A zip's text entries, from its local file headers. The Word file is a zip; nothing is installed. */
function zipEntries(file) {
  const buf = readFileSync(file)
  const out = new Map()
  for (let i = 0; i + 30 <= buf.length; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue
    const method = buf.readUInt16LE(i + 8)
    const compressed = buf.readUInt32LE(i + 18)
    const nameLen = buf.readUInt16LE(i + 26)
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString('utf8')
    const start = i + 30 + nameLen + buf.readUInt16LE(i + 28)
    if (!compressed) continue
    try { out.set(name, (method === 8 ? inflateRawSync(buf.subarray(start, start + compressed)) : buf.subarray(start, start + compressed)).toString('utf8')) } catch { /* not text */ }
  }
  return out
}
async function wholeText(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false }).promise
  let text = ''
  for (let n = 1; n <= doc.numPages; n++) text += ' ' + (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ')
  return text.replace(/\s+/g, ' ')
}

// ─── The examples, end to end ───────────────────────────────────────────

test('both worked examples pass the check and render as the files to file, in the pleading form', async () => {
  for (const ex of Object.values(examples)) {
    const dir = copy(ex)
    const c = run('check', dir)
    assert.equal(c.code, 0, c.out)
    const r = run('render', dir)
    assert.equal(r.code, 0, r.out)
    assert.ok(existsSync(join(dir, 'complaint.pdf')) && existsSync(join(dir, 'complaint.docx')))
    assert.ok(!existsSync(join(dir, 'complaint.DRAFT.pdf')))
    const first = await pageText(join(dir, 'complaint.pdf'), 1)
    assert.match(first, /BEFORE THE OFFICE OF ADMINISTRATIVE HEARINGS/)
    assert.match(first, /In the Matter of:/)
    assert.match(first, /Petitioner,/)
    assert.match(first, /I\. PRELIMINARY STATEMENT/)
    assert.match(first, /1\.\s+Petitioner/)
    assert.doesNotMatch(first, /DRAFT/)
    const all = await wholeText(join(dir, 'complaint.pdf'))
    // Every section the form requires, in the numerals the renderer assigns.
    for (const heading of ['REQUIRED INFORMATION', 'JURISDICTION, TIMELINESS AND BURDEN', 'STATEMENT OF FACTS', 'STATEMENT OF THE PROBLEMS', 'PROPOSED RESOLUTION', 'CERTIFICATE OF SERVICE']) {
      assert.match(all, new RegExp(heading), heading)
    }
    // The work product is NOT in the file named for filing. A page break and a heading saying
    // "Remove Before Filing" are an instruction to a human, not a guard, and what sits in those
    // notes is the petitioner's own account of what the District will argue.
    assert.doesNotMatch(all, /Remove Before Filing/, 'the review notes are in the filing-ready PDF')
    for (const leak of ['expected defenses', 'was not confirmed in this session', 'Verification checklist', 'Adverse authority']) {
      assert.ok(!all.includes(leak), `the filing-ready PDF carries work product: ${leak}`)
    }
    // They are written beside it instead.
    const notes = readFileSync(join(dir, 'review-notes.md'), 'utf8')
    assert.match(notes, /Remove Before Filing/)
    assert.match(notes, /### Arithmetic/)
    // Nothing a marker is written as ever reaches the page.
    assert.doesNotMatch(all, /\[#/, 'a paragraph label printed literally')
    assert.doesNotMatch(all, /\[@/, 'a source marker printed literally')
    assert.doesNotMatch(all, /\[(?:MISSING|CONFLICT|VERIFY|COUNSEL)-/, 'a flag printed on a final complaint')
    // A source prints as the page it names.
    assert.match(all, /\(p\. 1\)/)
    const last = (await pageText(join(dir, 'complaint.pdf'), -1)).replace(/\s+/g, ' ')
    const respondent = readFileSync(join(dir, 'complaint.md'), 'utf8').match(/^respondent: (.*)$/m)[1]
    assert.match(all.replace(/\s+/g, ' '), new RegExp(`Served on:.*Superintendent, ${respondent}, \\d+ `, 'i'))
    assert.ok(last.length > 0)
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the two examples are a parent filing pro se and an attorney filing, and each says so', async () => {
  const proSe = copy(examples.proSe)
  assert.equal(run('render', proSe).code, 0)
  const a = await wholeText(join(proSe, 'complaint.pdf'))
  assert.match(a, /Self-represented \(pro se\)/)
  const aNotes = readFileSync(join(proSe, 'review-notes.md'), 'utf8')
  assert.match(aNotes, /^## Review Notes . Remove Before Filing/m)
  assert.doesNotMatch(aNotes, /Attorney Work Product/, "a parent's own notes are not attorney work product")
  rmSync(proSe, { recursive: true, force: true })

  const counsel = copy(examples.counsel)
  assert.equal(run('render', counsel).code, 0)
  const b = await wholeText(join(counsel, 'complaint.pdf'))
  assert.match(b, /Attorney for Petitioner and the Parent/)
  assert.match(b, /Bar No\./)
  assert.match(b, /Counsel for Petitioner and the Parent certifies/)
  assert.match(b, /20 U\.S\.C\. . 1415\(i\)\(3\)\(B\)/, "counsel's fee reservation")
  assert.match(readFileSync(join(counsel, 'review-notes.md'), 'utf8'), /^## Attorney Review Notes . Attorney Work Product . Remove Before Filing/m)
  rmSync(counsel, { recursive: true, force: true })
})

// ─── Facts against the sources ──────────────────────────────────────────

test('a date no document or statement gives is refused', () => {
  refused(once('October 6, 2025, the District’s service delivery log records 90 minutes', 'October 7, 2025, the District’s service delivery log records 90 minutes'), /the date .October 7, 2025. is not in the documents/)
})

test('a figure no source gives is refused — including one that is only the tail of the real figure', () => {
  refused(once('recorded 21 words per minute', 'recorded 37 words per minute'), /the figure .37. is not in the documents/)
  refused(once('provides 240 minutes per week', 'provides 40 minutes per week'), /the figure .40. is not in the documents/)
})

test('a quotation that is not word for word in a source is refused', () => {
  refused((md) => md.replace('## Statement of the problems', 'The District wrote that it “will never fund an outside evaluation.”\n\n## Statement of the problems'), /the quotation .will never fund an outside evaluation. is not word for word/)
})

test('a figure from the person’s own statement passes, and is listed as resting on it', () => {
  const out = passes(once('within 15 days to adopt measurable reading goals', 'within 15 days to adopt measurable reading goals'))
  assert.match(out, /From statement\.md, not from any document[\s\S]*15 days/)
})

test('a space the extractor left before a semicolon does not refuse the District’s own words', () => {
  // pdf.js ends a text item at a font or position change, so an extracted line can read
  // “on leave ; no substitute”. Closing that space up is not rewording — every word, and
  // the order of them, still has to match exactly.
  const dir = copy(examples.proSe, once('and the note “small-group reading block discontinued pending staffing; SAI provided in the general education classroom during available periods.”', 'and the note “teacher on leave; no substitute.”'))
  writeFileSync(join(dir, 'work', 'text', 'log-transcribed.txt'), '--- page 1 ---\nWeek of October 6, 2025: 90 minutes — teacher on leave ; no substitute .\n')
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  rmSync(dir, { recursive: true, force: true })

  // And the latitude is only that. Closing up a space the writer put between two of the page's
  // own words is rewording, not an extractor artefact, and the quotation is still refused.
  const d2 = copy(examples.proSe, once('and the note “small-group reading block discontinued pending staffing; SAI provided in the general education classroom during available periods.”', 'and the note “teacher onleave; no substitute.”'))
  writeFileSync(join(d2, 'work', 'text', 'log-transcribed.txt'), '--- page 1 ---\nWeek of October 6, 2025: 90 minutes — teacher on leave ; no substitute .\n')
  const r2 = run('check', d2)
  assert.equal(r2.code, 1, r2.out)
  assert.match(r2.out, /the quotation .teacher onleave; no substitute. is not word for word/)
  rmSync(d2, { recursive: true, force: true })
})

// ─── Sources ────────────────────────────────────────────────────────────

test('a source names a document in the folder, and a page that document has', () => {
  refused(once('[@01_IEP_River_Oak, p. 1]\n\n[#present]', '[@99_Does_Not_Exist, p. 1]\n\n[#present]'), /names no document in the case folder/)
  refused(once('[@02_Progress_Reports, p. 1]', '[@02_Progress_Reports, p. 4]'), /names a page .* does not have/)
  // A stem that could be two documents says nothing about which page was read.
  refused(once('[@01_IEP_River_Oak, p. 1]\n\n[#present]', '[@0, p. 1]\n\n[#present]'), /matches 5 documents . give more of the name/)
  refused(once('[@01_IEP_River_Oak, p. 1]\n\n[#present]', '[@01_IEP_River_Oak]\n\n[#present]'), /must read \[@stem, p\. N\], \[@statement\] or \[@law\]/)
})

test('a fact with no source at all is refused', () => {
  refused((md) => md.replace('## Statement of facts\n\n', '## Statement of facts\n\nOn September 8, 2025 the IEP team met for the annual review.\n\n'), /says where nothing came from/)
})

test('a fact sourced only to the statement says so in its own words', () => {
  const fact = (sentence) => once('## Statement of the problems', `${sentence} [@statement]\n\n## Statement of the problems`)
  refused(fact('Two telephone calls to the school went unanswered.'), /must say so in its own words/)
  // A reporting verb on its own is not the phrase: this is the District speaking, not the Parent.
  refused(fact('She telephoned the school twice and was told the case manager would call back.'), /must say so in its own words/)
  passes(fact('The Parent reports that two telephone calls to the school went unanswered.'))
})

// ─── Flags: write it and flag it ────────────────────────────────────────

test('a flag carries an unsupported fact onto the page, and the check reports what rests on it', () => {
  const dir = copy(examples.proSe, chain(
    once('The District’s progress report dated November 14, 2025 recorded 21 words per minute', 'The District’s progress report dated November 14, 2025 recorded 37 words per minute [MISSING-1: figure not legible on the copy]'),
    once('### Citations', '### Flagged issues\n\n- **MISSING-1** — the figure is not legible on the copy provided.\n\n### Citations'),
  ))
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /Resting on a flag[\s\S]*the figure .37./)
  assert.match(r.out, /Flags still open[\s\S]*MISSING-1/)
  rmSync(dir, { recursive: true, force: true })
})

test('an open flag keeps a final, passing complaint out of the files to file', () => {
  const dir = copy(examples.proSe, withFlag('VERIFY-1: burden allocation not confirmed', 'VERIFY-1'))
  assert.equal(run('check', dir).code, 0)
  const r = run('render', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /1 flag\(s\) still open/)
  assert.ok(existsSync(join(dir, 'complaint.DRAFT.pdf')) && !existsSync(join(dir, 'complaint.pdf')))
  rmSync(dir, { recursive: true, force: true })
})

test('a flag the review notes do not explain is refused', () => {
  refused(once('Student resides in the District', '[VERIFY-1: burden allocation not confirmed] Student resides in the District'), /is not explained in the review notes/)
})

test('flags are numbered from 1, with no gaps, and never twice', () => {
  refused(withFlag('VERIFY-2: burden allocation not confirmed', 'VERIFY-2'), /must be numbered from 1 with no gaps/)
  refused(chain(
    once('Student resides in the District', '[VERIFY-1: burden allocation] Student resides in the District'),
    once('The violations pleaded below begin', '[VERIFY-1: something else] The violations pleaded below begin'),
    once('### Citations', '### Flagged issues\n\n- **VERIFY-1** — explained here.\n\n### Citations'),
  ), /is used twice/)
})

test('a flag longer than twelve words belongs in the notes, not in the pleading', () => {
  refused(withFlag('VERIFY-1: the allocation of the burden of proof in this state has not been confirmed against the official text of the education code', 'VERIFY-1'), /is longer than 12 words/)
})

// ─── The arithmetic table ───────────────────────────────────────────────

test('the arithmetic table is recomputed, and a result that does not follow is refused', () => {
  refused(once('| 24 - 4 | 20 weeks |', '| 24 - 4 | 21 weeks |'), /24 - 4 is 20, and the result says 21/)
})

test('an arithmetic input must come from a source, or from a row above it', () => {
  refused(once('| 24 instructional weeks logged (service log); 4 weeks at the full 240 minutes (service log) | 24 - 4 | 20 weeks |', '| 777 instructional weeks logged (service log); 4 weeks at the full 240 minutes (service log) | 777 - 4 | 773 weeks |'), /the input .777. is neither in the documents or statement\.md nor a result computed above/)
})

test('a computed figure may appear in the pleading only because the table computes it', () => {
  // Remove the row that computes the compensatory minutes and the pleading's figure is unsourced.
  refused((md) => {
    const row = md.split('\n').find((l) => l.includes('| 4800 - 1320 |'))
    assert.ok(row, 'the example no longer computes the compensatory minutes')
    return md.replace(`${row}\n`, '')
  }, /the figure .3480. is not in the documents or statement\.md, and is not a result in the arithmetic table/)
})

test('an arithmetic computation is digits and operators, and nothing else', () => {
  refused(once('| 24 - 4 | 20 weeks |', '| process.exit(0) | 20 weeks |'), /must be digits and \+ - \* \/ \( \) \. only/)
})

// ─── Authorities ────────────────────────────────────────────────────────

test('a case the authorities file does not list is refused, and a flag is the way to cite it', () => {
  const fake = once('580 U.S. 386, 399 (2017)', '999 F.3d 1, 7 (9th Cir. 2021)')
  refused(fake, /the citation .999 F\.3d 1. is not one references\/authorities\.md lists/)
  // Flagged, it is the person's to run down, which is what the tier rules ask for.
  passes(chain(
    once('580 U.S. 386, 399 (2017)', '999 F.3d 1, 7 (9th Cir. 2021) [VERIFY-1: citation not confirmed]'),
    once('### Citations', '### Flagged issues\n\n- **VERIFY-1** — the citation was not confirmed in this session.\n\n### Citations'),
  ))
})

const CASE_NAME = '*Endrew F. ex rel. Joseph F. v. Douglas Cnty. Sch. Dist. RE-1*, 580 U.S. 386, 399 (2017)'
const SECOND_CIRCUIT_CASE = "*R.E. v. N.Y.C. Dep't of Educ.*, 694 F.3d 167, 186 (2d Cir. 2012)"

test('a case that binds in another circuit is refused where this complaint is filed', () => {
  // R.E. is Tier 1 in Connecticut, New York and Vermont. River Oak is filed in California.
  refused(once(CASE_NAME, SECOND_CIRCUIT_CASE), /binds in the 2d Circuit and this complaint is filed in the 9th Circuit/)
  // The same case is in scope for a complaint filed in the Second Circuit.
  passes(chain(
    once('state: California', 'state: New York'),
    once('circuit: 9th', 'circuit: 2d'),
    once(CASE_NAME, SECOND_CIRCUIT_CASE),
  ))
})

test('a citation carries the name and the first page the authorities file gives it', () => {
  // The volume and the reporter alone are not enough: a fabricated case name bolted onto a real
  // citation is the error the guard exists for.
  refused(once(CASE_NAME, '*Marquez v. Willow Creek Unified Sch. Dist.*, 580 U.S. 386, 399 (2017)'), /is the citation for Endrew F\., and that case is not named here/)
  refused(once('580 U.S. 386, 399 (2017)', '580 U.S. 391, 399 (2017)'), /gives the wrong first page: references\/authorities\.md reports Endrew F\. at 386/)
  // A short form cites a pin, not the first page, so its page is not held to the reporter's.
  passes(once('580 U.S. 386, 399 (2017)', '580 U.S. at 399'))
})

test('a state court citation is caught by the citation rule, not by the figure check', () => {
  const r = copy(examples.proSe, once(CASE_NAME, '*Doe v. Sch. Dist.*, 455 P.3d 221, 230 (Cal. 2019)'))
  const out = run('check', r)
  assert.equal(out.code, 1, out.out)
  assert.match(out.out, /the citation .455 P\.3d 221. is not one references\/authorities\.md lists/)
  assert.doesNotMatch(out.out, /the figure .455./, 'a fabricated state case was reported as an unsourced number')
  rmSync(r, { recursive: true, force: true })
})

test('a citation on the italic regulation line is checked like any other', () => {
  refused(once('*34 C.F.R. §§ 300.101, 300.320, 300.324.*', '*34 C.F.R. §§ 300.101, 300.320, 300.324; Doe v. District, 912 F.3d 1044, 1051 (9th Cir. 2019).*'), /the citation .912 F\.3d 1044. is not one references\/authorities\.md lists/)
})

test('a date is checked whatever form it is written in', () => {
  refused(once('On September 8, 2025, the individualized education program team adopted', 'On Sept. 8, 2024, the individualized education program team adopted'), /the date .Sept\. 8, 2024. is not in the documents/)
  refused(once('On December 2, 2025, the Parent requested in writing', 'On 12/2/2026, the Parent requested in writing'), /the date .12\/2\/2026. is not in the documents/)
})

test('the arithmetic computation may use only its own inputs, and nothing inert', () => {
  refused(once('| 4800 - 1320 | 3480 minutes |', '| 1160 * 3 | 3480 minutes |'), /the computation uses 1160, which is not one of its inputs or a result computed above/)
  refused(once('| 24 - 4 | 20 weeks |', '| 24 - 4 /*- 10*/ | 20 weeks |'), /must be digits and \+ - \* \/ \( \) \. only/)
  refused(once('| 24 - 4 | 20 weeks |', '| 24 - 4 | weeks below the minimum: 20 |'), /the result .weeks below the minimum: 20. does not lead with a number/)
})

test('[@law] does not carry a quotation taken from a document', () => {
  refused(once('## Proposed resolution', 'The District wrote that it “will never fund an outside evaluation of any kind”. 34 C.F.R. § 300.502. [@law]\n\n## Proposed resolution'), /attributes its words to a document/)
  // What it does cover is listed, so the audit confirms it against the authority itself.
  const out = passes(once('## Proposed resolution', 'A district must make the services available “in accordance with the child’s IEP”. 34 C.F.R. § 300.323(c)(2). [@law]\n\n## Proposed resolution'))
  assert.match(out, /Quoted as the law[\s\S]*in accordance with the child/)
})

test('the circuit is the one the filing state sits in, and the state is a real one', () => {
  refused(once('circuit: 9th', 'circuit: 2d'), /a complaint filed in California is bound by the 9th Circuit/)
  refused(once('state: California', 'state: Narnia'), /is not a state or the District of Columbia/)
})

test('a quotation of the law is sourced to [@law], which is not a way past the source check', () => {
  const quoted = (tail) => once('## Proposed resolution', `A district must make the services available “in accordance with the child’s IEP”. 34 C.F.R. § 300.323(c)(2).${tail}\n\n## Proposed resolution`)
  // A regulation cannot be in the case folder, so without the marker the quotation is refused.
  refused(quoted(''), /the quotation .in accordance with the child.s IEP. is not word for word/)
  passes(quoted(' [@law]'))
  // The marker is a claim that the words are the law's, so the paragraph has to cite the law.
  refused(once('## Proposed resolution', 'The District must do what it promised, “in accordance with the child’s IEP”. [@law]\n\n## Proposed resolution'), /sourced to \[@law\] carries no citation/)
  // And the chronology carries no law at all.
  refused(once('## Statement of the problems', 'The rule is that services are delivered “in accordance with the child’s IEP”. 34 C.F.R. § 300.323(c)(2). [@law]\n\n## Statement of the problems'), /\[@law\] belongs in a claim, not in the chronology/)
})

test('a flag number is matched whole, so VERIFY-10 does not explain VERIFY-1', () => {
  refused(chain(
    once('Student resides in the District', '[VERIFY-1: burden allocation not confirmed] Student resides in the District'),
    once('### Citations', '### Flagged issues\n\n- **VERIFY-10** — something else entirely.\n\n### Citations'),
  ), /the flag .\[VERIFY-1\]. is not explained in the review notes/)
})

test('filing-instructions.md answers the § 300.508(a)(2) copy to the State educational agency', () => {
  const dir = copy()
  const fi = join(dir, 'filing-instructions.md')
  writeFileSync(fi, readFileSync(fi, 'utf8').replace('## The State educational agency', '## The state'))
  const r = run('check', dir)
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, /no .## The State educational agency. section/)
  rmSync(dir, { recursive: true, force: true })
})

test('the authorities the script carries are the authorities the documents give', async () => {
  // check.mjs is a self-contained file with no folder beside it, so it cannot read
  // references/authorities.md or references/state-rules.json at run time. The data it carries is
  // bound to them here: a case added to one and not the other, or a case moved between the
  // "binds everywhere" and "Second Circuit" blocks, fails this test rather than shipping.
  const { TIER1, CIRCUIT_OF, citeKey } = await import(pathToFileURL(join(root, 'src', 'authorities-data.mjs')).href)
  const refs = join(root, 'skills', 'due-process-complaint', 'references')
  const doc = readFileSync(join(refs, 'authorities.md'), 'utf8')
  const sectionOf = (heading) => {
    const at = doc.indexOf(heading)
    assert.ok(at > 0, `references/authorities.md has no “${heading}” heading`)
    const next = doc.indexOf('\n### ', at + heading.length)
    return doc.slice(at, next > 0 ? next : undefined)
  }
  const national = sectionOf('### Binding everywhere')
  const second = sectionOf('### Second Circuit')
  assert.equal(TIER1.length, 13)
  for (const c of TIER1) {
    const cite = `${c.volume} ${c.reporter} ${c.page}`
    const where = c.scope === 'national' ? national : second
    assert.ok(where.includes(cite), `${c.name}: “${cite}” is not in the ${c.scope} block of references/authorities.md`)
    // And it is in that block only.
    const other = c.scope === 'national' ? second : national
    assert.ok(!other.includes(cite), `${c.name}: “${cite}” is in both blocks`)
  }
  // Every citation the document lists is one the script carries, so neither grows alone.
  const keys = new Set(TIER1.map((c) => citeKey(c.volume, c.reporter)))
  for (const block of [national, second]) {
    for (const m of block.matchAll(/\b(\d{1,4})\s+(U\.S\.|F\.3d|F\. App'x)\s+\d{1,4}/g)) {
      assert.ok(keys.has(citeKey(m[1], m[2])), `references/authorities.md lists “${m[0]}” and src/authorities-data.mjs does not`)
    }
  }
  const { states } = JSON.parse(readFileSync(join(refs, 'state-rules.json'), 'utf8'))
  assert.equal(Object.keys(CIRCUIT_OF).length, states.length)
  for (const row of states) assert.equal(CIRCUIT_OF[row.code], row.circuit, `${row.code}: the table says ${row.circuit}`)
})

// ─── The form ───────────────────────────────────────────────────────────

test('a missing required element is refused: the school, the resolution, the address, the notes', () => {
  refused((md) => md.replace(/^school: .*$/m, 'school:'), /the front matter has no school/)
  refused((md) => md.replace(/## Proposed resolution[\s\S]*?(?=## Reservation of rights)/, ''), /no .Proposed resolution. section/)
  refused((md) => md.replace(/^address: .*$/m, 'address: 1418 Alder Street, Willow Creek, CA 95834'), /address: .CA 95834. is not in the documents/)
  refused((md) => md.replace(/## Review Notes[\s\S]*$/, ''), /no .Review Notes . Remove Before Filing. section/)
})

test('the front matter names who is filing, and the circuit whose law binds', () => {
  refused((md) => md.replace(/^filer: .*$/m, 'filer:'), /the front matter has no filer/)
  refused((md) => md.replace(/^circuit: .*$/m, 'circuit:'), /the front matter has no circuit/)
  refused((md) => md.replace(/^filer: .*$/m, 'filer: lawyer'), /filer: must be one of/)
})

test('a parent’s review notes are not attorney work product, and counsel’s are', () => {
  refused(once('## Review Notes – Remove Before Filing', '## Attorney Review Notes – Attorney Work Product – Remove Before Filing'), /a parent's notes are not attorney work product/)
  refused(once('## Attorney Review Notes – Attorney Work Product – Remove Before Filing', '## Review Notes – Remove Before Filing'), /the notes are headed .Attorney Review Notes/, examples.counsel)
})

test('a section out of the approved order, or not in it, is refused', () => {
  refused((md) => {
    const facts = md.match(/## Statement of facts[\s\S]*?(?=## Statement of the problems)/)[0]
    return md.replace(facts, '').replace('## Signature', `${facts}## Signature`)
  }, /.## Statement of facts. is out of order/)
  refused(once('## Statement of facts', '## Background'), /.## Background. is not a section of the complaint/)
})

// ─── Claims ─────────────────────────────────────────────────────────────

const claimIs = (claim) => (md) => {
  const [a] = md.match(/## Statement of the problems[\s\S]*?(?=### B\.)/)
  return md.replace(a, `## Statement of the problems\n\n### A. Failure to provide a free appropriate public education\n\n*34 C.F.R. §§ 300.101, 300.320, 300.324.*\n\n${claim}\n\n`)
}

test('a claim that only lists the paragraphs that bear on it is refused, however long the list', () => {
  const says = /says only which paragraphs bear on the problem/
  refused(claimIs('The facts at paragraphs [#goal] and [#goal] bear on this problem.'), says)
  // Punctuation is not substance: a longer list of the same pointers buys nothing.
  refused(claimIs(`The paragraphs that bear on this problem are ${Array(20).fill('[#goal]').join(', ')}.`), says)
  // Nor is the pointer's own vocabulary, repeated.
  refused(claimIs('Paragraph [#goal], paragraph [#goal] and paragraph [#goal] are the paragraphs for this problem.'), says)
})

test('a claim ties its rule to the facts by paragraph number', () => {
  refused(claimIs('The District failed to offer a program reasonably calculated to enable Student to make appropriate progress, and has not revised it since.'), /points at no paragraph of the chronology/)
})

test('a claim that says what the problem is passes, however short, and points to the chronology', () => {
  passes(claimIs('The District did not deliver the reading instruction the September 8, 2025 program requires (paragraph [#goal]).'))
  // A claim whose new content is what the District did NOT do carries no date or figure of its own.
  passes(claimIs('The District has not revised the reading goal or the services it provides since (paragraph [#goal]).'))
})

test('a label belongs on a fact paragraph, and only a claim or the pendency section points to one', () => {
  const belongs = /belongs on a paragraph of the statement of facts/
  const onlyClaims = /a paragraph number belongs to a claim or the pendency section/
  refused(claimIs('[#self] The District did not deliver the instruction the program requires (paragraph [#self]).'), belongs)
  // A remedy sends the reader to a paragraph number instead of naming its own figures.
  refused(once('(c) provide 3,480 minutes of compensatory specialized academic instruction in reading, being the shortfall', '(c) provide the compensatory instruction at paragraph [#goal], being the shortfall'), onlyClaims)
  // A label left in the signature or the certificate would print as “[#sig]” on the filed PDF.
  refused(once('Respectfully submitted,', '[#sig] Respectfully submitted,'), belongs)
  refused(once('The Parent certifies that on the date', '[#cert] The Parent certifies that on the date'), belongs)
})

test('the pendency section may point at the chronology', () => {
  passes(once('## Proposed resolution', '## Pendency\n\nStudent’s current educational placement is the program described in the individualized education program dated September 8, 2025 (paragraph [#services]). Petitioner requests that Student remain in that placement during the pendency of these proceedings. 34 C.F.R. § 300.518(a).\n\n## Proposed resolution'))
})

test('a label that points nowhere, starts two paragraphs, or is not lowercase words is refused', () => {
  refused(once('*34 C.F.R. §§ 300.101, 300.320, 300.324.*', '*34 C.F.R. §§ 300.101, 300.320, 300.324.*\n\nThe facts at paragraph [#nothing] bear on this problem, and the District said so in writing at the meeting.'), /.\[#nothing\]. points to no paragraph/)
  refused(once('[#nov] The District’s progress report dated November 14, 2025', '[#goal] The District’s progress report dated November 14, 2025'), /.\[#goal\]. starts two paragraphs/)
  refused(once('[#goal] On September 8, 2025', '[#Goal] On September 8, 2025'), /.\[#Goal\]. must be lowercase letters and hyphens/)
})

// ─── The certificate of service ─────────────────────────────────────────

test('the certificate of service names the district’s office and every other office served, as filing-instructions.md gives them', () => {
  const district = 'Superintendent, River Oak Unified School District, 500 Oak Valley Road, Willow Creek, CA 95833'
  const hearing = 'Special Education Division, Office of Administrative Hearings, 2349 Gateway Oaks Drive, Suite 200, Sacramento, CA 95833'
  refused(once(`${district}\n\n${hearing}\n\n`, ''), /names nobody served/)
  refused(once(`${district}\n\n`, ''), /does not name the school district.s office as filing-instructions\.md gives it/)
  refused(once('500 Oak Valley Road, Willow Creek', '550 Oak Valley Road, Willow Creek'), /.550 Oak Valley Road. is not in filing-instructions\.md/)
  const noFile = copy()
  rmSync(join(noFile, 'filing-instructions.md'))
  const r = run('check', noFile)
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, /there is no filing-instructions\.md/)
  rmSync(noFile, { recursive: true, force: true })
  const noSection = copy()
  const fi = join(noSection, 'filing-instructions.md')
  writeFileSync(fi, readFileSync(fi, 'utf8').replace('## The school district', '## The district'))
  const r2 = run('check', noSection)
  assert.equal(r2.code, 1, r2.out)
  assert.match(r2.out, /no .## The school district. section/)
  rmSync(noSection, { recursive: true, force: true })
})

// ─── Rendering ──────────────────────────────────────────────────────────

test('nothing runs outside the margins, in either example', async () => {
  for (const ex of Object.values(examples)) {
    const dir = copy(ex)
    assert.equal(run('render', dir).code, 0)
    const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'complaint.pdf'))), isEvalSupported: false }).promise
    for (let n = 1; n <= doc.numPages; n++) {
      for (const item of (await (await doc.getPage(n)).getTextContent()).items) {
        if (!item.str.trim()) continue
        assert.ok(item.transform[4] >= 71 && item.transform[4] + item.width <= 541, `page ${n}: “${item.str}” runs outside the margins`)
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a long forum name, claim heading, regulation line, table cell or signature line wraps inside the margins', async () => {
  const dir = copy(examples.proSe, chain(
    once('forum: Office of Administrative Hearings', 'forum: Office of Administrative Hearings, Special Education Division, Department of General Services'),
    once('### A. Failure to provide a free appropriate public education', '### A. Failure to provide a free appropriate public education and to revise the program when the progress reports recorded no progress toward the annual reading fluency goal'),
    once('*34 C.F.R. §§ 300.101, 300.320, 300.324.*', '*34 C.F.R. §§ 300.101, 300.300, 300.301, 300.303, 300.304, 300.305, 300.306, 300.320, 300.321, 300.323, 300.324, 300.503.*'),
    once('| Name of the child | Jordan Rivera |', '| Name of the child, in the form the state’s own filing form asks for it, surname first | Jordan Rivera, also recorded in the District’s documents as Rivera, Jordan, Student ID 4471-0093 |'),
    once('(555) 010-4471\n\ndana.r@example.com', '(555) 010-4471\n\ndana.r@example.com\n\nBar number and jurisdiction: ______________________'),
  ))
  assert.equal(run('render', dir).code, 0)
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'complaint.pdf'))), isEvalSupported: false }).promise
  for (let n = 1; n <= doc.numPages; n++) {
    for (const item of (await (await doc.getPage(n)).getTextContent()).items) {
      if (!item.str.trim()) continue
      assert.ok(item.transform[4] >= 71 && item.transform[4] + item.width <= 541, `page ${n}: “${item.str}” runs outside the margins`)
    }
  }
  rmSync(dir, { recursive: true, force: true })
})

test('a claim points to its facts by label, and the label prints as that paragraph’s number', async () => {
  const dir = copy(examples.proSe)
  assert.equal(run('check', dir).code, 0)
  assert.equal(run('render', dir).code, 0)
  const text = await wholeText(join(dir, 'complaint.pdf'))
  const goal = text.match(/(\d+)\. On September 8, 2025, the individualized education program team adopted an annual goal/)?.[1]
  const nov = text.match(/(\d+)\. The District.s progress report dated November 14, 2025/)?.[1]
  assert.ok(goal && nov, 'the labelled facts are numbered paragraphs')
  const pointer = text.match(/\(paragraphs [^)]*\)/)?.[0]
  assert.ok(pointer, 'the first claim prints a paragraph pointer')
  assert.match(text, new RegExp(`paragraphs ${goal} and|paragraphs [^)]*\\b${nov}\\b`))
  rmSync(dir, { recursive: true, force: true })
})

test('a case name is drawn in a different face, and emphasis never reaches the page', async () => {
  const dir = copy(examples.proSe)
  assert.equal(run('render', dir).code, 0)
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'complaint.pdf'))), isEvalSupported: false }).promise
  const items = []
  for (let n = 1; n <= doc.numPages; n++) items.push(...(await (await doc.getPage(n)).getTextContent()).items)
  const text = items.map((i) => i.str).join(' ')
  // No markdown survives into the pleading, in either direction: no emphasis marks, and the
  // case name is not left in roman with its asterisks stripped.
  assert.doesNotMatch(text, /\*/, 'a markdown emphasis mark reached the page')
  const caseName = items.find((i) => /Endrew/.test(i.str))
  assert.ok(caseName, 'the case name is on the page')
  const body = items.find((i) => /Petitioner Jordan Rivera/.test(i.str) || /is a student eligible/.test(i.str))
  assert.ok(body, 'a paragraph of body text is on the page')
  assert.notEqual(caseName.fontName, body.fontName, 'the case name is set in the same face as the body text')
  rmSync(dir, { recursive: true, force: true })

  // The arithmetic table's multiplication sign is not emphasis, and survives into the draft
  // where the table is rendered.
  const drafted = copy(examples.proSe, once('status: final', 'status: draft'))
  assert.equal(run('render', drafted).code, 0)
  const draftText = await wholeText(join(drafted, 'complaint.DRAFT.pdf'))
  assert.match(draftText, /20 \* 240/, 'a lone asterisk is a multiplication sign, not emphasis')
  assert.deepEqual(draftText.match(/\*/g), ['*'], 'the only asterisk in the draft is that one')
  rmSync(drafted, { recursive: true, force: true })
})

test('a draft carries the review notes behind its banner, and a final carries none', async () => {
  const draft = copy(examples.proSe, once('status: final', 'status: draft'))
  assert.equal(run('render', draft).code, 0)
  const text = await wholeText(join(draft, 'complaint.DRAFT.pdf'))
  assert.match(text, /DRAFT . NOT FOR FILING/)
  assert.match(text, /Remove Before Filing/, 'a draft is where the notes get read and acted on')
  assert.match(text, /Adverse authority/)
  const entries = zipEntries(join(draft, 'complaint.DRAFT.docx'))
  assert.match(entries.get('word/document.xml') ?? '', /pageBreakBefore/, 'the notes start on a new page in the draft')
  // While it is a draft the notes travel inside it, so they are not also written beside it.
  assert.ok(!existsSync(join(draft, 'review-notes.md')))
  rmSync(draft, { recursive: true, force: true })

  const final = copy(examples.proSe)
  assert.equal(run('render', final).code, 0)
  assert.ok(existsSync(join(final, 'review-notes.md')), 'a final render writes the notes beside the complaint')
  assert.doesNotMatch(await wholeText(join(final, 'complaint.pdf')), /Remove Before Filing/)
  rmSync(final, { recursive: true, force: true })
})

test('render never names a draft, or a complaint that fails the check, for filing', async () => {
  const draft = copy(examples.proSe, once('status: final', 'status: draft'))
  assert.equal(run('render', draft).code, 0)
  assert.ok(existsSync(join(draft, 'complaint.DRAFT.pdf')) && !existsSync(join(draft, 'complaint.pdf')))
  assert.match(await pageText(join(draft, 'complaint.DRAFT.pdf'), 1), /DRAFT — NOT FOR FILING/)
  rmSync(draft, { recursive: true, force: true })
  const failing = copy(examples.proSe, once('recorded 21 words per minute', 'recorded 37 words per minute'))
  const r = run('render', failing)
  assert.match(r.out, /check\.mjs found 1 error/)
  assert.ok(existsSync(join(failing, 'complaint.DRAFT.pdf')) && !existsSync(join(failing, 'complaint.pdf')))
  rmSync(failing, { recursive: true, force: true })
})

test('the Word file carries the whole document, and neither file names the software', () => {
  for (const ex of Object.values(examples)) {
    const dir = copy(ex)
    assert.equal(run('render', dir).code, 0)
    const entries = zipEntries(join(dir, 'complaint.docx'))
    const document = entries.get('word/document.xml')
    assert.ok(document && document.length > 10000, 'word/document.xml is there and is not a stub')
    assert.doesNotMatch(document, /Remove Before Filing/, 'the review notes are in the filing-ready Word file')
    assert.match(document, /<w:tbl>/, 'the required-information table is a table')
    assert.match(document, /<w:i\b/, 'a case name or regulation line is set in italic')
    // Nothing on the filed document says what produced it, its properties included. Left unset,
    // the Word writer stamps "Un-named" into lastModifiedBy, which a reader sees in File > Info.
    const core = entries.get('docProps/core.xml') ?? ''
    assert.doesNotMatch(core, /lastModifiedBy>[^<]/, 'the Word properties name a last editor')
    assert.doesNotMatch(core, /dc:creator>[^<]/, 'the Word properties name a creator')
    const everything = [...entries.values()].join('\n')
    const pdf = readFileSync(join(dir, 'complaint.pdf')).toString('latin1')
    for (const name of ['Un-named', 'pdf-lib', 'PDFKit', 'Anthropic', 'Claude', 'ChatGPT', 'OpenAI', 'due-process-complaint', 'Beekman']) {
      assert.ok(!everything.includes(name), `the Word file names ${name}`)
      assert.ok(!pdf.includes(name), `the PDF names ${name}`)
    }
    for (const key of ['/Producer', '/Creator']) assert.ok(!pdf.includes(key), `the PDF carries ${key}`)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ─── The scripts themselves ─────────────────────────────────────────────

test('the scripts run with nothing installed, and are built from src/ unchanged', () => {
  const out = mkdtempSync(join(tmpdir(), 'due-process-build-'))
  const b = spawnSync(process.execPath, [join(root, 'build.mjs'), out], { encoding: 'utf8' })
  assert.equal(b.status, 0, b.stderr)
  for (const f of ['pdf-text.mjs', 'check.mjs', 'render.mjs']) assert.ok(readFileSync(join(out, f)).equals(readFileSync(join(scripts, f))), `${f} is not the build of src/ — run npm run build`)
  // A folder with no node_modules anywhere above it: the scripts must bring everything they use.
  const dir = mkdtempSync(join(tmpdir(), 'due-process-bare-'))
  for (const f of ['documents', 'complaint.md', 'statement.md', 'filing-instructions.md']) cpSync(join(examples.proSe, f), join(dir, f), { recursive: true })
  for (const s of ['pdf-text', 'check', 'render']) {
    const r = spawnSync(process.execPath, [join(out, `${s}.mjs`), dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, `${s}: ${r.stdout}${r.stderr}`)
    assert.doesNotMatch(r.stdout + r.stderr, /Warning|Cannot find/, `${s} printed a warning`)
  }
  assert.ok(existsSync(join(dir, 'complaint.pdf')) && !existsSync(join(scripts, 'package.json')))
  rmSync(out, { recursive: true, force: true })
  rmSync(dir, { recursive: true, force: true })
})

test('the check works when the skill is reached through a symlink, as a personal-skill install is', () => {
  const dir = copy(examples.proSe, once('October 6, 2025, the District’s service delivery log records 90 minutes', 'October 7, 2025, the District’s service delivery log records 90 minutes'))
  const link = join(mkdtempSync(join(tmpdir(), 'due-process-link-')), 'skill')
  symlinkSync(dirname(scripts), link)
  const r = spawnSync(process.execPath, [join(link, 'scripts', 'check.mjs'), dir], { encoding: 'utf8' })
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stdout, /the date .October 7, 2025. is not in the documents/)
  rmSync(dir, { recursive: true, force: true })
})

test('every script prints its usage with no arguments', () => {
  for (const s of ['pdf-text', 'check', 'render']) {
    const r = run(s)
    assert.equal(r.code, 2, s)
    assert.match(r.out, new RegExp(`^usage: node scripts/${s}\\.mjs `), s)
  }
})

test('the exemplar the model copies would itself pass the form the check enforces', async () => {
  // A heading in references/exemplar.md that check.mjs rejects would make every complaint
  // written from it fail, and the notes heading has to match the filer the exemplar declares.
  const { FORM, parseComplaint, FILERS } = await import(pathToFileURL(join(root, 'src', 'check.mjs')).href)
  const ex = readFileSync(join(root, 'skills', 'due-process-complaint', 'references', 'exemplar.md'), 'utf8')
  const block = ex.match(/```markdown\n([\s\S]*?)\n```/)?.[1]
  assert.ok(block, 'the exemplar still carries one fenced markdown document')
  const { meta, sections } = parseComplaint(block)
  for (const key of ['forum', 'state', 'circuit', 'filer', 'petitioner', 'respondent', 'date', 'student', 'address', 'school', 'status']) {
    assert.ok(meta[key] !== undefined, `the exemplar's front matter has no ${key}:`)
  }
  assert.ok(FILERS.includes(meta.filer), `filer: ${meta.filer}`)
  const keys = sections.map((s) => {
    const hit = FORM.find((f) => f.re.test(s.heading))
    assert.ok(hit, `“## ${s.heading}” is not a section check.mjs accepts`)
    return hit.key
  })
  const order = FORM.map((f) => f.key)
  let last = -1
  for (const k of keys) {
    const at = order.indexOf(k)
    assert.ok(at > last, `the exemplar's “${k}” section is out of the order check.mjs enforces`)
    last = at
  }
  for (const f of FORM.filter((x) => x.required)) assert.ok(keys.includes(f.key), `the exemplar has no ${f.key} section`)
  // A parent holds no attorney work product, and check.mjs refuses the wrong heading for the filer.
  const notes = sections.find((s) => s.key === 'notes')
  const counsel = ['attorney', 'legal-aid'].includes(meta.filer)
  assert.equal(/attorney work product/i.test(notes.heading), counsel, `filer: ${meta.filer} with notes headed “${notes.heading}”`)
})

// ─── The package ────────────────────────────────────────────────────────

test('every file that states the version states the same one', () => {
  // An installed plugin updates only when its version changes, and the two manifests are read by
  // different apps — Claude's and OpenAI's. A release that bumps some of these and not others
  // ships an update one platform cannot see. CITATION.cff was left a release behind exactly once.
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  assert.match(version, /^\d+\.\d+\.\d+$/)
  for (const f of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json']) {
    assert.equal(JSON.parse(readFileSync(join(root, f), 'utf8')).version, version, f)
  }
  assert.match(readFileSync(join(root, 'CITATION.cff'), 'utf8'), new RegExp(`^version: ${version}$`, 'm'), 'CITATION.cff')
  assert.match(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), new RegExp(`^## ${version.replace(/\./g, '\\.')} — `, 'm'), 'CHANGELOG.md')
})

test('every state and the District of Columbia carries the circuit whose law binds it', () => {
  const { states } = JSON.parse(readFileSync(join(root, 'skills', 'due-process-complaint', 'references', 'state-rules.json'), 'utf8'))
  assert.equal(states.length, 51)
  const circuits = new Map()
  for (const row of states) {
    assert.ok(row.circuit, `${row.code} has no circuit`)
    assert.match(row.circuit, /^(1st|2d|3d|4th|5th|6th|7th|8th|9th|10th|11th|D\.C\.)$/, `${row.code}: ${row.circuit}`)
    circuits.set(row.circuit, (circuits.get(row.circuit) ?? 0) + 1)
  }
  // The Second Circuit block in references/authorities.md is cited in three states and no others.
  assert.equal(circuits.get('2d'), 3)
  assert.deepEqual(states.filter((r) => r.circuit === '2d').map((r) => r.code).sort(), ['CT', 'NY', 'VT'])
  assert.equal(circuits.get('D.C.'), 1)
  assert.equal([...circuits.values()].reduce((a, b) => a + b, 0), 51)
})

test('the reference files the procedure names all exist', () => {
  const skill = readFileSync(join(root, 'skills', 'due-process-complaint', 'SKILL.md'), 'utf8')
  const named = [...skill.matchAll(/references\/([\w-]+\.(?:md|json))/g)].map((m) => m[1])
  assert.ok(named.length >= 4)
  for (const f of new Set(named)) {
    assert.ok(existsSync(join(root, 'skills', 'due-process-complaint', 'references', f)), `SKILL.md names references/${f} and it is not there`)
  }
})
