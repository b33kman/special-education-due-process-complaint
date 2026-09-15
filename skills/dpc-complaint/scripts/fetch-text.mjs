// Fetches a web page or a PDF and prints its text, so a state source can be
// quoted verbatim. A fetch tool that summarises a page is no use for
// work/state.json, which needs the page's own words; this prints them.
//
//   node scripts/fetch-text.mjs <url> [--out <file>] [--insecure]
//
// What came back is told by its first bytes, not by the URL: a PDF is read
// page by page with the same reader pdf-text.mjs uses, each page headed
// "--- page N ---"; HTML is reduced to text (scripts, styles and tags
// removed, entities decoded, one block element per line); a Word file
// (.doc or .docx) is refused with the command that converts it, because its
// text cannot be read here. --insecure skips certificate verification, for
// the sandboxes whose trust store cannot verify a state site; the URL and
// what it says are still what you quote. Nothing is cached and nothing about
// a case is sent: the request carries only the URL.

import { writeFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const url = argv.find((a) => /^https?:\/\//.test(a))
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null
const insecure = argv.includes('--insecure')
if (!url) {
  console.error('usage: node scripts/fetch-text.mjs <url> [--out <file>] [--insecure]   — a state page or PDF as text, verbatim, for work/state.json')
  process.exit(2)
}

if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const res = await fetch(url, {
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; dpc-complaint state-research; +https://github.com/b33kman/dpc-complaint)', accept: 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.8' },
  redirect: 'follow',
}).catch((e) => { console.error(`fetch failed: ${e.message}${/certificate/i.test(e.message) ? ' (try --insecure)' : ''}`); process.exit(1) })
if (!res.ok) { console.error(`HTTP ${res.status} ${res.statusText} for ${url}`); process.exit(1) }

const type = (res.headers.get('content-type') ?? '').split(';')[0].trim() || 'unknown type'
const disposition = res.headers.get('content-disposition') ?? ''
const filename = (disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i) ?? [])[1] ?? ''
const bytes = new Uint8Array(await res.arrayBuffer())
const head = Buffer.from(bytes.slice(0, 8))
const isPdf = head.subarray(0, 5).toString('latin1') === '%PDF-'
const isOle = head.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])) // .doc
const isZip = head.subarray(0, 2).toString('latin1') === 'PK' // .docx and other zips

let text
if (isPdf) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  let pdf
  try {
    pdf = await getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise
  } catch (e) {
    console.error(`could not read the PDF at ${res.url} (${type}): ${e.message ?? e}`)
    process.exit(1)
  }
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
} else if (isOle || isZip || /msword|officedocument|octet-stream/i.test(type) && !/^\s*</.test(Buffer.from(bytes.slice(0, 200)).toString('utf8'))) {
  const name = filename || 'the file'
  console.error(`${res.url} is not a web page or a PDF (${type}${filename ? `, "${filename}"` : ''}) — a Word file, most likely. Download it and convert it to text, then save the text where the quotation can be checked:\n  curl -sL "${res.url}" -o "${name}" && textutil -convert txt "${name}"   (macOS; on Linux: libreoffice --headless --convert-to txt "${name}")`)
  process.exit(1)
} else {
  const html = Buffer.from(bytes).toString('utf8')
  const named = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", sect: '§', para: '¶', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™', deg: '°', middot: '·', bull: '•', eacute: 'é', egrave: 'è', agrave: 'à', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ccedil: 'ç', uuml: 'ü', ouml: 'ö', auml: 'ä', frac12: '½', frac14: '¼', times: '×' }
  text = html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote|dd|dt|pre|table|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z][a-z0-9]{1,7});/gi, (m, n) => named[n.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const header = `# ${res.url}\n# fetched ${new Date().toISOString().slice(0, 10)} (${type})\n\n`
if (out) { writeFileSync(out, header + text); console.log(`${text.length} characters → ${out}`) } else process.stdout.write(header + text + '\n')
