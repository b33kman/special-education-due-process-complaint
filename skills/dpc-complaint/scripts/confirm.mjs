// The confirmation gate's record. Only a confirmed reading reaches the
// complaint, and this script is the one place that status is written.
//
//   node scripts/confirm.mjs <case folder> --decisions
//       reads work/decisions.json — { "R12": "confirmed" | "rejected" | { "edit": "the corrected value" } }
//       written by the skill from what the person said at the gate.
//
//   node scripts/confirm.mjs <case folder> --all-verified --by "<name>"
//       confirms every reading verify-readings.mjs marked `verified`, in one
//       go, and records who said so. Only for readings the machine verified
//       on the page; anything else stays unconfirmed. Use it only when the
//       person has read the table and said so explicitly.
//
// Writes work/confirmed.json. Every reading keeps its verification result;
// an edited reading keeps the original value beside the edit.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { caseDir, hasFlag, readJson, writeJson, today } from './lib.mjs'

const argv = process.argv.slice(2)
const dir = caseDir(argv, 'node scripts/confirm.mjs <case folder> --decisions | --all-verified --by "<name>"   — records the person’s decision on each verified reading')
const work = join(dir, 'work')
const verifiedPath = join(work, 'readings.verified.json')
if (!existsSync(verifiedPath)) {
  console.error('run verify-readings.mjs first — nothing unverified may be confirmed')
  process.exit(2)
}
const readings = readJson(verifiedPath)
const byIndex = argv.indexOf('--by')
const by = byIndex !== -1 ? argv[byIndex + 1] : null

let decisions
if (hasFlag(argv, 'all-verified')) {
  if (!by) {
    console.error('--all-verified needs --by "<who confirmed>"')
    process.exit(2)
  }
  decisions = Object.fromEntries(readings.filter((r) => r.verification?.status === 'verified').map((r) => [r.id, 'confirmed']))
} else if (hasFlag(argv, 'decisions')) {
  decisions = readJson(join(work, 'decisions.json'))
} else {
  console.error('say --decisions (from work/decisions.json) or --all-verified --by "<name>"')
  process.exit(2)
}

const out = []
let confirmed = 0, edited = 0, rejected = 0, untouched = 0
for (const r of readings) {
  const d = decisions[r.id]
  const machineOk = r.verification?.status === 'verified' || r.verification?.status === 'unverifiable-image'
  let status = 'unconfirmed'
  let editedValue
  if (d === 'confirmed') {
    if (!machineOk) {
      console.error(`${r.id} cannot be confirmed: verification status is ${r.verification?.status}`)
      process.exit(1)
    }
    status = 'confirmed'
    confirmed++
  } else if (d === 'rejected') {
    status = 'rejected'
    rejected++
  } else if (d && typeof d === 'object' && typeof d.edit === 'string' && d.edit.trim()) {
    // An edit corrects a reading that IS on the page (a typo in the page's
    // own words, a value the person knows better). A reading the verifier
    // could not find is not corrected into existence: it is deleted from
    // readings.json, or the value is typed into case.json as "typed".
    if (!machineOk) {
      console.error(`${r.id} cannot be edited: verification status is ${r.verification?.status} — a reading that is not on its page is deleted, or the value is entered as "typed"`)
      process.exit(1)
    }
    status = 'edited'
    editedValue = d.edit.trim()
    edited++
  } else untouched++
  out.push({
    id: r.id, docId: r.docId, page: r.page, field: r.field, value: r.value,
    ...(r.note ? { note: r.note } : {}),
    status,
    ...(editedValue ? { editedValue } : {}),
    verification: r.verification?.status ?? 'not-run',
    ...(status !== 'unconfirmed' ? { decidedOn: today(), decidedBy: by ?? 'the person drafting' } : {}),
  })
}
writeJson(join(work, 'confirmed.json'), out)
console.log(`confirm: ${confirmed} confirmed, ${edited} edited, ${rejected} rejected, ${untouched} left unconfirmed (of ${out.length})`)
if (untouched) console.log('An unconfirmed reading cannot be cited in the draft. Decide it or leave it out.')
