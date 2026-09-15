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
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  caseDir, readJson, writeJson, readText, parseAnnotated, splitSentences, datesIn, monthsIn, draftDates, draftMonths, oddDates,
  numbersIn, numberAppearsIn, quotedSpans, withoutQuotes, containsExact, longDate, isoDate, wordSet, containment, MONTHS,
  printFindings, today,
} from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dir = caseDir(process.argv.slice(2), 'node scripts/check-draft.mjs <case folder>   — the statement gate: every sentence tagged; every date, figure and quotation in the sources it cites; the pleading rules')
const work = join(dir, 'work')

const draft = readText(join(work, 'statement.annotated.md'))
const confirmed = readJson(join(work, 'confirmed.json'))
const caseFile = readJson(join(work, 'case.json'))
const state = readJson(join(work, 'state.json'), null)
const reliefRef = readJson(join(here, '..', 'references', 'relief.json')).options
const v = (x) => (x && typeof x === 'object' && 'value' in x ? String(x.value ?? '').trim() : String(x ?? '').trim())

// ─── Sources by tag ───────────────────────────────────────────────────
// `text` is what a sentence may take a date, figure or quotation from;
// `docText` is the part of that which a document or an official page states,
// so a sentence resting on the person's own statement alone can be named.
// A reading is usable only if the person confirmed it AND the verifier found
// it on its page (or the page is a scan the person read by eye).
const MACHINE_OK = new Set(['verified', 'unverifiable-image'])
const sources = new Map()
for (const r of confirmed) {
  const usable = (r.status === 'confirmed' || r.status === 'edited') && MACHINE_OK.has(r.verification)
  const text = String((r.status === 'edited' ? r.editedValue : r.value) ?? '')
  sources.set(r.id, { kind: 'reading', usable, text, docText: text, label: `${r.docId} p.${r.page} ${r.field}${MACHINE_OK.has(r.verification) ? '' : `, verification ${r.verification}`}` })
}
for (const [id, f] of Object.entries(caseFile.facts ?? {})) {
  sources.set(id, { kind: 'fact', usable: Boolean(f.answer?.trim()), text: String(f.answer ?? ''), docText: '', label: `fact ${id}` })
}
for (const s of state?.sources ?? []) {
  const text = `${s.title ?? ''} ${s.quote ?? ''}`
  sources.set(s.id, { kind: 'state', usable: Boolean(s.url), text, docText: text, label: `state source ${s.id}` })
}
// An event's date prints at the head of its paragraph ("On March 12, 2026,"),
// so it is checked like any other date: it must be written in a reading or a
// fact the event names. Only then does the event lend its date to a sentence
// of the statement that cites it.
const eventDate = new Map() // id → { ok: true | false | null (no date to check), iso }
for (const e of caseFile.events ?? []) {
  const iso = isoDate(e.date)
  const own = (e.sources ?? []).map((t) => sources.get(t)).filter((s) => s && s.usable && (s.kind === 'reading' || s.kind === 'fact'))
  const ownText = own.map((s) => s.text).join('\n')
  let ok = null
  if (iso && iso.length === 10) { const [y, m, d] = iso.split('-'); ok = datesIn(ownText).has(`${Number(m)}/${Number(d)}/${y}`) }
  else if (iso) { const [y, m] = iso.split('-'); ok = monthsIn(ownText).has(`${Number(m)}/${y}`) }
  eventDate.set(e.id, { ok, iso })
  const dateWords = ok ? `${iso} ${longDate(iso)}` : ''
  const documentary = own.length > 0 && own.every((s) => s.kind === 'reading')
  sources.set(e.id, { kind: 'event', usable: Boolean(e.what), text: `${dateWords} ${e.what ?? ''}`.trim(), docText: documentary ? `${dateWords} ${e.what ?? ''}`.trim() : dateWords, label: `event ${e.id}` })
}

// ─── The forbidden patterns (ported from Sped DPC) ─
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
  {
    rule: 'arithmetic-in-words',
    why: 'a fraction or a judgment about the figures — state the figures the sources give and let the reader compare',
    patterns: [
      /\bno (?:measurable|meaningful|appreciable|significant|discernible) (?:progress|gain|gains|growth|improvement)\b/i,
      /\bmade no progress\b/i,
      /\bshortfall of (?:more|less) than\b/i,
      /\b(?:roughly|about|nearly|almost|approximately|around|over|under|more than|less than) (?:a |one[- ])?(?:half|third|quarter|fifth|two[- ]thirds|three[- ]quarters) (?:of|the)\b/i,
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
// The same claim twice prints the same heading twice and repeats the clause
// in the introduction; the same event id twice prints the event twice.
const claimIds = claims.map((cl) => cl.id).filter((id) => id !== 'other')
for (const id of new Set(claimIds.filter((id, i) => claimIds.indexOf(id) !== i))) add('error', 'duplicate-claim', `claim "${id}" is listed twice in case.json`)
const eventIds = (caseFile.events ?? []).map((e) => e.id)
for (const id of new Set(eventIds.filter((id, i) => eventIds.indexOf(id) !== i))) add('error', 'duplicate-event', `event ${id} appears twice in case.json`)

const studentFirst = caseFile.student?.first?.value?.trim()
const parentFirst = caseFile.parent?.first?.value?.trim()
// A child named May or June is not named by "May 6, 2025"; "Jordan's IEP"
// names Jordan.
const nameRe = (name) => new RegExp(`(?<![\\w'’])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)${MONTHS.includes(name.toLowerCase()) ? '(?!\\.?,?\\s+\\d)' : ''}`)

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
const finished = (t) => (/[.!?…]["”)]*$/.test(t) ? t : `${t}.`)
const chronology = (caseFile.events ?? [])
  .map((e) => ({ id: e.id, letter: `Facts (${e.id})`, text: String(e.what ?? '').trim() ? `${finished(String(e.what).trim())} ${(e.sources ?? []).map((t) => `[${t}]`).join('')}`.trim() : '' }))
  .filter((x) => x.text)
  .map((x) => ({ id: x.id, letter: x.letter, paragraphs: [splitSentences(x.text)] }))
/* The proposed resolution prints each remedy in the person's own words
   (case.json → relief[].detail), so each is held to the same rules and to
   the sources it names — the person's fourth statement of fact (F4) among
   them. A reservation of attorneys' fees in counsel's own wording is checked
   for the pleading rules only; it asserts no fact. */
const typedPassages = []
const relief = []
for (const r of caseFile.relief ?? []) {
  const ref = reliefRef.find((o) => o.id === r.id)
  const detail = String(r.detail ?? '').trim()
  if (!detail) continue
  // A fees reservation names the statute it reserves rights under.
  if (ref?.reservation) typedPassages.push([`Relief (${r.id})`, detail, { citation: true }])
  else relief.push({ letter: `Relief (${r.id})`, paragraphs: [splitSentences(`${finished(detail)} ${(r.sources ?? []).map((t) => `[${t}]`).join('')}`.trim())] })
}
if (v(caseFile.hearing?.accommodations)) typedPassages.push(['Hearing (accommodations)', v(caseFile.hearing?.accommodations), {}])
if (v(caseFile.hearing?.interpreter)) typedPassages.push(['Hearing (interpreter)', v(caseFile.hearing?.interpreter), {}])
for (const s of [...sections, ...impacts, ...chronology, ...relief]) {
  if (s.id && eventDate.get(s.id)?.ok === false) {
    const e = caseFile.events.find((x) => x.id === s.id)
    add('error', 'event-date-not-in-sources', `the event's date ${e.date} is not written in the sources it names (${(e.sources ?? []).join(', ')}) — it prints as "On ${longDate(eventDate.get(s.id).iso)},"`, `${s.letter}: “${String(e.what ?? '').slice(0, 90)}”`)
  }
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
      const docText = cited.map((c) => c.docText).join('\n')
      const docDates = datesIn(docText)
      const docMonths = monthsIn(docText)
      const onlyStatement = []

      for (const od of oddDates(sentence.text)) add('error', 'date-form', `"${od}" — write the date in full, as Month D, YYYY, so it is checked as a date`, where)
      for (const d of draftDates(sentence.text)) {
        if (!citedDates.has(d.key)) add('error', 'date-not-in-sources', `"${d.text}" is not written in the sources this sentence cites`, where)
        else if (!docDates.has(d.key)) onlyStatement.push(d.text)
      }
      for (const m of draftMonths(sentence.text)) {
        if (!citedMonths.has(m.key)) add('error', 'month-not-in-sources', `"${m.text}" is not written in the sources this sentence cites`, where)
        else if (!docMonths.has(m.key)) onlyStatement.push(m.text)
      }
      for (const n of numbersIn(sentence.text)) {
        if (!numberAppearsIn(n, citedText)) add('error', 'number-not-in-sources', `the figure "${n}" is not in the sources this sentence cites`, where)
        else if (!numberAppearsIn(n, docText)) onlyStatement.push(n)
      }
      for (const q of quotedSpans(sentence.text)) {
        const inSource = cited.some((c) => (c.kind === 'reading' || c.kind === 'fact') && containsExact(c.text, q))
        if (!inSource) add('error', 'quote-not-in-sources', `the quotation “${q.slice(0, 60)}${q.length > 60 ? '…' : ''}” is not word for word in a cited reading`, where)
      }
      // A sentence may rest on what the person typed — that is allowed, and
      // the report names it so the signer knows which sentences no document
      // supports.
      const factsCited = cited.filter((c) => c.kind === 'fact').map((c) => c.label)
      if (cited.length && cited.every((c) => c.kind === 'fact')) {
        add('warning', 'rests-on-statement', `rests on the person's own statement alone (${factsCited.join(', ')}) — no document is cited; the report will say so`, where)
      } else if (onlyStatement.length) {
        add('warning', 'rests-on-statement', `${[...new Set(onlyStatement)].map((x) => `"${x}"`).join(', ')} — in no cited reading; from the person's own statement (${factsCited.join(', ') || 'none cited'}); the report will say so`, where)
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
// Text the person typed that prints as their own words — hearing requests,
// a fees reservation in counsel's wording — asserts no fact to check
// against a source, but it is on the pleading and speaks in its voice.
for (const [label, passage, allow] of typedPassages) {
  const where = `${label}: “${passage.slice(0, 90)}${passage.length > 90 ? '…' : ''}”`
  const outside = withoutQuotes(passage)
  for (const rule of RULES) {
    if (allow[rule.rule]) continue
    const m = rule.patterns.map((p) => outside.match(p)).find(Boolean)
    if (m) add('error', rule.rule, `"${m[0].trim()}" — ${rule.why}`, where)
  }
  if (studentFirst && nameRe(studentFirst).test(outside)) add('error', 'named', `the student's given name "${studentFirst}" appears; the pleading says Student`, where)
}

// ─── Repetition ───────────────────────────────────────────────────────
// Within the statement only. The chronology states each event once by its
// date, an issue's section restating a dated fact from it is the form of a
// pleading, and a remedy restates what was asked for — none of that is
// padding.
const OVERLAP = 0.7
const statementSentences = allSentences.filter((s) => !/^(Facts|Relief) \(/.test(s.where))
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
// A fingerprint of what was checked, so validate.mjs can tell a pass on this
// statement and this case file from a pass on an earlier version of either.
const inputsSha = createHash('sha256')
  .update(draft)
  .update(JSON.stringify([caseFile.events ?? [], caseFile.facts ?? {}, caseFile.claims ?? [], caseFile.relief ?? [], caseFile.hearing ?? null]))
  .digest('hex')
writeJson(join(work, 'check-draft.json'), { checkedOn: today(), wordCount, inputsSha, findings })
const errors = printFindings('check-draft', findings)
appendFileSync(join(work, 'gates.log'), `${new Date().toISOString()} check-draft errors=${errors} warnings=${findings.length - errors} words=${wordCount}\n`)
if (errors > 0) {
  console.log('\nRewrite the sentences named above from their sources, then run this again. It must pass before assembly.')
  process.exit(1)
}
console.log(`\nStatement passes (${wordCount} words). Next: node scripts/run-gates.mjs <case> assembles, validates and reports.`)
