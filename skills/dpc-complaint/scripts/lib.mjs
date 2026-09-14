// Shared helpers for the dpc-complaint scripts. No dependencies.
//
// Everything here is deterministic on purpose: the scripts are the part of
// the skill that cannot be talked out of a rule. A model follows
// instructions most of the time; a script follows them every time.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ─── Files ──────────────────────────────────────────────────────────────

export function caseDir(argv) {
  const given = argv.find((a) => !a.startsWith('--'))
  if (!given) {
    console.error('usage: node <script> <case folder> [--flags]')
    process.exit(2)
  }
  const dir = resolve(given)
  if (!existsSync(dir)) {
    console.error(`no such folder: ${dir}`)
    process.exit(2)
  }
  return dir
}

export const hasFlag = (argv, name) => argv.includes(`--${name}`)

export function workDir(dir) {
  const w = join(dir, 'work')
  mkdirSync(w, { recursive: true })
  return w
}

export function readJson(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback
    console.error(`missing: ${path}`)
    process.exit(2)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`not valid JSON: ${path}\n${e.message}`)
    process.exit(2)
  }
}

export function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

export function readText(path) {
  if (!existsSync(path)) {
    console.error(`missing: ${path}`)
    process.exit(2)
  }
  return readFileSync(path, 'utf8')
}

// ─── Text normalisation ─────────────────────────────────────────────────

/** Curly quotes, dashes and ligatures a PDF text layer or a model may write differently. */
export function normalizeForMatch(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Whitespace-insensitive containment: is `needle` written inside `hay`? */
export function containsText(hay, needle) {
  const h = normalizeForMatch(hay)
  const n = normalizeForMatch(needle)
  if (!n) return false
  if (h.includes(n)) return true
  // A PDF text layer often breaks a line inside a sentence and drops the
  // space, or hyphenates. Compare with all spaces removed as a second try.
  return h.replace(/[\s-]/g, '').includes(n.replace(/[\s-]/g, ''))
}

/** Where in `hay` the needle sits — for a snippet in a report. */
export function snippetAround(hay, needle, radius = 80) {
  const h = normalizeForMatch(hay)
  const n = normalizeForMatch(needle)
  const at = h.indexOf(n)
  if (at === -1) return null
  return h.slice(Math.max(0, at - radius), Math.min(h.length, at + n.length + radius))
}

// ─── Dates ──────────────────────────────────────────────────────────────

export const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]
const MONTH_FORMS = MONTHS.flatMap((m) => [m, m.slice(0, 3), m.slice(0, 4)]).concat(['sept'])
const MONTH_ALT = [...new Set(MONTH_FORMS)].join('|')

export const monthNumber = (name) => {
  const l = name.toLowerCase().replace(/\.$/, '')
  return MONTHS.findIndex((m) => m === l || m.startsWith(l)) + 1
}

const key = (mm, dd, yyyy) => `${Number(mm)}/${Number(dd)}/${yyyy}`

/**
 * Every calendar date the text writes, as `m/d/yyyy` keys. A two-digit
 * year yields BOTH centuries: this is an allow list built from the
 * reader's own sources, and a guessed century is how a draft's correct
 * date gets refused (or a wrong one accepted).
 */
export function datesIn(text) {
  const out = new Set()
  const add = (mm, dd, yy) => {
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return
    if (String(yy).length === 4) out.add(key(mm, dd, yy))
    else {
      out.add(key(mm, dd, `20${String(yy).padStart(2, '0')}`))
      out.add(key(mm, dd, `19${String(yy).padStart(2, '0')}`))
    }
  }
  const t = String(text ?? '')
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{2,4})\\b`, 'gi'))) {
    add(monthNumber(m[1]), Number(m[2]), m[3])
  }
  for (const m of t.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) add(Number(m[2]), Number(m[3]), m[1])
  for (const m of t.matchAll(/(?<![\d/])(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4}|\d{2})(?![\d/])/g)) {
    add(Number(m[1]), Number(m[2]), m[3])
  }
  return out
}

/** Every bare month-and-year the text writes ("September 2025", "Sept. 2025", "09/2025", "2025-09"), as `m/yyyy`. */
export function monthsIn(text) {
  const out = new Set()
  const t = String(text ?? '')
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?,?\\s+(\\d{4})\\b`, 'gi'))) {
    out.add(`${monthNumber(m[1])}/${m[2]}`)
  }
  for (const m of t.matchAll(/(?<![\d/])(\d{1,2})\s*\/\s*(\d{4})(?![\d/])/g)) out.add(`${Number(m[1])}/${m[2]}`)
  for (const m of t.matchAll(/(?<![\d-])(\d{4})-(\d{1,2})(?![\d-])/g)) out.add(`${Number(m[2])}/${m[1]}`)
  // A full date names its month too.
  for (const d of datesIn(t)) {
    const [mm, , yyyy] = d.split('/')
    out.add(`${mm}/${yyyy}`)
  }
  return out
}

/** The dates a DRAFT writes, strictly: full month names, ISO, or m/d/yyyy — with the matched text kept for the report. */
export function draftDates(text) {
  const found = []
  const t = String(text ?? '')
  for (const m of t.matchAll(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi'))) {
    found.push({ text: m[0], key: key(monthNumber(m[1]), Number(m[2]), m[3]) })
  }
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) found.push({ text: m[0], key: key(Number(m[2]), Number(m[3]), m[1]) })
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) found.push({ text: m[0], key: key(Number(m[1]), Number(m[2]), m[3]) })
  return found
}

/** Bare month-year spans in a draft ("October 2025"), excluding those inside a full date. */
export function draftMonths(text) {
  const t = String(text ?? '')
  const inFull = new Set(draftDates(t).map((d) => d.text.toLowerCase()))
  const out = []
  for (const m of t.matchAll(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{4})\\b`, 'gi'))) {
    const covered = [...inFull].some((f) => f.includes(m[0].toLowerCase()))
    if (!covered) out.push({ text: m[0], key: `${monthNumber(m[1])}/${m[2]}` })
  }
  return out
}

/** ISO `yyyy-mm-dd` or `yyyy-mm` for a date the reader can order, else null. Two-digit years take the century nearest today. */
export function isoDate(text, today = new Date()) {
  const t = String(text ?? '').trim()
  let m
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return t
  if ((m = t.match(/^(\d{4})-(\d{2})$/))) return t
  if ((m = t.match(new RegExp(`^(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})$`, 'i')))) {
    return `${m[3]}-${String(monthNumber(m[1])).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`
  }
  if ((m = t.match(new RegExp(`^(${MONTH_ALT})\\.?,?\\s+(\\d{4})$`, 'i')))) {
    return `${m[2]}-${String(monthNumber(m[1])).padStart(2, '0')}`
  }
  if ((m = t.match(/^(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4}|\d{2})$/))) {
    let y = m[3]
    if (y.length === 2) {
      const now = today.getUTCFullYear()
      const cands = [1900 + Number(y), 2000 + Number(y), 2100 + Number(y)]
      y = String(cands.reduce((b, c) => (Math.abs(c - now) < Math.abs(b - now) ? c : b)))
    }
    return `${y}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`
  }
  return null
}

/** `2026-02-10` → `February 10, 2026`; `2025-11` → `November 2025`. */
export function longDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!m) return String(iso)
  const name = MONTHS[Number(m[2]) - 1]
  const Name = name[0].toUpperCase() + name.slice(1)
  return m[3] ? `${Name} ${Number(m[3])}, ${m[1]}` : `${Name} ${m[1]}`
}

export const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000

// ─── Numbers and quotations ─────────────────────────────────────────────

/** Numbers a sentence asserts (minutes, sessions, percentages, dollar figures), with dates removed first. */
export function numbersIn(text) {
  let t = String(text ?? '')
  for (const d of draftDates(t)) t = t.replace(d.text, ' ')
  for (const m of draftMonths(t)) t = t.replace(m.text, ' ')
  // Section citations and letters are not figures about the student, and a
  // form or test code ("Form H-06E", "PI-2115", "CELF-5") is a name: digits
  // joined to letters by a hyphen are left alone.
  t = t.replace(/§\s*[\d.()a-z]+/gi, ' ')
  const out = []
  for (const m of t.matchAll(/(?<![\w.]|[A-Za-z]-)\$?\d[\d,]*(?:\.\d+)?%?/g)) out.push(m[0].replace(/,/g, ''))
  return out
}

export function numberAppearsIn(number, text) {
  const n = number.replace(/[$%]/g, '')
  const t = String(text ?? '').replace(/,/g, '')
  return new RegExp(`(?<![\\d.])${n.replace(/\./g, '\\.')}(?![\\d])`).test(t)
}

/** Balanced quoted spans in a sentence, curly or straight. */
export function quotedSpans(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(/["“]([^"“”]{3,})["”]/g)) out.push(m[1])
  return out
}

/** The same sentence with its quoted spans blanked, so a district's "I" is not the draft's. */
export function withoutQuotes(text) {
  return String(text ?? '').replace(/["“]([^"“”]*)["”]/g, (m) => '"' + ' '.repeat(m.length - 2) + '"')
}

// ─── The annotated draft ────────────────────────────────────────────────

const TAG = /\[([RFES])(\d+)\]/g

/**
 * Parses the annotated statement: `A.` / `B.` letter lines, blank-line
 * paragraphs, and a tag group after each sentence — `[R3][F1]`.
 * Returns sections with sentences {text, tags, raw} and any untagged
 * text as sentences with an empty tag list.
 */
export function parseAnnotated(markdown) {
  const sections = []
  let current = null
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const letter = line.match(/^([A-Z])\.\s*(.*)$/)
    if (letter && (letter[2] === '' || !/[.!?]["”]?\s*\[/.test(letter[2]))) {
      current = { letter: letter[1], headingText: letter[2] || null, paragraphs: [] }
      sections.push(current)
      continue
    }
    if (!current) {
      current = { letter: null, headingText: null, paragraphs: [] }
      sections.push(current)
    }
    current.paragraphs.push(splitSentences(line))
  }
  return sections
}

export function splitSentences(paragraph) {
  const sentences = []
  let rest = paragraph
  const re = /^(.*?[.!?]["”)]*)\s*((?:\[[RFES]\d+\]\s*)+)/s
  while (rest.trim()) {
    const m = rest.match(re)
    if (!m) {
      sentences.push({ text: rest.trim(), tags: [], raw: rest.trim() })
      break
    }
    const tags = [...m[2].matchAll(TAG)].map((t) => `${t[1]}${t[2]}`)
    sentences.push({ text: m[1].trim(), tags, raw: (m[1] + ' ' + m[2]).trim() })
    rest = rest.slice(m[0].length)
  }
  return sentences
}

/** The draft with every tag removed — what the complaint prints. */
export function stripTags(text) {
  return String(text ?? '').replace(/\s*\[[RFES]\d+\]/g, '').replace(/[ \t]+$/gm, '')
}

// ─── Word sets (repetition) ─────────────────────────────────────────────

const STOP = new Set('the a an and or of to in on at by for with from that this these those is are was were be been it its as into than then'.split(' '))
export function wordSet(text) {
  return new Set(
    normalizeForMatch(text)
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}
export function containment(a, b) {
  if (a.size === 0) return 0
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / a.size
}

// ─── Reporting ──────────────────────────────────────────────────────────

export function printFindings(title, findings) {
  const errors = findings.filter((f) => f.level === 'error')
  const warnings = findings.filter((f) => f.level === 'warning')
  console.log(`\n${title}: ${errors.length} error(s), ${warnings.length} warning(s)`)
  for (const f of findings) {
    console.log(`  ${f.level === 'error' ? '✗' : '!'} [${f.code}] ${f.message}`)
    if (f.where) console.log(`      ${f.where}`)
  }
  return errors.length
}

export const pad2 = (n) => String(n).padStart(2, '0')
export const today = () => {
  const d = new Date()
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}
