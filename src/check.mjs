// Checks <case>/complaint.md before it can be rendered as final:
//
//   - every date, figure and quotation in the body is written in the
//     documents (work/text/, from pdf-text.mjs), in the person's own words
//     (statement.md), or is the result of a row of the arithmetic table —
//     unless the paragraph carries a flag, which is how an unsupported fact
//     reaches the page honestly (references/exemplar.md);
//   - the required elements are there: the child's name, the address of
//     residence, the school, the problems with their facts, a resolution;
//   - the sections follow the form in references/exemplar.md, in order,
//     ending with the review notes;
//   - every [#label] points to a paragraph that starts with that label, every
//     [@source] names a document in the folder and a page it has, and each
//     claim says what its problem is rather than only listing numbers;
//   - every flag is numbered in sequence and explained in the review notes;
//   - the arithmetic table adds up, and every input traces to a source.
//
//   node scripts/check.mjs <case folder>
//
// Exit 1 on any error. Also lists what rests on statement.md alone, what rests
// on a flag, and every flag still open.

import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPORTERS, circuitForState, citationsIn, tier1For } from './authorities-data.mjs'

// ─── The complaint file ─────────────────────────────────────────────────

export const FORM = [
  { key: 'preliminary', re: /^preliminary statement$/i, required: true, name: '“Preliminary statement”' },
  { key: 'required', re: /^required information$/i, required: true, name: '“Required information”' },
  { key: 'jurisdiction', re: /^jurisdiction, timeliness and burden$/i, required: true, name: '“Jurisdiction, timeliness and burden”' },
  { key: 'facts', re: /^statement of facts$/i, required: true, name: '“Statement of facts”' },
  { key: 'problems', re: /^statement of the problems$/i, required: true, name: '“Statement of the problems”' },
  { key: 'pendency', re: /^pendency$/i },
  { key: 'resolution', re: /^proposed resolution$/i, required: true, name: '“Proposed resolution”' },
  { key: 'hearing', re: /^requests concerning the hearing$/i },
  { key: 'state', re: /^additional information required in .+$/i },
  { key: 'rights', re: /^reservation of rights$/i },
  { key: 'signature', re: /^signature$/i, required: true, name: '“Signature”' },
  { key: 'service', re: /^certificate of service$/i, required: true, name: '“Certificate of service”' },
  { key: 'notes', re: /^(?:attorney review notes\s*[–—-]\s*attorney work product\s*[–—-]\s*remove before filing|review notes\s*[–—-]\s*remove before filing)$/i, required: true, name: '“Review Notes – Remove Before Filing”' },
]

/** Sections that may point at a paragraph of the chronology. */
const POINTER_SECTIONS = new Set(['problems', 'pendency'])
/** Who is filing. The signature block and the notes heading follow it. */
export const FILERS = ['parent', 'guardian', 'student', 'attorney', 'advocate', 'legal-aid']
/** A filer whose review notes are attorney work product. */
const COUNSEL_FILERS = new Set(['attorney', 'legal-aid'])
export const FLAG_KINDS = ['MISSING', 'CONFLICT', 'VERIFY', 'COUNSEL']
const FLAG_RE = new RegExp(`\\[(${FLAG_KINDS.join('|')})-(\\d+)(?::\\s*([^\\]]*))?\\]`, 'g')
const MAX_FLAG_WORDS = 12

const isTable = (block) => block.trimStart().startsWith('|')
/** A markdown table's cells, as plain text, minus its header and rule rows. */
function tableRows(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'))
  const cells = lines.map((l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
  return cells.filter((row) => !row.every((c) => /^:?-{2,}:?$/.test(c) || c === ''))
}

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

/** Is `q` quoted word for word in `hay`? The one latitude is the extractor's, not the writer's:
 *  pdf.js ends a text item at a font or position change, so an extracted line can read
 *  "on leave ; no substitute". Closing that space up is not rewording — every word, and the
 *  order of them, still has to match exactly. */
const tighten = (s) => String(s ?? '').replace(/\s+([;:,.!?])/g, '$1')
const quotedIn = (hay, q) => contains(hay, q, false) || contains(tighten(hay), tighten(q), false)

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

/** Everything the renderer reads rather than prints, stripped before a block is read as prose. */
const stripMarkers = (t) => String(t)
  .replace(FLAG_RE, ' ')
  .replace(/\[@[^\]]*\]/g, ' ')
  .replace(/\[#[^\]]*\]/g, ' ')

/** What a paragraph of the complaint asserts: dates, bare months, figures, quotations. */
function claimsIn(block) {
  // A label, a source and a flag are instructions to the renderer, not facts.
  let t = stripMarkers(block.replace(/^\([a-z]\)\s+/, ''))
  // A defined term in parentheses — (“Student”), (“FAPE”) — is not a quotation.
  // American style puts a period or comma inside the closing quote; it is the writer's, not the source's.
  const quotes = [...t.matchAll(/(\(?)["“]([^"“”]{2,})["”](\)?)/g)].filter((m) => !(m[1] && m[3])).map((m) => m[2].replace(/[.,;:]+$/, ''))
  const dates = [
    // "October 14, 2025", and the abbreviated forms a model reaches for anyway.
    ...[...t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,\\s*(\\d{4})\\b`, 'gi'))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${Number(m[2])}/${m[3]}` })),
    // "12/2/2026" and "2026-12-02". The pleading should write a date in full, but a date it does
    // write in figures still has to be one somebody wrote down.
    ...[...t.matchAll(/(?<![\d/-])(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})(?![\d/])/g)].map((m) => ({ text: m[0], key: `${Number(m[1])}/${Number(m[2])}/${m[3]}` })),
    ...[...t.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)].map((m) => ({ text: m[0], key: `${Number(m[2])}/${Number(m[3])}/${m[1]}` })),
  ]
  for (const d of dates) t = t.replace(d.text, ' ')
  const months = [...t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{4})\\b`, 'gi'))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${m[2]}` }))
  for (const m of months) t = t.replace(m.text, ' ')
  // Citations, section letters and form codes ("CELF-5", "H-06E") are not facts about the child.
  t = t
    .replace(/\b\d+\s+(?:C\.F\.R|U\.S\.C)\.?\s*(?:§+\s*)?[\w.()–-]*/g, ' ')
    .replace(/§+\s*[\d.()a-z,–\s-]+/gi, ' ')
    // A reporter citation in a claim is an authority, checked against references/authorities.md
    // and references/audit.md § 3, not a fact about this student. The volume and the pages are
    // bounded explicitly, and so is the court-and-year parenthetical: an earlier version stopped
    // at the first period, so "694 F.3d 167, 186-88 (2d Cir. 2012)" was only half struck out and
    // its volume number was then refused as an unsourced figure.
    .replace(CITATION_LONG, ' ')
    .replace(CITATION_SHORT, ' ')
  const numbers = [...t.matchAll(/(?<![\w.]|[A-Za-z]-)(\$?\d[\d,]*(?:\.\d+)?%?)(?:\s+([a-z]+))?/gi)].map((m) => ({ n: m[1].replace(/,/g, ''), unit: unitOf(m[2]) }))
  return { dates, months, numbers, quotes }
}
// A unit is a noun, not whatever word happens to follow the figure. "24 and" is a parse
// artefact; reading it as a unit sends a documented figure down the statement path.
const NOT_A_UNIT = new Set(['and', 'or', 'to', 'through', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'the', 'a', 'an', 'as', 'from', 'that', 'which', 'was', 'were', 'is', 'are', 'than', 'but', 'so', 'if', 'when', 'while', 'before', 'after'])
const unitOf = (word) => (word && !NOT_A_UNIT.has(word.toLowerCase()) ? word : '')
// "580 U.S. 386, 399 (2017)" and "694 F.3d 167, 186-88 (2d Cir. 2012)".
const CITATION_LONG = new RegExp(`\\b\\d{1,4}\\s+(?:${REPORTERS})\\s+\\d{1,4}(?:\\s*,\\s*[\\d–—-]+)*(?:\\s*\\([^()]{0,60}\\))?`, 'g')
// "580 U.S. at 399".
const CITATION_SHORT = new RegExp(`\\b\\d{1,4}\\s+(?:${REPORTERS})\\s+at\\s+[\\d–—,\\s-]+`, 'g')
const figureIn = (n, text) => new RegExp(`${n.startsWith('$') ? '\\$\\s?' : ''}(?<![\\d.])${escapeRe(n.replace(/[$%]/g, ''))}(?![\\d])${n.endsWith('%') ? '\\s?(?:%|percent)' : ''}`, 'i').test(String(text).replace(/,/g, ''))

// ─── The arithmetic table ───────────────────────────────────────────────

const ARITHMETIC_HEADER = ['what', 'inputs', 'computation', 'result']
// Digits and operators only — and no comment, which let part of a printed computation be inert
// ("24 - 4 /*- 10*/"), and no exponent.
const SAFE_EXPRESSION = /^(?!.*(?:\/\*|\*\/|\*\*|\/\/))[\d+\-*/(). ]+$/
const leadingNumber = (s) => {
  const m = String(s).replace(/,/g, '').match(/^\s*(-?\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

/** Rows of the arithmetic table in the review notes, recomputed. */
export function auditArithmetic(notesSection, sources) {
  const errors = []
  const results = []
  if (!notesSection) return { errors, results }
  for (const block of notesSection.blocks.filter(isTable)) {
    const rows = tableRows(block)
    if (!rows.length) continue
    const header = rows[0].map((c) => c.replace(/\*/g, '').toLowerCase())
    if (ARITHMETIC_HEADER.some((h, i) => header[i] !== h)) continue
    for (const row of rows.slice(1)) {
      const [what, inputs, computation, result] = row
      const where = `the arithmetic table, “${what}”`
      if (!SAFE_EXPRESSION.test(computation)) {
        errors.push(`${where}: the computation “${computation}” must be digits and + - * / ( ) . only`)
        continue
      }
      // Source attributions are parenthetical; the figures are what is left. An input may also be
      // a result an earlier row computed, or no count can be built on another count.
      const inputFigures = new Set()
      for (const { n } of [...inputs.replace(/\([^)]*\)/g, ' ').matchAll(/(\$?\d[\d,]*(?:\.\d+)?%?)/g)].map((m) => ({ n: m[1].replace(/,/g, '') }))) {
        inputFigures.add(n.replace(/[$%]/g, ''))
        if (!figureIn(n, sources) && !results.includes(n.replace(/[$%]/g, ''))) {
          errors.push(`${where}: the input “${n}” is neither in the documents or statement.md nor a result computed above`)
        }
      }
      for (const m of computation.matchAll(/\d+(?:\.\d+)?/g)) {
        const n = m[0]
        if (!inputFigures.has(n) && !results.includes(n)) {
          errors.push(`${where}: the computation uses ${n}, which is not one of its inputs or a result computed above`)
        }
      }
      let value
      try {
        // eslint-disable-next-line no-new-func -- the expression is held to SAFE_EXPRESSION above,
        // which admits no identifier, so there is nothing for it to reach.
        value = Function(`"use strict"; return (${computation})`)()
      } catch {
        errors.push(`${where}: the computation “${computation}” does not evaluate`)
        continue
      }
      const stated = leadingNumber(result)
      if (stated === null) { errors.push(`${where}: the result “${result}” does not lead with a number`); continue }
      if (!Number.isFinite(value) || Math.abs(value - stated) > 0.005) {
        errors.push(`${where}: ${computation} is ${value}, and the result says ${stated}`)
        continue
      }
      results.push(String(stated))
    }
  }
  return { errors, results }
}

// ─── The check ──────────────────────────────────────────────────────────

export function checkComplaint(dir) {
  const errors = []
  const statementOnly = []
  const onFlag = []
  const onLaw = []
  const file = join(dir, 'complaint.md')
  if (!existsSync(file)) return { errors: ['there is no complaint.md in the case folder'], statementOnly, onFlag, onLaw, openFlags: [], parsed: null }
  const parsed = parseComplaint(readFileSync(file, 'utf8'))
  const { meta, sections } = parsed

  const textDir = join(dir, 'work', 'text')
  const textFiles = existsSync(textDir) ? readdirSync(textDir).filter((f) => f.endsWith('.txt')) : []
  const textOf = new Map(textFiles.map((f) => [f, readFileSync(join(textDir, f), 'utf8')]))
  const documents = [...textOf.values()].join('\n')
  if (!documents) errors.push('no document text in work/text/ — run pdf-text.mjs first')
  const statement = existsSync(join(dir, 'statement.md')) ? readFileSync(join(dir, 'statement.md'), 'utf8') : ''
  const sources = `${documents}\n${statement}`

  // The caption and the required facts.
  for (const k of ['forum', 'state', 'circuit', 'filer', 'petitioner', 'respondent', 'date', 'student', 'address', 'school']) {
    if (!meta[k]) errors.push(`the front matter has no ${k}:`)
  }
  if (meta.filer && !FILERS.includes(meta.filer)) errors.push(`filer: must be one of ${FILERS.join(', ')}`)
  if (meta.state && meta.circuit) {
    const expected = circuitForState(meta.state)
    if (!expected) errors.push(`state: “${meta.state}” is not a state or the District of Columbia`)
    else if (expected !== meta.circuit.trim()) errors.push(`circuit: ${meta.circuit} — a complaint filed in ${meta.state} is bound by the ${expected} Circuit`)
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
    if (!s) errors.push(`the complaint has no ${f.name} section`)
    else if (!s.blocks.some((b) => !/^\*.*\*$/.test(b) && !b.startsWith('###'))) errors.push(`the “${s.heading}” section is empty`)
  }

  // The review notes are headed for whoever is filing: a parent's own notes are not
  // attorney work product, and a claim of privilege nobody holds is a false claim.
  const notes = sections.find((s) => s.key === 'notes')
  if (notes && meta.filer) {
    const isCounselHeading = /attorney work product/i.test(notes.heading)
    const shouldBe = COUNSEL_FILERS.has(meta.filer)
    if (shouldBe && !isCounselHeading) errors.push(`filer: ${meta.filer} — the notes are headed “Attorney Review Notes – Attorney Work Product – Remove Before Filing”`)
    if (!shouldBe && isCounselHeading) errors.push(`filer: ${meta.filer} — a ${meta.filer}'s notes are not attorney work product; head them “Review Notes – Remove Before Filing”`)
  }

  const pleading = sections.filter((s) => !['signature', 'service', 'notes'].includes(s.key))
  const pleadingText = pleading.flatMap((s) => s.blocks).join('\n')
  const preliminary = sections.find((s) => s.key === 'preliminary')?.blocks.join('\n') ?? ''
  const required = sections.find((s) => s.key === 'required')?.blocks.join('\n') ?? ''
  if (meta.student && !contains(preliminary, meta.student)) errors.push(`the preliminary statement does not name the child as the front matter does (“${meta.student}”)`)
  if (meta.address && !contains(required, meta.address)) errors.push(`the required information section does not give the address as the front matter does (“${meta.address}”)`)
  if (meta.school && !contains(pleadingText, meta.school)) errors.push(`the complaint does not name the school (“${meta.school}”)`)
  for (const [k, parts] of [['student', String(meta.student ?? '').split(/\s+/)], ['address', String(meta.address ?? '').split(/,\s*/)], ['school', [meta.school]]]) {
    for (const part of parts.filter(Boolean)) if (!contains(sources, part)) errors.push(`${k}: “${part}” is not in the documents or statement.md`)
  }

  // ── Flags. Numbered in sequence within each kind, each explained in the notes,
  // and short enough inside the pleading to read as a marker rather than a note.
  const notesText = notes ? notes.blocks.join('\n') : ''
  const flagsByKind = new Map(FLAG_KINDS.map((k) => [k, new Set()]))
  const openFlags = []
  for (const s of sections) {
    if (s.key === 'notes') continue
    for (const block of s.blocks) {
      for (const m of [...block.matchAll(FLAG_RE)]) {
        const [, kind, num, text] = m
        const id = `${kind}-${num}`
        if (flagsByKind.get(kind).has(num)) errors.push(`the flag “[${id}]” is used twice`)
        flagsByKind.get(kind).add(num)
        openFlags.push(`${id}${text ? `: ${text.trim()}` : ''} — ${s.heading}`)
        if (text && text.trim().split(/\s+/).length > MAX_FLAG_WORDS) {
          errors.push(`the flag “[${id}]” is longer than ${MAX_FLAG_WORDS} words — shorten it and explain it in the review notes`)
        }
        if (!new RegExp(`\\b${kind}-${num}\\b`).test(notesText)) errors.push(`the flag “[${id}]” is not explained in the review notes`)
      }
    }
  }
  for (const [kind, nums] of flagsByKind) {
    const sorted = [...nums].map(Number).sort((a, b) => a - b)
    for (const [i, n] of sorted.entries()) {
      if (n !== i + 1) { errors.push(`the ${kind} flags must be numbered from 1 with no gaps — ${sorted.join(', ')}`); break }
    }
  }
  /** Does this block carry a flag, so an assertion in it is the person's to resolve? */
  const flagged = (block) => { FLAG_RE.lastIndex = 0; return FLAG_RE.test(block) }

  // ── Paragraph labels. A label is defined in the chronology and pointed to from a claim or
  // the pendency section, and nowhere else. A label anywhere else is either pointless (a
  // paragraph pointing at itself) or harmful — a remedy that sends the reader to a paragraph
  // number instead of naming its own figures, or a stray [#label] in the signature, which the
  // renderer has no number for and prints literally on the filed PDF.
  const labels = new Set()
  for (const s of sections) {
    for (const block of s.blocks) {
      const name = block.match(/^\[#([^\]]*)\]/)?.[1]
      if (name === undefined) continue
      if (s.key !== 'facts') { errors.push(`${s.heading}: the paragraph label “[#${name}]” belongs on a paragraph of the statement of facts`); continue }
      if (!/^[a-z][a-z-]*$/.test(name)) errors.push(`the paragraph label “[#${name}]” must be lowercase letters and hyphens`)
      else if (labels.has(name)) errors.push(`the paragraph label “[#${name}]” starts two paragraphs`)
      labels.add(name)
    }
  }
  for (const s of sections) {
    for (const block of s.blocks) {
      for (const m of block.replace(/^\[#[^\]]*\]/, '').matchAll(/\[#([^\]]*)\]/g)) {
        if (!POINTER_SECTIONS.has(s.key)) errors.push(`${s.heading}: “[#${m[1]}]” points at a paragraph of the chronology — a paragraph number belongs to a claim or the pendency section, and a remedy names its own figures`)
        else if (!labels.has(m[1])) errors.push(`${s.heading}: “[#${m[1]}]” points to no paragraph — start the paragraph it means with [#${m[1]}]`)
      }
    }
  }

  // ── Sources. Every fact paragraph says where it came from, and a source names a document
  // that is in the folder and a page that document has. A fact from the person rather than a
  // document says so in its own words, because the complaint must never pass one off as the other.
  const resolveStem = (stem) => {
    const want = stem.toLowerCase().replace(/[\s_-]/g, '')
    return textFiles.filter((f) => f.toLowerCase().replace(/\.txt$/, '').replace(/[\s_-]/g, '').startsWith(want))
  }
  // "the Parent reports", "Counsel states". A bare reporting verb anywhere in the paragraph is
  // not enough: "was told by the District" is the District speaking, not the person filing.
  // "the District wrote", "the log records", "the report states": words taken from a document,
  // which [@law] does not cover.
  const ATTRIBUTES_TO_A_DOCUMENT = /\b(?:the District|the Distict|the log|the notice|the report|the letter|the email|the IEP|the evaluation|the minutes|the record)\b[^.]{0,60}?\b(?:wrote|writes|records|recorded|states|stated|says|said|noted|notes|acknowledges|acknowledged|describes|described|reads)\b/i
  const REPORTS = /\b(?:the Parent|the Parents|the Student|Petitioner|Counsel|the person filing)\b[^.]{0,40}?\b(?:report|reports|reported|states|stated|says|said|recalls|recalled|describes|described)\b/i
  const facts = sections.find((s) => s.key === 'facts')
  for (const s of sections) {
    if (s.key === 'notes') continue
    for (const block of s.blocks) {
      for (const m of block.matchAll(/\[@([^\]]*)\]/g)) {
        const body = m[1].trim()
        if (/^statement$/i.test(body)) {
          if (!REPORTS.test(stripMarkers(block))) {
            errors.push(`${s.heading}: a paragraph sourced to [@statement] must say so in its own words — “the Parent reports”, “Counsel states”`)
          }
          continue
        }
        if (/^law$/i.test(body)) {
          // A quotation of a statute, regulation or case cannot be in the case folder. The marker
          // says the paragraph quotes the law, which exempts its quoted words from the source
          // check and hands them to references/audit.md §§ 3-5 instead. It is not a general
          // escape: the paragraph has to carry a citation, and the facts may not use it at all.
          if (s.key === 'facts') errors.push(`Statement of facts: [@law] belongs in a claim, not in the chronology — the facts carry no legal citation`)
          else if (!/\d+\s+(?:C\.F\.R|U\.S\.C)\.|§+\s*\d|\d+\s+(?:U\.\s?S\.|F\.\s?\d|F\.\s?App)/.test(block)) {
            errors.push(`${s.heading}: a paragraph sourced to [@law] carries no citation — give the authority the words come from`)
          } else if (ATTRIBUTES_TO_A_DOCUMENT.test(stripMarkers(block))) {
            errors.push(`${s.heading}: a paragraph sourced to [@law] attributes its words to a document — [@law] is for quoting an authority, so source this to the page it is on`)
          }
          continue
        }
        const parts = body.match(/^(.*?),\s*p\.\s*(\d+)$/i)
        if (!parts) { errors.push(`${s.heading}: the source “[@${body}]” must read [@stem, p. N], [@statement] or [@law]`); continue }
        const [, stem, page] = parts
        const hits = resolveStem(stem)
        if (hits.length === 0) errors.push(`${s.heading}: the source “[@${body}]” names no document in the case folder`)
        else if (hits.length > 1) errors.push(`${s.heading}: the source “[@${body}]” matches ${hits.length} documents — give more of the name`)
        else if (!new RegExp(`^--- page ${Number(page)} ---$`, 'm').test(textOf.get(hits[0]))) {
          errors.push(`${s.heading}: the source “[@${body}]” names a page ${hits[0].replace(/\.txt$/, '')} does not have`)
        }
      }
    }
  }
  if (facts) {
    for (const block of facts.blocks) {
      if (isTable(block) || /^\*.*\*$/.test(block) || block.startsWith('###')) continue
      if (!/\[@[^\]]*\]/.test(block) && !flagged(block)) {
        errors.push(`Statement of facts: “${block.slice(0, 60)}…” says where nothing came from — end it with [@stem, p. N] or [@statement]`)
      }
    }
  }

  // ── A claim says what the problem is, and ties it to the facts.
  // Only what the claim says in its own words is counted: the pointer is struck out, and so is
  // the pointer's own vocabulary, or a long enough list of labels buys its way past on the commas
  // between them — which is the very shape this refuses.
  const problems = sections.find((s) => s.key === 'problems')
  if (problems) {
    let claim = null
    let words = 0
    let pointers = 0
    const claimDone = () => {
      if (!claim) return
      if (words < 10) errors.push(`“${claim}” says only which paragraphs bear on the problem — say what the problem is, with its key dates and figures`)
      else if (pointers === 0) errors.push(`“${claim}” points at no paragraph of the chronology — apply the rule to the facts by paragraph number`)
    }
    for (const block of problems.blocks) {
      if (block.startsWith('###')) { claimDone(); claim = block.replace(/^#+\s*/, '').trim(); words = 0; pointers = 0; continue }
      if (/^\*.*\*$/.test(block)) continue
      pointers += [...block.matchAll(/\[#[^\]]*\]/g)].length
      words += (stripMarkers(block)
        .replace(/\bparagraphs?\b/gi, ' ')
        .match(/[A-Za-z0-9][A-Za-z0-9''’-]*/g) ?? []).length
    }
    claimDone()
  }

  // ── The certificate of service names every office the complaint goes to, with its address, so
  // the person filing is not left to find the district's on their own. Those offices and addresses
  // are researched on official pages and written into filing-instructions.md with their sources;
  // the certificate may name only what that file gives, and must name the district's office from it.
  const service = sections.find((s) => s.key === 'service')
  if (service) {
    const at = service.blocks.findIndex((b) => /^served on:?$/i.test(b))
    const end = service.blocks.findIndex((b) => /^dated:/i.test(b))
    const served = at < 0 ? [] : service.blocks.slice(at + 1, end > at ? end : undefined)
    const partsOf = (office) => office.replace(/\s*\n\s*/g, ', ').split(/,\s*/).filter(Boolean)
    const instructionsFile = join(dir, 'filing-instructions.md')
    const instructions = existsSync(instructionsFile) ? readFileSync(instructionsFile, 'utf8') : ''
    if (!served.length) errors.push('the certificate of service names nobody served — under “Served on:”, give each office the complaint goes to, with its address, as filing-instructions.md gives it')
    else if (!instructions) errors.push('there is no filing-instructions.md — the offices on the certificate of service, and their addresses, come from it (step 5)')
    else {
      for (const office of served) for (const part of partsOf(office)) if (!contains(instructions, part)) errors.push(`Certificate of service: “${part}” is not in filing-instructions.md`)
      // 34 C.F.R. s 300.508(a)(2): the party filing "must forward a copy of the due process
      // complaint to the SEA". In most states the complaint is filed with the SEA and one line
      // covers both; where a separate hearings office takes the filing, the SEA needs its own.
      // Either way the question has to be answered in writing before the certificate is written.
      if (!instructions.split(/^## /m).some((chunk) => /^the state educational agency\b/i.test(chunk))) {
        errors.push('filing-instructions.md has no “## The State educational agency” section — 34 C.F.R. § 300.508(a)(2) requires a copy to the SEA, so say who the SEA is, whether the filing office is the SEA, and the page that says so')
      }
      const district = instructions.split(/^## /m).find((chunk) => /^the school district\b/i.test(chunk))
      if (!district) errors.push('filing-instructions.md has no “## The school district” section — say which office of the district receives the complaint, its address, and the page that gives them')
      else if (!served.some((office) => partsOf(office).every((part) => contains(district, part)))) errors.push('the certificate of service does not name the school district’s office as filing-instructions.md gives it')
    }
  }

  // ── The arithmetic, recomputed. Its results are the one kind of figure that may appear in the
  // pleading without appearing in a document: the count is ours, the inputs are the record's.
  const arithmetic = auditArithmetic(notes, sources)
  errors.push(...arithmetic.errors)
  const computed = new Set(arithmetic.results)

  // Every case cited in the pleading is one references/authorities.md lists — the same reporter,
  // the same first page, under the name that file gives it — and binds where the complaint is
  // filed, or it carries a flag. A fabricated case name with a plausible reporter citation is the
  // error a model makes most readily.
  const checkCitations = (text, where, excused) => {
    for (const c of citationsIn(stripMarkers(text))) {
      const t = tier1For(c.key, meta.circuit, c)
      if (t.listed && t.inScope) continue
      if (excused) { onFlag.push(`${c.raw} — ${where}`); continue }
      if (t.wrongPage !== undefined) errors.push(`${where} — “${c.raw}” gives the wrong first page: references/authorities.md reports ${t.name} at ${t.wrongPage}`)
      else if (t.expectedName) errors.push(`${where} — “${c.raw}” is the citation for ${t.expectedName}, and that case is not named here`)
      else if (t.listed) errors.push(`${where} — “${c.raw}” binds in the ${t.scope} Circuit and this complaint is filed in the ${meta.circuit} Circuit: cite it as persuasive with a [VERIFY-#] flag, or not at all`)
      else errors.push(`${where} — the citation “${c.raw}” is not one references/authorities.md lists: cite it with a [VERIFY-#] flag, which is how an authority read in this session reaches the page`)
    }
  }

  // ── Every date, figure and quotation in the pleading, against the sources.
  const docDates = datesIn(documents), stmtDates = datesIn(statement)
  const docMonths = monthsIn(documents), stmtMonths = monthsIn(statement)
  for (const s of pleading) {
    for (const block of s.blocks) {
      if (block.startsWith('###')) continue
      if (/^\*.*\*$/.test(block)) {
        // The italic regulation line under a claim heading is not prose, but it carries authority.
        checkCitations(block, `${s.heading}: “${block.slice(0, 80)}”`, flagged(block))
        continue
      }
      // A paragraph sourced to [@law] quotes an authority, which cannot be in the case folder.
      // Its quotations are not refused — they are listed, for references/audit.md § 8 to confirm
      // against the authority's own text. Nothing else about the paragraph is exempt.
      const quotesTheLaw = /\[@law\]/i.test(block)
      const texts = isTable(block) ? tableRows(block).slice(1).flat() : [block]
      const where = `${s.heading}: “${stripMarkers(block).trim().slice(0, 80)}${block.length > 80 ? '…' : ''}”`
      const excused = flagged(block)
      const note = (what) => { (excused ? onFlag : statementOnly).push(`${what} — ${where}`) }
      const refuse = (message) => { if (excused) onFlag.push(`${message} — ${where}`); else errors.push(`${where} — ${message}`) }
      for (const text of texts) {
        const { dates, months, numbers, quotes } = claimsIn(text)
        // Every case cited in the pleading is one references/authorities.md lists and that binds
        // where the complaint is filed, or it carries a flag. A fabricated case name with a
        // plausible reporter citation is the error a model makes most readily, and until now
        // nothing but prose stood against it.
        checkCitations(text, where, excused)
        for (const d of dates) {
          if (docDates.has(d.key)) continue
          if (stmtDates.has(d.key)) note(d.text)
          else refuse(`the date “${d.text}” is not in the documents or statement.md`)
        }
        for (const m of months) {
          if (docMonths.has(m.key)) continue
          if (stmtMonths.has(m.key)) note(m.text)
          else refuse(`“${m.text}” is not in the documents or statement.md`)
        }
        for (const { n, unit } of numbers) {
          // A figure with its unit ("15 days") is looked for with the unit first, so "15%" in a document does not account for it.
          const withUnit = unit && !/%$/.test(n) ? `${n} ${unit}` : ''
          if (withUnit ? contains(documents, withUnit) : figureIn(n, documents)) continue
          if (computed.has(n.replace(/[$%]/g, ''))) continue
          if (withUnit ? contains(statement, withUnit) : figureIn(n, statement)) { note(withUnit || n); continue }
          if (figureIn(n, documents)) continue
          if (figureIn(n, statement)) { note(n); continue }
          refuse(`the figure “${n}” is not in the documents or statement.md, and is not a result in the arithmetic table`)
        }
        for (const q of quotes) {
          if (quotedIn(documents, q)) continue
          if (quotedIn(statement, q)) { note(`“${q}”`); continue }
          if (quotesTheLaw) { onLaw.push(`“${q}” — ${where}`); continue }
          refuse(`the quotation “${q}” is not word for word in the documents or statement.md`)
        }
      }
    }
  }
  return { errors, statementOnly, onFlag, onLaw, openFlags, parsed }
}

// ─── Command line ───────────────────────────────────────────────────────

// Compared as real paths, so it also runs when the skill is reached through a symlink; and only
// as check.mjs itself, never from inside render.mjs, which carries this code when built.
const self = fileURLToPath(import.meta.url)
if (basename(self) === 'check.mjs' && process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) {
  if (!process.argv[2]) {
    console.error('usage: node scripts/check.mjs <case folder>   — every date, figure and quotation in complaint.md against the documents and statement.md; the flags; the arithmetic; the required elements; the form')
    process.exit(2)
  }
  const { errors, statementOnly, onFlag, onLaw, openFlags } = checkComplaint(resolve(process.argv[2]))
  for (const e of errors) console.log(`✗ ${e}`)
  const list = (title, items) => {
    if (!items.length) return
    console.log(`\n${title}`)
    for (const s of items) console.log(`  · ${s}`)
  }
  list('From statement.md, not from any document — tell the person signing:', statementOnly)
  list('Resting on a flag, not on a source — the person resolves each of these:', onFlag)
  list('Quoted as the law — confirm each against the authority itself (references/audit.md § 8):', onLaw)
  list('Flags still open — the complaint renders as DRAFT until they are resolved:', openFlags)
  console.log(errors.length ? `\n${errors.length} error(s). Fix each from the sources and run again.` : '\ncheck passed.')
  process.exit(errors.length ? 1 : 0)
}
