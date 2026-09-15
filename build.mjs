// Builds the skill's three scripts from src/ into skills/due-process-complaint/scripts/,
// each one self-contained file that runs on Node.js 20 or later with nothing to install.
//
//   npm run build            — write the scripts
//   node build.mjs <dir>     — write them to another folder (the tests compare the two)

import { build } from 'esbuild'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const outdir = process.argv[2] ?? join(root, 'skills', 'due-process-complaint', 'scripts')

await build({
  entryPoints: ['pdf-text', 'check', 'render'].map((n) => join(root, 'src', `${n}.mjs`)),
  outdir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
  logLevel: 'warning',
  banner: { js: "// Built from src/ by `npm run build`; edit the source, not this file.\nimport { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);" },
})
