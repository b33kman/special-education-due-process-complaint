// Assembles the complaint from the checked statement and the case file,
// in the gold standard's shape. Nothing here is written by a model: the
// caption, introduction, parties, headings, relief, signature block and
// certificate of service are composed from confirmed data and fixed
// wording, and every paragraph records its sources in work/provenance.json.
//
//   node scripts/assemble.mjs <case folder>
//
// Writes complaint.md and complaint.html in the case folder.

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caseDir, readJson, writeJson, readText, parseAnnotated, stripTags, longDate, isoDate, today } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dir = caseDir(process.argv.slice(2))
const work = join(dir, 'work')

const c = readJson(join(work, 'case.json'))
const confirmed = readJson(join(work, 'confirmed.json'))
const state = readJson(join(work, 'state.json'))
const check = readJson(join(work, 'check-draft.json'), null)
const claimsRef = readJson(join(here, '..', 'references', 'claims.json')).claims
const reliefRef = readJson(join(here, '..', 'references', 'relief.json')).options

if (!check || check.findings.some((f) => f.level === 'error')) {
  console.error('check-draft has not passed. Run scripts/check-draft.mjs and fix its errors first.')
  process.exit(1)
}

const v = (x) => (x && typeof x === 'object' && 'value' in x ? String(x.value ?? '').trim() : String(x ?? '').trim())
const src = (x) => (x && typeof x === 'object' && x.source ? [x.source] : [])

// ─── Names ────────────────────────────────────────────────────────────
// `privacy.initials` prints the student and parent as initials (J.D.,
// M.D.) everywhere a name would print — a common practice in some
// forums. The confirmed readings still hold the full names for the person
// checking; only the printed complaint abbreviates.
const initial = (s) => (s ? `${s.trim()[0].toUpperCase()}.` : '')
const asInitials = c.privacy?.initials === true
const fullStudent = [v(c.student?.first), v(c.student?.middle), v(c.student?.last)].filter(Boolean).join(' ')
const fullParent = [v(c.parent?.first), v(c.parent?.last)].filter(Boolean).join(' ')
const studentName = asInitials ? [initial(v(c.student?.first)), initial(v(c.student?.last))].filter(Boolean).join('') : fullStudent
const parentName = asInitials ? [initial(v(c.parent?.first)), initial(v(c.parent?.last))].filter(Boolean).join('') : fullParent
const district = v(c.student?.district)
// The respondent is the district as the documents name it unless the person
// chose otherwise — a Board of Education, a city-wide agency, a county
// office. The choice is theirs (SKILL.md step 5) and carries its own source.
const respondent = v(c.student?.respondent) || district
const respondentSrc = v(c.student?.respondent) ? src(c.student?.respondent) : src(c.student?.district)
const school = v(c.student?.school)
const counsel = c.representation?.type === 'counsel' ? c.representation.counsel : null

const withThe = (name) => (/^the\s/i.test(name) ? name : `the ${name}`)
const article = (n) => ([8, 11, 18].includes(n) ? 'an' : 'a')

function ageOn(dobText, onIso) {
  const dob = isoDate(dobText)
  if (!dob || dob.length !== 10) return null
  const born = new Date(`${dob}T00:00:00Z`)
  const on = new Date(`${onIso}T00:00:00Z`)
  if (Number.isNaN(born.getTime()) || Number.isNaN(on.getTime())) return null
  let age = on.getUTCFullYear() - born.getUTCFullYear()
  const m = on.getUTCMonth() - born.getUTCMonth()
  if (m < 0 || (m === 0 && on.getUTCDate() < born.getUTCDate())) age -= 1
  return age >= 0 && age < 120 ? age : null
}

const address = c.student?.address ?? {}
const addressLines = [
  [v(address.line1), v(address.line2)].filter(Boolean).join(', '),
  [[v(address.city), v(address.state)].filter(Boolean).join(', '), v(address.postalCode)].filter(Boolean).join(' '),
].filter(Boolean)
const addressOneLine = addressLines.join(', ')
const addressSources = ['line1', 'line2', 'city', 'state', 'postalCode'].flatMap((k) => src(address[k]))

const filingDate = c.filingDate || today()

// ─── Build ────────────────────────────────────────────────────────────
const doc = { sections: [] }
const section = (id, heading, paragraphs, opts = {}) => doc.sections.push({ id, heading, paragraphs, ...opts })
const P = (text, tags = [], cls = null) => ({ text, tags, cls })
// Section numerals run in order over the sections that exist.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
let numeral = 0
const numbered = (title) => `${ROMAN[numeral++]}. ${title}`

const stateName = state.name || c.state
// The caption's second line is "STATE OF …", so the agency line must not
// carry the state's name again ("Office of Administrative Hearings, State
// of California" prints as "Office of Administrative Hearings").
const seaCaption = (v(state.captionAgency) || v(state.seaName))
  .replace(new RegExp(`\\s*(?:,|of|for)?\\s*(?:the\\s+)?state\\s+of\\s+${String(stateName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '')
  .trim()

section('caption', null, [
  P(`BEFORE ${withThe(seaCaption).toUpperCase()}`, state.captionAgency?.sources ?? state.seaName?.sources ?? [], 'caption-court'),
  P(`STATE OF ${String(stateName).toUpperCase()}`, [], 'caption-court'),
  P('In the Matter of:', [], 'caption-label'),
  P(`${studentName.toUpperCase()}, a minor, by and through the parent, ${parentName.toUpperCase()},`, [...src(c.student?.first), ...src(c.student?.last), ...src(c.parent?.first), ...src(c.parent?.last)], 'caption-party'),
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
const age = ageOn(v(c.student?.dob), filingDate)
const disability = v(c.student?.disability)
const since = v(c.student?.eligibleSince)
let intro = `Petitioner ${studentName} (“Student”) is ${age !== null ? `${article(age)} ${age}-year-old student` : 'a student'}`
const sinceText = since ? (isoDate(since) ? longDate(isoDate(since)) : since) : ''
if (disability) intro += ` who has been eligible for special education and related services under the category of ${disability}${sinceText ? ` since ${sinceText}` : ''}, and`
intro += ` who attends ${school} in ${withThe(district)}${respondent !== district ? `, for which ${withThe(respondent)} is the responsible local educational agency and the respondent here` : ''} (“District”). This due process complaint is brought on Student’s behalf by the parent, ${parentName} (“Parent”), who is ${counsel ? `represented by ${counsel.name} of ${counsel.firmName}` : 'self-represented'}.`
const introTags = [...src(c.student?.first), ...src(c.student?.last), ...src(c.student?.dob), ...src(c.student?.disability), ...src(c.student?.eligibleSince), ...src(c.student?.school), ...src(c.student?.district), ...(respondent !== district ? respondentSrc : [])]

const chosen = (c.claims ?? []).map((cl) => ({ ...cl, ref: claimsRef.find((r) => r.id === cl.id) }))
const missing = chosen.filter((cl) => !cl.ref).map((cl) => cl.id)
if (missing.length) {
  console.error(`unknown claim id(s): ${missing.join(', ')} — see references/claims.json`)
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

// II. Contact and residence — the § 300.508(b)(1)–(2) facts, with the date of birth.
const contact = [v(c.parent?.email), v(c.parent?.phone)].filter(Boolean)
const dobIso = isoDate(v(c.student?.dob))
const born = v(c.student?.dob) ? ` was born on ${dobIso && dobIso.length === 10 ? longDate(dobIso) : v(c.student?.dob)},` : ''
const parties = [
  P(`34 C.F.R. § 300.508(b)(1)–(2).`, [], 'cite'),
  P(
    c.student?.homeless
      ? `Student${born} does not have a fixed address, and is enrolled at ${school}. The Parent may be reached at ${v(c.student?.homelessContact)}.`
      : `Student${born} resides with the Parent at ${addressOneLine}, and is enrolled at ${school}.${contact.length ? ` The Parent may be reached at ${contact.join(' and ')}.` : ''}`,
    [...src(c.student?.dob), ...addressSources, ...src(c.student?.school), ...src(c.parent?.email), ...src(c.parent?.phone), ...src(c.student?.homelessContact)],
  ),
]
section('parties', numbered('Contact and residence information'), parties)

// III. Statement of facts — the confirmed chronology, one numbered paragraph
// per event, oldest first. Each event's sentence was gated by check-draft
// against the sources it names, exactly as the statement's sentences are.
const chronology = (c.events ?? [])
  .map((e) => ({ ...e, iso: isoDate(e.date) }))
  .sort((a, b) => String(a.iso ?? a.date).localeCompare(String(b.iso ?? b.date)))
const eventSentence = (e) => {
  const what = String(e.what ?? '').trim()
  if (!what) return ''
  const lead = e.iso ? (e.iso.length === 7 ? `In ${longDate(e.iso)}, ` : `On ${longDate(e.iso)}, `) : `${e.date}: `
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
  statementParagraphs.push(P(`${letter}. ${cl.ref.filingHeading}`, [`claim:${cl.id}`], 'subheading'))
  statementParagraphs.push(P(cl.ref.cfr + '.', [], 'cite'))
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

// IV. Proposed resolution
const reliefClauses = []
const reliefTags = []
for (const r of c.relief ?? []) {
  const ref = reliefRef.find((o) => o.id === r.id)
  if (!ref) {
    console.error(`unknown relief id "${r.id}" — see references/relief.json`)
    process.exit(1)
  }
  const detail = String(r.detail ?? '').trim().replace(/[.!?]+$/, '')
  if (ref.requiresDetail && !detail) continue
  reliefClauses.push(detail || ref.filingLabel)
  if (r.sources) reliefTags.push(...r.sources)
}
const lettered =
  reliefClauses.length === 0
    ? null
    : reliefClauses.length === 1
      ? reliefClauses[0]
      : reliefClauses.map((cl, i, all) => `${i === all.length - 1 ? 'and ' : ''}(${String.fromCharCode(97 + i)}) ${cl}`).join('; ')
section('resolution', numbered('Proposed resolution'), [
  P('34 C.F.R. § 300.508(b)(6).', [], 'cite'),
  ...(lettered ? [P(`The Parent proposes the following resolution: ${lettered}.`, reliefTags)] : [P('[No relief has been entered. Enter the proposed resolution before filing.]', [], 'placeholder')]),
])

// V. Anything the state requires beyond the federal six
const extra = c.additionalContents ?? []
if (extra.length) {
  section('state-additional', numbered(`Additional information required in ${stateName}`), extra.map((item) => P(`${item.heading ? item.heading + ': ' : ''}${item.text}`, item.sources ?? [])))
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
const signature = counsel
  ? [
      P(DATED, [], 'dated'),
      P('Respectfully submitted,', [], 'lead'),
      P(SIGLINE, [], 'sigline'),
      P(counsel.name, []),
      P('Attorney for Petitioner', []),
      P(counsel.barNumber?.trim() ? `Bar No. ${counsel.barNumber.trim()}${counsel.barJurisdiction ? ` (${counsel.barJurisdiction})` : ''}` : 'Bar No. ____________', []),
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
      P('Self-represented (pro se)', []),
      ...(c.student?.homeless ? [] : addressLines.map((line) => P(line, addressSources))),
      ...(v(c.parent?.phone) ? [P(v(c.parent?.phone), src(c.parent?.phone))] : []),
      ...(v(c.parent?.email) ? [P(v(c.parent?.email), src(c.parent?.email))] : []),
    ]
section('signature', null, signature, { cls: 'signature' })

// Certificate of service — the recipients come from the verified state block.
const recipients = (state.serviceRecipients?.value ?? [v(state.seaName), `the Superintendent of ${withThe(district)}`]).map(String)
const recipientText =
  recipients.length === 1 ? recipients[0] : recipients.length === 2 ? `${recipients[0]} and ${recipients[1]}` : `${recipients.slice(0, -1).join(', ')}, and ${recipients.at(-1)}`
section('service', 'Certificate of service', [
  P(
    `${counsel ? 'Counsel for Petitioner' : 'The Parent'} certifies that on the date written below a true and complete copy of this Due Process Complaint Notice was served on ${recipientText}, by the method indicated below.`,
    state.serviceRecipients?.sources ?? [],
  ),
  P('Method of service:   ☐ U.S. mail   ☐ Hand delivery   ☐ Electronic filing', [], 'method'),
  P(DATED, [], 'dated'),
  P(SIGLINE, [], 'sigline'),
  P(counsel ? counsel.name : parentName, []),
  P(counsel ? 'Attorney for Petitioner' : 'Self-represented (pro se)', []),
])

// ─── Paragraph numbers ────────────────────────────────────────────────
// A pleading numbers its allegations consecutively from the introduction
// through the proposed resolution, so a reader can point at "paragraph 7".
// Headings, regulation lines, the caption, the signature and the
// certificate carry no number.
let n = 0
for (const s of doc.sections) {
  if (!['introduction', 'parties', 'facts', 'statement', 'resolution', 'state-additional'].includes(s.id)) continue
  for (const p of s.paragraphs) if (!p.cls) p.n = ++n
}

// ─── Markdown ─────────────────────────────────────────────────────────
const md = []
for (const s of doc.sections) {
  if (s.heading) md.push(`## ${s.heading}`, '')
  for (const p of s.paragraphs) {
    if (p.cls === 'subheading') md.push(`### ${p.text}`, '')
    else if (p.cls === 'cite') md.push(`*${p.text}*`, '')
    else if (p.n) md.push(`${p.n}. ${p.text}`, '')
    else md.push(p.text, '')
  }
}
const markdown = md.join('\n').replace(/\n{3,}/g, '\n\n')
writeFileSync(join(dir, 'complaint.md'), markdown)

// ─── HTML (printable) ─────────────────────────────────────────────────
// The look of a filed pleading: Times 12, one-inch margins, the court's
// name centred, a bracketed caption with the parties on the left and the
// case number and title on the right, double-spaced numbered paragraphs,
// a signature block on the right, the certificate of service last.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cap = Object.fromEntries(doc.sections[0].paragraphs.map((p) => [p.cls, p]))
const captionCls = (cls) => doc.sections[0].paragraphs.filter((p) => p.cls === cls)
const html = []
html.push(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Due Process Complaint Notice — ${esc(studentName)}</title>
<style>
  @page { size: letter; margin: 1in; @bottom-center { content: counter(page); font: 11pt "Times New Roman", Times, serif; } }
  html { background: #fff; }
  body { font-family: "Times New Roman", Times, Georgia, serif; font-size: 12pt; line-height: 1.15; color: #000; margin: 0 auto; padding: 0; width: 6.5in; max-width: 100%; box-sizing: border-box; }
  p { margin: 0; }
  /* The forum's name, then the caption: parties on the left inside an L-shaped rule, case number and title on the right. */
  .court { text-align: center; font-weight: bold; text-transform: uppercase; margin: 0 0 18pt; }
  table.caption { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0 0 24pt; }
  table.caption td { vertical-align: top; }
  table.caption td.parties { width: 3.5in; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0 0.3in 16pt 0; }
  table.caption td.case { padding: 0 0 0 0.35in; }
  table.caption td p { margin: 0 0 12pt; }
  table.caption td p:last-child { margin-bottom: 0; }
  table.caption p.caption-role { text-align: right; padding-right: 0.4in; }
  table.caption p.caption-v { padding-left: 0.5in; }
  .caption-title { font-weight: bold; text-transform: uppercase; }
  /* Headings centred and set in capitals; the regulation under each in italics. */
  h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; text-align: center; margin: 24pt 0 8pt; page-break-after: avoid; }
  h3 { font-size: 12pt; font-weight: bold; margin: 18pt 0 4pt; page-break-after: avoid; }
  p.cite { font-style: italic; margin: 0 0 10pt; }
  /* Numbered allegations, double-spaced: the number at the margin, the text a tab in, wrapped lines back at the margin. */
  p.para { line-height: 2; margin: 0; text-align: left; overflow-wrap: anywhere; orphans: 2; widows: 2; }
  p.para .n { display: inline-block; width: 0.5in; }
  p.placeholder { background: #fff3cd; padding: 4pt 6pt; margin: 6pt 0; }
  /* The closing: "Dated" at the left margin, the signer's block on the right half, never split across a page. */
  .closing { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 30pt; page-break-inside: avoid; break-inside: avoid; }
  .closing p.dated { flex: 0 0 auto; }
  .sigblock { width: 3.25in; flex: 0 0 auto; }
  .sigblock p { margin: 0; line-height: 1.25; }
  .sigblock p.lead { margin-bottom: 30pt; }
  .sigblock p.sigline { border-bottom: 1px solid #000; height: 0; margin: 0 0 4pt; }
  .service { margin-top: 36pt; page-break-inside: avoid; break-inside: avoid; }
  .service h2 { margin-top: 0; }
  .service p.text { margin: 0 0 12pt; }
  .service p.method { margin: 0 0 6pt; }
  @media screen { html { background: #e9e7e2; } body { background: #fff; box-shadow: 0 0 0.5in rgba(0,0,0,0.12); width: 8.5in; padding: clamp(0.5in, 8vw, 1in); margin: 0.5in auto; } }
</style></head><body>`)

html.push('<div class="court">')
for (const p of captionCls('caption-court')) html.push(`<p>${esc(p.text)}</p>`)
html.push('</div>')
html.push('<table class="caption"><tr><td class="parties">')
html.push(`<p>${esc(cap['caption-label'].text)}</p>`)
const captionParties = captionCls('caption-party')
html.push(`<p class="caption-party">${esc(captionParties[0].text)}</p>`)
html.push(`<p class="caption-role">${esc(captionCls('caption-role')[0].text)}</p>`)
html.push(`<p class="caption-v">${esc(cap['caption-v'].text)}</p>`)
html.push(`<p class="caption-party">${esc(captionParties[1].text)}</p>`)
html.push(`<p class="caption-role">${esc(captionCls('caption-role')[1].text)}</p>`)
html.push('</td><td class="case">')
html.push(`<p>${esc(cap['caption-case'].text)}</p>`)
html.push(`<p class="caption-title">${esc(cap['caption-title'].text)}</p>`)
for (const p of captionCls('caption-cite')) html.push(`<p>${esc(p.text)}</p>`)
html.push(`<p>${esc(cap['caption-date'].text)}</p>`)
html.push('</td></tr></table>')

// "Dated:" at the left margin, the signer's block on the right.
const closing = (paras) => {
  const dated = paras.find((p) => p.cls === 'dated')
  const block = paras.filter((p) => p.cls !== 'dated').map((p) => (p.cls === 'sigline' ? '<p class="sigline"></p>' : `<p class="${p.cls ?? ''}">${esc(p.text)}</p>`))
  return `<div class="closing"><p class="dated">${dated ? esc(dated.text) : ''}</p><div class="sigblock">${block.join('')}</div></div>`
}
for (const s of doc.sections.slice(1)) {
  const cls = s.cls ?? s.id
  html.push(`<section class="${cls}">`)
  if (s.heading) html.push(`<h2>${esc(s.heading)}</h2>`)
  if (s.id === 'signature') {
    html.push(closing(s.paragraphs))
  } else if (s.id === 'service') {
    const first = s.paragraphs.findIndex((p) => p.cls === 'dated')
    for (const p of s.paragraphs.slice(0, first)) html.push(`<p class="${p.cls ?? 'text'}">${esc(p.text)}</p>`)
    html.push(closing(s.paragraphs.slice(first)))
  } else {
    for (const p of s.paragraphs) {
      if (p.cls === 'subheading') html.push(`<h3>${esc(p.text)}</h3>`)
      else if (p.cls === 'cite') html.push(`<p class="cite">${esc(p.text)}</p>`)
      else if (p.cls === 'placeholder') html.push(`<p class="placeholder">${esc(p.text)}</p>`)
      else if (p.n) html.push(`<p class="para"><span class="n">${p.n}.</span>${esc(p.text)}</p>`)
      else html.push(`<p>${esc(p.text)}</p>`)
    }
  }
  html.push('</section>')
}
html.push('</body></html>')
writeFileSync(join(dir, 'complaint.html'), html.join('\n'))

// ─── Provenance ───────────────────────────────────────────────────────
const provenance = doc.sections.flatMap((s) => s.paragraphs.map((p, i) => ({ section: s.id, index: i, cls: p.cls, text: p.text, tags: p.tags })))
writeJson(join(work, 'provenance.json'), { assembledOn: today(), filingDate, provenance })

const words = doc.sections.flatMap((s) => s.paragraphs).map((p) => p.text).join(' ').split(/\s+/).filter(Boolean).length
console.log(`assembled: complaint.md, complaint.html (${words} words, ${chosen.length} claim(s), ${reliefClauses.length} relief clause(s))`)
