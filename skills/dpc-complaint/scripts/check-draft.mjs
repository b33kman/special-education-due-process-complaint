// The gate on the statement of the problems — work/statement.annotated.md.
//
//   node scripts/check-draft.mjs <case folder>
//
// Every sentence must cite its sources with tags — [R12] a confirmed
// reading, [F1] one of the four facts, [E3] a chronology event, [S2] a
// state source — and every date, number and quotation in the sentence
// must appear in the sources it cites. Then the pleading rules: third
// person, no legal conclusions, no citations, no advice, no outcome
// language, no first names, every sentence finished, nothing said twice.
//
// Exit 1 on any error. Fix the draft, run again; the loop ends only when
// this prints 0 errors. Findings are also written to work/check-draft.json
// and appended to work/gates.log for the report.

import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  caseDir, readJson, writeJson, readText, parseAnnotated, splitSentences, datesIn, monthsIn, draftDates, draftMonths,
  numbersIn, numberAppearsIn, quotedSpans, withoutQuotes, containsText, longDate, wordSet, containment,
  printFindings, today,
} from './lib.mjs'

const dir = caseDir(process.argv.slice(2))
const work = join(dir, 'work')

const draft = readText(join(work, 'statement.annotated.md'))
const confirmed = readJson(join(work, 'confirmed.json'))
const caseFile = readJson(join(work, 'case.json'))
const state = readJson(join(work, 'state.json'), null)

// ─── Sources by tag ───────────────────────────────────────────────────
const sources = new Map()
for (const r of confirmed) {
  const usable = r.status === 'confirmed' || r.status === 'edited'
  const text = r.status === 'edited' ? r.editedValue : r.value
  sources.set(r.id, { kind: 'reading', usable, text: String(text ?? ''), label: `${r.docId} p.${r.page} ${r.field}` })
}
for (const [id, f] of Object.entries(caseFile.facts ?? {})) {
  sources.set(id, { kind: 'fact', usable: Boolean(f.answer?.trim()), text: String(f.answer ?? ''), label: `fact ${id}` })
}
for (const e of caseFile.events ?? []) {
  const iso = e.date
  sources.set(e.id, { kind: 'event', usable: Boolean(e.what), text: `${iso} ${longDate(iso)} ${e.what}`, label: `event ${e.id}` })
}
for (const s of state?.sources ?? []) {
  sources.set(s.id, { kind: 'state', usable: Boolean(s.url), text: `${s.title ?? ''} ${s.quote ?? ''}`, label: `state source ${s.id}` })
}

// ─── The forbidden patterns (ported from Sped DPC drafting-guardrails.ts) ─
const w = (s) => s.split(' ').join('\\s+')
const RULES = [
  {
    rule: 'legal-standard',
    why: 'states a legal conclusion — the complaint states facts and lets the reader conclude',
    patterns: [
      new RegExp(w('material(?:ly)? (?:deviat(?:ion|ed|e)|fail(?:ed|s|ure|ing))'), 'i'),
      new RegExp(w('free (?:and )?appropriate public education'), 'i'),
      /\bFAPE\b/,
      new RegExp(w('denial of educational benefit'), 'i'),
      new RegExp(w('(?:in )?violation of'), 'i'),
      /\bviolat(?:ed|es|ing)\b/i,
      /\bunlawful(?:ly)?\b/i,
      /\billegal(?:ly)?\b/i,
      new RegExp(w('(?:constitutes|amounts to) a denial'), 'i'),
      /\bliab(?:le|ility)\b/i,
      /\bbreach(?:ed|es|ing)?\b/i,
      new RegExp(w('bad faith'), 'i'),
      /\bdiscriminat(?:e|ed|es|ing|ion|ory)\b/i,
      new RegExp(w('(?:fail(?:ed|s|ure)|refus(?:ed|es|al)) to comply'), 'i'),
      new RegExp(w('(?:contrary to|in contravention of) (?:law|the law)'), 'i'),
      new RegExp(w('non-?compliance'), 'i'),
      new RegExp(w('(?:denied|deprived) (?:student|the student|him|her|them) of (?:a |an )?(?:free|appropriate|meaningful)'), 'i'),
      new RegExp(w('predetermin(?:ed|ation)'), 'i'),
      new RegExp(w('least restrictive environment'), 'i'),
      /\bLRE\b/,
    ],
  },
  {
    rule: 'citation',
    why: 'cites law — regulations print under the headings, never inside the facts',
    patterns: [/\bC\.?F\.?R\.?\b/i, /\bU\.?S\.?C\.?\b/i, /§\s*\d/, /\bIDEA\b/, /\bEndrew\s+F\b/i, /\bRowley\b/, /\bNYCRR\b/, /\bILCS\b/],
  },
  {
    rule: 'outcome',
    why: 'predicts or characterises the outcome',
    patterns: [
      new RegExp(w('(?:strong|weak)(?:est|er)? (?:case|claim|argument|position)'), 'i'),
      new RegExp(w('likely to (?:prevail|succeed|win|obtain|recover)'), 'i'),
      new RegExp(w('will (?:\\w+ ){0,2}(?:win|prevail|succeed)'), 'i'),
      new RegExp(w('(?:hearing officer|iho|alj|judge)s?[^.]{0,60}(?:probably|likely|certainly|would|will)'), 'i'),
      new RegExp(w('settlement value'), 'i'),
      /\bodds\b/i,
      new RegExp(String.raw`\d{1,3}\s?%\s*(?:chance|likelihood|probability)`, 'i'),
      new RegExp(w('favou?rable (?:outcome|decision|ruling|result|finding)'), 'i'),
      new RegExp(w('clearly (?:shows|demonstrates|establishes|proves)'), 'i'),
      new RegExp(w('(?:shows|demonstrates|establishes|proves) that the district'), 'i'),
    ],
  },
  {
    rule: 'voice',
    why: 'first or second person — the complaint speaks of Student, the Parent and the District',
    patterns: [
      /\bI\b(?!\.)/,
      /\b(?:I'm|I've|I'll|I'd)\b/,
      /\bme\b/i,
      /\bmy\b/i,
      /\b(?:we|us|our|ours)\b/i,
      /\byou\b/i,
      /\byour\b/i,
      new RegExp(w('(?:my|our) (?:son|daughter|child|kid)'), 'i'),
    ],
  },
  {
    rule: 'representation',
    why: 'the statement of facts does not speak for counsel; the signature block does',
    patterns: [
      new RegExp(w('undersigned counsel'), 'i'),
      new RegExp(w('(?:counsel|attorney) for (?:the )?(?:petitioner|parent|student|complainant)'), 'i'),
      new RegExp(w('my client'), 'i'),
      new RegExp(w('this (?:firm|office) represents'), 'i'),
      /\bEsq\./,
      /\bLaw Offices? of\b/i,
      new RegExp(w('the above-named parent'), 'i'),
    ],
  },
  {
    rule: 'advice',
    why: 'addresses or advises the reader',
    patterns: [
      new RegExp(w('(?:you|the parent|petitioner|complainant) should'), 'i'),
      new RegExp(w('we recommend'), 'i'),
      new RegExp(w('(?:is|are) entitled to'), 'i'),
    ],
  },
  {
    rule: 'characterisation',
    why: 'adjectives of outrage or intent the facts do not state',
    patterns: [
      /\b(?:egregious(?:ly)?|outrageous(?:ly)?|blatant(?:ly)?|flagrant(?:ly)?|shocking(?:ly)?|callous(?:ly)?|deliberately|knowingly|willful(?:ly)?|wilful(?:ly)?|intentionally ignored)\b/i,
    ],
  },
]

// ─── Walk the draft ───────────────────────────────────────────────────
const findings = []
const add = (level, code, message, where) => findings.push({ level, code, message, where })

const sections = parseAnnotated(draft)
const claims = caseFile.claims ?? []
const letters = sections.map((s) => s.letter)
const expected = claims.map((_, i) => String.fromCharCode(65 + i))
if (letters.join('') !== expected.join('')) {
  add('error', 'sections', `expected one lettered section per claim, in order (${expected.join(', ') || 'none'}); found ${letters.map((l) => l ?? '(no letter)').join(', ') || 'none'}`)
}
for (const s of sections) {
  if (s.headingText) add('warning', 'heading-text', `section ${s.letter}: heading text is ignored — the claim's fixed filing heading prints instead`, s.headingText)
  if (s.paragraphs.length === 0) add('warning', 'empty-section', `section ${s.letter} has no paragraphs; the complaint will carry a placeholder there until facts are entered or the claim is removed`)
}

const studentFirst = caseFile.student?.first?.value?.trim()
const parentFirst = caseFile.parent?.first?.value?.trim()
const nameRe = (name) => new RegExp(`(?<![\\w'’])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w'’])`)

const allSentences = []
let wordCount = 0
/* The procedural impact statement (case.json → claims[].impact) prints under
   its section and is held to every rule a sentence of the statement is. */
const impacts = claims
  .map((cl, i) => ({ letter: `${String.fromCharCode(65 + i)} (impact)`, text: String(cl.impact ?? '').trim() }))
  .filter((x) => x.text)
  .map((x) => ({ letter: x.letter, paragraphs: [splitSentences(x.text)] }))
/* The chronology (case.json → events) prints as the statement of facts, one
   numbered paragraph per event, so each event's sentence is held to the
   same rules: its dates, figures and quotations in the sources it names. */
const chronology = (caseFile.events ?? [])
  .map((e) => ({ letter: `Facts (${e.id})`, text: `${String(e.what ?? '').trim()} ${(e.sources ?? []).map((t) => `[${t}]`).join('')}`.trim() }))
  .filter((x) => x.text)
  .map((x) => ({ letter: x.letter, paragraphs: [splitSentences(x.text)] }))
for (const s of [...sections, ...impacts, ...chronology]) {
  for (const paragraph of s.paragraphs) {
    for (const sentence of paragraph) {
      const where = `${s.letter ?? '?'}: “${sentence.text.slice(0, 90)}${sentence.text.length > 90 ? '…' : ''}”`
      allSentences.push({ ...sentence, where })
      wordCount += sentence.text.split(/\s+/).filter(Boolean).length

      if (sentence.tags.length === 0) {
        add('error', 'untagged', 'a sentence with no source tag — every sentence cites what it rests on', where)
        continue
      }
      const cited = []
      for (const tag of sentence.tags) {
        const src = sources.get(tag)
        if (!src) add('error', 'unknown-tag', `[${tag}] names no reading, fact, event or state source`, where)
        else if (!src.usable) add('error', 'unconfirmed-source', `[${tag}] is not confirmed (${src.label}) — nothing unconfirmed reaches the draft`, where)
        else cited.push(src)
      }
      const citedText = cited.map((c) => c.text).join('\n')
      const citedDates = datesIn(citedText)
      const citedMonths = monthsIn(citedText)

      for (const d of draftDates(sentence.text)) {
        if (!citedDates.has(d.key)) add('error', 'date-not-in-sources', `"${d.text}" is not written in the sources this sentence cites`, where)
      }
      for (const m of draftMonths(sentence.text)) {
        if (!citedMonths.has(m.key)) add('error', 'month-not-in-sources', `"${m.text}" is not written in the sources this sentence cites`, where)
      }
      for (const n of numbersIn(sentence.text)) {
        if (!numberAppearsIn(n, citedText)) add('error', 'number-not-in-sources', `the figure "${n}" is not in the sources this sentence cites`, where)
      }
      for (const q of quotedSpans(sentence.text)) {
        const inSource = cited.some((c) => (c.kind === 'reading' || c.kind === 'fact') && containsText(c.text, q))
        if (!inSource) add('error', 'quote-not-in-sources', `the quotation “${q.slice(0, 60)}${q.length > 60 ? '…' : ''}” is not word for word in a cited reading`, where)
      }

      const outside = withoutQuotes(sentence.text)
      for (const rule of RULES) {
        for (const p of rule.patterns) {
          const m = outside.match(p)
          if (m) {
            add('error', rule.rule, `"${m[0].trim()}" — ${rule.why}`, where)
            break
          }
        }
      }
      if (studentFirst && nameRe(studentFirst).test(outside)) add('error', 'named', `the student's given name "${studentFirst}" appears; the caption defines Student and the body uses it`, where)
      if (parentFirst && nameRe(parentFirst).test(outside)) add('error', 'named', `the parent's given name "${parentFirst}" appears; the caption defines the Parent and the body uses it`, where)
      if (/\.\.\.$|…$/.test(sentence.text.replace(/["”)]+$/, ''))) add('error', 'unfinished', 'the sentence trails off', where)
    }
  }
}

// ─── Repetition ───────────────────────────────────────────────────────
// Within the statement only. The chronology states each event once by its
// date, and an issue's section restating a dated fact from it is the form
// of a pleading, not padding.
const OVERLAP = 0.7
const statementSentences = allSentences.filter((s) => !s.where.startsWith('Facts ('))
for (let i = 0; i < statementSentences.length; i++) {
  const a = statementSentences[i]
  const wa = wordSet(a.text)
  if (wa.size < 6) continue
  for (let j = 0; j < i; j++) {
    const b = statementSentences[j]
    const wb = wordSet(b.text)
    if (wb.size < 6 || containment(wa, wb) < OVERLAP) continue
    const newFigure = numbersIn(a.text).some((n) => !numberAppearsIn(n, b.text)) || draftDates(a.text).some((d) => !b.text.includes(d.text))
    const newQuote = quotedSpans(a.text).some((q) => !b.text.includes(q))
    if (!newFigure && !newQuote) {
      add('error', 'repetition', 'says again what an earlier sentence said, with nothing new', a.where)
      break
    }
  }
}

if (wordCount > 1200) add('warning', 'long', `the statement runs ${wordCount} words — read it once more for anything said twice and anything the reader does not need in order to see the problem; the exemplar states each fact once and moves on`)
if (sections.length && wordCount === 0) add('error', 'empty', 'the statement has no sentences')

// ─── Report ───────────────────────────────────────────────────────────
writeJson(join(work, 'check-draft.json'), { checkedOn: today(), wordCount, findings })
const errors = printFindings('check-draft', findings)
appendFileSync(join(work, 'gates.log'), `${new Date().toISOString()} check-draft errors=${errors} warnings=${findings.length - errors} words=${wordCount}\n`)
if (errors > 0) {
  console.log('\nRewrite the sentences named above from their sources, then run this again. It must pass before assembly.')
  process.exit(1)
}
console.log(`\nStatement passes (${wordCount} words). Next: node scripts/run-gates.mjs <case> assembles, validates and reports.`)
