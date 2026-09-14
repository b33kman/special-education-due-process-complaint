// The back half in one command, so no gate can be skipped:
//
//   node scripts/run-gates.mjs <case folder>
//
//   check-draft → assemble → validate → report
//
// Stops at the first failure and says which. When it finishes, the case
// folder holds complaint.md, complaint.html, sources.md and
// verification-report.md, and the last line says FINAL or DRAFT.

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
if (!args.length) {
  console.error('usage: node scripts/run-gates.mjs <case folder>')
  process.exit(2)
}

for (const step of ['check-draft', 'assemble', 'validate', 'report']) {
  console.log(`\n── ${step} ──`)
  const r = spawnSync(process.execPath, [join(here, `${step}.mjs`), ...args], { stdio: 'inherit' })
  if (r.status !== 0) {
    if (step === 'validate') {
      // validate exits 1 on a blocking finding but the report is still worth writing.
      const rep = spawnSync(process.execPath, [join(here, 'report.mjs'), ...args], { stdio: 'inherit' })
      console.log(`\nStopped at validate: the complaint is a DRAFT, not for filing. Read verification-report.md, fix what it names, and run this again.`)
      process.exit(rep.status === 0 ? 1 : 2)
    }
    console.log(`\nStopped at ${step}. Fix what it named and run this again.`)
    process.exit(1)
  }
}
console.log('\nAll gates passed.')
