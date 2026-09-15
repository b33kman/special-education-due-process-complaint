// Step 2 of the skill: every PDF in <case>/documents becomes a per-page
// text file the later checks can search. Run once per case, and again
// whenever a document is added.
//
//   node scripts/pdf-text.mjs <case folder>
//
// Writes work/text/<docId>.json and work/documents.json (the inventory).
// A page with no text layer (a scan) is recorded as `imageOnly: true`, so
// verify-readings.mjs can say "this cannot be checked by machine" instead
// of quietly passing it.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { caseDir, workDir, readJson, writeJson } from './lib.mjs'

const dir = caseDir(process.argv.slice(2), 'node scripts/pdf-text.mjs <case folder>   — every PDF in <case>/documents → per-page text in work/text/ and the inventory work/documents.json')
const docsDir = join(dir, 'documents')
let files
try {
  files = readdirSync(docsDir).filter((f) => extname(f).toLowerCase() === '.pdf').sort()
} catch {
  console.error(`no documents folder at ${docsDir}`)
  process.exit(2)
}
if (files.length === 0) {
  console.error(`no PDF files in ${docsDir}`)
  process.exit(2)
}

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const work = workDir(dir)
const textDir = join(work, 'text')
mkdirSync(textDir, { recursive: true })
// Re-running over a folder keeps what step 2 wrote into the inventory
// (kinds, documentDate, title) for each document already there.
const previous = new Map((existsSync(join(work, 'documents.json')) ? readJson(join(work, 'documents.json')) : []).map((d) => [d.docId, d]))

const slug = (name) =>
  basename(name, extname(name))
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

const inventory = []
for (const file of files) {
  const path = join(docsDir, file)
  const data = new Uint8Array(readFileSync(path))
  let doc
  try {
    doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise
  } catch (e) {
    inventory.push({ docId: slug(file), file, pages: 0, unreadable: true, error: String(e.message || e) })
    console.log(`✗ ${file}: could not open (${e.message || e})`)
    continue
  }
  const pages = []
  let imageOnlyPages = 0
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    const text = content.items.map((i) => i.str + (i.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim()
    const imageOnly = text.replace(/\s/g, '').length < 20
    if (imageOnly) imageOnlyPages++
    pages.push({ n, text, imageOnly })
  }
  const docId = slug(file)
  writeJson(join(textDir, `${docId}.json`), { docId, file, pages })
  const was = previous.get(docId) ?? {}
  inventory.push({
    docId,
    file,
    bytes: statSync(path).size,
    pages: doc.numPages,
    imageOnlyPages,
    // Filled in by the skill after reading the document (SKILL.md step 2);
    // kept from the previous inventory on a re-run.
    kinds: was.kinds ?? [],
    documentDate: was.documentDate ?? null,
    title: was.title ?? null,
  })
  console.log(`✓ ${file}: ${doc.numPages} page(s)${imageOnlyPages ? `, ${imageOnlyPages} with no text layer` : ''}`)
}

writeJson(join(work, 'documents.json'), inventory)
console.log(`\n${inventory.length} document(s) → ${join(work, 'documents.json')}`)
if (inventory.some((d) => d.imageOnlyPages > 0)) {
  console.log('Some pages have no text layer. Readings from those pages cannot be machine-verified; the skill must re-read them by eye and mark them so.')
}
