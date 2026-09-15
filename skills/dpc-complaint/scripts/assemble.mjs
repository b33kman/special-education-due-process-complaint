// Composes the complaint from the checked statement and the case file, in
// the form of a filed pleading. Nothing here is written by a model: the
// caption, introduction, contact paragraph, headings, relief, signature
// block and certificate of service are composed from confirmed data and
// fixed wording, and every paragraph records its sources.
//
//   node scripts/assemble.mjs <case folder>
//
// Writes work/complaint.json (the document, paragraph by paragraph, for
// render.mjs to set as Word, PDF and Markdown) and work/provenance.json
// (the same paragraphs with their source tags, for validate.mjs and
// report.mjs).

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caseDir, readJson, writeJson, readText, parseAnnotated, stripTags, longDate, isoDate, ageOn, today } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dir = caseDir(process.argv.slice(2), 'node scripts/assemble.mjs <case folder>   — composes the pleading from case.json, the checked statement and fixed wording; writes work/complaint.json and work/provenance.json')
const work = join(dir, 'work')

const c = readJson(join(work, 'case.json'))
const state = readJson(join(work, 'state.json'))
const check = readJson(join(work, 'check-draft.json'), null)
const claimsRef = readJson(join(here, '..', 'references', 'claims.json')).claims
const reliefRef = readJson(join(here, '..', 'references', 'relief.json')).options
const states = readJson(join(here, '..', 'references', 'state-rules.json')).states

if (!check || check.findings.some((f) => f.level === 'error')) {
  console.error('check-draft has not passed. Run scripts/check-draft.mjs and fix its errors first.')
  process.exit(1)
}

const v = (x) => (x && typeof x === 'object' && 'value' in x ? String(x.value ?? '').trim() : String(x ?? '').trim())
const src = (x) => (x && typeof x === 'object' && x.source ? [x.source] : [])

// ─── Names ────────────────────────────────────────────────────────────
// The complaint names the child in full: 34 C.F.R. § 300.508(b)(1) requires
// "the name of the child", and a complaint without it can be found
// insufficient. (Hearing offices that publish decisions with initials
// anonymise the decision, not the complaint.)
const studentName = [v(c.student?.first), v(c.student?.middle), v(c.student?.last)].filter(Boolean).join(' ')
const parentName = [v(c.parent?.first), v(c.parent?.last)].filter(Boolean).join(' ')
// Two parents may file together (`parent.second`): the caption, the defined
// term, the verbs and the pro se signature block all follow.
const second = c.parent?.second
const secondName = second ? [v(second.first), v(second.last)].filter(Boolean).join(' ') : ''
const twoParents = Boolean(secondName)
const parentsNames = twoParents ? `${parentName} and ${secondName}` : parentName
const Parent = twoParents ? 'Parents' : 'Parent' // the defined term
const theParent = twoParents ? 'the Parents' : 'the Parent'
const TheParent = twoParents ? 'The Parents' : 'The Parent'
const s3 = twoParents ? '' : 's' // "request" / "requests"
const parentSrc = [...src(c.parent?.first), ...src(c.parent?.last), ...(second ? [...src(second.first), ...src(second.last)] : [])]
const district = v(c.student?.district)
// The respondent is the district as the documents name it unless the person
// chose otherwise — a Board of Education, a city-wide agency, a county
// office. The choice is theirs (SKILL.md step 5) and carries its own source.
const respondent = v(c.student?.respondent) || district
const respondentSrc = v(c.student?.respondent) ? src(c.student?.respondent) : src(c.student?.district)
const school = v(c.student?.school)
const county = v(c.student?.county)
const counsel = c.representation?.type === 'counsel' ? c.representation.counsel : null

const withThe = (name) => (/^the\s/i.test(name) ? name : `the ${name}`)
const article = (n) => ([8, 11, 18].includes(n) ? 'an' : 'a')

const address = c.student?.address ?? {}
const addressLines = [
  [v(address.line1), v(address.line2)].filter(Boolean).join(', '),
  [[v(address.city), v(address.state)].filter(Boolean).join(', '), v(address.postalCode)].filter(Boolean).join(' '),
].filter(Boolean)
const addressOneLine = addressLines.join(', ')
const addressSources = ['line1', 'line2', 'city', 'state', 'postalCode'].flatMap((k) => src(address[k]))

const filingDate = c.filingDate || today()
// A student who has reached the age of majority is not "a minor"; IDEA
// rights may have transferred to them (34 C.F.R. § 300.520). The validator
// warns; the caption states nothing false either way.
const age = ageOn(v(c.student?.dob), filingDate)
const minor = age === null || age < 18

// ─── Build ────────────────────────────────────────────────────────────
const doc = { sections: [] }
const section = (id, heading, paragraphs, opts = {}) => doc.sections.push({ id, heading, paragraphs, ...opts })
const P = (text, tags = [], cls = null) => ({ text, tags, cls })
// Section numerals run in order over the sections that exist.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
let numeral = 0
const numbered = (title) => `${ROMAN[numeral++]}. ${title}`

const stateName = state.name || states.find((s) => s.code === (state.code || c.state))?.name || c.state
// The caption's second line is "STATE OF …", so the agency line must not
// carry the state's name again ("Office of Administrative Hearings, State
// of California" prints as "Office of Administrative Hearings").
const seaCaption = (v(state.captionAgency) || v(state.seaName))
  .replace(new RegExp(`\\s*(?:,|of|for)?\\s*(?:the\\s+)?state\\s+of\\s+${String(stateName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '')
  .trim()

section('caption', null, [
  P(`BEFORE ${withThe(seaCaption).toUpperCase()}`, state.captionAgency?.sources ?? state.seaName?.sources ?? [], 'caption-court'),
  P(`STATE OF ${String(stateName).toUpperCase()}`, [], 'caption-court'),
  // Where the state's form puts the county in the caption (North Carolina's
  // "COUNTY OF ___"), the person supplies it and it prints as a third line.
  ...(county ? [P(`COUNTY OF ${county.toUpperCase()}`, src(c.student?.county), 'caption-court')] : []),
  P('In the Matter of:', [], 'caption-label'),
  P(`${studentName.toUpperCase()}, ${minor ? 'a minor, ' : ''}by and through the ${twoParents ? 'parents' : 'parent'}, ${parentsNames.toUpperCase()},`, [...src(c.student?.first), ...src(c.student?.last), ...parentSrc], 'caption-party'),
  P('Petitioner,', [], 'caption-role'),
  P('v.', [], 'caption-v'),
  P(`${respondent.toUpperCase()},`, respondentSrc, 'caption-party'),
  P('Respondent.', [], 'caption-role'),
  P('Case No. ____________', [], 'caption-case'),
  P('DUE PROCESS COMPLAINT NOTICE', [], 'caption-title'),
  P('20 U.S.C. § 1415(b)(7)', [], 'caption-cite'),
  P('34 C.F.R. § 300.508', [], 'caption-cite'),
  P(`Date: ${longDate(filingDate)}`, [], 'caption-date'),
])

// I. Introduction
const disability = v(c.student?.disability)
const since = v(c.student?.eligibleSince)
let intro = `Petitioner ${studentName} (“Student”) is ${age !== null ? `${article(age)} ${age}-year-old student` : 'a student'}`
const sinceText = since ? (isoDate(since) ? longDate(isoDate(since)) : since) : ''
if (disability) intro += ` who has been eligible for special education and related services under the category of ${disability}${sinceText ? ` since ${sinceText}` : ''}, and`
intro += ` who attends ${school} in ${withThe(district)}${respondent !== district ? `, for which ${withThe(respondent)} is the responsible local educational agency and the respondent here` : ''} (“District”). This due process complaint is brought on Student’s behalf by the ${twoParents ? 'parents' : 'parent'}, ${parentsNames} (“${Parent}”), who ${twoParents ? 'are' : 'is'} ${counsel ? `represented by ${counsel.name} of ${counsel.firmName}` : 'self-represented'}.`
const introTags = [...src(c.student?.first), ...src(c.student?.last), ...parentSrc, ...src(c.student?.dob), ...src(c.student?.disability), ...src(c.student?.eligibleSince), ...src(c.student?.school), ...src(c.student?.district), ...(respondent !== district ? respondentSrc : [])]

// The claims print in the catalogue's fixed wording. A claim outside the
// catalogue ("other") prints the heading, clause and regulation the person
// typed; a catalogue claim the person reworded (its own `heading`, `clause`
// or `cfr` in case.json) prints their words, marked as typed in sources.md.
const ownClaim = (cl) => (cl.id === 'other' && String(cl.heading ?? '').trim() ? { id: 'other', filingHeading: String(cl.heading).trim(), filingClause: String(cl.clause ?? cl.heading).trim(), cfr: String(cl.cfr ?? '').trim(), isProcedural: Boolean(cl.isProcedural), typed: true } : null)
const chosen = (c.claims ?? []).map((cl) => {
  const catalogue = claimsRef.find((r) => r.id === cl.id)
  const reworded = catalogue && [cl.heading, cl.clause, cl.cfr].some((x) => String(x ?? '').trim())
  const ref = reworded
    ? { ...catalogue, filingHeading: String(cl.heading ?? '').trim() || catalogue.filingHeading, filingClause: String(cl.clause ?? '').trim() || catalogue.filingClause, cfr: String(cl.cfr ?? '').trim() || catalogue.cfr, typed: true }
    : catalogue ?? ownClaim(cl)
  return { ...cl, ref }
})
const missing = chosen.filter((cl) => !cl.ref)
if (missing.length) {
  for (const cl of missing) {
    console.error(cl.id === 'other' ? 'claim "other" carries no heading — the person supplies the heading (and, for counsel, the regulation) in case.json' : `unknown claim id "${cl.id}" — see references/claims.json`)
  }
  process.exit(1)
}
const clauses = chosen.map((cl) => cl.ref.filingClause)
let fape = null
if (clauses.length) {
  const joined = clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join('; by ')}; and by ${clauses.at(-1)}`
  // Define "IEP" once.
  let seen = false
  const defined = joined.replace(/individualized education program \(“IEP”\)/g, (m) => (seen ? 'IEP' : ((seen = true), m)))
  fape = `The District has denied Student a free appropriate public education (“FAPE”) by ${defined}.`
}
section('introduction', numbered('Introduction'), [P(intro, introTags), ...(fape ? [P(fape, chosen.map((cl) => `claim:${cl.id}`))] : [])])

// II. Contact and residence — the facts § 300.508(b)(1)–(3) require, with
// the date of birth; for a student with no fixed address, (b)(1) and (b)(4).
const contact = [v(c.parent?.email), v(c.parent?.phone)].filter(Boolean)
const dobIso = isoDate(v(c.student?.dob))
const born = v(c.student?.dob) ? ` was born on ${dobIso && dobIso.length === 10 ? longDate(dobIso) : v(c.student?.dob)},` : ''
const parties = [
  P(c.student?.homeless ? '34 C.F.R. § 300.508(b)(1), (4).' : '34 C.F.R. § 300.508(b)(1)–(3).', [], 'cite'),
  P(
    c.student?.homeless
      ? `Student${born} does not have a fixed address, and is enrolled at ${school}. ${TheParent} may be reached at ${v(c.student?.homelessContact)}.`
      : `Student${born} resides with ${theParent} at ${addressOneLine}, and is enrolled at ${school}.${contact.length ? ` ${TheParent} may be reached at ${contact.join(' and ')}.` : ''}`,
    [...src(c.student?.dob), ...addressSources, ...src(c.student?.school), ...src(c.parent?.email), ...src(c.parent?.phone), ...src(c.student?.homelessContact)],
  ),
]
section('parties', numbered('Contact and residence information'), parties)

// III. Statement of facts — the confirmed chronology, one numbered paragraph
// per event, oldest first. Each event's sentence and date were gated by
// check-draft against the sources it names, exactly as the statement's are.
const chronology = (c.events ?? [])
  .map((e) => ({ ...e, iso: isoDate(e.date) }))
  .sort((a, b) => String(a.iso ?? a.date).localeCompare(String(b.iso ?? b.date)))
const eventSentence = (e) => {
  const what = String(e.what ?? '').trim()
  if (!what) return ''
  const lead = e.iso ? (e.iso.length === 7 ? `In ${longDate(e.iso)}, ` : `On ${longDate(e.iso)}, `) : `[no date — ${String(e.date ?? '')}]: `
  if (/^(on|in)\s/i.test(what) || /^\d/.test(what)) return what
  const body = /^(The|A|An)\s/.test(what) ? what[0].toLowerCase() + what.slice(1) : what
  return `${lead}${body}${/[.!?]$/.test(body) ? '' : '.'}`
}
if (chronology.length) {
  section('facts', numbered('Statement of facts'), chronology.map((e) => P(eventSentence(e), e.sources ?? [])))
}

// IV. Statement of the problems
const draft = readText(join(work, 'statement.annotated.md'))
const sections = parseAnnotated(draft)
const statementParagraphs = []
chosen.forEach((cl, i) => {
  const letter = String.fromCharCode(65 + i)
  const s = sections.find((x) => x.letter === letter)
  statementParagraphs.push(P(`${letter}. ${cl.ref.filingHeading}`, [`claim:${cl.id}`, ...(cl.ref.typed ? ['typed'] : [])], 'subheading'))
  if (cl.ref.cfr) statementParagraphs.push(P(cl.ref.cfr + '.', [], 'cite'))
  if (!s || s.paragraphs.length === 0) {
    statementParagraphs.push(P('[No facts were entered under this heading. Enter them or remove the claim before filing.]', [], 'placeholder'))
    return
  }
  for (const paragraph of s.paragraphs) {
    const text = paragraph.map((sen) => stripTags(sen.text)).join(' ')
    const tags = [...new Set(paragraph.flatMap((sen) => sen.tags))]
    statementParagraphs.push(P(text, tags))
  }
  if (cl.ref.isProcedural && cl.impact?.trim()) {
    const tags = [...new Set([...cl.impact.matchAll(/\[([RFES]\d+)\]/g)].map((m) => m[1]))]
    statementParagraphs.push(P(stripTags(cl.impact.trim()), tags))
  }
})
section('statement', numbered('Statement of the problems'), statementParagraphs)

// V. Proposed resolution
// Each remedy is its own lettered sub-paragraph under a one-line lead-in,
// so a long list reads as a list; a single remedy is one sentence. A
// reservation of the right to seek attorneys' fees is not a remedy the
// district can grant at the resolution session, so it follows the list as
// its own paragraph.
const reliefClauses = []
const reservations = []
for (const r of c.relief ?? []) {
  const ref = reliefRef.find((o) => o.id === r.id)
  if (!ref) {
    console.error(`unknown relief id "${r.id}" — see references/relief.json`)
    process.exit(1)
  }
  const detail = String(r.detail ?? '').trim().replace(/[.!?]+$/, '')
  if (ref.requiresDetail && !detail) continue
  if (ref.reservation) {
    reservations.push({ text: detail || `${TheParent} reserve${s3} the right to seek reasonable attorneys’ fees and costs under 20 U.S.C. § 1415(i)(3)(B)`, tags: r.sources ?? [] })
    continue
  }
  reliefClauses.push({ text: detail || ref.filingLabel, tags: r.sources ?? [] })
}
const reliefParagraphs =
  reliefClauses.length === 0
    ? [P('[No relief has been entered. Enter the proposed resolution before filing.]', [], 'placeholder')]
    : reliefClauses.length === 1
      ? [P(`${TheParent} propose${s3} the following resolution: ${reliefClauses[0].text}.`, reliefClauses[0].tags)]
      : [
          P(`${TheParent} propose${s3} the following resolution:`, []),
          ...reliefClauses.map((cl, i, all) => {
            const last = i === all.length - 1
            const punctuation = last ? '.' : i === all.length - 2 ? '; and' : ';'
            return P(`(${String.fromCharCode(97 + i)}) ${cl.text}${punctuation}`, cl.tags, 'relief')
          }),
        ]
section('resolution', numbered('Proposed resolution'), [P('34 C.F.R. § 300.508(b)(6).', [], 'cite'), ...reliefParagraphs, ...reservations.map((r) => P(`${r.text}.`, r.tags))])

// Requests concerning the hearing — mediation, an expedited hearing, an
// interpreter or accommodations — only where the person asked for them.
const hearing = []
if (c.mediation === 'requested') hearing.push(P(`${TheParent} request${s3} mediation under 34 C.F.R. § 300.506 concurrently with this due process complaint.`, []))
else if (c.mediation === 'declined') hearing.push(P(`${TheParent} do${twoParents ? '' : 'es'} not request mediation at this time.`, []))
if (c.expedited === true) hearing.push(P(`${TheParent} request${s3} an expedited due process hearing under 34 C.F.R. § 300.532(c).`, []))
if (v(c.hearing?.interpreter)) hearing.push(P(`${TheParent} require${s3} an interpreter for the hearing (${v(c.hearing.interpreter)}).`, src(c.hearing.interpreter)))
if (v(c.hearing?.accommodations)) hearing.push(P(`${TheParent} request${s3} the following accommodations for the hearing: ${v(c.hearing.accommodations).replace(/[.]+$/, '')}.`, src(c.hearing.accommodations)))
if (hearing.length) section('hearing', numbered('Requests concerning the hearing'), hearing)

// Anything the state requires beyond the federal six that the fixed form
// does not already carry. An item marked `met` (the pleading states it
// elsewhere — the county in the caption, the date of birth in section II)
// prints nothing here.
const extra = (c.additionalContents ?? []).filter((item) => String(item.text ?? '').trim() || !String(item.met ?? '').trim())
if (extra.length) {
  section('state-additional', numbered(`Additional information required in ${stateName}`), extra.map((item) => P(`${item.heading ? item.heading + ': ' : ''}${item.text ?? ''}`, item.sources ?? [])))
}

// Signature block. A pleading closes with "Dated:" at the left margin and
// the signer's block on the right half of the page: a signature line, the
// name, the capacity, and how to reach the signer, one item per line.
// The street and the city/state/ZIP go on separate lines, as on letterhead.
const splitAddress = (addr) => {
  const s = String(addr ?? '').replace(/\s*\n\s*/g, ', ').trim()
  if (!s) return []
  const m = s.match(/^(.*?),\s*([^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)$/)
  return m ? [m[1], m[2]] : [s]
}
const SIGLINE = '______________________________'
const DATED = 'Dated: ______________________'
const barLabel = String(counsel?.barLabel ?? '').trim() || 'Bar No.'
const signature = counsel
  ? [
      P(DATED, [], 'dated'),
      P('Respectfully submitted,', [], 'lead'),
      P(SIGLINE, [], 'sigline'),
      P(counsel.name, []),
      P('Attorney for Petitioner', []),
      P(counsel.barNumber?.trim() ? `${barLabel} ${counsel.barNumber.trim()}${counsel.barJurisdiction ? ` (${counsel.barJurisdiction})` : ''}` : `${barLabel} ____________`, []),
      P(counsel.firmName, []),
      ...splitAddress(counsel.firmAddress).map((line) => P(line, [])),
      ...(counsel.firmPhone ? [P(String(counsel.firmPhone), [])] : []),
      ...(counsel.firmEmail ? [P(String(counsel.firmEmail), [])] : []),
    ]
  : [
      P(DATED, [], 'dated'),
      P('Respectfully submitted,', [], 'lead'),
      P(SIGLINE, [], 'sigline'),
      P(parentName, [...src(c.parent?.first), ...src(c.parent?.last)]),
      P(`Parent of ${studentName}`, []),
      ...(twoParents ? [P(SIGLINE, [], 'sigline'), P(secondName, [...src(second.first), ...src(second.last)]), P(`Parent of ${studentName}`, [])] : []),
      P('Self-represented (pro se)', []),
      ...(c.student?.homeless ? [P(v(c.student?.homelessContact), src(c.student?.homelessContact))] : addressLines.map((line) => P(line, addressSources))),
      ...(v(c.parent?.phone) ? [P(v(c.parent?.phone), src(c.parent?.phone))] : []),
      ...(v(c.parent?.email) ? [P(v(c.parent?.email), src(c.parent?.email))] : []),
    ]
section('signature', null, signature, { cls: 'signature' })

// Certificate of service — who is served comes from the verified state
// block (the district's superintendent, and the state agency where the
// state requires a copy). Filing with the forum is not service; the report's
// "How to file" says where the original goes.
const recipientsRaw = state.serviceRecipients?.value ?? [`the Superintendent of ${withThe(district)}`]
const recipients = (Array.isArray(recipientsRaw) ? recipientsRaw : [recipientsRaw]).map(String)
const recipientText =
  recipients.length === 1 ? recipients[0] : recipients.length === 2 ? `${recipients[0]} and ${recipients[1]}` : `${recipients.slice(0, -1).join(', ')}, and ${recipients.at(-1)}`
section('service', 'Certificate of service', [
  P(
    `${counsel ? 'Counsel for Petitioner certifies' : `${TheParent} certif${twoParents ? 'y' : 'ies'}`} that on the date written below a true and complete copy of this Due Process Complaint Notice was served on ${recipientText}, by the method indicated below.`,
    state.serviceRecipients?.sources ?? [],
  ),
  P('Method of service:   [  ] U.S. mail   [  ] Hand delivery   [  ] Other: ____________________', [], 'method'),
  P(DATED, [], 'dated'),
  P(SIGLINE, [], 'sigline'),
  P(counsel ? counsel.name : parentsNames, []),
  P(counsel ? 'Attorney for Petitioner' : 'Self-represented (pro se)', []),
])

// ─── Paragraph numbers ────────────────────────────────────────────────
// A pleading numbers its allegations consecutively from the introduction
// through the last numbered section, so a reader can point at "paragraph
// 7". Headings, regulation lines, the caption, the signature and the
// certificate carry no number.
let n = 0
for (const s of doc.sections) {
  if (!['introduction', 'parties', 'facts', 'statement', 'resolution', 'hearing', 'state-additional'].includes(s.id)) continue
  for (const p of s.paragraphs) if (!p.cls) p.n = ++n
}

writeJson(join(work, 'complaint.json'), { assembledOn: today(), filingDate, student: studentName, sections: doc.sections })
const provenance = doc.sections.flatMap((s) => s.paragraphs.map((p, i) => ({ section: s.id, index: i, cls: p.cls, n: p.n ?? null, text: p.text, tags: p.tags })))
writeJson(join(work, 'provenance.json'), { assembledOn: today(), filingDate, provenance })

const words = doc.sections.flatMap((s) => s.paragraphs).map((p) => p.text).join(' ').split(/\s+/).filter(Boolean).length
console.log(`assembled: ${n} numbered paragraphs, ${words} words, ${chosen.length} claim(s), ${reliefClauses.length} relief clause(s) → work/complaint.json`)
