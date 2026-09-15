// Sets <case>/complaint.md as a filed pleading, in the form of
// references/exemplar.md:
//
//   complaint.pdf   — to file: Letter, one-inch margins, Times 12, page numbers
//   complaint.docx  — the same document, to edit in Word
//
//   node scripts/render.mjs <case folder>
//
// The forum's name, a bracketed caption, consecutively numbered double-spaced
// paragraphs, lettered remedies, the signature block on the right, the
// certificate of service last. Only a complaint marked `status: final` that
// passes check.mjs is written under those names; anything else is written as
// complaint.DRAFT.pdf and complaint.DRAFT.docx, with DRAFT — NOT FOR FILING at
// its head, so a draft cannot be filed by mistake.

import { rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AlignmentType, BorderStyle, Document, Footer, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TabStopType, TextRun, WidthType } from 'docx'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { checkComplaint } from './check.mjs'

if (!process.argv[2]) {
  console.error('usage: node scripts/render.mjs <case folder>   — complaint.md → complaint.pdf and complaint.docx (complaint.DRAFT.* unless final and checked)')
  process.exit(2)
}
const dir = resolve(process.argv[2])
const { errors, parsed } = checkComplaint(dir)
if (!parsed) { console.error(errors[0]); process.exit(2) }
const { meta, sections } = parsed
const draft = meta.status !== 'final' || errors.length > 0
const BANNER = 'DRAFT — NOT FOR FILING'
const base = draft ? 'complaint.DRAFT' : 'complaint'
for (const ext of ['pdf', 'docx']) rmSync(join(dir, `${draft ? 'complaint' : 'complaint.DRAFT'}.${ext}`), { force: true })

// ─── The document, from complaint.md ──────────────────────────────────
// One convention of quotation marks throughout, and every numbered paragraph
// ends like a sentence.
const curly = (t) => String(t).replace(/(^|[\s(\[{—–-])"/g, '$1“').replace(/"/g, '”').replace(/(^|[\s(\[{—–-])'/g, '$1‘').replace(/'/g, '’')
const P = (text, cls = null) => ({ text: curly(text), cls })
const upper = (s) => String(s ?? '').trim().toUpperCase()
const forum = String(meta.forum ?? '').trim()

const caption = {
  court: [`BEFORE ${/^the\s/i.test(forum) ? upper(forum) : `THE ${upper(forum)}`}`, `STATE OF ${upper(meta.state)}`],
  county: meta.county ? `COUNTY OF ${upper(meta.county)}` : '',
  petitioner: curly(`${String(meta.petitioner ?? '').replace(/,$/, '')},`),
  respondent: curly(`${upper(meta.respondent).replace(/,$/, '')},`),
  title: upper(meta.title || 'Due Process Complaint Notice'),
  cites: ['20 U.S.C. § 1415(b)(7)', '34 C.F.R. § 300.508'],
  date: `Date: ${meta.date ?? ''}`,
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const body = []
let numeral = 0
let n = 0
for (const s of sections) {
  if (s.key === 'signature' || s.key === 'service') {
    const paras = []
    let closing = s.key === 'signature'
    for (const block of s.blocks) {
      if (/^dated:/i.test(block)) closing = true
      if (!closing) { paras.push(P(block.replace(/\s*\n\s*/g, ' '), /^(method of service|name and address)/i.test(block) ? 'method' : null)); continue }
      for (const line of block.split('\n').map((l) => l.trim()).filter(Boolean)) {
        paras.push(P(line, /^dated:/i.test(line) ? 'dated' : /^respectfully submitted/i.test(line) ? 'lead' : /^_{5,}$/.test(line) ? 'sigline' : null))
      }
    }
    body.push({ id: s.key, heading: s.key === 'service' ? 'Certificate of service' : null, paragraphs: paras })
    continue
  }
  const paras = []
  for (const block of s.blocks) {
    const text = block.replace(/\s*\n\s*/g, ' ').trim()
    if (text.startsWith('### ')) paras.push(P(text.slice(4), 'subheading'))
    else if (/^\*[^*].*\*$/.test(text)) paras.push(P(text.slice(1, -1), 'cite'))
    else if (/^\([a-z]\)\s/.test(text)) paras.push(P(text, 'relief'))
    else {
      const p = P(text.replace(/^\d+\.\s+/, ''))
      p.n = ++n
      if (!/[.!?:;][”’)]*$/.test(p.text)) p.text += '.'
      paras.push(p)
    }
  }
  body.push({ id: s.key, heading: `${ROMAN[numeral++]}. ${s.heading}`, paragraphs: paras })
}
const title = `Due Process Complaint Notice — ${meta.student ?? ''}`

// ─── Word ─────────────────────────────────────────────────────────────
const IN = 1440 // twips
const PT = 20
const run = (text, opts = {}) => new TextRun({ text, font: 'Times New Roman', size: 24, ...opts })
const para = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts })
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const rule = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const w = []
if (draft) w.push(para(run(BANNER, { bold: true }), { alignment: AlignmentType.CENTER, spacing: { after: 12 * PT } }))
for (const line of caption.court) w.push(para(run(line, { bold: true }), { alignment: AlignmentType.CENTER }))
w.push(para([], { spacing: { after: 6 * PT } }))
const after = { spacing: { after: 12 * PT } }
const left = [
  // Where the state's form puts the county in the caption, it is in the upper left corner.
  ...(caption.county ? [para(run(caption.county, { bold: true }), after)] : []),
  para(run('In the Matter of:'), after),
  para(run(caption.petitioner), after),
  para(run('Petitioner,'), { alignment: AlignmentType.RIGHT, indent: { right: 0.4 * IN }, ...after }),
  para(run('v.'), { indent: { left: 0.5 * IN }, ...after }),
  para(run(caption.respondent), after),
  para(run('Respondent.'), { alignment: AlignmentType.RIGHT, indent: { right: 0.4 * IN } }),
]
const right = [
  para(run('Case No. ____________'), after),
  para(run(caption.title, { bold: true }), after),
  ...caption.cites.map((c) => para(run(c), after)),
  para(run(caption.date)),
]
w.push(new Table({
  width: { size: 6.5 * IN, type: WidthType.DXA },
  columnWidths: [3.5 * IN, 3 * IN],
  borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
  rows: [new TableRow({ children: [
    new TableCell({ width: { size: 3.5 * IN, type: WidthType.DXA }, borders: { top: none, left: none, bottom: rule, right: rule }, margins: { top: 0, bottom: 16 * PT, left: 0, right: 0.3 * IN }, children: left }),
    new TableCell({ width: { size: 3 * IN, type: WidthType.DXA }, borders: { top: none, left: none, bottom: none, right: none }, margins: { top: 0, bottom: 0, left: 0.35 * IN, right: 0 }, children: right }),
  ] })],
}))
w.push(para([], { spacing: { after: 12 * PT } }))
const closingBlock = (paras) => {
  const dated = paras.find((p) => p.cls === 'dated')
  const rest = paras.filter((p) => p.cls !== 'dated')
  return [
    para(run(dated?.text ?? ''), { spacing: { before: 30 * PT, after: 0 }, keepNext: true }),
    ...rest.map((p, i) => para(run(p.text), { indent: { left: 3.25 * IN }, spacing: { after: p.cls === 'lead' ? 30 * PT : 0, line: 300 }, keepNext: i < rest.length - 1, keepLines: true })),
  ]
}
for (const s of body) {
  if (s.heading) w.push(para(run(s.heading.toUpperCase(), { bold: true }), { alignment: AlignmentType.CENTER, spacing: { before: 24 * PT, after: 8 * PT }, keepNext: true }))
  if (s.id === 'signature') { w.push(...closingBlock(s.paragraphs)); continue }
  if (s.id === 'service') {
    const first = s.paragraphs.findIndex((p) => p.cls === 'dated')
    for (const p of s.paragraphs.slice(0, first)) w.push(para(run(p.text), { spacing: { after: p.cls === 'method' ? 6 * PT : 12 * PT }, keepNext: true }))
    w.push(...closingBlock(s.paragraphs.slice(first)))
    continue
  }
  for (const p of s.paragraphs) {
    if (p.cls === 'subheading') w.push(para(run(p.text, { bold: true }), { spacing: { before: 18 * PT, after: 4 * PT }, keepNext: true }))
    else if (p.cls === 'cite') w.push(para(run(p.text, { italics: true }), { spacing: { after: 10 * PT }, keepNext: true }))
    else if (p.cls === 'relief') {
      const m = p.text.match(/^(\([a-z]\))\s+([\s\S]*)$/)
      w.push(para(run(m ? `${m[1]}\t${m[2]}` : p.text), { indent: { left: 1.5 * IN, hanging: 0.5 * IN }, tabStops: [{ type: TabStopType.LEFT, position: 1.5 * IN }], spacing: { line: 480 }, keepLines: true, widowControl: true }))
    } else w.push(para(run(`${p.n}.\t${p.text}`), { tabStops: [{ type: TabStopType.LEFT, position: 0.5 * IN }], spacing: { line: 480 }, widowControl: true }))
  }
}
writeFileSync(join(dir, `${base}.docx`), await Packer.toBuffer(new Document({
  creator: '',
  title,
  styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
  sections: [{
    properties: { page: { size: { width: 8.5 * IN, height: 11 * IN }, margin: { top: IN, right: IN, bottom: IN, left: IN } } },
    footers: { default: new Footer({ children: [para(new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 22 }), { alignment: AlignmentType.CENTER })] }) },
    children: w,
  }],
})))

// ─── PDF ──────────────────────────────────────────────────────────────
// Nothing on the filed document says what produced it, its properties included.
const pdf = await PDFDocument.create({ updateMetadata: false })
pdf.setTitle(title)
const F = { regular: await pdf.embedFont(StandardFonts.TimesRoman), bold: await pdf.embedFont(StandardFonts.TimesRomanBold), italic: await pdf.embedFont(StandardFonts.TimesRomanItalic) }
const SIZE = 12
const PAGE = { w: 612, h: 792, margin: 72 }
const WIDTH = PAGE.w - 2 * PAGE.margin
const SINGLE = 14
const DOUBLE = 24
// The standard fonts carry the WinAnsi characters; anything else prints as "?".
const supported = new Set(F.regular.getCharacterSet())
const replaced = new Set()
const clean = (s) => [...String(s ?? '')].map((ch) => (supported.has(ch.codePointAt(0)) ? ch : (replaced.add(ch), '?'))).join('')
const width = (s, font = F.regular, size = SIZE) => font.widthOfTextAtSize(s, size)
function wrap(text, font, size, first, rest = first) {
  const words = clean(text).split(/\s+/).filter(Boolean)
  const out = []
  let line = ''
  let max = first
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (width(candidate, font, size) <= max) { line = candidate; continue }
    if (line) { out.push(line); max = rest }
    line = word
    while (width(line, font, size) > max) { // a word longer than the line (an email address)
      let cut = line.length
      while (cut > 1 && width(line.slice(0, cut), font, size) > max) cut--
      out.push(line.slice(0, cut)); line = line.slice(cut); max = rest
    }
  }
  if (line) out.push(line)
  return out.length ? out : ['']
}

let page = null
let y = 0
const pages = []
const newPage = () => { page = pdf.addPage([PAGE.w, PAGE.h]); pages.push(page); y = PAGE.h - PAGE.margin }
const room = () => y - PAGE.margin
const ensure = (height) => { if (room() < height) newPage() }
const draw = (text, x, font = F.regular, size = SIZE) => page.drawText(clean(text), { x, y: y - size, size, font, color: rgb(0, 0, 0) })
const drawCentered = (text, font = F.bold) => draw(text, PAGE.margin + (WIDTH - width(clean(text), font)) / 2, font)
// A paragraph never leaves one line alone at the foot or the head of a page:
// a paragraph of three lines or fewer stays whole; a longer one starts with at
// least two lines and ends with at least two.
const flow = (ls, leading, drawLine) => {
  if (room() < (ls.length <= 3 ? ls.length : 2) * leading) newPage()
  ls.forEach((l, i) => {
    if (room() < leading || (ls.length > 3 && i === ls.length - 2 && room() < 2 * leading)) newPage()
    drawLine(l, i)
    y -= leading
  })
}

newPage()
if (draft) { drawCentered(BANNER); y -= SINGLE + 6 }
for (const line of caption.court) { drawCentered(line); y -= SINGLE }
y -= 18
// The caption: two columns, the parties inside an L-shaped rule.
const leftW = 3.5 * 72
const gap = 0.35 * 72
const leftInner = leftW - 0.3 * 72
const rightX = PAGE.margin + leftW + gap
const rightW = WIDTH - leftW - gap
const column = (items, cw) => items.map((it) => ({ ...it, lines: wrap(it.text, it.font ?? F.regular, SIZE, cw) }))
const leftItems = column([
  ...(caption.county ? [{ text: caption.county, font: F.bold }] : []),
  { text: 'In the Matter of:' },
  { text: caption.petitioner },
  { text: 'Petitioner,', align: 'right' },
  { text: 'v.', indent: 0.5 * 72 },
  { text: caption.respondent },
  { text: 'Respondent.', align: 'right' },
], leftInner)
const rightItems = column([
  { text: 'Case No. ____________' },
  { text: caption.title, font: F.bold },
  ...caption.cites.map((text) => ({ text })),
  { text: caption.date },
], rightW)
const colHeight = (items) => items.reduce((h, it, i) => h + it.lines.length * SINGLE + (i < items.length - 1 ? 12 : 0), 0)
const top = y
const drawColumn = (items, x, cw) => {
  y = top
  items.forEach((it, i) => {
    for (const l of it.lines) {
      const lx = it.align === 'right' ? x + cw - 0.4 * 72 - width(clean(l), it.font ?? F.regular) : x + (it.indent ?? 0)
      draw(l, lx, it.font ?? F.regular)
      y -= SINGLE
    }
    if (i < items.length - 1) y -= 12
  })
}
const leftH = colHeight(leftItems) + 16
drawColumn(leftItems, PAGE.margin, leftInner)
drawColumn(rightItems, rightX, rightW)
page.drawLine({ start: { x: PAGE.margin + leftW, y: top }, end: { x: PAGE.margin + leftW, y: top - leftH }, thickness: 0.75, color: rgb(0, 0, 0) })
page.drawLine({ start: { x: PAGE.margin, y: top - leftH }, end: { x: PAGE.margin + leftW, y: top - leftH }, thickness: 0.75, color: rgb(0, 0, 0) })
y = top - Math.max(leftH, colHeight(rightItems)) - 24

const closing = (paras) => {
  const dated = paras.find((p) => p.cls === 'dated')
  const rest = paras.filter((p) => p.cls !== 'dated')
  const blockX = PAGE.w - PAGE.margin - 3.25 * 72
  ensure(SINGLE + rest.reduce((h, p) => h + (p.cls === 'lead' ? 45 : 15), 0) + 42)
  y -= 30
  const startY = y
  draw(dated?.text ?? '', PAGE.margin)
  y = startY
  for (const p of rest) { draw(p.text, blockX); y -= p.cls === 'lead' ? 45 : 15 }
}
// A heading, subheading or regulation line is never left at the foot of a
// page: make room for it, the heading lines after it, and the start of the
// paragraph they introduce.
const leadIn = (paras, from) => {
  let h = 0
  for (let i = from; i < paras.length; i++) {
    const p = paras[i]
    if (p.cls === 'subheading') { h += 18 + SINGLE + 4; continue }
    if (p.cls === 'cite') { h += SINGLE + 10; continue }
    const ls = wrap(p.text, F.regular, SIZE, WIDTH - 36, WIDTH)
    return h + (ls.length <= 3 ? ls.length : 2) * DOUBLE
  }
  return h
}
for (const s of body) {
  if (s.id === 'service') {
    // The certificate stays on one page.
    const first = s.paragraphs.findIndex((p) => p.cls === 'dated')
    ensure(SINGLE + 32 + s.paragraphs.slice(0, first).reduce((h, p) => h + wrap(p.text, F.regular, SIZE, WIDTH).length * SINGLE + 12, 0) + 30 + 15 * 6 + 36)
    y -= 12
  }
  if (s.heading) {
    ensure(24 + SINGLE + 8 + (s.id === 'service' ? 0 : leadIn(s.paragraphs, 0)))
    y -= 24
    drawCentered(s.heading.toUpperCase())
    y -= SINGLE + 8
  }
  if (s.id === 'signature') { closing(s.paragraphs); continue }
  if (s.id === 'service') {
    const first = s.paragraphs.findIndex((p) => p.cls === 'dated')
    for (const p of s.paragraphs.slice(0, first < 0 ? undefined : first)) {
      if (p.cls === 'method' && width(clean(p.text)) <= WIDTH) { ensure(SINGLE); draw(p.text, PAGE.margin); y -= SINGLE }
      else flow(wrap(p.text, F.regular, SIZE, WIDTH), SINGLE, (l) => draw(l, PAGE.margin))
      y -= p.cls === 'method' ? 6 : 12
    }
    if (first >= 0) closing(s.paragraphs.slice(first))
    continue
  }
  for (const [i, p] of s.paragraphs.entries()) {
    if (p.cls === 'subheading') {
      ensure(leadIn(s.paragraphs, i))
      y -= 18
      draw(p.text, PAGE.margin, F.bold)
      y -= SINGLE + 4
    } else if (p.cls === 'cite') {
      ensure(leadIn(s.paragraphs, i))
      draw(p.text, PAGE.margin, F.italic)
      y -= SINGLE + 10
    } else if (p.cls === 'relief') {
      const m = p.text.match(/^(\([a-z]\))\s+([\s\S]*)$/)
      flow(wrap(m ? m[2] : p.text, F.regular, SIZE, WIDTH - 108), DOUBLE, (l, k) => { if (k === 0 && m) draw(m[1], PAGE.margin + 72); draw(l, PAGE.margin + 108) })
    } else {
      flow(wrap(p.text, F.regular, SIZE, WIDTH - 36, WIDTH), DOUBLE, (l, k) => { if (k === 0) draw(`${p.n}.`, PAGE.margin); draw(l, k === 0 ? PAGE.margin + 36 : PAGE.margin) })
    }
  }
}
pages.forEach((pg, i) => {
  const label = String(i + 1)
  pg.drawText(label, { x: (PAGE.w - width(label, F.regular, 11)) / 2, y: 36, size: 11, font: F.regular, color: rgb(0, 0, 0) })
})
writeFileSync(join(dir, `${base}.pdf`), await pdf.save())

console.log(`rendered ${base}.pdf (${pages.length} page${pages.length === 1 ? '' : 's'}) and ${base}.docx`)
if (draft) console.log(meta.status !== 'final' ? 'DRAFT: complaint.md is not marked status: final.' : `DRAFT: check.mjs found ${errors.length} error(s) — run it to see them.`)
if (replaced.size) console.log(`! ${[...replaced].map((ch) => `“${ch}”`).join(' ')} cannot be set in the PDF’s Times font and print as “?” — write the name in characters the PDF can carry, or file a PDF made from the Word file`)
