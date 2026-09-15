// Checks every state source's quotation against the page it cites, the way
// verify-readings.mjs checks a reading against its page. A filing address,
// a limitations window or a forum's name rests on a quotation; if the words
// are not on the page, the value rests on nothing.
//
//   node scripts/verify-state.mjs <case folder> [--offline]
//
// For each entry in work/state.json → sources, the page's text is read from
// work/state-text/<id>.txt — written by `fetch-text.mjs <url> --out` (or by
// hand, for a form served as a Word file) — and fetched into that file when
// it is not there yet (--offline refuses instead). The `quote` must then be
// on the page, word for word; "…" or "[…]" inside a quote marks words left
// out, and each piece around it is checked on its own. Results go to
// work/state-check.json, which validate.mjs reads: a field citing a source
// that did not verify keeps the complaint a DRAFT. Exit 1 on any failure.

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { caseDir, hasFlag, readJson, writeJson, containsText, quoteSegments, snippetAround, today } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const dir = caseDir(argv, 'node scripts/verify-state.mjs <case folder> [--offline]   — every state source’s quotation checked on its page (fetched into work/state-text/ unless --offline)')
const work = join(dir, 'work')
const state = readJson(join(work, 'state.json'))
const textDir = join(work, 'state-text')
mkdirSync(textDir, { recursive: true })
const offline = hasFlag(argv, 'offline')

const results = []
for (const s of state.sources ?? []) {
  const file = join(textDir, `${s.id}.txt`)
  // The quotation's hash lets validate.mjs notice a quote edited after this ran.
  const result = { id: s.id, url: s.url ?? null, file: `work/state-text/${s.id}.txt`, quoteSha: createHash('sha256').update(String(s.quote ?? '')).digest('hex') }
  if (!s.url) { results.push({ ...result, status: 'no-url', detail: 'the source has no URL' }); continue }
  if (!existsSync(file)) {
    if (offline) { results.push({ ...result, status: 'no-text', detail: `no saved text; run: node scripts/fetch-text.mjs "${s.url}" --out ${result.file}` }); continue }
    const r = spawnSync(process.execPath, [join(here, 'fetch-text.mjs'), s.url, '--out', file, ...(hasFlag(argv, 'insecure') ? ['--insecure'] : [])], { encoding: 'utf8' })
    if (r.status !== 0 || !existsSync(file)) { results.push({ ...result, status: 'fetch-failed', detail: (r.stderr || r.stdout || '').trim().split('\n').at(-1) ?? 'fetch failed' }); continue }
  }
  const page = readFileSync(file, 'utf8')
  const segments = quoteSegments(s.quote)
  if (segments.length === 0) { results.push({ ...result, status: 'no-quote', detail: 'the source carries no quotation — quote the words on the page that support the values citing it' }); continue }
  const missing = segments.filter((seg) => !containsText(page, seg))
  if (missing.length) {
    results.push({ ...result, status: 'quote-not-on-page', detail: `not on the page, word for word: ${missing.map((m) => `“${m.length > 80 ? m.slice(0, 80) + '…' : m}”`).join('; ')}` })
    continue
  }
  results.push({ ...result, status: 'verified', snippet: snippetAround(page, segments[0], 40) })
}

writeJson(join(work, 'state-check.json'), { checkedOn: today(), sources: results })
const failed = results.filter((r) => r.status !== 'verified')
for (const r of results) console.log(`${r.status === 'verified' ? '✓' : '✗'} ${r.id} ${r.status}${r.detail ? ` — ${r.detail}` : ''}`)
console.log(`\nverify-state: ${results.length - failed.length} of ${results.length} source(s) verified on their pages → work/state-check.json`)
if (failed.length) {
  console.log('A quotation that is not on the page supports nothing. Fix each source named above — the page’s own words, from work/state-text/<id>.txt — and run this again.')
  process.exit(1)
}
