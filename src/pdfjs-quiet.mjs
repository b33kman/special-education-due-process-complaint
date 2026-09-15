// pdf.js looks for a drawing library when it loads and warns when it is missing.
// Reading text never draws, so stand-ins and a filtered console keep those
// warnings out of the output. Imported before pdf.js so it runs first;
// pdf-text.mjs calls quietDone() once pdf.js has loaded.
for (const name of ['DOMMatrix', 'ImageData', 'Path2D']) globalThis[name] ??= class {}
const log = console.log
console.log = (...args) => { if (!String(args[0]).startsWith('Warning: Cannot load "@napi-rs/canvas"')) log(...args) }
export const quietDone = () => { console.log = log }
