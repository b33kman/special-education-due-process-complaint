// Writes sources.md (every fact on the complaint, traced to the page or
// URL it came from) and verification-report.md (what was checked, what
// passed, what is still open). These two files are how the complaint gets
// double-checked by a person: nothing on it should be untraceable.
//
//   node scripts/report.mjs <case folder>

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { caseDir, readJson, today } from './lib.mjs'

const dir = caseDir(process.argv.slice(2))
const work = join(dir, 'work')

const c = readJson(join(work, 'case.json'))
const documents = readJson(join(work, 'documents.json'))
const confirmed = readJson(join(work, 'confirmed.json'))
const verified = readJson(join(work, 'readings.verified.json'), [])
const state = readJson(join(work, 'state.json'))
const prov = readJson(join(work, 'provenance.json'))
const validation = readJson(join(work, 'validation.json'))
const check = readJson(join(work, 'check-draft.json'), { findings: [], wordCount: 0 })
const gatesLog = existsSync(join(work, 'gates.log')) ? readFileSync(join(work, 'gates.log'), 'utf8').trim().split('\n') : []

const byId = new Map(confirmed.map((r) => [r.id, r]))
const docById = new Map(documents.map((d) => [d.docId, d]))
const vById = new Map(verified.map((r) => [r.id, r.verification]))
const stateSources = new Map((state.sources ?? []).map((s) => [s.id, s]))
const q = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
// Who typed the facts and confirmed the readings: counsel on a represented
// filing, the Parent on a pro se one. The files she is told to read must not
// call her "counsel".
const counsel = c.representation?.type === 'counsel'
const who = counsel ? 'counsel' : 'the Parent'
const whose = counsel ? 'counsel’s' : 'the Parent’s'
const Whose = counsel ? 'Counsel’s' : 'The Parent’s'

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
  if (tag.startsWith('claim:')) return `${tag}: fixed wording for this claim (references/claims.json)`
  return tag
}

// ─── sources.md ───────────────────────────────────────────────────────
const md = []
md.push(`# Sources — ${[c.student?.first?.value, c.student?.last?.value].filter(Boolean).join(' ')} v. ${c.student?.district?.value ?? ''}`, '')
md.push(`Prepared ${today()}. Every fact on the complaint is listed here with what it rests on. A reading is the document’s own words at the page given; a fact marked “${whose} own statement” was typed by ${who} and is not in any document; a state source is a web page opened on the date shown.`, '')

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

md.push(`## State procedure — ${state.name ?? c.state}`, '')
md.push(`Checked on ${state.checkedOn ?? 'unknown date'}.`, '')
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
for (const s of state.sources ?? []) md.push(`- **${s.id}** ${s.title ?? ''} — ${s.url} (accessed ${s.accessed})${s.quote ? `\n  > ${q(s.quote)}` : ''}`)
md.push('')

md.push('## The complaint, paragraph by paragraph', '')
for (const p of prov.provenance) {
  if (p.section === 'caption' && p.tags.length === 0) continue
  if (['cite', 'subheading'].includes(p.cls) && p.tags.length === 0) continue
  md.push(`**[${p.section} ${p.index + 1}]** ${p.text}`)
  if (p.tags.length) for (const t of p.tags) md.push(`  - ${describe(t)}`)
  else md.push('  - fixed wording; no factual claim')
  md.push('')
}
writeFileSync(join(dir, 'sources.md'), md.join('\n'))

// ─── verification-report.md ───────────────────────────────────────────
const r = []
const status = validation.status
r.push(`# Verification report`, '', `**Status: ${status}**`, '', `Prepared ${today()} for ${[c.student?.first?.value, c.student?.last?.value].filter(Boolean).join(' ')}, ${state.name ?? c.state}. Run with ${c.runMeta?.model ?? 'an unrecorded model'}${c.runMeta?.effort ? ` at ${c.runMeta.effort} effort` : ''}.`, '')
r.push('## What was checked', '')
const vCounts = { verified: 0, 'unverifiable-image': 0, other: 0 }
for (const x of verified) vCounts[x.verification?.status === 'verified' ? 'verified' : x.verification?.status === 'unverifiable-image' ? 'unverifiable-image' : 'other']++
const confirmedN = confirmed.filter((x) => x.status === 'confirmed').length
const editedN = confirmed.filter((x) => x.status === 'edited').length
r.push(`1. **Documents read:** ${documents.length}, ${documents.reduce((n, d) => n + (d.pages ?? 0), 0)} pages; ${documents.reduce((n, d) => n + (d.imageOnlyPages ?? 0), 0)} page(s) with no text layer.`)
r.push(`2. **Readings machine-verified on their page:** ${vCounts.verified} of ${verified.length}${vCounts['unverifiable-image'] ? ` (${vCounts['unverifiable-image']} on image-only pages, checked by eye)` : ''}${vCounts.other ? ` — ${vCounts.other} FAILED` : ''}.`)
r.push(`3. **Confirmed by ${who}:** ${confirmedN} confirmed, ${editedN} edited, ${rejected.length} rejected. Only confirmed and edited readings reach the complaint.`)
r.push(`4. **Statement of the problems:** ${check.wordCount} words; every sentence tagged with its sources; every date, figure and quotation checked against the cited sources; pleading rules enforced (third person, no legal conclusions, no citations, no advice, no outcome language, no given names, no repetition). Gate runs: ${gatesLog.length || 'none recorded'}.`)
if (gatesLog.length) r.push('', '```', ...gatesLog, '```', '')
r.push(`5. **Validation:** ${validation.findings.filter((f) => f.level === 'blocking').length} blocking, ${validation.findings.filter((f) => f.level === 'warning').length} warning(s).`)
r.push(`6. **State procedure (${state.name ?? c.state}):** ${validation.stateUnverified === 0 ? 'every item sourced to a web page opened this run' : `${validation.stateUnverified} item(s) without a source — see below`}.`, '')
if (validation.findings.length) {
  r.push('## Findings', '')
  for (const f of validation.findings) r.push(`- ${f.level === 'blocking' ? '**BLOCKING**' : 'Warning'} [${f.code}] ${f.message}${f.cfr ? ` (${f.cfr})` : ''}`)
  r.push('')
}
r.push(`## How to file in ${state.name ?? c.state}`, '', `Verified on the web on ${state.checkedOn ?? 'an unrecorded date'}; every line below cites a page listed in sources.md.`, '')
for (const [key, label] of [['filesWith', 'Where it goes'], ['filingAddress', 'Address'], ['channels', 'How it may be sent'], ['requiredForm', 'Form'], ['serviceRecipients', 'Serve'], ['limitationsMonths', 'Window (months)'], ['additionalContents', 'Required beyond § 300.508(b)']]) {
  if (state[key]) r.push(`- **${label}:** ${stateValue(key)}`)
}
if (state.notes) r.push(`- **Notes:** ${state.notes}`)
r.push('')
r.push('## For the person signing', '')
r.push('- Read the complaint against sources.md. Every paragraph lists what it rests on; open the page or the URL and check it.')
r.push('- The statement of the problems states facts and draws no legal conclusion; the regulations print under the headings. Whether the facts make out each claim is your judgment.')
r.push('- The state procedure block was verified on the web on the date shown. Filing rules change; if the filing date is later, check again.')
r.push('- Nothing here estimates the outcome, and nothing should. The complaint is yours once you sign it.')
r.push('')
writeFileSync(join(dir, 'verification-report.md'), r.join('\n'))

console.log(`report: sources.md, verification-report.md — status ${status}`)
