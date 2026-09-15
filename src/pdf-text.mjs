// Every PDF in <case>/documents becomes a text file, page by page, in
// <case>/work/text/ — for reading, and for check.mjs to search.
//
//   node scripts/pdf-text.mjs <case folder>

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename, extname, resolve } from 'node:path'
import { quietDone } from './pdfjs-quiet.mjs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
// pdf.js runs its worker in this process when it finds it here, so no separate worker file is needed.
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
globalThis.pdfjsWorker = pdfjsWorker
quietDone()

const arg = process.argv[2]
if (!arg) {
  console.error('usage: node scripts/pdf-text.mjs <case folder>   — every PDF in <case>/documents → page-by-page text in <case>/work/text/')
  process.exit(2)
}
const dir = resolve(arg)
let files
try {
  files = readdirSync(join(dir, 'documents')).filter((f) => extname(f).toLowerCase() === '.pdf').sort()
} catch {
  console.error(`no documents folder in ${dir}`)
  process.exit(2)
}
if (!files.length) {
  console.error(`no PDF files in ${join(dir, 'documents')}`)
  process.exit(2)
}

const out = join(dir, 'work', 'text')
mkdirSync(out, { recursive: true })

for (const file of files) {
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join(dir, 'documents', file))), useSystemFonts: true, isEvalSupported: false }).promise
    const pages = []
    let scanned = 0
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent()
      const text = content.items.map((i) => i.str + (i.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim()
      if (text.replace(/\s/g, '').length < 20) scanned++
      pages.push(`--- page ${n} ---\n${text}`)
    }
    writeFileSync(join(out, `${basename(file, extname(file))}.txt`), `# ${file}\n\n${pages.join('\n\n')}\n`)
    console.log(`✓ ${file}: ${doc.numPages} page(s)${scanned ? ` — ${scanned} with no text layer: read those by eye` : ''}`)
  } catch (e) {
    console.log(`✗ ${file}: could not read (${e.message ?? e})`)
  }
}
