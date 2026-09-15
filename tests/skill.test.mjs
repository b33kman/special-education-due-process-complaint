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
    once('dana.r@example.com', 'dana.r@example.com\n\nBar number and jurisdiction: ______________________'),
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
  const dir = copy(examples.proSe, (md) => [
    once('On September 8, 2025, the IEP team adopted the annual', '[#goal] On September 8, 2025, the IEP team adopted the annual'),
    once('On November 14, 2025, the District’s progress report', '[#progress-nov] On November 14, 2025, the District’s progress report'),
    once('*34 C.F.R. §§ 300.320, 300.324.*', '*34 C.F.R. §§ 300.320, 300.324.*\n\nThe facts at paragraphs [#goal] and [#progress-nov] bear on this problem.'),
  ].reduce((m, edit) => edit(m), md))
  const c = run('check', dir)
  assert.equal(c.code, 0, c.out)
  assert.equal(run('render', dir).code, 0)
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'complaint.pdf'))), isEvalSupported: false }).promise
  let text = ''
  for (let n = 1; n <= doc.numPages; n++) text += ' ' + (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ')
  text = text.replace(/\s+/g, ' ')
  const goal = text.match(/(\d+)\. On September 8, 2025, the IEP team adopted the annual/)?.[1]
  const progress = text.match(/(\d+)\. On November 14, 2025, the District.s progress report/)?.[1]
  assert.ok(goal && progress, 'the labelled facts are numbered paragraphs')
  assert.match(text, new RegExp(`The facts at paragraphs ${goal} and ${progress} bear on this problem\\.`))
  assert.doesNotMatch(text, /\[#/)
  rmSync(dir, { recursive: true, force: true })
})

test('a label that points nowhere, starts two paragraphs, or is not lowercase words is refused', () => {
  refused(once('*34 C.F.R. §§ 300.320, 300.324.*', '*34 C.F.R. §§ 300.320, 300.324.*\n\nThe facts at paragraph [#nothing] bear on this problem.'), /“\[#nothing\]” points to no paragraph/)
  refused((md) => once('On November 14, 2025, the District’s progress report', '[#goal] On November 14, 2025, the District’s progress report')(once('On September 8, 2025, the IEP team adopted the annual', '[#goal] On September 8, 2025, the IEP team adopted the annual')(md)), /“\[#goal\]” starts two paragraphs/)
  refused(once('On September 8, 2025, the IEP team adopted the annual', '[#Goal] On September 8, 2025, the IEP team adopted the annual'), /“\[#Goal\]” must be lowercase letters and hyphens/)
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
