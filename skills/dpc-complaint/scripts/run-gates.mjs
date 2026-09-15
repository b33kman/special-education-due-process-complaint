// The back half in one command, so no gate can be skipped:
//
//   node scripts/run-gates.mjs <case folder>
//
//   check-draft → assemble → validate → render → report
//
// Stops at the first failure and says which. When it finishes, the case
// folder holds complaint.pdf, complaint.docx, complaint.md, sources.md and
// verification-report.md, and the status line says FINAL or DRAFT. The
// deliverables of an earlier run are removed first, so a run that stops
// leaves nothing stale behind that still says FINAL.

import { rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
if (!args.length) {
  console.error('usage: node scripts/run-gates.mjs <case folder>   — check-draft → assemble → validate → render → report, stopping at the first failure')
  process.exit(2)
}
const dir = resolve(args.find((a) => !a.startsWith('--')))
for (const f of ['complaint.pdf', 'complaint.docx', 'complaint.md', 'complaint.html', 'sources.md', 'verification-report.md', join('work', 'validation.json'), join('work', 'complaint.json'), join('work', 'provenance.json')]) {
  rmSync(join(dir, f), { force: true })
}

const step = (name) => {
  console.log(`\n── ${name} ──`)
  return spawnSync(process.execPath, [join(here, `${name}.mjs`), ...args], { stdio: 'inherit' }).status
}
const stop = (name) => {
  console.log(`\nStopped at ${name}. Fix what it named and run this again.`)
  process.exit(1)
}

if (step('check-draft') !== 0) stop('check-draft')
if (step('assemble') !== 0) stop('assemble')
const validated = step('validate')
// validate exits 1 on a blocking finding; the documents are still rendered
// (marked DRAFT — NOT FOR FILING) and the report is still written, because
// they are what says what to fix.
if (step('render') !== 0) stop('render')
if (step('report') !== 0) stop('report')
if (validated !== 0) {
  console.log('\nStopped at validate: the complaint is a DRAFT, not for filing. Read verification-report.md, fix what it names, and run this again.')
  process.exit(1)
}
console.log('\nAll gates passed.')
