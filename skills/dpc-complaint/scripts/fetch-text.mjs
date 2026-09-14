// Fetches a web page or a PDF and prints its text, so a state source can be
// quoted verbatim. A fetch tool that summarises a page is no use for
// work/state.json, which needs the page's own words; this prints them.
//
//   node scripts/fetch-text.mjs <url> [--out <file>] [--insecure]
//
// HTML is reduced to text (scripts, styles and tags removed, entities
// decoded, whitespace collapsed, one block element per line). A PDF is read
// page by page with the same reader pdf-text.mjs uses, each page headed
// "--- page N ---". --insecure skips certificate verification, for the
// sandboxes whose trust store cannot verify a state site; the URL and what
// it says are still what you quote. Nothing is cached and nothing about a
// case is sent: the request carries only the URL.

import { writeFileSync } from 'node:fs'
import { Agent } from 'node:https'

const argv = process.argv.slice(2)
const url = argv.find((a) => /^https?:\/\//.test(a))
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null
const insecure = argv.includes('--insecure')
if (!url) {
  console.error('usage: node scripts/fetch-text.mjs <url> [--out <file>] [--insecure]')
  process.exit(2)
}

if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const res = await fetch(url, {
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; dpc-complaint state-research; +https://github.com/b33kman/dpc-complaint)', accept: 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.8' },
  redirect: 'follow',
}).catch((e) => { console.error(`fetch failed: ${e.message}${/certificate/i.test(e.message) ? ' (try --insecure)' : ''}`); process.exit(1) })
if (!res.ok) { console.error(`HTTP ${res.status} ${res.statusText} for ${url}`); process.exit(1) }

const type = res.headers.get('content-type') ?? ''
let text
if (/pdf/i.test(type) || /\.pdf(\?|$)/i.test(res.url)) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await res.arrayBuffer())
  const pdf = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise
  const pages = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const content = await page.getTextContent()
    let line = ''
    const lines = []
    for (const item of content.items) {
      if (!('str' in item)) continue
      line += item.str
      if (item.hasEOL) { lines.push(line); line = '' }
    }
    if (line) lines.push(line)
    pages.push(`--- page ${n} ---\n${lines.join('\n').replace(/[ \t]+/g, ' ').trim()}`)
  }
  text = pages.join('\n\n')
} else {
  const html = await res.text()
  text = html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote|dd|dt|pre|table|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&sect;/g, '§').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&rdquo;/g, '”').replace(/&ldquo;/g, '“')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const header = `# ${res.url}\n# fetched ${new Date().toISOString().slice(0, 10)} (${type.split(';')[0] || 'unknown type'})\n\n`
if (out) { writeFileSync(out, header + text); console.log(`${text.length} characters → ${out}`) } else process.stdout.write(header + text + '\n')
