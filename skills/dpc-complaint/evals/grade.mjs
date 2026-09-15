// Grades one eval run against the objective assertions in evals.json, so the
// with-skill and no-skill runs are judged by the same script rather than by
// eye. Writes <run>/grading.json in the shape the skill-creator viewer reads.
//
//   node evals/grade.mjs <run dir> --eval <1|2> [--asked yes|no]
//
// <run dir> is the folder holding outputs/ (the case folder the run wrote
// into, with documents/ inside it). --asked says whether the run stopped to
// ask the user a question (read from the run's final reply; the script
// cannot see the transcript).

import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { datesIn, draftDates, draftMonths, monthsIn, numbersIn, numberAppearsIn, withoutQuotes } from '../scripts/lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const runDir = args.find((a) => !a.startsWith('--'))
const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined }
const evalId = Number(flag('eval'))
const asked = flag('asked')
if (!runDir || !evalId) { console.error('usage: node evals/grade.mjs <run dir> --eval <1|2> [--asked yes|no]'); process.exit(2) }

const outputs = join(runDir, 'outputs')
const evals = JSON.parse(readFileSync(join(here, 'evals.json'), 'utf8')).evals
const ev = evals.find((e) => e.id === evalId)

// ─── gather the run's files ──────────────────────────────────────────────
const textFiles = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { if (!['documents', 'node_modules', 'text'].includes(name)) walk(p); continue }
    if (/\.(md|txt|json|html)$/i.test(name)) textFiles.push({ path: p, name, rel: p.slice(outputs.length + 1), text: readFileSync(p, 'utf8') })
  }
}
walk(outputs)
const allText = textFiles.map((f) => f.text).join('\n')
const findFile = (re) => textFiles.find((f) => re.test(f.rel))

const complaint = findFile(/^complaint\.md$/i) ?? findFile(/complaint.*\.md$/i) ?? textFiles.filter((f) => /\.md$/i.test(f.name) && !/sources|verification|readme|notes/i.test(f.name)).sort((a, b) => b.text.length - a.text.length)[0]
const body = complaint?.text ?? ''

// The statement — the statement of facts (where the run wrote one) and the
// statement of the problems — from the first such heading to the proposed
// resolution, whatever numeral or number the headings carry.
function statementOf(text) {
  const start = text.search(/^#+\s*(?:[IVX]+|\d+)?\.?\s*statement of (?:the )?(?:problems?|facts)|^(?:[IVX]+|\d+)\.\s+.*statement/im)
  const endRe = /^#+\s*(?:[IVX]+|\d+)?\.?\s*proposed resolution|^(?:[IVX]+|\d+)\.\s+.*(?:resolution|relief)|^#+\s*(?:proposed )?(?:resolution|relief)/im
  if (start < 0) return { text, how: 'no statement heading found; the whole complaint was checked' }
  const rest = text.slice(start)
  const end = rest.slice(20).search(endRe)
  return { text: end < 0 ? rest : rest.slice(0, end + 20), how: 'the section from the statement heading to the resolution heading' }
}
const st = statementOf(body)
// Regulation lines under the headings are the exemplar's fixed form, and a
// paragraph number is not a figure about the student; the facts are the rest.
const facts = st.text.split('\n').filter((l) => !/^\s*\*?\s*34 C\.F\.R\./.test(l) && !/^#/.test(l)).map((l) => l.replace(/^\d+\.\s+/, '')).join('\n')
const factsNoQuotes = withoutQuotes(facts)

// ─── the documents' text, extracted the same way the skill does ──────────
const tmp = mkdtempSync(join(tmpdir(), 'dpc-grade-'))
cpSync(join(outputs, 'documents'), join(tmp, 'documents'), { recursive: true })
spawnSync(process.execPath, [join(here, '..', 'scripts', 'pdf-text.mjs'), tmp], { encoding: 'utf8' })
let pdfText = ''
const textDir = join(tmp, 'work', 'text')
if (existsSync(textDir)) for (const f of readdirSync(textDir)) {
  const j = JSON.parse(readFileSync(join(textDir, f), 'utf8'))
  for (const p of j.pages ?? []) pdfText += `\n${p.text}`
}
rmSync(tmp, { recursive: true, force: true })
const allowed = `${pdfText}\n${ev.prompt}` // the person's own statement is a source too

// ─── checks ──────────────────────────────────────────────────────────────
const results = []
const grade = (text, passed, evidence) => results.push({ text, passed: Boolean(passed), evidence })
const A = ev.expectations

const head = body.slice(0, 900)
const lines = (re, n = 3) => allText.split('\n').filter((l) => re.test(l)).slice(0, n).map((l) => l.trim().slice(0, 160)).join(' | ')

function checkDates() {
  const have = datesIn(allowed)
  const months = monthsIn(allowed)
  const missing = draftDates(facts).filter((d) => !have.has(d.key)).map((d) => d.text)
  const missingMonths = draftMonths(facts).filter((m) => !months.has(m.key)).map((m) => m.text)
  const fromPrompt = draftDates(facts).filter((d) => !datesIn(pdfText).has(d.key) && have.has(d.key)).map((d) => d.text)
  const all = [...missing, ...missingMonths]
  return { ok: all.length === 0, evidence: all.length ? `not in the documents or the person's statement: ${[...new Set(all)].join(', ')}` : `${draftDates(facts).length} dates and ${draftMonths(facts).length} month references checked; all appear in the documents${fromPrompt.length ? ` (only in the person's statement: ${[...new Set(fromPrompt)].join(', ')})` : ''}` }
}
function checkNumbers() {
  const nums = numbersIn(facts.replace(/^\s*[A-Z]\.\s*$/gm, ''))
  const missing = [...new Set(nums.filter((n) => !numberAppearsIn(n, allowed)))]
  const onlyPrompt = [...new Set(nums.filter((n) => !numberAppearsIn(n, pdfText) && numberAppearsIn(n, allowed)))]
  return { ok: missing.length === 0, evidence: missing.length ? `figures not in the documents or the person's statement: ${missing.join(', ')}` : `${nums.length} figures checked; all appear in the documents${onlyPrompt.length ? ` (only in the person's statement: ${onlyPrompt.join(', ')})` : ''}` }
}
const firstPerson = factsNoQuotes.match(/\b(I|I'm|I've|my|me|we|our|us)\b/g)
const citations = facts.match(/\b\d+\s*C\.?\s*F\.?\s*R\.?|\bU\.?S\.?C\.?\b|§|\bIDEA\b.{0,30}\brequires\b/g)
const conclusions = factsNoQuotes.match(/\bviolat\w*|in violation of|denied .{0,30}\bFAPE\b|free appropriate public education|\bunlawful\w*|\bfailed to comply\b|\bbreach\w*/gi)
const outcome = withoutQuotes(body).match(/\blikely to (prevail|succeed)\b|\bstrong case\b|\bwould likely\b|\bwill likely\b|hearing officer (would|will|should) (find|order|conclude)|\bshould prevail\b|\bmeritorious\b|\bclearly (violat|denied|failed)/gi)
const sourcesFile = textFiles.find((f) => /sources/i.test(f.name) && (f.text.match(/\bp(age|\.)\s*\d+/gi) ?? []).length >= 5)
const pageRefsInComplaint = (body.match(/\bp(age|\.)\s*\d+/gi) ?? []).length
const officialUrls = [...new Set((allText.match(/https?:\/\/[^\s)\]"'>]+/g) ?? []).map((u) => u.replace(/[.,;:]+$/, '')).filter((u) => /\.gov\b|\.state\.\w\w\.us\b|public\.law|law\.cornell\.edu|ncleg\.gov/i.test(u)))]
const accessDate = allText.match(/\b(accessed|retrieved|checked|read on|checkedOn)\b[^\n]{0,40}\b20\d\d\b|"accessed":\s*"20\d\d-\d\d-\d\d"/i)
const verification = textFiles.find((f) => /verification/i.test(f.name))

if (evalId === 1) {
  grade(A[0], complaint && body.length > 1500, complaint ? `${complaint.rel}, ${body.length} characters` : 'no complaint file found')
  grade(A[1], /OFFICE OF ADMINISTRATIVE HEARINGS/i.test(head) && !/BEFORE THE CALIFORNIA DEPARTMENT OF EDUCATION/i.test(head), head.split('\n').filter(Boolean).slice(0, 3).join(' | '))
  grade(A[2], /Jordan Rivera|Rivera, Jordan/.test(body) && /95833/.test(body) && /Willow Creek Elementary School/.test(body), `name ${/Jordan Rivera|Rivera, Jordan/.test(body)}, ZIP ${/95833/.test(body)}, school ${/Willow Creek Elementary School/.test(body)}`)
  const d = checkDates(); grade(A[3], d.ok, `${d.evidence} (${st.how})`)
  const n = checkNumbers(); grade(A[4], n.ok, `${n.evidence} (${st.how})`)
  grade(A[5], !firstPerson, firstPerson ? `first person found: ${[...new Set(firstPerson)].join(', ')}` : 'no first-person pronoun outside quotations')
  grade(A[6], !/\bJordan\b/.test(factsNoQuotes), /\bJordan\b/.test(factsNoQuotes) ? `"Jordan" appears ${(factsNoQuotes.match(/\bJordan\b/g) ?? []).length} time(s) in the statement` : 'the statement says Student')
  grade(A[7], !citations && !conclusions, `${citations ? `citations in the facts: ${[...new Set(citations)].slice(0, 4).join(', ')}` : 'no citation in the facts (regulation lines under the headings excluded)'}; ${conclusions ? `legal conclusions: ${[...new Set(conclusions)].slice(0, 4).join(', ')}` : 'no legal conclusion'}`)
  grade(A[8], !outcome, outcome ? `outcome language: ${[...new Set(outcome)].join(', ')}` : 'none found')
  const res = body.slice(body.search(/proposed resolution|relief requested|relief sought|IV\./i))
  const reliefOk = /15 days/i.test(res) && /independent educational evaluation/i.test(res) && /compensatory/i.test(res) && /quarterly/i.test(res)
  grade(A[9], reliefOk, `15 days ${/15 days/i.test(res)}, IEE ${/independent educational evaluation/i.test(res)}, compensatory ${/compensatory/i.test(res)}, quarterly logs ${/quarterly/i.test(res)}`)
  grade(A[10], sourcesFile || pageRefsInComplaint >= 8, sourcesFile ? `${sourcesFile.rel} carries ${(sourcesFile.text.match(/\bp(age|\.)\s*\d+/gi) ?? []).length} page references` : `no sources file; ${pageRefsInComplaint} page references inside the complaint`)
  grade(A[11], officialUrls.length >= 2 && accessDate && /Gateway Oaks|two years|2 years|24/.test(allText), `${officialUrls.length} official URL(s)${officialUrls.slice(0, 3).map((u) => ` ${u}`).join('')}; access date ${accessDate ? `"${accessDate[0].slice(0, 60)}"` : 'none'}`)
  grade(A[12], verification && /\bFINAL\b/.test(verification.text) && /0 blocking/.test(verification.text), verification ? lines(/status|blocking/i, 2) : 'no verification report')
  grade(A[13], asked === 'no', asked ? `run's final reply: asked=${asked}` : 'not supplied (--asked)')
} else {
  grade(A[0], complaint && body.length > 1500, complaint ? `${complaint.rel}, ${body.length} characters` : 'no complaint file found')
  grade(A[1], /OFFICE OF ADMINISTRATIVE HEARINGS/i.test(head) && /NORTH CAROLINA/i.test(head), head.split('\n').filter(Boolean).slice(0, 3).join(' | '))
  const sig = body.slice(body.search(/respectfully submitted|signature|\/s\//i))
  grade(A[2], /Castillo/.test(sig) && /61042/.test(sig) && !/pro se|self-represented/i.test(sig), `counsel ${/Castillo/.test(sig)}, bar no. ${/61042/.test(sig)}, pro se wording ${/pro se|self-represented/i.test(sig)}`)
  grade(A[3], /Maya Okafor|Okafor, Maya/.test(body) && /27999/.test(body) && /Cedar Ridge Middle School/.test(body), `name ${/Maya Okafor|Okafor, Maya/.test(body)}, ZIP ${/27999/.test(body)}, school ${/Cedar Ridge Middle School/.test(body)}`)
  const d = checkDates(); grade(A[4], d.ok, `${d.evidence} (${st.how})`)
  const n = checkNumbers(); grade(A[5], n.ok, `${n.evidence} (${st.how})`)
  grade(A[6], !firstPerson && !/\bMaya\b/.test(factsNoQuotes), `${firstPerson ? `first person: ${[...new Set(firstPerson)].join(', ')}` : 'third person'}; "Maya" in the statement ${/\bMaya\b/.test(factsNoQuotes)}`)
  grade(A[7], !citations && !conclusions, `${citations ? `citations in the facts: ${[...new Set(citations)].slice(0, 4).join(', ')}` : 'no citation in the facts (regulation lines under the headings excluded)'}; ${conclusions ? `legal conclusions: ${[...new Set(conclusions)].slice(0, 4).join(', ')}` : 'no legal conclusion'}`)
  grade(A[8], !outcome, outcome ? `outcome language: ${[...new Set(outcome)].join(', ')}` : 'none found')
  const lim = /115C-109\.6/.test(allText) && /one[- ]year|1 year|12 months|"value":\s*12\b/i.test(allText)
  grade(A[9], lim, lines(/115C-109\.6|one[- ]year|12 months/i, 3) || 'no one-year rule found')
  const proc = /H-06E|1711 New Hope Church/i.test(allText) && officialUrls.some((u) => /oah\.nc\.gov/i.test(u)) && accessDate && /superintendent/i.test(body)
  grade(A[10], proc, `form/address ${/H-06E|1711 New Hope Church/i.test(allText)}, oah.nc.gov URL ${officialUrls.some((u) => /oah\.nc\.gov/i.test(u))}, access date ${Boolean(accessDate)}, superintendent in the complaint ${/superintendent/i.test(body)}`)
  const warned = textFiles.some((f) => /outside-limitations/.test(f.text) || (/May 6, 2025|2025-05-06/.test(f.text) && /outside|limitations|one[- ]year|12 months|window/i.test(f.text) && !/^complaint\.md$/i.test(f.rel)))
  grade(A[11], warned, warned ? lines(/outside-limitations|May 6, 2025.*(window|limitations)|(window|limitations).*May 6, 2025/i, 3) : 'no file flags the May 6, 2025 event against the one-year window')
  grade(A[12], sourcesFile || pageRefsInComplaint >= 8, sourcesFile ? `${sourcesFile.rel} carries ${(sourcesFile.text.match(/\bp(age|\.)\s*\d+/gi) ?? []).length} page references` : `no sources file; ${pageRefsInComplaint} page references inside the complaint`)
  grade(A[13], asked === 'no', asked ? `run's final reply: asked=${asked}` : 'not supplied (--asked)')
}

const passed = results.filter((r) => r.passed).length
// Timing stays in the run's own timing.json: the skill-creator aggregator
// reads tokens from there only when grading.json carries no timing of its own.
const out = { expectations: results, summary: { passed, failed: results.length - passed, total: results.length, pass_rate: Number((passed / results.length).toFixed(2)) }, graded_by: basename(fileURLToPath(import.meta.url)), files: textFiles.map((f) => f.rel) }
writeFileSync(join(runDir, 'grading.json'), JSON.stringify(out, null, 2))
for (const r of results) console.log(`${r.passed ? '✓' : '✗'} ${r.text}\n    ${r.evidence}`)
console.log(`\n${passed}/${results.length} passed → ${join(runDir, 'grading.json')}`)
