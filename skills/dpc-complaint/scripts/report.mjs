// Writes sources.md (every fact on the complaint, traced to the page or
// URL it came from) and verification-report.md (what was checked, what
// passed, what is still open). These two files are how the complaint gets
// double-checked by a person: nothing on it should be untraceable.
//
//   node scripts/report.mjs <case folder>

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { caseDir, readJson, today } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dir = caseDir(process.argv.slice(2), 'node scripts/report.mjs <case folder>   — writes sources.md (every paragraph with what it rests on) and verification-report.md (what was checked, the status, how to file)')
const work = join(dir, 'work')

const c = readJson(join(work, 'case.json'))
const documents = readJson(join(work, 'documents.json'))
const confirmed = readJson(join(work, 'confirmed.json'))
const verified = readJson(join(work, 'readings.verified.json'), [])
const state = readJson(join(work, 'state.json'))
const stateCheck = readJson(join(work, 'state-check.json'), null)
const prov = readJson(join(work, 'provenance.json'))
const validation = readJson(join(work, 'validation.json'))
const check = readJson(join(work, 'check-draft.json'), { findings: [], wordCount: 0 })
const gatesLog = existsSync(join(work, 'gates.log')) ? readFileSync(join(work, 'gates.log'), 'utf8').trim().split('\n') : []
const states = readJson(join(here, '..', 'references', 'state-rules.json')).states

const byId = new Map(confirmed.map((r) => [r.id, r]))
const docById = new Map(documents.map((d) => [d.docId, d]))
const vById = new Map(verified.map((r) => [r.id, r.verification]))
const stateSources = new Map((state.sources ?? []).map((s) => [s.id, s]))
const stateName = state.name || states.find((s) => s.code === (state.code || c.state))?.name || c.state
const q = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
// Who typed the facts and confirmed the readings: counsel on a represented
// filing, the Parent on a pro se one. The files she is told to read must not
// call her "counsel".
const counsel = c.representation?.type === 'counsel'
const twoParents = Boolean(c.parent?.second && (c.parent.second.first?.value || c.parent.second.last?.value))
const who = counsel ? 'counsel' : twoParents ? 'the Parents' : 'the Parent'
const whose = counsel ? 'counsel’s' : twoParents ? 'the Parents’' : 'the Parent’s'
const Whose = counsel ? 'Counsel’s' : twoParents ? 'The Parents’' : 'The Parent’s'
const studentName = [c.student?.first?.value, c.student?.last?.value].filter(Boolean).join(' ')
const respondent = c.student?.respondent?.value || c.student?.district?.value || ''

const describe = (tag) => {
  if (/^R\d+$/.test(tag)) {
    const r = byId.get(tag)
    if (!r) return `${tag} (not confirmed)`
    const d = docById.get(r.docId)
    const text = r.status === 'edited' ? r.editedValue : r.value
    return `${tag}: ${d?.file ?? r.docId}, p. ${r.page} — ${r.field}${r.status === 'edited' ? ` (edited by ${who} at the confirmation gate)` : ''}: “${q(text)}”`
  }
  if (/^F\d+$/.test(tag)) return `${tag}: ${whose} own statement — “${q(c.facts?.[tag]?.answer)}”`
  if (/^E\d+$/.test(tag)) {
    const e = (c.events ?? []).find((x) => x.id === tag)
    return `${tag}: chronology event ${e?.date ?? ''} — ${q(e?.what)} (from ${(e?.sources ?? []).join(', ') || 'no source'})`
  }
  if (/^S\d+$/.test(tag)) {
    const s = stateSources.get(tag)
    return `${tag}: ${s?.title ?? ''} — ${s?.url ?? ''} (accessed ${s?.accessed ?? '?'})${s?.quote ? ` — “${q(s.quote)}”` : ''}`
  }
  if (tag === 'typed') return `typed: entered by ${who}; not read from any document`
  if (tag === 'claim:other') return `${tag}: a heading and clause of ${whose} own, outside references/claims.json`
  if (tag.startsWith('claim:')) return `${tag}: fixed wording for this claim (references/claims.json)`
  return tag
}
// A paragraph's key is its number on the pleading, so the signer can read
// the two side by side; the caption, the closing and the certificate have no
// number and are keyed by their place.
const key = (p) => (p.n ? `¶ ${p.n}` : `${p.section} ${p.index + 1}`)

// What each tag ultimately rests on: a document (a reading or an official
// page) or the person's own words (a statement of fact, a typed value).
const restsOn = (tag, depth = 0) => {
  if (/^[RS]\d+$/.test(tag)) return ['document']
  if (/^F\d+$/.test(tag) || tag === 'typed') return ['statement']
  if (/^E\d+$/.test(tag) && depth < 3) {
    const e = (c.events ?? []).find((x) => x.id === tag)
    return (e?.sources ?? []).flatMap((t) => restsOn(t, depth + 1))
  }
  return []
}

// ─── sources.md ───────────────────────────────────────────────────────
const md = []
md.push(`# Sources — ${studentName} v. ${respondent}`, '')
md.push(`Prepared ${today()}. Every fact on the complaint is listed here with what it rests on, keyed by the paragraph number on the pleading. A reading is the document’s own words at the page given; a fact marked “${whose} own statement” was typed by ${who} and is not in any document; a state source is a web page opened on the date shown, whose quotation was checked against the page.`, '')

md.push('## Documents', '', '| File | Pages | Kind(s) | Readings confirmed |', '|---|---|---|---|')
for (const d of documents) {
  const n = confirmed.filter((r) => r.docId === d.docId && (r.status === 'confirmed' || r.status === 'edited')).length
  md.push(`| ${q(d.file)} | ${d.pages} | ${(d.kinds ?? []).join(', ') || '—'} | ${n} |`)
}
md.push('')

md.push('## Confirmed readings', '', '| Id | Document | Page | Field | Value (verbatim) | Checked |', '|---|---|---|---|---|---|')
for (const r of confirmed) {
  if (r.status === 'rejected') continue
  const d = docById.get(r.docId)
  const text = r.status === 'edited' ? `${r.editedValue} _(edited; read as “${r.value}”)_` : r.value
  const vs = vById.get(r.id)?.status ?? r.verification ?? 'not run'
  md.push(`| ${r.id} | ${q(d?.file ?? r.docId)} | ${r.page} | ${r.field} | ${q(text)} | ${vs === 'verified' ? 'on the page' : vs} |`)
}
md.push('')

const rejected = confirmed.filter((r) => r.status === 'rejected')
if (rejected.length) {
  md.push('## Readings rejected at confirmation (not used)', '')
  for (const r of rejected) md.push(`- ${r.id}: ${docById.get(r.docId)?.file ?? r.docId}, p. ${r.page}, ${r.field} — “${q(r.value)}”`)
  md.push('')
}

md.push(`## ${Whose} statements of fact`, '')
for (const [id, f] of Object.entries(c.facts ?? {})) md.push(`- **${id}** — *${f.question}*: ${f.answer}`)
md.push('')

if ((c.events ?? []).length) {
  md.push('## Chronology', '', '| Id | Date | Event | Sources |', '|---|---|---|---|')
  for (const e of c.events) md.push(`| ${e.id} | ${e.date} | ${q(e.what)} | ${(e.sources ?? []).join(', ')} |`)
  md.push('')
}

md.push(`## State procedure — ${stateName}`, '')
md.push(`Checked on ${state.checkedOn ?? 'unknown date'}.${stateCheck ? ` Each source’s quotation was checked against the page’s text on ${stateCheck.checkedOn} (work/state-text/).` : ''}`, '')
const STATE_KEYS = ['seaName', 'captionAgency', 'filesWith', 'filingAddress', 'channels', 'limitationsMonths', 'requiredForm', 'additionalContents', 'serviceRecipients']
const stateValue = (key) => {
  const f = state[key]
  const value = f && typeof f === 'object' && 'value' in f ? f.value : f
  if (Array.isArray(value)) return value.length ? value.join('; ') : (key === 'additionalContents' ? 'nothing beyond 34 C.F.R. § 300.508(b)' : '—')
  return value === null || value === undefined || value === '' ? '—' : String(value)
}
for (const key of STATE_KEYS) {
  const f = state[key]
  if (!f) continue
  md.push(`- **${key}**: ${q(stateValue(key))} — sources: ${(f.sources ?? []).map((id) => stateSources.get(id)?.url ?? id).join(', ') || 'NONE'}`)
}
md.push('', '### Sources opened', '')
for (const s of state.sources ?? []) {
  const r = (stateCheck?.sources ?? []).find((x) => x.id === s.id)
  md.push(`- **${s.id}** ${s.title ?? ''} — ${s.url} (accessed ${s.accessed}${r ? `; quotation ${r.status === 'verified' ? 'on the page' : r.status}` : ''})${s.quote ? `\n  > ${q(s.quote)}` : ''}`)
}
md.push('')

md.push('## The complaint, paragraph by paragraph', '')
for (const p of prov.provenance) {
  if (p.section === 'caption' && p.tags.length === 0) continue
  if (['cite', 'subheading', 'dated', 'lead', 'sigline', 'method'].includes(p.cls) && p.tags.length === 0) continue
  md.push(`**[${key(p)}]** ${p.text}`)
  if (p.tags.length) for (const t of p.tags) md.push(`  - ${describe(t)}`)
  else md.push('  - fixed wording; no factual claim')
  md.push('')
}

// Which sentences no document supports: the signer reads these knowing they
// rest on what was typed, and on nothing else.
const statementOnly = prov.provenance.filter((p) => ['facts', 'statement', 'resolution', 'hearing', 'state-additional'].includes(p.section) && p.tags.length && p.tags.every((t) => { const r = restsOn(t); return r.length && r.every((x) => x === 'statement') }))
const sentences = check.findings.filter((f) => f.code === 'rests-on-statement')
md.push(`## What rests on ${whose} statement alone`, '')
if (!statementOnly.length && !sentences.length) md.push('Nothing: every fact on the complaint is cited to a document or an official page.', '')
else {
  if (statementOnly.length) {
    md.push('Paragraphs cited to no document:', '')
    for (const p of statementOnly) md.push(`- **[${key(p)}]** ${p.text} — ${p.tags.join(', ')}`)
    md.push('')
  }
  if (sentences.length) {
    md.push(`Sentences, dates or figures that no cited document supports (the draft gate’s findings, by section):`, '')
    for (const f of sentences) md.push(`- ${f.where} — ${f.message.replace(/;? ?the report will say so\.?$/, '')}`)
    md.push('')
  }
}
writeFileSync(join(dir, 'sources.md'), md.join('\n'))

// ─── verification-report.md ───────────────────────────────────────────
const r = []
const status = validation.status
r.push(`# Verification report`, '', `**Status: ${status}**`, '', `Prepared ${today()} for ${studentName}, ${stateName}. Run with ${c.runMeta?.model ?? 'an unrecorded model'}${c.runMeta?.effort ? ` at ${c.runMeta.effort} effort` : ''}. The complaint is complaint.pdf (to file) and complaint.docx (to edit); complaint.md is the same text, plain.`, '')
r.push('## What was checked', '')
const vCounts = { verified: 0, 'unverifiable-image': 0, other: 0 }
for (const x of verified) vCounts[x.verification?.status === 'verified' ? 'verified' : x.verification?.status === 'unverifiable-image' ? 'unverifiable-image' : 'other']++
const confirmedN = confirmed.filter((x) => x.status === 'confirmed').length
const editedN = confirmed.filter((x) => x.status === 'edited').length
r.push(`1. **Documents read:** ${documents.length}, ${documents.reduce((n, d) => n + (d.pages ?? 0), 0)} pages; ${documents.reduce((n, d) => n + (d.imageOnlyPages ?? 0), 0)} page(s) with no text layer.`)
r.push(`2. **Readings machine-verified on their page:** ${vCounts.verified} of ${verified.length}${vCounts['unverifiable-image'] ? ` (${vCounts['unverifiable-image']} on image-only pages, checked by eye)` : ''}${vCounts.other ? ` — ${vCounts.other} FAILED` : ''}.`)
r.push(`3. **Confirmed by ${who}:** ${confirmedN} confirmed, ${editedN} edited, ${rejected.length} rejected. Only confirmed and edited readings reach the complaint.`)
r.push(`4. **Statement of the problems and the chronology:** ${check.wordCount} words; every sentence tagged with its sources; every date, figure and quotation checked against the cited sources; pleading rules enforced (third person, no legal conclusions, no citations, no advice, no outcome language, no given names, no repetition). Gate runs: ${gatesLog.length || 'none recorded'}.`)
if (gatesLog.length) r.push('', '```', ...gatesLog, '```', '')
r.push(`5. **Validation:** ${validation.findings.filter((f) => f.level === 'blocking').length} blocking, ${validation.findings.filter((f) => f.level === 'warning').length} warning(s).`)
const stateSourcesN = (state.sources ?? []).length
const stateVerifiedN = (stateCheck?.sources ?? []).filter((x) => x.status === 'verified').length
r.push(`6. **State procedure (${stateName}):** ${validation.stateUnverified === 0 ? 'every item sourced to a web page opened this run' : `${validation.stateUnverified} item(s) not fully sourced — see below`}; ${stateCheck ? `${stateVerifiedN} of ${stateSourcesN} quotations verified on their pages` : 'the quotations were NOT checked against their pages (verify-state.mjs has not run)'}.`, '')
if (validation.findings.length) {
  r.push('## Findings', '')
  for (const f of validation.findings) r.push(`- ${f.level === 'blocking' ? '**BLOCKING**' : 'Warning'} [${f.code}] ${f.message}${f.cfr ? ` (${f.cfr})` : ''}`)
  r.push('')
}
r.push(`## How to file in ${stateName}`, '', `Verified on the web on ${state.checkedOn ?? 'an unrecorded date'}; every line below cites a page listed in sources.md.`, '')
for (const [key, label] of [['filesWith', 'Where it goes'], ['filingAddress', 'Address'], ['channels', 'How it may be sent'], ['requiredForm', 'Form'], ['serviceRecipients', 'Serve'], ['limitationsMonths', 'Window (months)'], ['additionalContents', 'Required beyond § 300.508(b)']]) {
  if (state[key]) r.push(`- **${label}:** ${stateValue(key)}`)
}
if (state.notes) r.push(`- **Notes:** ${state.notes}`)
r.push('')
r.push('## For the person signing', '')
r.push('- Read the complaint against sources.md. Every paragraph lists what it rests on, keyed by its number; open the page or the URL and check it.')
r.push(`- The section “What rests on ${whose} statement alone” in sources.md lists every sentence no document supports. Read those as the District will.`)
r.push('- Every numbered fact in the statement of facts and the statement of the problems is an allegation the District can hold the Parent to, and the hearing is confined to the problems the complaint raises. Say only what the sources say.')
r.push('- The statement of the problems states facts and draws no legal conclusion; the regulations print under the headings. Whether the facts make out each claim is your judgment.')
r.push('- The state procedure block was verified on the web on the date shown. Filing rules change; if the filing date is later, check again.')
r.push('- Nothing here estimates the outcome, and nothing should. The complaint is yours once you sign it.')
r.push('')
writeFileSync(join(dir, 'verification-report.md'), r.join('\n'))

console.log(`report: sources.md, verification-report.md — status ${status}`)
