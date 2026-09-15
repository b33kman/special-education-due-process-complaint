// The check has to be able to fail. Each test copies a worked example, breaks
// one thing a model could plausibly get wrong, and asserts check.mjs refuses
// it — or that render.mjs will not name the result for filing.
//
//   npm install && npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  refused((md) => md.replace('## Statement of the problems', 'The District wrote that it “will never fund an outside evaluation.”\n\n## Statement of the problems'), /the quotation “will never fund an outside evaluation\.” is not word for word/)
})

test('a figure from the person’s own statement passes, and is listed as resting on it', () => {
  const dir = copy(examples.proSe, (md) => md.replace('## Statement of the problems', 'The Parent states that the reading teacher left after 7 weeks, on July 21, 2025.\n\n## Statement of the problems'))
  writeFileSync(join(dir, 'statement.md'), `${readFileSync(join(dir, 'statement.md'), 'utf8')}\nThe reading teacher left after 7 weeks, on July 21, 2025.\n`)
  const r = run('check', dir)
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /From statement\.md, not from any document[\s\S]*· July 21, 2025 —[\s\S]*· 7 —/)
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

test('every script prints its usage with no arguments', () => {
  for (const s of ['pdf-text', 'check', 'render']) {
    const r = run(s)
    assert.equal(r.code, 2, s)
    assert.match(r.out, new RegExp(`^usage: node scripts/${s}\\.mjs `), s)
  }
})
