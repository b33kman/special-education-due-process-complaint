// Checks <case>/complaint.md before it can be rendered as final:
//
//   - every date, figure and quotation in the body is written in the
//     documents (work/text/, from pdf-text.mjs) or in the person's own words
//     (statement.md) — a model's commonest error on a legal filing is a
//     plausible fact nobody wrote;
//   - the required elements are there: the child's name, the address of
//     residence, the school, the problems with their facts, a resolution;
//   - the sections follow the form in references/exemplar.md, in order.
//
//   node scripts/check.mjs <case folder>
//
// Exit 1 on any error. Also lists what rests on statement.md alone.

import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── The complaint file ─────────────────────────────────────────────────

export const FORM = [
  { key: 'introduction', re: /^introduction$/i, required: true },
  { key: 'contact', re: /^contact and residence information$/i, required: true },
  { key: 'facts', re: /^statement of facts$/i },
  { key: 'problems', re: /^statement of the problems$/i, required: true },
  { key: 'resolution', re: /^proposed resolution$/i, required: true },
  { key: 'hearing', re: /^requests concerning the hearing$/i },
  { key: 'state', re: /^additional information required in .+$/i },
  { key: 'signature', re: /^signature$/i, required: true },
  { key: 'service', re: /^certificate of service$/i, required: true },
]

/** Front matter and sections: each section a heading and its blank-line-separated blocks. */
export function parseComplaint(md) {
  const text = String(md).replace(/\r\n/g, '\n')
  const meta = {}
  let body = text
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^([A-Za-z]+):\s*(.*?)\s*(?:#.*)?$/)
      if (m) meta[m[1].toLowerCase()] = m[2]
    }
    body = text.slice(fm[0].length)
  }
  const sections = []
  for (const chunk of body.split(/^## /m).slice(1)) {
    const [headingLine, ...rest] = chunk.split('\n')
    const heading = headingLine.trim().replace(/^[IVX]+\.\s*/, '')
    const blocks = rest.join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
    sections.push({ heading, key: FORM.find((f) => f.re.test(heading))?.key ?? null, blocks })
  }
  return { meta, sections }
}

// ─── Matching against the sources ───────────────────────────────────────

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_ALT = [...new Set(MONTHS.flatMap((m) => [m, m.slice(0, 3), m.slice(0, 4)]).concat('sept'))].join('|')
const monthNumber = (name) => MONTHS.findIndex((m) => m.startsWith(name.toLowerCase().replace(/\.$/, ''))) + 1

const normalize = (s) => String(s ?? '').normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase()
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Is `needle` written in `hay`? Whole figures only: "40 minutes" is not in "240 minutes". */
function contains(hay, needle, loose = true) {
  const h = normalize(hay), n = normalize(needle)
  if (!n) return false
  const re = (x) => new RegExp(`${/^\d/.test(x) ? '(?<![\\d.,])' : ''}${escapeRe(x)}${/\d$/.test(x) ? '(?![\\d]|[.,]\\d)' : ''}`)
  if (re(n).test(h)) return true
  // A PDF text layer breaks lines inside words and phrases.
  return loose && re(n.replace(/[\s-]/g, '')).test(h.replace(/[\s-]/g, ''))
}

/** Every calendar date a source writes, in any common form, as m/d/yyyy. */
function datesIn(text) {
  const out = new Set()
  const add = (mm, dd, yy) => {
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return
    for (const y of String(yy).length === 4 ? [yy] : [`20${yy}`, `19${yy}`]) out.add(`${Number(mm)}/${Number(dd)}/${y}`)
  }
  const t = String(text ?? '')
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4}|\\d{2})\\b`, 'gi'))) add(monthNumber(m[1]), Number(m[2]), m[3])
  for (const m of t.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) add(Number(m[2]), Number(m[3]), m[1])
  for (const m of t.matchAll(/(?<![\d/])(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4}|\d{2})(?![\d/])/g)) add(Number(m[1]), Number(m[2]), m[3])
  return out
}
function monthsIn(text) {
  const out = new Set()
  const t = String(text ?? '')
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?,?\\s+(\\d{4})\\b`, 'gi'))) out.add(`${monthNumber(m[1])}/${m[2]}`)
  for (const m of t.matchAll(/(?<![\d/])(\d{1,2})\s*\/\s*(\d{4})(?![\d/])/g)) out.add(`${Number(m[1])}/${m[2]}`)
  for (const d of datesIn(t)) { const [mm, , y] = d.split('/'); out.add(`${mm}/${y}`) }
  return out
}

/** What a paragraph of the complaint asserts: dates, bare months, figures, quotations. */
function claimsIn(block) {
  let t = block.replace(/^\([a-z]\)\s+/, '')
  // A defined term in parentheses — (“Student”), (“FAPE”) — is not a quotation.
  // American style puts a period or comma inside the closing quote; it is the writer's, not the source's.
  const quotes = [...t.matchAll(/(\(?)["“]([^"“”]{2,})["”](\)?)/g)].filter((m) => !(m[1] && m[3])).map((m) => m[2].replace(/[.,;:]+$/, ''))
  const dates = [...t.matchAll(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2}),\\s+(\\d{4})\\b`, 'gi'))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${Number(m[2])}/${m[3]}` }))
  for (const d of dates) t = t.replace(d.text, ' ')
  const months = [...t.matchAll(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{4})\\b`, 'gi'))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${m[2]}` }))
  for (const m of months) t = t.replace(m.text, ' ')
  // Citations, section letters and form codes ("CELF-5", "H-06E") are not facts about the child.
  t = t
    .replace(/\b\d+\s+(?:C\.F\.R|U\.S\.C)\.?\s*(?:§+\s*)?[\w.()–-]*/g, ' ')
    .replace(/§+\s*[\d.()a-z,–\s-]+/gi, ' ')
  const numbers = [...t.matchAll(/(?<![\w.]|[A-Za-z]-)(\$?\d[\d,]*(?:\.\d+)?%?)(?:\s+([a-z]+))?/gi)].map((m) => ({ n: m[1].replace(/,/g, ''), unit: m[2] ?? '' }))
  return { dates, months, numbers, quotes }
}
const figureIn = (n, text) => new RegExp(`${n.startsWith('$') ? '\\$\\s?' : ''}(?<![\\d.])${escapeRe(n.replace(/[$%]/g, ''))}(?![\\d])${n.endsWith('%') ? '\\s?(?:%|percent)' : ''}`, 'i').test(String(text).replace(/,/g, ''))

// ─── The check ──────────────────────────────────────────────────────────

export function checkComplaint(dir) {
  const errors = []
  const statementOnly = []
  const file = join(dir, 'complaint.md')
  if (!existsSync(file)) return { errors: ['there is no complaint.md in the case folder'], statementOnly, parsed: null }
  const parsed = parseComplaint(readFileSync(file, 'utf8'))
  const { meta, sections } = parsed

  const textDir = join(dir, 'work', 'text')
  const documents = existsSync(textDir) ? readdirSync(textDir).filter((f) => f.endsWith('.txt')).map((f) => readFileSync(join(textDir, f), 'utf8')).join('\n') : ''
  if (!documents) errors.push('no document text in work/text/ — run pdf-text.mjs first')
  const statement = existsSync(join(dir, 'statement.md')) ? readFileSync(join(dir, 'statement.md'), 'utf8') : ''
  const sources = `${documents}\n${statement}`

  // The caption and the required facts.
  for (const k of ['forum', 'state', 'petitioner', 'respondent', 'date', 'student', 'address', 'school']) {
    if (!meta[k]) errors.push(`the front matter has no ${k}:`)
  }
  if (!['draft', 'final'].includes(meta.status)) errors.push('the front matter needs status: draft or status: final')

  // The form: known sections, in order, the required ones present and not empty.
  let last = -1
  for (const s of sections) {
    const at = FORM.findIndex((f) => f.key === s.key)
    if (at === -1) errors.push(`“## ${s.heading}” is not a section of the complaint (references/exemplar.md)`)
    else if (at <= last) errors.push(`“## ${s.heading}” is out of order (references/exemplar.md)`)
    else last = at
  }
  for (const f of FORM.filter((x) => x.required)) {
    const s = sections.find((x) => x.key === f.key)
    if (!s) errors.push(`the complaint has no ${f.key === 'problems' ? '“Statement of the problems”' : f.key === 'resolution' ? '“Proposed resolution”' : `“${f.re.source.replace(/[\^$\\/i]/g, '')}”`} section`)
    else if (!s.blocks.some((b) => !/^\*.*\*$/.test(b) && !b.startsWith('###'))) errors.push(`the “${s.heading}” section is empty`)
  }
  const body = sections.filter((s) => !['signature', 'service'].includes(s.key))
  const bodyText = body.flatMap((s) => s.blocks).join('\n')
  const intro = sections.find((s) => s.key === 'introduction')?.blocks.join('\n') ?? ''
  const contact = sections.find((s) => s.key === 'contact')?.blocks.join('\n') ?? ''
  if (meta.student && !contains(intro, meta.student)) errors.push(`the introduction does not name the child as the front matter does (“${meta.student}”)`)
  if (meta.address && !contains(contact, meta.address)) errors.push(`the contact and residence section does not give the address as the front matter does (“${meta.address}”)`)
  if (meta.school && !contains(bodyText, meta.school)) errors.push(`the complaint does not name the school (“${meta.school}”)`)
  for (const [k, parts] of [['student', String(meta.student ?? '').split(/\s+/)], ['address', String(meta.address ?? '').split(/,\s*/)], ['school', [meta.school]]]) {
    for (const part of parts.filter(Boolean)) if (!contains(sources, part)) errors.push(`${k}: “${part}” is not in the documents or statement.md`)
  }

  // Every date, figure and quotation in the body, against the sources.
  const docDates = datesIn(documents), stmtDates = datesIn(statement)
  const docMonths = monthsIn(documents), stmtMonths = monthsIn(statement)
  for (const s of body) {
    for (const block of s.blocks) {
      if (block.startsWith('###') || /^\*.*\*$/.test(block)) continue
      const where = `${s.heading}: “${block.slice(0, 80)}${block.length > 80 ? '…' : ''}”`
      const { dates, months, numbers, quotes } = claimsIn(block)
      for (const d of dates) {
        if (docDates.has(d.key)) continue
        if (stmtDates.has(d.key)) statementOnly.push(`${d.text} — ${where}`)
        else errors.push(`${where} — the date “${d.text}” is not in the documents or statement.md`)
      }
      for (const m of months) {
        if (docMonths.has(m.key)) continue
        if (stmtMonths.has(m.key)) statementOnly.push(`${m.text} — ${where}`)
        else errors.push(`${where} — “${m.text}” is not in the documents or statement.md`)
      }
      for (const { n, unit } of numbers) {
        // A figure with its unit ("15 days") is looked for with the unit first, so "15%" in a document does not account for it.
        const withUnit = unit && !/%$/.test(n) ? `${n} ${unit}` : ''
        if (withUnit ? contains(documents, withUnit) : figureIn(n, documents)) continue
        if (withUnit ? contains(statement, withUnit) : figureIn(n, statement)) { statementOnly.push(`${withUnit || n} — ${where}`); continue }
        if (figureIn(n, documents)) continue
        if (figureIn(n, statement)) statementOnly.push(`${n} — ${where}`)
        else errors.push(`${where} — the figure “${n}” is not in the documents or statement.md`)
      }
      for (const q of quotes) {
        if (contains(documents, q, false)) continue
        if (contains(statement, q, false)) statementOnly.push(`“${q}” — ${where}`)
        else errors.push(`${where} — the quotation “${q}” is not word for word in the documents or statement.md`)
      }
    }
  }
  return { errors, statementOnly, parsed }
}

// ─── Command line ───────────────────────────────────────────────────────

// Compared as real paths, so it also runs when the skill is reached through a symlink.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  if (!process.argv[2]) {
    console.error('usage: node scripts/check.mjs <case folder>   — every date, figure and quotation in complaint.md against the documents and statement.md; the required elements; the form')
    process.exit(2)
  }
  const { errors, statementOnly } = checkComplaint(resolve(process.argv[2]))
  for (const e of errors) console.log(`✗ ${e}`)
  if (statementOnly.length) {
    console.log('\nFrom statement.md, not from any document — tell the person signing:')
    for (const s of statementOnly) console.log(`  · ${s}`)
  }
  console.log(errors.length ? `\n${errors.length} error(s). Fix each from the sources and run again.` : '\ncheck passed.')
  process.exit(errors.length ? 1 : 0)
}
