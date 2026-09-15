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

import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caseDir, readJson, writeJson, readText, isoDate, draftDates, draftMonths, datesIn, monthsIn, numbersIn, numberAppearsIn, quotedSpans, containsExact, normalizeForMatch, longDate, ageOn, MS_PER_MONTH, printFindings, today } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dir = caseDir(process.argv.slice(2), 'node scripts/validate.mjs <case folder>   — the export gate: every § 300.508(b) element, every caption fact traced, the state block verified, the limitations window')
const work = join(dir, 'work')

const c = readJson(join(work, 'case.json'))
const confirmed = readJson(join(work, 'confirmed.json'))
const verified = readJson(join(work, 'readings.verified.json'))
const documents = readJson(join(work, 'documents.json'), [])
const state = readJson(join(work, 'state.json'))
const stateCheck = readJson(join(work, 'state-check.json'), null)
const prov = readJson(join(work, 'provenance.json'))
const check = readJson(join(work, 'check-draft.json'), null)
const claimsRef = readJson(join(here, '..', 'references', 'claims.json')).claims
const reliefRef = readJson(join(here, '..', 'references', 'relief.json')).options
const states = readJson(join(here, '..', 'references', 'state-rules.json')).states

const findings = []
const add = (level, code, message, cfr) => findings.push({ level, code, message, ...(cfr ? { cfr } : {}) })
// "typed" marks a value the person entered themselves; anything else is a reading id.
const TYPED = new Set(['typed'])
const MACHINE_OK = new Set(['verified', 'unverifiable-image'])
const signer = c.representation?.type === 'counsel' ? 'counsel' : 'the Parent'
const filingDate = c.filingDate || today()
const stateName = state.name || states.find((s) => s.code === (state.code || c.state))?.name || c.state
const v = (x) => (x && typeof x === 'object' && 'value' in x ? String(x.value ?? '').trim() : String(x ?? '').trim())
const present = (x) => v(x).length > 0
const usable = new Map(confirmed.filter((r) => r.status === 'confirmed' || r.status === 'edited').map((r) => [r.id, r]))
const verifiedOk = new Map(verified.map((r) => [r.id, r.verification?.status]))

// ─── Gates before this one ───────────────────────────────────────────
if (!check || check.findings.some((f) => f.level === 'error')) add('blocking', 'gates-not-passed', 'check-draft has not passed on the current statement')
else {
  const draft = readText(join(work, 'statement.annotated.md'))
  const inputsSha = createHash('sha256').update(draft).update(JSON.stringify([c.events ?? [], c.facts ?? {}, c.claims ?? [], c.relief ?? [], c.hearing ?? null])).digest('hex')
  if (check.inputsSha && check.inputsSha !== inputsSha) add('blocking', 'gates-not-passed', 'check-draft passed an earlier version of the statement or of case.json — run it again on the current files')
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(filingDate) || !isoDate(filingDate)) add('blocking', 'filing-date-invalid', `filingDate must be a date written YYYY-MM-DD (got "${filingDate}") — the caption, the limitations check and the age all read it`)

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
      if (!MACHINE_OK.has(status)) add('blocking', 'unverified-reading', `${label} cites ${source}, which the verifier did not find on its page (${status ?? 'not verified'})`)
      const r = usable.get(source)
      const text = r.status === 'edited' ? r.editedValue : r.value
      // A caption fact prints its reading. A value that differs from the
      // reading it cites is traced to words that say something else; the
      // routes are to print the reading as read, to edit the reading at the
      // confirmation gate, or to enter the value as "typed".
      const same = (a, b) => normalizeForMatch(a).replace(/[.,;:]+$/, '') === normalizeForMatch(b).replace(/[.,;:]+$/, '')
      if (!same(text, v(x))) add('blocking', 'differs-from-reading', `${label} is "${v(x)}" but ${source} reads "${String(text).trim()}" — print the reading as read, edit the reading at the confirmation gate, or enter the value with "source": "typed"`)
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
traced(c.student?.county, 'the county in the caption', null, false)
traced(c.student?.disability, 'the eligibility category', null, false)
traced(c.student?.eligibleSince, 'the eligibility date', null, false)
traced(c.parent?.first, 'the parent’s first name', null)
traced(c.parent?.last, 'the parent’s last name', null)
traced(c.parent?.second?.first, 'the second parent’s first name', null, false)
traced(c.parent?.second?.last, 'the second parent’s last name', null, false)
traced(c.hearing?.interpreter, 'the interpreter language', null, false)
traced(c.hearing?.accommodations, 'the hearing accommodations', null, false)
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
// IDEA rights transfer to the student at the state's age of majority
// (34 C.F.R. § 300.520) unless the state provides otherwise; a parent then
// files only where the rights did not transfer. The caption never calls an
// adult "a minor", and whether the rights transferred is the signer's call.
const ageAtFiling = ageOn(v(c.student?.dob), filingDate)
if (ageAtFiling !== null && ageAtFiling >= 18) add('warning', 'adult-student', `Student will be ${ageAtFiling} on the filing date ${filingDate}. In most states IDEA rights transfer to the student at the age of majority (34 C.F.R. § 300.520); if they have, the student is the petitioner and signs. The caption omits "a minor"; whether the rights transferred is ${signer === 'counsel' ? 'counsel’s' : 'the signer’s'} judgment.`)

// ─── The inventory: every document classified at step 2 ───────────────
for (const d of documents) {
  if (!d.unreadable && !(d.kinds ?? []).length) add('warning', 'document-unclassified', `${d.file} has no kind in work/documents.json — step 2’s inventory (kinds, documentDate, title) was not written for it`)
}

// ─── Claims: § 300.508(b)(5) needs a problem WITH facts ───────────────
const statement = prov.provenance.filter((p) => p.section === 'statement')
const claims = c.claims ?? []
if (claims.length === 0) add('blocking', 'no-claims', 'no claim is pleaded', '34 C.F.R. § 300.508(b)(5)')
let anyDated = false
claims.forEach((cl, i) => {
  const ref = claimsRef.find((r) => r.id === cl.id) ?? (cl.id === 'other' ? { filingHeading: String(cl.heading ?? '').trim(), isProcedural: Boolean(cl.isProcedural) } : undefined)
  if (cl.id === 'other' && !ref.filingHeading) add('blocking', 'claim-other-incomplete', `claim ${i + 1} is "other" but carries no heading — the person supplies the heading (and, for counsel, the regulation)`)
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
})
if (claims.length && !anyDated) add('blocking', 'no-dated-facts', 'no section states what happened and when', '34 C.F.R. § 300.508(b)(5)')
if (claims.length > 4) add('warning', 'many-claims', `${claims.length} claims are pleaded; each section needs its own dated facts (checked above)`)

// ─── Every reading cited anywhere on the pleading: confirmed, and found on its page ──
const paragraphName = (p) => (p.n ? `paragraph ${p.n}` : `the ${p.section}`)
for (const p of prov.provenance) {
  for (const t of p.tags) {
    if (!/^R\d+$/.test(t)) continue
    if (!usable.has(t)) add('blocking', 'unconfirmed', `${paragraphName(p)} cites ${t}, which is not confirmed`)
    else if (!MACHINE_OK.has(verifiedOk.get(t))) add('blocking', 'unverified-reading', `${paragraphName(p)} cites ${t}, which the verifier did not find on its page (${verifiedOk.get(t) ?? 'not verified'})`)
  }
}

// ─── Relief: § 300.508(b)(6) ─────────────────────────────────────────
const resolution = prov.provenance.filter((p) => p.section === 'resolution' && p.cls !== 'cite')
if (resolution.some((p) => p.cls === 'placeholder') || resolution.length === 0) add('blocking', 'resolution-missing', 'no proposed resolution is stated', '34 C.F.R. § 300.508(b)(6)')
for (const r of c.relief ?? []) {
  const ref = reliefRef.find((o) => o.id === r.id)
  if (!ref) { add('blocking', 'relief-unknown', `relief id "${r.id}" is not in references/relief.json`); continue }
  if (ref.requiresDetail && !String(r.detail ?? '').trim()) add('blocking', 'relief-detail-missing', `relief "${r.id}" has no text — it prints nothing; give the relief in the pleading’s own words or remove it`, '34 C.F.R. § 300.508(b)(6)')
  if (ref.outsideAuthority) add('warning', 'relief-outside-authority', `"${ref.filingLabel}" is generally beyond what a hearing officer can order`)
  if (ref.counselOnly && c.representation?.type !== 'counsel') add('warning', 'relief-counsel-only', `"${ref.filingLabel}" belongs on a represented filing; a self-represented parent cannot recover attorneys’ fees`)
}
if (c.expedited === true && !claims.some((cl) => cl.id === 'discipline')) add('warning', 'expedited-without-discipline', 'an expedited hearing is requested, but no discipline claim is pleaded — § 300.532(c) provides it for disciplinary placement disputes')
if (c.mediation && !['requested', 'declined'].includes(c.mediation)) add('warning', 'mediation-unset', `mediation is "${c.mediation}"; use "requested" or "declined", or leave it null`)

// ─── Who signs ────────────────────────────────────────────────────────
if (c.representation?.type === 'counsel') {
  const k = c.representation.counsel ?? {}
  for (const [key, label] of [['name', 'the attorney’s name'], ['barNumber', 'the bar or registration number'], ['firmName', 'the firm’s name'], ['firmAddress', 'the firm’s address']]) {
    if (!String(k[key] ?? '').trim()) add('blocking', 'signature-incomplete', `${label} is missing from the signature block`)
  }
} else if (c.representation?.type === 'pro-se') {
  if (!present(c.parent?.first) || !present(c.parent?.last)) add('blocking', 'signature-incomplete', 'the parent’s name is missing from the signature block')
} else add('blocking', 'representation-unset', 'representation.type must be "counsel" or "pro-se"')

// ─── The state block: every fact about procedure must be sourced, and every
// source's quotation verified on its page (verify-state.mjs) ─────────────
const sourceIds = new Set((state.sources ?? []).filter((s) => s.url && s.accessed).map((s) => s.id))
const sha = (s) => createHash('sha256').update(String(s ?? '')).digest('hex')
const verifiedQuote = new Set()
if (!stateCheck) add('blocking', 'state-unverified', 'the state sources have not been checked against their pages — run node scripts/verify-state.mjs <case>')
else {
  for (const s of state.sources ?? []) {
    const r = (stateCheck.sources ?? []).find((x) => x.id === s.id)
    if (!r) add('blocking', 'state-check-stale', `source ${s.id} was added after verify-state ran — run it again`)
    else if (r.status !== 'verified') add('blocking', 'state-quote-unverified', `source ${s.id}’s quotation did not verify on its page (${r.status}${r.detail ? `: ${r.detail}` : ''})`)
    else if (r.quoteSha && r.quoteSha !== sha(s.quote)) add('blocking', 'state-check-stale', `source ${s.id}’s quotation changed after verify-state ran — run it again`)
    else verifiedQuote.add(s.id)
  }
}
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
  if (has && ['additionalContents', 'serviceRecipients'].includes(key) && !Array.isArray(value)) add('blocking', 'state-invalid', `${label} must be a list (an array of strings), even a list of one`)
  if (has && key === 'limitationsMonths' && !/^\d+$/.test(String(value).trim())) add('blocking', 'state-invalid', `the limitations window must be a whole number of months (got "${value}")`)
  if (!has) add('blocking', 'state-missing', `state.json has no value for ${label}`)
  else if (!sourced) {
    stateUnverified++
    add('blocking', 'state-unsourced', `${label} ("${Array.isArray(value) ? value.join('; ') : value}") has no web source with a URL and an access date — verify it (references/state-research.md)`)
  } else if (stateCheck && !f.sources.every((id) => verifiedQuote.has(id))) {
    stateUnverified++
  }
}
if (state.checkedOn && state.checkedOn < today().slice(0, 4)) add('warning', 'state-stale', 'the state block was checked in an earlier year; re-verify before filing')

// ─── Limitations ──────────────────────────────────────────────────────
const months = /^\d+$/.test(v(state.limitationsMonths)) ? Number(v(state.limitationsMonths)) : 24
const filing = new Date(`${filingDate}T00:00:00Z`)
if (filingDate < today()) add('warning', 'filing-date-past', `the planned filing date ${filingDate} is earlier than today (${today()}); the limitations check ran from it — set filingDate to the real date before filing`)
const ruleSources = (state.limitationsMonths?.sources ?? []).map((id) => (state.sources ?? []).find((s) => s.id === id)?.title).filter(Boolean)
const rule = ruleSources.length ? `${stateName}’s rule as stated at ${ruleSources.join('; ')}` : `34 C.F.R. § 300.507(a)(2)`
const events = (c.events ?? []).map((e) => ({ ...e, iso: isoDate(e.date) })).filter((e) => e.iso)
for (const e of events) {
  const when = new Date(`${e.iso.length === 7 ? e.iso + '-01' : e.iso}T00:00:00Z`)
  if (filing.getTime() - when.getTime() > months * MS_PER_MONTH) {
    add('warning', 'outside-limitations', `event ${e.id} (${e.date}) is more than ${months} months before the filing date ${filingDate}; the window is ${months} months (${rule}). Exceptions exist, and the window runs from when the Parent knew or should have known; if the Parent learned of it later, the chronology should say when. Whether an exception applies is ${signer === 'counsel' ? 'counsel’s' : 'the signer’s'} judgment.`)
  }
}
// The chronology prints as the statement of facts, so an event with no source
// is a sentence on the pleading that nothing supports, and an event with no
// date the chronology can read prints nonsense at the head of a paragraph.
for (const e of c.events ?? []) {
  if (!e.sources?.length) add('blocking', 'unsourced', `event ${e.id} ("${String(e.what ?? '').slice(0, 60)}") names no source`)
  else for (const t of e.sources) {
    if (/^R\d+$/.test(t) && !usable.has(t)) add('blocking', 'unconfirmed', `event ${e.id} cites ${t}, which is not a confirmed reading`)
  }
  if (!isoDate(e.date)) add('blocking', 'event-undated', `event ${e.id} has no date the chronology can order ("${e.date}") — a date written YYYY-MM-DD or YYYY-MM, as the sources state it`)
}

// ─── Anything the state requires beyond the federal six: sourced, and true to its sources ──
const textOf = (tag) => {
  if (/^R\d+$/.test(tag)) { const r = usable.get(tag); return r ? String(r.status === 'edited' ? r.editedValue : r.value) : null }
  if (/^S\d+$/.test(tag)) { const s = (state.sources ?? []).find((x) => x.id === tag); return s ? `${s.title ?? ''} ${s.quote ?? ''}` : null }
  if (/^F\d+$/.test(tag)) return c.facts?.[tag]?.answer ?? null
  if (/^E\d+$/.test(tag)) { const e = (c.events ?? []).find((x) => x.id === tag); return e ? `${e.date} ${longDate(e.date)} ${e.what}` : null }
  return null
}
// Every item the state block lists as required has an entry: either `text`
// that prints under the state's section, or `met`, naming where the fixed
// form of the pleading already states it (the date of birth in section II,
// the county in the caption). Nothing the state requires can be dropped by
// leaving it out of case.json.
const required = Array.isArray(state.additionalContents?.value) ? state.additionalContents.value : []
required.forEach((req, i) => {
  const n = i + 1
  if (!(c.additionalContents ?? []).some((item) => Number(item.requirement) === n)) {
    add('blocking', 'state-item-missing', `state-required item ${n} (“${String(req).slice(0, 90)}${String(req).length > 90 ? '…' : ''}”) has no entry in case.json → additionalContents: add one with "requirement": ${n} and either "text" to print or "met" naming where the pleading already states it`)
  }
})
;(c.additionalContents ?? []).forEach((item, i) => {
  const label = `state-required item ${item.requirement ?? i + 1}${item.heading ? ` (${item.heading})` : ''}`
  if (item.requirement && !required[Number(item.requirement) - 1]) add('warning', 'state-item-unknown', `${label} names requirement ${item.requirement}, but the state block lists ${required.length} — check the numbering`)
  const texts = (item.sources ?? []).map(textOf)
  if (!item.sources?.length || texts.some((t) => t === null)) { add('blocking', 'unsourced', `${label} cites no confirmed reading or state source`); return }
  if (!String(item.text ?? '').trim() && String(item.met ?? '').trim()) return // met elsewhere on the pleading; nothing prints
  // A blank left on purpose ("no document states the county") is honest, and
  // the person signing has to know it is there before it goes out.
  if (!String(item.text ?? '').trim() || /_{3,}/.test(String(item.text))) add('warning', 'blank-item', `${label} is left blank on the complaint${item.note ? ` — ${item.note}` : ''}; fill it in by hand before filing`)
  const cited = texts.join('\n')
  const cd = datesIn(cited), cm = monthsIn(cited)
  for (const d of draftDates(item.text)) if (!cd.has(d.key)) add('blocking', 'date-not-in-sources', `${label}: "${d.text}" is not in its sources`)
  for (const m of draftMonths(item.text)) if (!cm.has(m.key)) add('blocking', 'month-not-in-sources', `${label}: "${m.text}" is not in its sources`)
  for (const n of numbersIn(item.text)) if (!numberAppearsIn(n, cited)) add('blocking', 'number-not-in-sources', `${label}: the figure "${n}" is not in its sources`)
  for (const q of quotedSpans(item.text)) if (!texts.some((t) => containsExact(t, q))) add('blocking', 'quote-not-in-sources', `${label}: the quotation “${q.slice(0, 60)}” is not word for word in its sources`)
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
