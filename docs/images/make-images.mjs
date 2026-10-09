// Draws the three pictures that show the product rather than the app:
//
//   banner.png               1600x560   the header of README.md
//   social-preview.png       1280x640   the card GitHub shows when the repo is shared
//   complaint-first-page.png 1027x1315  page 1 of the worked complaint, on a light ground
//
// All three carry the first page of examples/river-oak/complaint.pdf, so all three go stale
// the moment that example is redrafted. Regenerate them in the same commit:
//
//   node docs/images/make-images.mjs
//
// It needs Google Chrome, `qlmanage` (macOS) and a network connection for the one webfont, and
// nothing installed. Chrome draws the two dark pictures from HTML written here; qlmanage
// rasterizes the PDF page all three carry.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const out = (name) => join(here, name)

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p))
if (!CHROME) throw new Error('Google Chrome not found; it draws the two dark pictures')

const INK = '#1D2430' // the ground of both dark pictures
const CREAM = '#F4EFE6'
const ORANGE = '#d97757'
const SERIF = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&display=block'

const EYEBROW = 'Individuals with Disabilities Education Act (IDEA)'
const TITLE = 'Due Process<br>Complaint Writer'
const TITLE_3 = 'Due Process<br>Complaint<br>Writer'
const WHO = 'Free plugin for Claude, ChatGPT and other AI chat apps'
const WHAT = 'Reads the school documents, checks every fact against them, and drafts the complaint as a Word document to edit, sign and file.'

const work = mkdtempSync(join(tmpdir(), 'dpc-images-'))

/** Page 1 of the finished complaint, rasterized well above the size any picture draws it at. */
const page = join(work, 'complaint.pdf.png')
execFileSync('qlmanage', ['-t', '-s', '2200', '-o', work, join(root, 'examples', 'river-oak', 'complaint.pdf')], { stdio: 'ignore' })
if (!existsSync(page)) throw new Error('qlmanage did not rasterize the complaint; it draws the page every picture carries')
const PAGE_SRC = `data:image/png;base64,${readFileSync(page).toString('base64')}`

const shoot = (name, width, height, body) => {
  const html = join(work, `${name}.html`)
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${SERIF}"><style>
    * { box-sizing: border-box; margin: 0 }
    body { width: ${width}px; height: ${height}px; overflow: hidden; background: ${INK};
           font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
           -webkit-font-smoothing: antialiased }
    .eyebrow { color: ${ORANGE}; font-weight: 700 }
    h1 { font-family: "Source Serif 4", serif; font-weight: 700; color: ${CREAM}; letter-spacing: -0.015em }
    .who { color: ${CREAM}; font-weight: 700 }
    .what { color: #C9CDD4; font-weight: 400 }
    .page { position: absolute; background: #fff; overflow: hidden }
    .page img { width: 100%; display: block }
  </style>${body}`)
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--virtual-time-budget=8000', // the webfont has to arrive before the shutter
    `--window-size=${width},${height}`, `--screenshot=${out(name)}`, `file://${html}`], { stdio: 'ignore' })
  console.log(`${name}  ${width}x${height}`)
}

// The README header. Measured from the picture it replaces: text from x=114, the page from
// x=1090 and y=72, running off the bottom edge.
shoot('banner.png', 1600, 560, `
  <div style="position:absolute;left:114px;top:100px;width:900px">
    <p class="eyebrow" style="font-size:36px">${EYEBROW}</p>
    <h1 style="font-size:124px;line-height:0.855;margin:28px 0 0">${TITLE}</h1>
    <p class="who" style="font-size:27px;margin-top:46px">${WHO}</p>
  </div>
  <div class="page" style="left:1090px;top:72px;width:440px;height:488px"><img src="${PAGE_SRC}"></div>`)

// The share card. Three title lines, the sentence under them, and the page on the right.
shoot('social-preview.png', 1280, 640, `
  <div style="position:absolute;left:82px;top:64px;width:650px">
    <p class="eyebrow" style="font-size:21px">${EYEBROW}</p>
    <h1 style="font-size:103px;line-height:0.82;margin:22px 0 0">${TITLE_3}</h1>
    <p class="what" style="font-size:24px;line-height:1.42;margin-top:48px;width:600px">${WHAT}</p>
    <p class="who" style="font-size:21px;margin-top:34px">${WHO}</p>
  </div>
  <div class="page" style="left:730px;top:70px;width:500px;height:570px"><img src="${PAGE_SRC}"></div>`)

// Page 1 on its own, on the light ground the README shows it against.
shoot('complaint-first-page.png', 1027, 1315, `
  <style>body { background: #E9ECEF }</style>
  <div class="page" style="left:40px;top:28px;width:947px;height:1227px;border:1px solid #CDCDCD;
       box-shadow:0 2px 10px rgba(0,0,0,.08)"><img src="${PAGE_SRC}"></div>`)

rmSync(work, { recursive: true, force: true })
