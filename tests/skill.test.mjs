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
  for (const f of ['documents', 'complaint.md', 'statement.md']) cpSync(join(from, f), join(dir, f), { recursive: true })
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
const once = (from, to) => (md) => {
  assert.ok(md.includes(from), `the example no longer contains: ${from}`)
  return md.replace(from, to)
}
async function pageText(file, n) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false }).promise
  return (await (await doc.getPage(n < 0 ? doc.numPages : n)).getTextContent()).items.map((i) => i.str).join(' ')
}

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
    assert.match(first, /I\. INTRODUCTION/)
    assert.match(first, /1\.\s+Petitioner/)
    assert.doesNotMatch(first, /DRAFT/)
    assert.match(await pageText(join(dir, 'complaint.pdf'), -1), /CERTIFICATE OF SERVICE/)
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a date no document or statement gives is refused', () => {
  refused(once('On October 6, 2025, the small-group', 'On October 7, 2025, the small-group'), /the date “October 7, 2025” is not in the documents/)
})

test('a figure no source gives is refused — including one that is only the tail of the real figure', () => {
  refused(once('recorded 21 words per minute', 'recorded 37 words per minute'), /the figure “37” is not in the documents/)
  refused(once('provides for 240 minutes per week', 'provides for 40 minutes per week'), /the figure “40” is not in the documents/)
})

test('a quotation that is not word for word in a source is refused', () => {
  refused((md) => md.replace('## Statement of the problems', 'The District wrote that it “will never fund an outside evaluation.”\n\n## Statement of the problems'), /the quotation “will never fund an outside evaluation” is not word for word/)
})

test('a figure from the person’s own statement passes, and is listed as resting on it', () => {
  const dir = copy(examples.proSe, (md) => md.replace('## Statement of the problems', 'The Parent states that the reading teacher left after 7 weeks, on July 21, 2025.\n\n## Statement of the problems'))
  writeFileSync(join(dir, 'statement.md'), `${readFileSync(join(dir, 'statement.md'), 'utf8')}\nThe reading teacher left after 7 weeks, on July 21, 2025.\n`)
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /From statement\.md, not from any document[\s\S]*· July 21, 2025 —[\s\S]*· 7 weeks —/)
  rmSync(dir, { recursive: true, force: true })
})

test('a period inside the closing quotation mark is the writer’s, and a figure is traced with its unit', () => {
  const dir = copy(examples.proSe, (md) => md.replace('## Statement of the problems', 'The District’s service log describes the instruction as “delivered in a small-group setting.”\n\n## Statement of the problems'))
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /· 15 days —/, 'within 15 days comes from the statement, though a document says 15%')
  rmSync(dir, { recursive: true, force: true })
})

test('nothing runs outside the margins: a long forum name, claim heading, regulation line or signature line wraps', async () => {
  const dir = copy(examples.proSe, (md) => [
    once('forum: Office of Administrative Hearings', 'forum: Office of Administrative Hearings, Special Education Division, Department of General Services'),
    once('### A. Failure to provide an adequate individualized education program', '### A. Failure to provide an adequate individualized education program and to revise it when the progress reports recorded no progress toward the annual reading fluency goal'),
    once('*34 C.F.R. §§ 300.320, 300.324.*', '*34 C.F.R. §§ 300.101, 300.300, 300.301, 300.303, 300.304, 300.305, 300.306, 300.320, 300.321, 300.323, 300.324, 300.503.*'),
    once('(555) 010-4471\n\ndana.r@example.com', '(555) 010-4471\n\ndana.r@example.com\n\nBar number and jurisdiction: ______________________'),
  ].reduce((m, edit) => edit(m), md))
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
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'complaint.pdf'))), isEvalSupported: false }).promise
  let text = ''
  for (let n = 1; n <= doc.numPages; n++) text += ' ' + (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ')
  text = text.replace(/\s+/g, ' ')
  // The example's first claim points at the goal and the three progress reports it labels.
  const goal = text.match(/(\d+)\. On September 8, 2025, the IEP team adopted an annual reading fluency goal/)?.[1]
  const nov = text.match(/(\d+)\. On November 14, 2025, the District.s progress report/)?.[1]
  assert.ok(goal && nov, 'the labelled facts are numbered paragraphs')
  const pointer = text.match(/\(paragraphs [^)]*\)/)?.[0]
  assert.ok(pointer, 'the first claim prints a paragraph pointer')
  assert.match(pointer, new RegExp(`\\b${goal}\\b`))
  assert.match(pointer, new RegExp(`\\b${nov}\\b`))
  // Nothing a label is written as ever reaches the filed page.
  assert.doesNotMatch(text, /\[#/)
  rmSync(dir, { recursive: true, force: true })
})

// The worked example's first claim is replaced with `claim`. Its chronology already carries
// the labels the example's own claims point to, [#goal] among them.
const claimIs = (claim) => (md) => {
  const [a] = md.match(/## Statement of the problems[\s\S]*?(?=### B\.)/)
  return md.replace(a, `## Statement of the problems\n\n### A. Failure to provide an adequate individualized education program\n\n*34 C.F.R. §§ 300.320, 300.324.*\n\n${claim}\n\n`)
}
const passes = (edit, from) => {
  const dir = copy(from, edit)
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  rmSync(dir, { recursive: true, force: true })
}

test('a claim that only lists the paragraphs that bear on it is refused, however long the list', () => {
  const says = /says only which paragraphs bear on the problem/
  refused(claimIs('The facts at paragraphs [#goal] and [#goal] bear on this problem.'), says)
  // Punctuation is not substance: a longer list of the same pointers buys nothing.
  refused(claimIs(`The paragraphs that bear on this problem are ${Array(20).fill('[#goal]').join(', ')}.`), says)
  // Nor is the pointer's own vocabulary, repeated.
  refused(claimIs('Paragraph [#goal], paragraph [#goal] and paragraph [#goal] are the paragraphs for this problem.'), says)
})

test('a claim that says what the problem is passes, however short, and points to the chronology', () => {
  // One sentence of substance and a pointer — the shape the procedure asks for.
  passes(claimIs('The District did not deliver the reading instruction the September 8, 2025 IEP requires (paragraph [#goal]).'))
  // A claim whose new content is what the District did NOT do carries no date or figure of its own.
  passes(claimIs('The District has not revised the reading goal or the services it provides since (paragraph [#goal]).'))
})

test('a label belongs on a fact paragraph, and only a claim points to one', () => {
  const belongs = /belongs on a paragraph of the statement of facts/
  const onlyClaims = /a paragraph number belongs to a claim/
  // A claim that labels itself and points at itself says nothing about the chronology.
  refused(claimIs('[#self] The District did not deliver the reading instruction the IEP requires (paragraph [#self]).'), belongs)
  // A remedy sends the reader to a paragraph number instead of naming its own figures.
  refused((md) => claimIs('The District did not deliver the reading instruction the September 8, 2025 IEP requires (paragraph [#goal]).')(md)
    .replace('(d) implement the IEP as written', '(d) implement the IEP as written, for the weeks at paragraph [#goal],'), onlyClaims)
  // A label left in the signature or the certificate would print as “[#sig]” on the filed PDF.
  refused(once('Respectfully submitted,', '[#sig] Respectfully submitted,'), belongs)
  refused(once('The Parent certifies that on the date', '[#cert] The Parent certifies that on the date'), belongs)
})

test('a label that points nowhere, starts two paragraphs, or is not lowercase words is refused', () => {
  refused(once('*34 C.F.R. §§ 300.320, 300.324.*', '*34 C.F.R. §§ 300.320, 300.324.*\n\nThe facts at paragraph [#nothing] bear on this problem.'), /“\[#nothing\]” points to no paragraph/)
  refused(once('[#nov] On November 14, 2025', '[#goal] On November 14, 2025'), /“\[#goal\]” starts two paragraphs/)
  refused(once('[#goal] On September 8, 2025', '[#Goal] On September 8, 2025'), /“\[#Goal\]” must be lowercase letters and hyphens/)
})

test('a space the extractor left before a semicolon does not refuse the District’s own words', () => {
  // pdf.js ends a text item at a font or position change, so an extracted line can read
  // “on leave ; no substitute”. The writer quotes the page as it reads and is refused,
  // with no way out but to drop the quotation — and 1.0.13 asks for far more of them.
  const dir = copy(examples.proSe, once('On October 6, 2025, the small-group reading block was discontinued when the reading intervention position became vacant.',
    'On October 6, 2025, the small-group reading block was discontinued. The service log for that week reads, “teacher on leave; no substitute.”'))
  writeFileSync(join(dir, 'work', 'text', 'log-transcribed.txt'), 'Week of October 6, 2025: no reading instruction delivered — teacher on leave ; no substitute .\n')
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  rmSync(dir, { recursive: true, force: true })

  // And the latitude is only that. Closing up a space the writer put between two of the page's
  // own words is rewording, not an extractor artefact, and the quotation is still refused —
  // otherwise this is just the loose match that quotations are deliberately held out of.
  const d2 = copy(examples.proSe, once('On October 6, 2025, the small-group reading block was discontinued when the reading intervention position became vacant.',
    'On October 6, 2025, the small-group reading block was discontinued. The service log for that week reads, “teacher onleave; no substitute.”'))
  writeFileSync(join(d2, 'work', 'text', 'log-transcribed.txt'), 'Week of October 6, 2025: no reading instruction delivered — teacher on leave ; no substitute .\n')
  const r2 = run('check', d2)
  assert.equal(r2.code, 1, r2.out)
  assert.match(r2.out, /the quotation “teacher onleave; no substitute” is not word for word/)
  rmSync(d2, { recursive: true, force: true })
})

test('the scripts run with nothing installed, and are built from src/ unchanged', () => {
  const out = mkdtempSync(join(tmpdir(), 'due-process-build-'))
  const b = spawnSync(process.execPath, [join(root, 'build.mjs'), out], { encoding: 'utf8' })
  assert.equal(b.status, 0, b.stderr)
  for (const f of ['pdf-text.mjs', 'check.mjs', 'render.mjs']) assert.ok(readFileSync(join(out, f)).equals(readFileSync(join(scripts, f))), `${f} is not the build of src/ — run npm run build`)
  // A folder with no node_modules anywhere above it: the scripts must bring everything they use.
  const dir = mkdtempSync(join(tmpdir(), 'due-process-bare-'))
  for (const f of ['documents', 'complaint.md', 'statement.md']) cpSync(join(examples.proSe, f), join(dir, f), { recursive: true })
  for (const s of ['pdf-text', 'check', 'render']) {
    const r = spawnSync(process.execPath, [join(out, `${s}.mjs`), dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, `${s}: ${r.stdout}${r.stderr}`)
    assert.doesNotMatch(r.stdout + r.stderr, /Warning|Cannot find/, `${s} printed a warning`)
  }
  assert.ok(existsSync(join(dir, 'complaint.pdf')) && !existsSync(join(scripts, 'package.json')))
  rmSync(out, { recursive: true, force: true })
  rmSync(dir, { recursive: true, force: true })
})

test('a missing required element is refused: the school, the resolution, the address', () => {
  refused((md) => md.replace(/^school: .*$/m, 'school:'), /the front matter has no school/)
  refused((md) => md.replace(/## Proposed resolution[\s\S]*?(?=## Signature)/, ''), /no “Proposed resolution” section/)
  refused((md) => md.replace(/^address: .*$/m, 'address: 1418 Alder Street, Willow Creek, CA 95834'), /address: “CA 95834” is not in the documents/)
})

test('a section out of the approved order, or not in it, is refused', () => {
  refused((md) => {
    const facts = md.match(/## Statement of facts[\s\S]*?(?=## Statement of the problems)/)[0]
    return md.replace(facts, '').replace('## Signature', `${facts}## Signature`)
  }, /“## Statement of facts” is out of order/)
  refused(once('## Statement of facts', '## Background'), /“## Background” is not a section of the complaint/)
})

test('render never names a draft, or a complaint that fails the check, for filing', async () => {
  const draft = copy(examples.proSe, once('status: final', 'status: draft'))
  assert.equal(run('render', draft).code, 0)
  assert.ok(existsSync(join(draft, 'complaint.DRAFT.pdf')) && !existsSync(join(draft, 'complaint.pdf')))
  assert.match(await pageText(join(draft, 'complaint.DRAFT.pdf'), 1), /DRAFT — NOT FOR FILING/)
  rmSync(draft, { recursive: true, force: true })
  const failing = copy(examples.proSe, once('recorded 21 words per minute', 'recorded 37 words per minute'))
  const r = run('render', failing)
  assert.match(r.out, /DRAFT: check\.mjs found 1 error/)
  assert.ok(existsSync(join(failing, 'complaint.DRAFT.pdf')) && !existsSync(join(failing, 'complaint.pdf')))
  rmSync(failing, { recursive: true, force: true })
})

test('the check works when the skill is reached through a symlink, as a personal-skill install is', () => {
  const dir = copy(examples.proSe, once('On October 6, 2025, the small-group', 'On October 7, 2025, the small-group'))
  const link = join(mkdtempSync(join(tmpdir(), 'due-process-link-')), 'skill')
  symlinkSync(dirname(scripts), link)
  const r = spawnSync(process.execPath, [join(link, 'scripts', 'check.mjs'), dir], { encoding: 'utf8' })
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stdout, /the date “October 7, 2025” is not in the documents/)
  rmSync(dir, { recursive: true, force: true })
})

test('every script prints its usage with no arguments', () => {
  for (const s of ['pdf-text', 'check', 'render']) {
    const r = run(s)
    assert.equal(r.code, 2, s)
    assert.match(r.out, new RegExp(`^usage: node scripts/${s}\\.mjs `), s)
  }
})
