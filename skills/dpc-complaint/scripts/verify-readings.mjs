// Step 3 of the skill: every reading in work/readings.json must be on the
// page it claims, word for word. This is the first anti-hallucination
// gate, and it is a machine check, not a promise.
//
//   node scripts/verify-readings.mjs <case folder> [--allow-image-pages]
//
// Writes work/readings.verified.json. Exits 1 if any reading fails, so the
// skill cannot move on to confirmation with an unverified reading in the
// list. A reading from a page with no text layer (a scan) is marked
// `unverifiable-image`; with --allow-image-pages that is not a failure,
// and the confirmation table has to show the person the page instead.

import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caseDir, hasFlag, readJson, writeJson, containsText, snippetAround, isoDate } from './lib.mjs'

const argv = process.argv.slice(2)
const dir = caseDir(argv, 'node scripts/verify-readings.mjs <case folder> [--allow-image-pages]   — every reading in work/readings.json checked on its page, word for word')
const work = join(dir, 'work')
const allowImage = hasFlag(argv, 'allow-image-pages')

const readings = readJson(join(work, 'readings.json'))
const documents = readJson(join(work, 'documents.json'))
const schema = readJson(join(dirname(fileURLToPath(import.meta.url)), '..', 'references', 'extraction-schema.json'))

const knownFields = new Set([
  ...schema.identity.map((f) => f.key),
  ...Object.values(schema.kinds).flatMap((k) => k.fields.map((f) => f.key)),
])

if (!Array.isArray(readings) || readings.length === 0) {
  console.error('work/readings.json is empty — read the documents first (SKILL.md step 2).')
  process.exit(1)
}

const textCache = new Map()
const pagesOf = (docId) => {
  if (!textCache.has(docId)) {
    const p = join(work, 'text', `${docId}.json`)
    textCache.set(docId, existsSync(p) ? readJson(p).pages : null)
  }
  return textCache.get(docId)
}

const seen = new Set()
const out = []
let failed = 0
let unverifiable = 0
let warnings = 0

for (const r of readings) {
  const result = { ...r, verification: { status: 'not-found' } }
  const problems = []

  if (!r.id || !/^R\d+$/.test(r.id)) problems.push('id must look like R12')
  else if (seen.has(r.id)) problems.push(`duplicate id ${r.id}`)
  seen.add(r.id)
  if (!r.field || !knownFields.has(r.field)) {
    result.verification.warning = `field "${r.field}" is not in references/extraction-schema.json`
    warnings++
  }
  if (typeof r.value !== 'string' || !r.value.trim()) problems.push('value is empty')
  if (!Number.isInteger(r.page) || r.page < 1) problems.push('page must be a positive integer')
  if (!documents.some((d) => d.docId === r.docId)) problems.push(`docId "${r.docId}" is not in work/documents.json`)

  const pages = problems.length ? null : pagesOf(r.docId)
  if (!problems.length && !pages) problems.push(`no text for ${r.docId} — run pdf-text.mjs`)
  if (!problems.length && r.page > pages.length) problems.push(`page ${r.page} is past the end (${pages.length} pages)`)

  if (problems.length) {
    result.verification = { status: 'invalid', problems }
    failed++
    out.push(result)
    continue
  }

  const page = pages[r.page - 1]
  // A short value ("7", "NC", "Maya") is somewhere on almost any page, and
  // so is a bare number ("2025", "95833"), so finding it proves nothing. It
  // has to come with the words around it.
  const value = r.value.trim()
  const short = value.length < 5 || (/^[\d\s.,/-]+$/.test(value) && value.length < 8)
  if (short && (typeof r.context !== 'string' || !containsText(r.context, r.value))) {
    result.verification = { status: 'invalid', problems: [`a value of fewer than 5 characters, or a bare number of fewer than 8, needs a "context": the words on the page around it, containing the value — the label and the value ("Grade: 7", "DOB: 04/19/2013"), or the line it sits in ("Willow Creek, CA 95833")`] }
    failed++
    out.push(result)
    continue
  }
  const needle = short ? r.context : r.value
  if (containsText(page.text, needle)) {
    result.verification = { status: 'verified', snippet: snippetAround(page.text, needle) }
  } else if (page.imageOnly) {
    result.verification = { status: 'unverifiable-image', reason: 'no text layer on this page' }
    unverifiable++
    if (!allowImage) failed++
  } else {
    // Wrong page number is the common slip. Say where it actually is.
    const elsewhere = pages.find((p) => containsText(p.text, needle))
    result.verification = elsewhere
      ? { status: 'wrong-page', foundOnPage: elsewhere.n, reason: `the text is on page ${elsewhere.n}, not ${r.page}` }
      : { status: 'not-found', reason: `these words are not on the page — a paraphrase, a correction, or an invention${short ? ' (the context, not just the value, has to be on the page)' : ''}` }
    failed++
  }

  if (/\.(date|dob)$/.test(r.field) || r.field === 'progress.period' || r.field === 'serviceLog.period') {
    const iso = isoDate(r.value)
    if (!iso && /\.(date|dob)$/.test(r.field)) {
      result.verification.dateNote = 'not a single date as written; it will be shown as written and cannot order a chronology'
    }
  }
  out.push(result)
}

writeJson(join(work, 'readings.verified.json'), out)

const verified = out.filter((r) => r.verification.status === 'verified').length
console.log(`\nverify-readings: ${verified} verified, ${unverifiable} unverifiable (image pages), ${out.length - verified - unverifiable} failed, ${warnings} warning(s), of ${out.length}`)
for (const r of out) {
  const v = r.verification
  if (v.status !== 'verified') {
    console.log(`  ✗ ${r.id} ${r.docId} p.${r.page} ${r.field}: ${v.status}${v.reason ? ' — ' + v.reason : ''}${v.problems ? ' — ' + v.problems.join('; ') : ''}`)
    console.log(`      value: ${JSON.stringify(String(r.value).slice(0, 160))}`)
  }
  if (v.warning) console.log(`  ! ${r.id}: ${v.warning}`)
  if (v.dateNote) console.log(`  ! ${r.id}: ${v.dateNote}`)
}
if (failed > 0) {
  console.log('\nFix or delete every failed reading and run this again. Do not confirm an unverified reading.')
  process.exit(1)
}
console.log('\nEvery reading is on its page. Next: the confirmation gate (SKILL.md step 3).')
