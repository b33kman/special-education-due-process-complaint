// The export gate: is this complaint filable, and is every fact on it
// traced to something the person confirmed or a source they can open?
//
//   node scripts/validate.mjs <case folder>
//
// Blocking findings stop a FINAL status: a missing § 300.508(b) element,
// an unsourced caption fact, an unverified state block, a placeholder left
// in the text, a reading cited that was never confirmed. Warnings are
// reported and do not block: a claim with no dated fact, a procedural
// claim without its impact statement, relief a hearing officer generally
// cannot order, an event outside the limitations window, a filing state
// that differs from the home address. Exit 1 on blocking.

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caseDir, readJson, writeJson, isoDate, draftDates, draftMonths, datesIn, monthsIn, numbersIn, numberAppearsIn, longDate, MS_PER_MONTH, printFindings, today } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dir = caseDir(process.argv.slice(2))
const work = join(dir, 'work')

const c = readJson(join(work, 'case.json'))
const confirmed = readJson(join(work, 'confirmed.json'))
const verified = readJson(join(work, 'readings.verified.json'), [])
const state = readJson(join(work, 'state.json'))
const prov = readJson(join(work, 'provenance.json'))
const check = readJson(join(work, 'check-draft.json'), null)
const claimsRef = readJson(join(here, '..', 'references', 'claims.json')).claims
const reliefRef = readJson(join(here, '..', 'references', 'relief.json')).options
const states = readJson(join(here, '..', 'references', 'state-rules.json')).states

const findings = []
const add = (level, code, message, cfr) => findings.push({ level, code, message, ...(cfr ? { cfr } : {}) })
// "typed" is the person's own entry; "counsel" is the same thing under its older name.
const TYPED = new Set(['typed', 'counsel'])
const signer = c.representation?.type === 'counsel' ? 'counsel' : 'the Parent'
const v = (x) => (x && typeof x === 'object' && 'value' in x ? String(x.value ?? '').trim() : String(x ?? '').trim())
const present = (x) => v(x).length > 0
const usable = new Map(confirmed.filter((r) => r.status === 'confirmed' || r.status === 'edited').map((r) => [r.id, r]))
const verifiedOk = new Map(verified.map((r) => [r.id, r.verification?.status]))

// ─── Gates before this one ───────────────────────────────────────────
if (!check || check.findings.some((f) => f.level === 'error')) add('blocking', 'gates-not-passed', 'check-draft has not passed on the current statement')

// ─── Caption facts: present, and traced ───────────────────────────────
function traced(field, label, cfr, required = true) {
  const x = field
  if (!present(x)) {
    if (required) add('blocking', 'missing', `${label} is missing`, cfr)
    return
  }
  const source = x && typeof x === 'object' ? x.source : null
  if (!source) add('blocking', 'unsourced', `${label} ("${v(x)}") names no source — a confirmed reading id, or "typed" for something the person drafting typed`)
  else if (!TYPED.has(source)) {
    if (!usable.has(source)) add('blocking', 'unconfirmed', `${label} cites ${source}, which is not a confirmed reading`)
    else {
      const status = verifiedOk.get(source)
      if (status && status !== 'verified' && status !== 'unverifiable-image') add('blocking', 'unverified-reading', `${label} cites ${source}, which failed verification (${status})`)
      const r = usable.get(source)
      const text = r.status === 'edited' ? r.editedValue : r.value
      if (String(text).trim().toLowerCase() !== v(x).toLowerCase()) add('warning', 'differs-from-reading', `${label} is "${v(x)}" but ${source} reads "${String(text).trim()}" — make sure the difference is deliberate`)
    }
  }
}

traced(c.student?.first, 'the student’s first name', '34 C.F.R. § 300.508(b)(1)')
traced(c.student?.last, 'the student’s last name', '34 C.F.R. § 300.508(b)(1)')
traced(c.student?.middle, 'the student’s middle name', null, false)
traced(c.student?.dob, 'the student’s date of birth', null, false)
traced(c.student?.school, 'the school Student attends', '34 C.F.R. § 300.508(b)(3)')
traced(c.student?.district, 'the school district', null)
traced(c.student?.respondent, 'the respondent as chosen', null, false)
traced(c.student?.disability, 'the eligibility category', null, false)
traced(c.student?.eligibleSince, 'the eligibility date', null, false)
traced(c.parent?.first, 'the parent’s first name', null)
traced(c.parent?.last, 'the parent’s last name', null)
traced(c.parent?.phone, 'the parent’s telephone', null, false)
traced(c.parent?.email, 'the parent’s email', null, false)

if (c.student?.homeless) {
  traced(c.student?.homelessContact, 'contact information for a student with no fixed address', '34 C.F.R. § 300.508(b)(4)')
} else {
  const a = c.student?.address ?? {}
  traced(a.line1, 'the street of the home address', '34 C.F.R. § 300.508(b)(2)')
  traced(a.line2, 'the unit of the home address', null, false)
  traced(a.city, 'the city of the home address', '34 C.F.R. § 300.508(b)(2)')
  traced(a.state, 'the state of the home address', '34 C.F.R. § 300.508(b)(2)')
  traced(a.postalCode, 'the ZIP code of the home address', '34 C.F.R. § 300.508(b)(2)')
  const home = v(a.state).toUpperCase()
  const homeCode = states.find((s) => s.code === home || s.name.toUpperCase() === home)?.code
  if (homeCode && c.state && homeCode !== c.state) add('warning', 'filing-state-mismatch', `the home address is in ${homeCode} and the complaint is captioned for ${c.state} — check which agency is right before it is sent`)
}

if (present(c.student?.dob) && !isoDate(v(c.student?.dob))) add('warning', 'dob-not-a-date', `the date of birth "${v(c.student?.dob)}" is not a single date, so no age is printed`)

// ─── Claims: § 300.508(b)(5) needs a problem WITH facts ───────────────
const statement = prov.provenance.filter((p) => p.section === 'statement')
const claims = c.claims ?? []
if (claims.length === 0) add('blocking', 'no-claims', 'no claim is pleaded', '34 C.F.R. § 300.508(b)(5)')
let anyDated = false
claims.forEach((cl, i) => {
  const ref = claimsRef.find((r) => r.id === cl.id)
  const letter = String.fromCharCode(65 + i)
  const start = statement.findIndex((p) => p.cls === 'subheading' && p.text.startsWith(`${letter}. `))
  const next = statement.findIndex((p, j) => j > start && p.cls === 'subheading')
  const body = statement.slice(start + 1, next === -1 ? undefined : next).filter((p) => p.cls !== 'cite')
  const placeholder = body.some((p) => p.cls === 'placeholder')
  if (placeholder) add('blocking', 'placeholder', `section ${letter} (${ref?.filingHeading ?? cl.id}) still carries a placeholder`, '34 C.F.R. § 300.508(b)(5)')
  const dated = body.some((p) => draftDates(p.text).length > 0)
  if (dated) anyDated = true
  else if (!placeholder) add('warning', 'undated-section', `section ${letter} states no full date; a hearing officer needs when`, '34 C.F.R. § 300.508(b)(5)')
  if (ref?.isProcedural && !String(cl.impact ?? '').trim()) add('warning', 'procedural-without-impact', `${ref.filingHeading}: no statement of how the failure impeded Student’s education or the Parent’s participation`, '34 C.F.R. § 300.513(a)(2)')
  for (const p of body) for (const t of p.tags) {
    if (/^R\d+$/.test(t) && !usable.has(t)) add('blocking', 'unconfirmed', `section ${letter} cites ${t}, which is not confirmed`)
  }
})
if (claims.length && !anyDated) add('blocking', 'no-dated-facts', 'no section states what happened and when', '34 C.F.R. § 300.508(b)(5)')
if (claims.length > 4) add('warning', 'many-claims', `${claims.length} claims — unfocused complaints are harder to try; consider fewer`)

// ─── Relief: § 300.508(b)(6) ─────────────────────────────────────────
const resolution = prov.provenance.filter((p) => p.section === 'resolution' && p.cls !== 'cite')
if (resolution.some((p) => p.cls === 'placeholder') || resolution.length === 0) add('blocking', 'resolution-missing', 'no proposed resolution is stated', '34 C.F.R. § 300.508(b)(6)')
for (const r of c.relief ?? []) {
  const ref = reliefRef.find((o) => o.id === r.id)
  if (ref?.outsideAuthority) add('warning', 'relief-outside-authority', `"${ref.filingLabel}" is generally beyond what a hearing officer can order`)
}

// ─── Who signs ────────────────────────────────────────────────────────
if (c.representation?.type === 'counsel') {
  const k = c.representation.counsel ?? {}
  for (const [key, label] of [['name', 'the attorney’s name'], ['barNumber', 'the bar number'], ['firmName', 'the firm’s name'], ['firmAddress', 'the firm’s address']]) {
    if (!String(k[key] ?? '').trim()) add('blocking', 'signature-incomplete', `${label} is missing from the signature block`)
  }
} else if (c.representation?.type === 'pro-se') {
  if (!present(c.parent?.first) || !present(c.parent?.last)) add('blocking', 'signature-incomplete', 'the parent’s name is missing from the signature block')
} else add('blocking', 'representation-unset', 'representation.type must be "counsel" or "pro-se"')

// ─── The state block: every fact about procedure must be sourced ──────
const sourceIds = new Set((state.sources ?? []).filter((s) => s.url && s.accessed).map((s) => s.id))
const needed = [
  ['seaName', 'the state education agency'],
  ['captionAgency', 'the agency the caption names'],
  ['filesWith', 'where the complaint is filed and who gets the copy'],
  ['filingAddress', 'the filing address'],
  ['channels', 'the accepted filing channels'],
  ['limitationsMonths', 'the limitations window'],
  ['requiredForm', 'whether the state requires its own form'],
  ['additionalContents', 'whether the state requires contents beyond § 300.508(b)'],
  ['serviceRecipients', 'who must be served'],
]
let stateUnverified = 0
for (const [key, label] of needed) {
  const f = state[key]
  const value = f && typeof f === 'object' ? f.value : f
  const has = Array.isArray(value) ? true : value !== null && value !== undefined && String(value).trim() !== ''
  const sourced = Array.isArray(f?.sources) && f.sources.length > 0 && f.sources.every((id) => sourceIds.has(id))
  if (!has) add('blocking', 'state-missing', `state.json has no value for ${label}`)
  else if (!sourced) {
    stateUnverified++
    add('blocking', 'state-unsourced', `${label} ("${Array.isArray(value) ? value.join('; ') : value}") has no web source with a URL and an access date — verify it (references/state-research.md)`)
  }
}
if (state.checkedOn && state.checkedOn < today().slice(0, 4)) add('warning', 'state-stale', 'the state block was checked in an earlier year; re-verify before filing')

// ─── Limitations ──────────────────────────────────────────────────────
const months = Number(v(state.limitationsMonths)) || 24
const filingDate = c.filingDate || today()
const filing = new Date(`${filingDate}T00:00:00Z`)
if (filingDate < today()) add('warning', 'filing-date-past', `the planned filing date ${filingDate} is earlier than today (${today()}); the limitations check ran from it — set filingDate to the real date before filing`)
const ruleSources = (state.limitationsMonths?.sources ?? []).map((id) => (state.sources ?? []).find((s) => s.id === id)?.title).filter(Boolean)
const rule = ruleSources.length ? `${state.name ?? c.state}’s rule as stated at ${ruleSources.join('; ')}` : `34 C.F.R. § 300.507(a)(2)`
const events = (c.events ?? []).map((e) => ({ ...e, iso: isoDate(e.date) })).filter((e) => e.iso)
for (const e of events) {
  const when = new Date(`${e.iso.length === 7 ? e.iso + '-01' : e.iso}T00:00:00Z`)
  if (filing.getTime() - when.getTime() > months * MS_PER_MONTH) {
    add('warning', 'outside-limitations', `event ${e.id} (${e.date}) is more than ${months} months before the filing date ${filingDate}; the window is ${months} months (${rule}). Exceptions exist; whether one applies is ${signer === 'counsel' ? 'counsel’s' : 'the signer’s'} judgment.`)
  }
}
for (const e of c.events ?? []) {
  if (!e.sources?.length) add('warning', 'event-unsourced', `event ${e.id} names no source`)
}

// ─── Anything the state requires beyond the federal six: sourced, and true to its sources ──
const textOf = (tag) => {
  if (/^R\d+$/.test(tag)) { const r = usable.get(tag); return r ? String(r.status === 'edited' ? r.editedValue : r.value) : null }
  if (/^S\d+$/.test(tag)) { const s = (state.sources ?? []).find((x) => x.id === tag); return s ? `${s.title ?? ''} ${s.quote ?? ''}` : null }
  if (/^F\d+$/.test(tag)) return c.facts?.[tag]?.answer ?? null
  if (/^E\d+$/.test(tag)) { const e = (c.events ?? []).find((x) => x.id === tag); return e ? `${e.date} ${longDate(e.date)} ${e.what}` : null }
  return null
}
;(c.additionalContents ?? []).forEach((item, i) => {
  const label = `state-required item ${i + 1}${item.heading ? ` (${item.heading})` : ''}`
  // A blank left on purpose ("no document states the county") is honest, and
  // the person signing has to know it is there before it goes out.
  if (!String(item.text ?? '').trim() || /_{3,}/.test(String(item.text))) add('warning', 'blank-item', `${label} is left blank on the complaint; fill it in by hand or state why it is blank before filing`)
  const texts = (item.sources ?? []).map(textOf)
  if (!item.sources?.length || texts.some((t) => t === null)) { add('blocking', 'unsourced', `${label} cites no confirmed reading or state source`); return }
  const cited = texts.join('\n')
  const cd = datesIn(cited), cm = monthsIn(cited)
  for (const d of draftDates(item.text)) if (!cd.has(d.key)) add('blocking', 'date-not-in-sources', `${label}: "${d.text}" is not in its sources`)
  for (const m of draftMonths(item.text)) if (!cm.has(m.key)) add('blocking', 'month-not-in-sources', `${label}: "${m.text}" is not in its sources`)
  for (const n of numbersIn(item.text)) if (!numberAppearsIn(n, cited)) add('blocking', 'number-not-in-sources', `${label}: the figure "${n}" is not in its sources`)
})

// ─── Nothing identifying software, nothing self-referential ───────────
const all = prov.provenance.map((p) => p.text).join('\n')
if (/generated by|prepared (?:with|using) (?:claude|ai|software)|artificial intelligence/i.test(all)) add('blocking', 'software-named', 'the complaint names the software that produced it')

// ─── Result ───────────────────────────────────────────────────────────
const blocking = findings.filter((f) => f.level === 'blocking')
const status = blocking.length === 0 ? 'FINAL' : 'DRAFT — NOT FOR FILING'
writeJson(join(work, 'validation.json'), { validatedOn: today(), status, stateUnverified, findings })
printFindings('validate', findings.map((f) => ({ ...f, level: f.level === 'blocking' ? 'error' : 'warning' })))
console.log(`\nstatus: ${status}`)
if (blocking.length) process.exit(1)
