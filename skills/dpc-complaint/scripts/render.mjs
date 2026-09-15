// Sets the composed complaint (work/complaint.json, from assemble.mjs) as a
// filed pleading in three forms:
//
//   complaint.pdf   — to file: Letter, one-inch margins, Times 12, page numbers
//   complaint.docx  — to edit in Word, in the same form
//   complaint.md    — the same text, plain
//
//   node scripts/render.mjs <case folder>
//
// The form is fixed (references/format.md): the forum's name, a bracketed
// caption, numbered double-spaced paragraphs, lettered remedies, the
// signature block on the right, the certificate of service last. While the
// validator has not passed the document, every form carries the line
// "DRAFT — NOT FOR FILING" at its head, so a draft cannot be filed by
// mistake.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { caseDir, readJson } from './lib.mjs'
import { AlignmentType, BorderStyle, Document, Footer, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun, WidthType } from 'docx'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const dir = caseDir(process.argv.slice(2), 'node scripts/render.mjs <case folder>   — work/complaint.json → complaint.pdf, complaint.docx, complaint.md')
const work = join(dir, 'work')
const doc = readJson(join(work, 'complaint.json'))
const validation = readJson(join(work, 'validation.json'), null)
const status = validation?.status ?? 'DRAFT — NOT FOR FILING'
const draft = status !== 'FINAL'
const BANNER = 'DRAFT — NOT FOR FILING'

const caption = doc.sections[0].paragraphs
const byCls = (cls) => caption.filter((p) => p.cls === cls)
const one = (cls) => caption.find((p) => p.cls === cls)?.text ?? ''
const body = doc.sections.slice(1)

// ─── Markdown ─────────────────────────────────────────────────────────
const md = []
if (draft) md.push(`**${BANNER}** — see verification-report.md`, '')
for (const p of caption) md.push(p.text, '')
for (const s of body) {
  if (s.heading) md.push(`## ${s.heading}`, '')
  for (const p of s.paragraphs) {
    if (p.cls === 'subheading') md.push(`### ${p.text}`, '')
    else if (p.cls === 'cite') md.push(`*${p.text}*`, '')
    else if (p.n) md.push(`${p.n}. ${p.text}`, '')
    else if (p.cls === 'relief') md.push(`&nbsp;&nbsp;&nbsp;&nbsp;${p.text}`, '')
    else if (p.cls === 'sigline') md.push(p.text, '')
    else md.push(p.text, '')
  }
}
writeFileSync(join(dir, 'complaint.md'), md.join('\n').replace(/\n{3,}/g, '\n\n'))

// ─── Word ─────────────────────────────────────────────────────────────
const IN = 1440 // twips
const PT = 20
const run = (text, opts = {}) => new TextRun({ text, font: 'Times New Roman', size: 24, ...opts })
const para = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts })
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const line = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const w = []
if (draft) w.push(para(run(BANNER, { bold: true }), { alignment: AlignmentType.CENTER, spacing: { after: 12 * PT } }))
for (const p of byCls('caption-court')) w.push(para(run(p.text, { bold: true }), { alignment: AlignmentType.CENTER }))
w.push(para([], { spacing: { after: 6 * PT } }))
const captionParties = byCls('caption-party')
const captionRoles = byCls('caption-role')
const left = [
  para(run(one('caption-label')), { spacing: { after: 12 * PT } }),
  para(run(captionParties[0].text), { spacing: { after: 12 * PT } }),
  para(run(captionRoles[0].text), { alignment: AlignmentType.RIGHT, indent: { right: 0.4 * IN }, spacing: { after: 12 * PT } }),
  para(run(one('caption-v')), { indent: { left: 0.5 * IN }, spacing: { after: 12 * PT } }),
  para(run(captionParties[1].text), { spacing: { after: 12 * PT } }),
  para(run(captionRoles[1].text), { alignment: AlignmentType.RIGHT, indent: { right: 0.4 * IN } }),
]
const right = [
  para(run(one('caption-case')), { spacing: { after: 12 * PT } }),
  para(run(one('caption-title'), { bold: true }), { spacing: { after: 12 * PT } }),
  ...byCls('caption-cite').map((p) => para(run(p.text), { spacing: { after: 12 * PT } })),
  para(run(one('caption-date'))),
]
w.push(
  new Table({
    width: { size: 6.5 * IN, type: WidthType.DXA },
    columnWidths: [3.5 * IN, 3 * IN],
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 3.5 * IN, type: WidthType.DXA }, borders: { top: none, left: none, bottom: line, right: line }, margins: { top: 0, bottom: 16 * PT, left: 0, right: 0.3 * IN }, children: left }),
          new TableCell({ width: { size: 3 * IN, type: WidthType.DXA }, borders: { top: none, left: none, bottom: none, right: none }, margins: { top: 0, bottom: 0, left: 0.35 * IN, right: 0 }, children: right }),
        ],
      }),
    ],
  }),
)
w.push(para([], { spacing: { after: 12 * PT } }))
const closingBlock = (paras) => {
  const dated = paras.find((p) => p.cls === 'dated')
  const rest = paras.filter((p) => p.cls !== 'dated')
  const out = [para(run(dated?.text ?? ''), { spacing: { before: 30 * PT, after: 0 }, keepNext: true })]
  rest.forEach((p, i) => {
    const last = i === rest.length - 1
    out.push(para(run(p.text), { indent: { left: 3.25 * IN }, spacing: { after: p.cls === 'lead' ? 30 * PT : 0, line: 300 }, keepNext: !last, keepLines: true }))
  })
  return out
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
    else if (p.cls === 'placeholder') w.push(para(run(p.text), { shading: { type: ShadingType.CLEAR, fill: 'FFF3CD', color: 'auto' }, spacing: { before: 6 * PT, after: 6 * PT } }))
    else if (p.cls === 'relief') {
      const m = p.text.match(/^(\([a-z]\))\s+([\s\S]*)$/)
      w.push(para(run(m ? `${m[1]}\t${m[2]}` : p.text), { indent: { left: 1.5 * IN, hanging: 0.5 * IN }, tabStops: [{ type: TabStopType.LEFT, position: 1.5 * IN }], spacing: { line: 480 } }))
    } else if (p.n) w.push(para(run(`${p.n}.\t${p.text}`), { tabStops: [{ type: TabStopType.LEFT, position: 0.5 * IN }], spacing: { line: 480 }, widowControl: true }))
    else w.push(para(run(p.text), { spacing: { line: 480 } }))
  }
}
const wordDoc = new Document({
  creator: '',
  title: `Due Process Complaint Notice — ${doc.student}`,
  styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
  sections: [
    {
      properties: { page: { size: { width: 8.5 * IN, height: 11 * IN }, margin: { top: IN, right: IN, bottom: IN, left: IN } } },
      footers: { default: new Footer({ children: [para(new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 22 }), { alignment: AlignmentType.CENTER })] }) },
      children: w,
    },
  ],
})
writeFileSync(join(dir, 'complaint.docx'), await Packer.toBuffer(wordDoc))

// ─── PDF ──────────────────────────────────────────────────────────────
const pdf = await PDFDocument.create()
pdf.setTitle(`Due Process Complaint Notice — ${doc.student}`)
const F = { regular: await pdf.embedFont(StandardFonts.TimesRoman), bold: await pdf.embedFont(StandardFonts.TimesRomanBold), italic: await pdf.embedFont(StandardFonts.TimesRomanItalic) }
const SIZE = 12
const PAGE = { w: 612, h: 792, margin: 72 }
const WIDTH = PAGE.w - 2 * PAGE.margin
const SINGLE = 14
const DOUBLE = 24
// The standard fonts carry the WinAnsi characters; anything else is drawn
// as "?" and named, so the Word file (any character) can be used instead.
const supported = new Set(F.regular.getCharacterSet())
const replaced = new Set()
const clean = (s) => [...String(s ?? '')].map((ch) => (supported.has(ch.codePointAt(0)) ? ch : (replaced.add(ch), '?'))).join('')
const width = (s, font = F.regular, size = SIZE) => font.widthOfTextAtSize(s, size)
function wrap(text, font, size, first, rest = first) {
  const words = clean(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  let max = first
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (width(candidate, font, size) <= max) { line = candidate; continue }
    if (line) { lines.push(line); max = rest }
    line = word
    while (width(line, font, size) > max) { // a word longer than the line (an email address)
      let cut = line.length
      while (cut > 1 && width(line.slice(0, cut), font, size) > max) cut--
      lines.push(line.slice(0, cut)); line = line.slice(cut); max = rest
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

let page = null
let y = 0
const pages = []
const newPage = () => { page = pdf.addPage([PAGE.w, PAGE.h]); pages.push(page); y = PAGE.h - PAGE.margin }
const room = () => y - PAGE.margin
const ensure = (height) => { if (room() < height) newPage() }
const draw = (text, x, font = F.regular, size = SIZE) => page.drawText(clean(text), { x, y: y - size, size, font, color: rgb(0, 0, 0) })
const drawCentered = (text, font = F.bold, size = SIZE) => draw(text, PAGE.margin + (WIDTH - width(clean(text), font, size)) / 2, font, size)
const lines = (text, font, size, leading, first, rest, xFirst, xRest, keepLines = 2) => {
  const ls = wrap(text, font, size, first, rest)
  if (room() < Math.min(ls.length, keepLines) * leading) newPage()
  ls.forEach((l, i) => {
    // No lone last line on a fresh page: break one line earlier instead.
    if (room() < leading || (i === ls.length - 2 && ls.length > 2 && room() < 2 * leading)) newPage()
    draw(l, i === 0 ? xFirst : xRest, font, size)
    y -= leading
  })
}
newPage()
if (draft) { drawCentered(BANNER); y -= SINGLE + 6 }
for (const p of byCls('caption-court')) { drawCentered(p.text); y -= SINGLE }
y -= 18
// The caption: two columns, the parties inside an L-shaped rule.
const leftW = 3.5 * 72
const gap = 0.35 * 72
const leftInner = leftW - 0.3 * 72
const rightX = PAGE.margin + leftW + gap
const rightW = WIDTH - leftW - gap
const column = (items, w) => items.map((it) => ({ ...it, lines: wrap(it.text, it.font ?? F.regular, SIZE, w) }))
const leftItems = column([
  { text: one('caption-label') },
  { text: captionParties[0].text },
  { text: captionRoles[0].text, align: 'right' },
  { text: one('caption-v'), indent: 0.5 * 72 },
  { text: captionParties[1].text },
  { text: captionRoles[1].text, align: 'right' },
], leftInner)
const rightItems = column([
  { text: one('caption-case') },
  { text: one('caption-title'), font: F.bold },
  ...byCls('caption-cite').map((p) => ({ text: p.text })),
  { text: one('caption-date') },
], rightW)
const colHeight = (items) => items.reduce((h, it, i) => h + it.lines.length * SINGLE + (i < items.length - 1 ? 12 : 0), 0)
const top = y
const drawColumn = (items, x, w) => {
  y = top
  items.forEach((it, i) => {
    for (const l of it.lines) {
      const lw = width(clean(l), it.font ?? F.regular, SIZE)
      const lx = it.align === 'right' ? x + w - 0.4 * 72 - lw : x + (it.indent ?? 0)
      draw(l, lx, it.font ?? F.regular, SIZE)
      y -= SINGLE
    }
    if (i < items.length - 1) y -= 12
  })
}
const leftH = colHeight(leftItems) + 16
drawColumn(leftItems, PAGE.margin, leftInner)
drawColumn(rightItems, rightX, rightW)
const bottom = top - Math.max(leftH, colHeight(rightItems))
page.drawLine({ start: { x: PAGE.margin + leftW, y: top }, end: { x: PAGE.margin + leftW, y: top - leftH }, thickness: 0.75, color: rgb(0, 0, 0) })
page.drawLine({ start: { x: PAGE.margin, y: top - leftH }, end: { x: PAGE.margin + leftW, y: top - leftH }, thickness: 0.75, color: rgb(0, 0, 0) })
y = bottom - 24

const closing = (paras) => {
  const dated = paras.find((p) => p.cls === 'dated')
  const rest = paras.filter((p) => p.cls !== 'dated')
  const blockX = PAGE.w - PAGE.margin - 3.25 * 72
  const height = SINGLE + rest.reduce((h, p) => h + (p.cls === 'lead' ? 15 + 30 : 15), 0) + 12
  ensure(height + 30)
  y -= 30
  const startY = y
  draw(dated?.text ?? '', PAGE.margin)
  y = startY
  for (const p of rest) {
    draw(p.text, blockX)
    y -= p.cls === 'lead' ? 15 + 30 : 15
  }
}
const heading = (text) => {
  ensure(SINGLE + 8 + 2 * DOUBLE)
  y -= 24
  drawCentered(text.toUpperCase())
  y -= SINGLE + 8
}
for (const s of body) {
  if (s.id === 'service') {
    // The certificate is short and stays on one page.
    const first = s.paragraphs.findIndex((p) => p.cls === 'dated')
    const before = s.paragraphs.slice(0, first)
    const est = SINGLE + 8 + 24 + before.reduce((h, p) => h + wrap(p.text, F.regular, SIZE, WIDTH).length * SINGLE + 12, 0) + 30 + 15 * 6
    ensure(est + 36)
    y -= 12
  }
  if (s.heading) heading(s.heading)
  if (s.id === 'signature') { closing(s.paragraphs); continue }
  if (s.id === 'service') {
    const first = s.paragraphs.findIndex((p) => p.cls === 'dated')
    for (const p of s.paragraphs.slice(0, first)) {
      // The method line keeps its spacing between the boxes.
      if (p.cls === 'method' && width(clean(p.text)) <= WIDTH) { ensure(SINGLE); draw(p.text, PAGE.margin); y -= SINGLE }
      else lines(p.text, F.regular, SIZE, SINGLE, WIDTH, WIDTH, PAGE.margin, PAGE.margin, 99)
      y -= p.cls === 'method' ? 6 : 12
    }
    closing(s.paragraphs.slice(first))
    continue
  }
  for (const p of s.paragraphs) {
    if (p.cls === 'subheading') {
      ensure(SINGLE + 4 + 2 * DOUBLE)
      y -= 18
      draw(p.text, PAGE.margin, F.bold)
      y -= SINGLE + 4
    } else if (p.cls === 'cite') {
      ensure(SINGLE + 10 + DOUBLE)
      draw(p.text, PAGE.margin, F.italic)
      y -= SINGLE + 10
    } else if (p.cls === 'placeholder') {
      const ls = wrap(p.text, F.regular, SIZE, WIDTH - 12)
      ensure(ls.length * SINGLE + 12)
      page.drawRectangle({ x: PAGE.margin, y: y - ls.length * SINGLE - 8, width: WIDTH, height: ls.length * SINGLE + 8, color: rgb(1, 0.953, 0.804) })
      y -= 4
      for (const l of ls) { draw(l, PAGE.margin + 6); y -= SINGLE }
      y -= 8
    } else if (p.cls === 'relief') {
      const m = p.text.match(/^(\([a-z]\))\s+([\s\S]*)$/)
      const letterX = PAGE.margin + 72
      const textX = PAGE.margin + 108
      const ls = wrap(m ? m[2] : p.text, F.regular, SIZE, WIDTH - 108)
      if (room() < Math.min(ls.length, 2) * DOUBLE) newPage()
      ls.forEach((l, i) => {
        if (room() < DOUBLE) newPage()
        if (i === 0 && m) draw(m[1], letterX)
        draw(l, textX)
        y -= DOUBLE
      })
    } else if (p.n) {
      const ls = wrap(p.text, F.regular, SIZE, WIDTH - 36, WIDTH)
      if (room() < Math.min(ls.length, 2) * DOUBLE) newPage()
      ls.forEach((l, i) => {
        if (room() < DOUBLE || (i === ls.length - 2 && ls.length > 2 && room() < 2 * DOUBLE)) newPage()
        if (i === 0) draw(`${p.n}.`, PAGE.margin)
        draw(l, i === 0 ? PAGE.margin + 36 : PAGE.margin)
        y -= DOUBLE
      })
    } else {
      lines(p.text, F.regular, SIZE, DOUBLE, WIDTH, WIDTH, PAGE.margin, PAGE.margin)
    }
  }
}
pages.forEach((pg, i) => {
  const label = String(i + 1)
  pg.drawText(label, { x: (PAGE.w - width(label, F.regular, 11)) / 2, y: 36, size: 11, font: F.regular, color: rgb(0, 0, 0) })
})
writeFileSync(join(dir, 'complaint.pdf'), await pdf.save())

console.log(`rendered: complaint.pdf (${pages.length} page${pages.length === 1 ? '' : 's'}), complaint.docx, complaint.md — ${status}`)
if (replaced.size) console.log(`  ! ${[...replaced].map((ch) => `"${ch}"`).join(' ')} cannot be set in the PDF's Times font and print as "?"; complaint.docx carries them as written`)
