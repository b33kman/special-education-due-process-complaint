// Built from src/ by `npm run build`; edit the source, not this file.
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/check.mjs
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/authorities-data.mjs
var citeKey = (volume, reporter) => `${Number(volume)} ${String(reporter).replace(/\s+/g, "").toLowerCase()}`;
var TIER1 = [
  // Binding everywhere.
  { name: "Endrew F.", volume: 580, reporter: "U.S.", page: 386, scope: "national" },
  { name: "Rowley", volume: 458, reporter: "U.S.", page: 176, scope: "national" },
  { name: "Burlington", volume: 471, reporter: "U.S.", page: 359, scope: "national", placementOnly: true },
  { name: "Carter", volume: 510, reporter: "U.S.", page: 7, scope: "national", placementOnly: true },
  // Second Circuit: Connecticut, New York and Vermont only.
  { name: "R.E.", volume: 694, reporter: "F.3d", page: 167, scope: "2d" },
  { name: "C.F.", volume: 746, reporter: "F.3d", page: 68, scope: "2d" },
  { name: "L.O.", volume: 822, reporter: "F.3d", page: 95, scope: "2d" },
  { name: "A.M.", volume: 845, reporter: "F.3d", page: 523, scope: "2d" },
  { name: "Newington", volume: 546, reporter: "F.3d", page: 111, scope: "2d" },
  { name: "Woodstock", volume: 370, reporter: "F. App'x", page: 202, scope: "2d" },
  { name: "Trumbull", volume: 975, reporter: "F.3d", page: 152, scope: "2d" },
  { name: "Frank G.", volume: 459, reporter: "F.3d", page: 356, scope: "2d", placementOnly: true },
  { name: "Gagliardo", volume: 489, reporter: "F.3d", page: 105, scope: "2d", placementOnly: true }
];
var CIRCUIT_OF = {
  ME: "1st",
  MA: "1st",
  NH: "1st",
  RI: "1st",
  CT: "2d",
  NY: "2d",
  VT: "2d",
  DE: "3d",
  NJ: "3d",
  PA: "3d",
  MD: "4th",
  NC: "4th",
  SC: "4th",
  VA: "4th",
  WV: "4th",
  LA: "5th",
  MS: "5th",
  TX: "5th",
  KY: "6th",
  MI: "6th",
  OH: "6th",
  TN: "6th",
  IL: "7th",
  IN: "7th",
  WI: "7th",
  AR: "8th",
  IA: "8th",
  MN: "8th",
  MO: "8th",
  NE: "8th",
  ND: "8th",
  SD: "8th",
  AK: "9th",
  AZ: "9th",
  CA: "9th",
  HI: "9th",
  ID: "9th",
  MT: "9th",
  NV: "9th",
  OR: "9th",
  WA: "9th",
  CO: "10th",
  KS: "10th",
  NM: "10th",
  OK: "10th",
  UT: "10th",
  WY: "10th",
  AL: "11th",
  FL: "11th",
  GA: "11th",
  DC: "D.C."
};
var CODE_OF_STATE = Object.fromEntries(Object.entries({
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming"
}).map(([code, name]) => [name.toLowerCase(), code]));
function circuitForState(state) {
  const raw = String(state ?? "").trim();
  const code = CODE_OF_STATE[raw.toLowerCase()] ?? (raw.length === 2 ? raw.toUpperCase() : null);
  return (code && CIRCUIT_OF[code]) ?? null;
}
var REPORTERS = "U\\.\\s?S\\.|F\\.\\s?2d|F\\.\\s?3d|F\\.\\s?4th|F\\.\\s?App'x|F\\.\\s?Supp\\.(?:\\s?\\dd?)?|S\\.\\s?Ct\\.|N\\.E\\.(?:\\s?\\dd)?|N\\.W\\.(?:\\s?\\dd)?|S\\.E\\.(?:\\s?\\dd)?|S\\.W\\.(?:\\s?\\dd)?|So\\.(?:\\s?\\dd)?|P\\.(?:\\s?\\dd)?|A\\.(?:\\s?\\dd)?|Cal\\.\\s?Rptr\\.(?:\\s?\\dd)?|N\\.Y\\.S\\.(?:\\s?\\dd)?";
function citationsIn(text) {
  const re = new RegExp(`\\b(\\d{1,4})\\s+(${REPORTERS})\\s+(at\\s+)?(\\d{1,4})`, "g");
  const out = [];
  for (const m of String(text ?? "").matchAll(re)) {
    out.push({
      raw: m[0].replace(/\s+/g, " "),
      key: citeKey(m[1], m[2]),
      page: Number(m[4]),
      short: Boolean(m[3]),
      // What was written before the citation, where the case name sits.
      before: String(text).slice(Math.max(0, m.index - 140), m.index)
    });
  }
  return out;
}
var nameNeedle = (name) => name.replace(/[*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
function tier1For(key, circuit, { page, short, before } = {}) {
  const hit = TIER1.find((c) => citeKey(c.volume, c.reporter) === key);
  if (!hit) return { listed: false, inScope: false };
  if (!short && page !== void 0 && page !== hit.page) {
    return { listed: false, inScope: false, wrongPage: hit.page, name: hit.name };
  }
  if (before !== void 0) {
    const seen = String(before).replace(/\s+/g, " ").toLowerCase();
    if (!seen.includes(nameNeedle(hit.name))) return { listed: false, inScope: false, expectedName: hit.name };
  }
  return { listed: true, inScope: hit.scope === "national" || hit.scope === String(circuit).trim(), scope: hit.scope, name: hit.name };
}

// src/check.mjs
var FORM = [
  { key: "preliminary", re: /^preliminary statement$/i, required: true, name: "\u201CPreliminary statement\u201D" },
  { key: "required", re: /^required information$/i, required: true, name: "\u201CRequired information\u201D" },
  { key: "jurisdiction", re: /^jurisdiction, timeliness and burden$/i, required: true, name: "\u201CJurisdiction, timeliness and burden\u201D" },
  { key: "facts", re: /^statement of facts$/i, required: true, name: "\u201CStatement of facts\u201D" },
  { key: "problems", re: /^statement of the problems$/i, required: true, name: "\u201CStatement of the problems\u201D" },
  { key: "pendency", re: /^pendency$/i },
  { key: "resolution", re: /^proposed resolution$/i, required: true, name: "\u201CProposed resolution\u201D" },
  { key: "hearing", re: /^requests concerning the hearing$/i },
  { key: "state", re: /^additional information required in .+$/i },
  { key: "rights", re: /^reservation of rights$/i },
  { key: "signature", re: /^signature$/i, required: true, name: "\u201CSignature\u201D" },
  { key: "service", re: /^certificate of service$/i, required: true, name: "\u201CCertificate of service\u201D" },
  { key: "notes", re: /^(?:attorney review notes\s*[–—-]\s*attorney work product\s*[–—-]\s*remove before filing|review notes\s*[–—-]\s*remove before filing)$/i, required: true, name: "\u201CReview Notes \u2013 Remove Before Filing\u201D" }
];
var POINTER_SECTIONS = /* @__PURE__ */ new Set(["problems", "pendency"]);
var FILERS = ["parent", "guardian", "student", "attorney", "advocate", "legal-aid"];
var COUNSEL_FILERS = /* @__PURE__ */ new Set(["attorney", "legal-aid"]);
var FLAG_KINDS = ["MISSING", "CONFLICT", "VERIFY", "COUNSEL"];
var FLAG_RE = new RegExp(`\\[(${FLAG_KINDS.join("|")})-(\\d+)(?::\\s*([^\\]]*))?\\]`, "g");
var MAX_FLAG_WORDS = 12;
var isTable = (block) => block.trimStart().startsWith("|");
function tableRows(block) {
  const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  const cells = lines.map((l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
  return cells.filter((row) => !row.every((c) => /^:?-{2,}:?$/.test(c) || c === ""));
}
function parseComplaint(md) {
  const text = String(md).replace(/\r\n/g, "\n");
  const meta = {};
  let body = text;
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([A-Za-z]+):\s*(.*?)\s*(?:#.*)?$/);
      if (m) meta[m[1].toLowerCase()] = m[2];
    }
    body = text.slice(fm[0].length);
  }
  const sections = [];
  for (const chunk of body.split(/^## /m).slice(1)) {
    const [headingLine, ...rest] = chunk.split("\n");
    const heading = headingLine.trim().replace(/^[IVX]+\.\s*/, "");
    const blocks = rest.join("\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    sections.push({ heading, key: FORM.find((f) => f.re.test(heading))?.key ?? null, blocks });
  }
  return { meta, sections };
}
var MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
var MONTH_ALT = [...new Set(MONTHS.flatMap((m) => [m, m.slice(0, 3), m.slice(0, 4)]).concat("sept"))].join("|");
var monthNumber = (name) => MONTHS.findIndex((m) => m.startsWith(name.toLowerCase().replace(/\.$/, ""))) + 1;
var normalize = (s) => String(s ?? "").normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―−]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function contains(hay, needle, loose = true) {
  const h = normalize(hay), n = normalize(needle);
  if (!n) return false;
  const re = (x) => new RegExp(`${/^\d/.test(x) ? "(?<![\\d.,])" : ""}${escapeRe(x)}${/\d$/.test(x) ? "(?![\\d]|[.,]\\d)" : ""}`);
  if (re(n).test(h)) return true;
  return loose && re(n.replace(/[\s-]/g, "")).test(h.replace(/[\s-]/g, ""));
}
var tighten = (s) => String(s ?? "").replace(/\s+([;:,.!?])/g, "$1");
var quotedIn = (hay, q) => contains(hay, q, false) || contains(tighten(hay), tighten(q), false);
function datesIn(text) {
  const out = /* @__PURE__ */ new Set();
  const add = (mm, dd, yy) => {
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return;
    for (const y of String(yy).length === 4 ? [yy] : [`20${yy}`, `19${yy}`]) out.add(`${Number(mm)}/${Number(dd)}/${y}`);
  };
  const t = String(text ?? "");
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4}|\\d{2})\\b`, "gi"))) add(monthNumber(m[1]), Number(m[2]), m[3]);
  for (const m of t.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) add(Number(m[2]), Number(m[3]), m[1]);
  for (const m of t.matchAll(/(?<![\d/])(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4}|\d{2})(?![\d/])/g)) add(Number(m[1]), Number(m[2]), m[3]);
  return out;
}
function monthsIn(text) {
  const out = /* @__PURE__ */ new Set();
  const t = String(text ?? "");
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?,?\\s+(\\d{4})\\b`, "gi"))) out.add(`${monthNumber(m[1])}/${m[2]}`);
  for (const m of t.matchAll(/(?<![\d/])(\d{1,2})\s*\/\s*(\d{4})(?![\d/])/g)) out.add(`${Number(m[1])}/${m[2]}`);
  for (const d of datesIn(t)) {
    const [mm, , y] = d.split("/");
    out.add(`${mm}/${y}`);
  }
  return out;
}
var stripMarkers = (t) => String(t).replace(FLAG_RE, " ").replace(/\[@[^\]]*\]/g, " ").replace(/\[#[^\]]*\]/g, " ");
function claimsIn(block) {
  let t = stripMarkers(block.replace(/^\([a-z]\)\s+/, ""));
  const quotes = [...t.matchAll(/(\(?)["“]([^"“”]{2,})["”](\)?)/g)].filter((m) => !(m[1] && m[3])).map((m) => m[2].replace(/[.,;:]+$/, ""));
  const dates = [
    // "October 14, 2025", and the abbreviated forms a model reaches for anyway.
    ...[...t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,\\s*(\\d{4})\\b`, "gi"))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${Number(m[2])}/${m[3]}` })),
    // "12/2/2026" and "2026-12-02". The pleading should write a date in full, but a date it does
    // write in figures still has to be one somebody wrote down.
    ...[...t.matchAll(/(?<![\d/-])(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})(?![\d/])/g)].map((m) => ({ text: m[0], key: `${Number(m[1])}/${Number(m[2])}/${m[3]}` })),
    ...[...t.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)].map((m) => ({ text: m[0], key: `${Number(m[2])}/${Number(m[3])}/${m[1]}` }))
  ];
  for (const d of dates) t = t.replace(d.text, " ");
  const months = [...t.matchAll(new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{4})\\b`, "gi"))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${m[2]}` }));
  for (const m of months) t = t.replace(m.text, " ");
  t = t.replace(/\b\d+\s+(?:C\.F\.R|U\.S\.C)\.?\s*(?:§+\s*)?[\w.()–-]*(?:\s*,\s*[\d][\w.()–-]*)*/g, " ").replace(/§+\s*[\d.()a-z,–\s-]+/gi, " ").replace(/\bsections?\s+[\d][\w.()–-]*(?:\s*,\s*[\d][\w.()–-]*)*/gi, " ").replace(CITATION_LONG, " ").replace(CITATION_SHORT, " ");
  const numbers = [...t.matchAll(/(?<![\w.]|[A-Za-z]-)(\$?\d[\d,]*(?:\.\d+)?%?)(?:\s+([a-z]+))?/gi)].map((m) => ({ n: m[1].replace(/,/g, ""), unit: unitOf(m[2]) }));
  return { dates, months, numbers, quotes };
}
var NOT_A_UNIT = /* @__PURE__ */ new Set(["and", "or", "to", "through", "of", "in", "on", "at", "by", "for", "with", "the", "a", "an", "as", "from", "that", "which", "was", "were", "is", "are", "than", "but", "so", "if", "when", "while", "before", "after"]);
var unitOf = (word) => word && !NOT_A_UNIT.has(word.toLowerCase()) ? word : "";
var CITATION_LONG = new RegExp(`\\b\\d{1,4}\\s+(?:${REPORTERS})\\s+\\d{1,4}(?:\\s*,\\s*[\\d\u2013\u2014-]+)*(?:\\s*\\([^()]{0,60}\\))?`, "g");
var CITATION_SHORT = new RegExp(`\\b\\d{1,4}\\s+(?:${REPORTERS})\\s+at\\s+[\\d\u2013\u2014,\\s-]+`, "g");
var figureIn = (n, text) => new RegExp(`${n.startsWith("$") ? "\\$\\s?" : ""}(?<![\\d.])${escapeRe(n.replace(/[$%]/g, ""))}(?![\\d])${n.endsWith("%") ? "\\s?(?:%|percent)" : ""}`, "i").test(String(text).replace(/,/g, ""));
var ARITHMETIC_HEADER = ["what", "inputs", "computation", "result"];
var SAFE_EXPRESSION = /^(?!.*(?:\/\*|\*\/|\*\*|\/\/))[\d+\-*/(). ]+$/;
var leadingNumber = (s) => {
  const m = String(s).replace(/,/g, "").match(/^\s*(-?\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};
function auditArithmetic(notesSection, sources) {
  const errors = [];
  const results = [];
  if (!notesSection) return { errors, results };
  for (const block of notesSection.blocks.filter(isTable)) {
    const rows = tableRows(block);
    if (!rows.length) continue;
    const header = rows[0].map((c) => c.replace(/\*/g, "").toLowerCase());
    if (ARITHMETIC_HEADER.some((h, i) => header[i] !== h)) continue;
    for (const row of rows.slice(1)) {
      const [what, inputs, computation, result] = row;
      const where = `the arithmetic table, \u201C${what}\u201D`;
      if (!SAFE_EXPRESSION.test(computation)) {
        errors.push(`${where}: the computation \u201C${computation}\u201D must be digits and + - * / ( ) . only`);
        continue;
      }
      const inputFigures = /* @__PURE__ */ new Set();
      for (const { n } of [...inputs.replace(/\([^)]*\)/g, " ").matchAll(/(\$?\d[\d,]*(?:\.\d+)?%?)/g)].map((m) => ({ n: m[1].replace(/,/g, "") }))) {
        inputFigures.add(n.replace(/[$%]/g, ""));
        if (!figureIn(n, sources) && !results.includes(n.replace(/[$%]/g, ""))) {
          errors.push(`${where}: the input \u201C${n}\u201D is neither in the documents or statement.md nor a result computed above`);
        }
      }
      for (const m of computation.matchAll(/\d+(?:\.\d+)?/g)) {
        const n = m[0];
        if (!inputFigures.has(n) && !results.includes(n)) {
          errors.push(`${where}: the computation uses ${n}, which is not one of its inputs or a result computed above`);
        }
      }
      let value;
      try {
        value = Function(`"use strict"; return (${computation})`)();
      } catch {
        errors.push(`${where}: the computation \u201C${computation}\u201D does not evaluate`);
        continue;
      }
      const stated = leadingNumber(result);
      if (stated === null) {
        errors.push(`${where}: the result \u201C${result}\u201D does not lead with a number`);
        continue;
      }
      if (!Number.isFinite(value) || Math.abs(value - stated) > 5e-3) {
        errors.push(`${where}: ${computation} is ${value}, and the result says ${stated}`);
        continue;
      }
      results.push(String(stated));
    }
  }
  return { errors, results };
}
function checkComplaint(dir) {
  const errors = [];
  const statementOnly = [];
  const onFlag = [];
  const onLaw = [];
  const looselyTraced = [];
  const file = join(dir, "complaint.md");
  if (!existsSync(file)) return { errors: ["there is no complaint.md in the case folder"], statementOnly, onFlag, onLaw, looselyTraced, openFlags: [], parsed: null };
  const parsed = parseComplaint(readFileSync(file, "utf8"));
  const { meta, sections } = parsed;
  const textDir = join(dir, "work", "text");
  const textFiles = existsSync(textDir) ? readdirSync(textDir).filter((f) => f.endsWith(".txt")) : [];
  const textOf = new Map(textFiles.map((f) => [f, readFileSync(join(textDir, f), "utf8")]));
  const documents = [...textOf.values()].join("\n");
  if (!documents) errors.push("no document text in work/text/ \u2014 run pdf-text.mjs first");
  const statement = existsSync(join(dir, "statement.md")) ? readFileSync(join(dir, "statement.md"), "utf8") : "";
  const sources = `${documents}
${statement}`;
  for (const k of ["forum", "state", "circuit", "filer", "petitioner", "respondent", "date", "student", "address", "school"]) {
    if (!meta[k]) errors.push(`the front matter has no ${k}:`);
  }
  if (meta.filer && !FILERS.includes(meta.filer)) errors.push(`filer: must be one of ${FILERS.join(", ")}`);
  if (meta.state && meta.circuit) {
    const expected = circuitForState(meta.state);
    if (!expected) errors.push(`state: \u201C${meta.state}\u201D is not a state or the District of Columbia`);
    else if (expected !== meta.circuit.trim()) errors.push(`circuit: ${meta.circuit} \u2014 a complaint filed in ${meta.state} is bound by the ${expected} Circuit`);
  }
  if (!["draft", "final"].includes(meta.status)) errors.push("the front matter needs status: draft or status: final");
  let last = -1;
  for (const s of sections) {
    const at = FORM.findIndex((f) => f.key === s.key);
    if (at === -1) errors.push(`\u201C## ${s.heading}\u201D is not a section of the complaint (references/exemplar.md)`);
    else if (at <= last) errors.push(`\u201C## ${s.heading}\u201D is out of order (references/exemplar.md)`);
    else last = at;
  }
  for (const f of FORM.filter((x) => x.required)) {
    const s = sections.find((x) => x.key === f.key);
    if (!s) errors.push(`the complaint has no ${f.name} section`);
    else if (!s.blocks.some((b) => !/^\*.*\*$/.test(b) && !b.startsWith("###"))) errors.push(`the \u201C${s.heading}\u201D section is empty`);
  }
  const notes = sections.find((s) => s.key === "notes");
  if (notes && meta.filer) {
    const isCounselHeading = /attorney work product/i.test(notes.heading);
    const shouldBe = COUNSEL_FILERS.has(meta.filer);
    if (shouldBe && !isCounselHeading) errors.push(`filer: ${meta.filer} \u2014 the notes are headed \u201CAttorney Review Notes \u2013 Attorney Work Product \u2013 Remove Before Filing\u201D`);
    if (!shouldBe && isCounselHeading) errors.push(`filer: ${meta.filer} \u2014 a ${meta.filer}'s notes are not attorney work product; head them \u201CReview Notes \u2013 Remove Before Filing\u201D`);
  }
  const pleading = sections.filter((s) => !["signature", "service", "notes"].includes(s.key));
  const pleadingText = pleading.flatMap((s) => s.blocks).join("\n");
  const preliminary = sections.find((s) => s.key === "preliminary")?.blocks.join("\n") ?? "";
  const required = sections.find((s) => s.key === "required")?.blocks.join("\n") ?? "";
  if (meta.student && !contains(preliminary, meta.student)) errors.push(`the preliminary statement does not name the child as the front matter does (\u201C${meta.student}\u201D)`);
  if (meta.address && !contains(required, meta.address)) errors.push(`the required information section does not give the address as the front matter does (\u201C${meta.address}\u201D)`);
  if (meta.school && !contains(pleadingText, meta.school)) errors.push(`the complaint does not name the school (\u201C${meta.school}\u201D)`);
  for (const [k, parts] of [["student", String(meta.student ?? "").split(/\s+/)], ["address", String(meta.address ?? "").split(/,\s*/)], ["school", [meta.school]]]) {
    for (const part of parts.filter(Boolean)) if (!contains(sources, part)) errors.push(`${k}: \u201C${part}\u201D is not in the documents or statement.md`);
  }
  const notesText = notes ? notes.blocks.join("\n") : "";
  const flagsByKind = new Map(FLAG_KINDS.map((k) => [k, /* @__PURE__ */ new Set()]));
  const openFlags = [];
  for (const s of sections) {
    if (s.key === "notes") continue;
    for (const block of s.blocks) {
      for (const m of [...block.matchAll(FLAG_RE)]) {
        const [, kind, num, text] = m;
        const id = `${kind}-${num}`;
        if (flagsByKind.get(kind).has(num)) errors.push(`the flag \u201C[${id}]\u201D is used twice`);
        flagsByKind.get(kind).add(num);
        openFlags.push(`${id}${text ? `: ${text.trim()}` : ""} \u2014 ${s.heading}`);
        if (text && text.trim().split(/\s+/).length > MAX_FLAG_WORDS) {
          errors.push(`the flag \u201C[${id}]\u201D is longer than ${MAX_FLAG_WORDS} words \u2014 shorten it and explain it in the review notes`);
        }
        if (!new RegExp(`\\b${kind}-${num}\\b`).test(notesText)) errors.push(`the flag \u201C[${id}]\u201D is not explained in the review notes`);
      }
    }
  }
  for (const [kind, nums] of flagsByKind) {
    const sorted = [...nums].map(Number).sort((a, b) => a - b);
    for (const [i, n] of sorted.entries()) {
      if (n !== i + 1) {
        errors.push(`the ${kind} flags must be numbered from 1 with no gaps \u2014 ${sorted.join(", ")}`);
        break;
      }
    }
  }
  const flagged = (block) => {
    FLAG_RE.lastIndex = 0;
    return FLAG_RE.test(block);
  };
  const labels = /* @__PURE__ */ new Set();
  for (const s of sections) {
    for (const block of s.blocks) {
      const name = block.match(/^\[#([^\]]*)\]/)?.[1];
      if (name === void 0) continue;
      if (s.key !== "facts") {
        errors.push(`${s.heading}: the paragraph label \u201C[#${name}]\u201D belongs on a paragraph of the statement of facts`);
        continue;
      }
      if (!/^[a-z][a-z-]*$/.test(name)) errors.push(`the paragraph label \u201C[#${name}]\u201D must be lowercase letters and hyphens`);
      else if (labels.has(name)) errors.push(`the paragraph label \u201C[#${name}]\u201D starts two paragraphs`);
      labels.add(name);
    }
  }
  for (const s of sections) {
    for (const block of s.blocks) {
      for (const m of block.replace(/^\[#[^\]]*\]/, "").matchAll(/\[#([^\]]*)\]/g)) {
        if (!POINTER_SECTIONS.has(s.key)) errors.push(`${s.heading}: \u201C[#${m[1]}]\u201D points at a paragraph of the chronology \u2014 a paragraph number belongs to a claim or the pendency section, and a remedy names its own figures`);
        else if (!labels.has(m[1])) errors.push(`${s.heading}: \u201C[#${m[1]}]\u201D points to no paragraph \u2014 start the paragraph it means with [#${m[1]}]`);
      }
    }
  }
  const resolveStem = (stem) => {
    const want = stem.toLowerCase().replace(/[\s_-]/g, "");
    return textFiles.filter((f) => f.toLowerCase().replace(/\.txt$/, "").replace(/[\s_-]/g, "").startsWith(want));
  };
  const ATTRIBUTES_TO_A_DOCUMENT = /\b(?:the District|the Distict|the log|the notice|the report|the letter|the email|the IEP|the evaluation|the minutes|the record)\b[^.]{0,60}?\b(?:wrote|writes|records|recorded|states|stated|says|said|noted|notes|acknowledges|acknowledged|describes|described|reads)\b/i;
  const REPORTS = /\b(?:the Parent|the Parents|the Student|Petitioner|Counsel|the person filing)\b[^.]{0,40}?\b(?:report|reports|reported|states|stated|says|said|recalls|recalled|describes|described)\b/i;
  const facts = sections.find((s) => s.key === "facts");
  for (const s of sections) {
    if (s.key === "notes") continue;
    for (const block of s.blocks) {
      for (const m of block.matchAll(/\[@([^\]]*)\]/g)) {
        const body = m[1].trim();
        if (/^statement$/i.test(body)) {
          if (!REPORTS.test(stripMarkers(block))) {
            errors.push(`${s.heading}: a paragraph sourced to [@statement] must say so in its own words \u2014 \u201Cthe Parent reports\u201D, \u201CCounsel states\u201D`);
          }
          continue;
        }
        if (/^law$/i.test(body)) {
          if (s.key === "facts") errors.push(`Statement of facts: [@law] belongs in a claim, not in the chronology \u2014 the facts carry no legal citation`);
          else if (!/\d+\s+(?:C\.F\.R|U\.S\.C)\.|§+\s*\d|\d+\s+(?:U\.\s?S\.|F\.\s?\d|F\.\s?App)/.test(block)) {
            errors.push(`${s.heading}: a paragraph sourced to [@law] carries no citation \u2014 give the authority the words come from`);
          } else if (ATTRIBUTES_TO_A_DOCUMENT.test(stripMarkers(block))) {
            errors.push(`${s.heading}: a paragraph sourced to [@law] attributes its words to a document \u2014 [@law] is for quoting an authority, so source this to the page it is on`);
          }
          continue;
        }
        const parts = body.match(/^(.*?),\s*p\.\s*(\d+)$/i);
        if (!parts) {
          errors.push(`${s.heading}: the source \u201C[@${body}]\u201D must read [@stem, p. N], [@statement] or [@law]`);
          continue;
        }
        const [, stem, page] = parts;
        const hits = resolveStem(stem);
        if (hits.length === 0) errors.push(`${s.heading}: the source \u201C[@${body}]\u201D names no document in the case folder`);
        else if (hits.length > 1) errors.push(`${s.heading}: the source \u201C[@${body}]\u201D matches ${hits.length} documents \u2014 give more of the name`);
        else if (!new RegExp(`^--- page ${Number(page)} ---$`, "m").test(textOf.get(hits[0]))) {
          errors.push(`${s.heading}: the source \u201C[@${body}]\u201D names a page ${hits[0].replace(/\.txt$/, "")} does not have`);
        }
      }
    }
  }
  if (facts) {
    for (const block of facts.blocks) {
      if (isTable(block) || /^\*.*\*$/.test(block) || block.startsWith("###")) continue;
      if (!/\[@[^\]]*\]/.test(block) && !flagged(block)) {
        errors.push(`Statement of facts: \u201C${block.slice(0, 60)}\u2026\u201D says where nothing came from \u2014 end it with [@stem, p. N] or [@statement]`);
      }
    }
  }
  const problems = sections.find((s) => s.key === "problems");
  if (problems) {
    let claim = null;
    let words = 0;
    let pointers = 0;
    const claimDone = () => {
      if (!claim) return;
      if (words < 10) errors.push(`\u201C${claim}\u201D says only which paragraphs bear on the problem \u2014 say what the problem is, with its key dates and figures`);
      else if (pointers === 0) errors.push(`\u201C${claim}\u201D points at no paragraph of the chronology \u2014 apply the rule to the facts by paragraph number`);
    };
    for (const block of problems.blocks) {
      if (block.startsWith("###")) {
        claimDone();
        claim = block.replace(/^#+\s*/, "").trim();
        words = 0;
        pointers = 0;
        continue;
      }
      if (/^\*.*\*$/.test(block)) continue;
      pointers += [...block.matchAll(/\[#[^\]]*\]/g)].length;
      words += (stripMarkers(block).replace(/\bparagraphs?\b/gi, " ").match(/[A-Za-z0-9][A-Za-z0-9''’-]*/g) ?? []).length;
    }
    claimDone();
  }
  const service = sections.find((s) => s.key === "service");
  if (service) {
    const at = service.blocks.findIndex((b) => /^served on:?$/i.test(b));
    const end = service.blocks.findIndex((b) => /^dated:/i.test(b));
    const served = at < 0 ? [] : service.blocks.slice(at + 1, end > at ? end : void 0);
    const partsOf = (office) => office.replace(/\s*\n\s*/g, ", ").split(/,\s*/).filter(Boolean);
    const instructionsFile = join(dir, "filing-instructions.md");
    const instructions = existsSync(instructionsFile) ? readFileSync(instructionsFile, "utf8") : "";
    if (!served.length) errors.push("the certificate of service names nobody served \u2014 under \u201CServed on:\u201D, give each office the complaint goes to, with its address, as filing-instructions.md gives it");
    else if (!instructions) errors.push("there is no filing-instructions.md \u2014 the offices on the certificate of service, and their addresses, come from it (step 5)");
    else {
      for (const office of served) for (const part of partsOf(office)) if (!contains(instructions, part)) errors.push(`Certificate of service: \u201C${part}\u201D is not in filing-instructions.md`);
      if (!instructions.split(/^## /m).some((chunk) => /^the state educational agency\b/i.test(chunk))) {
        errors.push("filing-instructions.md has no \u201C## The State educational agency\u201D section \u2014 34 C.F.R. \xA7 300.508(a)(2) requires a copy to the SEA, so say who the SEA is, whether the filing office is the SEA, and the page that says so");
      }
      const district = instructions.split(/^## /m).find((chunk) => /^the school district\b/i.test(chunk));
      if (!district) errors.push("filing-instructions.md has no \u201C## The school district\u201D section \u2014 say which office of the district receives the complaint, its address, and the page that gives them");
      else if (!served.some((office) => partsOf(office).every((part) => contains(district, part)))) errors.push("the certificate of service does not name the school district\u2019s office as filing-instructions.md gives it");
    }
  }
  const arithmetic = auditArithmetic(notes, sources);
  errors.push(...arithmetic.errors);
  const computed = new Set(arithmetic.results);
  const checkCitations = (text, where, excused) => {
    for (const c of citationsIn(stripMarkers(text))) {
      const t = tier1For(c.key, meta.circuit, c);
      if (t.listed && t.inScope) continue;
      if (excused) {
        onFlag.push(`${c.raw} \u2014 ${where}`);
        continue;
      }
      if (t.wrongPage !== void 0) errors.push(`${where} \u2014 \u201C${c.raw}\u201D gives the wrong first page: references/authorities.md reports ${t.name} at ${t.wrongPage}`);
      else if (t.expectedName) errors.push(`${where} \u2014 \u201C${c.raw}\u201D is the citation for ${t.expectedName}, and that case is not named here`);
      else if (t.listed) errors.push(`${where} \u2014 \u201C${c.raw}\u201D binds in the ${t.scope} Circuit and this complaint is filed in the ${meta.circuit} Circuit: cite it as persuasive with a [VERIFY-#] flag, or not at all`);
      else errors.push(`${where} \u2014 the citation \u201C${c.raw}\u201D is not one references/authorities.md lists: cite it with a [VERIFY-#] flag, which is how an authority read in this session reaches the page`);
    }
  };
  const docDates = datesIn(documents), stmtDates = datesIn(statement);
  const docMonths = monthsIn(documents), stmtMonths = monthsIn(statement);
  for (const s of pleading) {
    for (const block of s.blocks) {
      if (block.startsWith("###")) continue;
      if (/^\*.*\*$/.test(block)) {
        checkCitations(block, `${s.heading}: \u201C${block.slice(0, 80)}\u201D`, flagged(block));
        continue;
      }
      const quotesTheLaw = /\[@law\]/i.test(block);
      const texts = isTable(block) ? tableRows(block).slice(1).flat() : [block];
      const where = `${s.heading}: \u201C${stripMarkers(block).trim().slice(0, 80)}${block.length > 80 ? "\u2026" : ""}\u201D`;
      const excused = flagged(block);
      const note = (what) => {
        (excused ? onFlag : statementOnly).push(`${what} \u2014 ${where}`);
      };
      const refuse = (message) => {
        if (excused) onFlag.push(`${message} \u2014 ${where}`);
        else errors.push(`${where} \u2014 ${message}`);
      };
      for (const text of texts) {
        const { dates, months, numbers, quotes } = claimsIn(text);
        checkCitations(text, where, excused);
        for (const d of dates) {
          if (docDates.has(d.key)) continue;
          if (stmtDates.has(d.key)) note(d.text);
          else refuse(`the date \u201C${d.text}\u201D is not in the documents or statement.md`);
        }
        for (const m of months) {
          if (docMonths.has(m.key)) continue;
          if (stmtMonths.has(m.key)) note(m.text);
          else refuse(`\u201C${m.text}\u201D is not in the documents or statement.md`);
        }
        for (const { n, unit } of numbers) {
          const withUnit = unit && !/%$/.test(n) ? `${n} ${unit}` : "";
          if (withUnit ? contains(documents, withUnit) : figureIn(n, documents)) continue;
          if (computed.has(n.replace(/[$%]/g, ""))) continue;
          if (withUnit ? contains(statement, withUnit) : figureIn(n, statement)) {
            note(withUnit || n);
            continue;
          }
          if (withUnit && (figureIn(n, documents) || figureIn(n, statement))) {
            looselyTraced.push(`${withUnit} \u2014 only \u201C${n}\u201D appears anywhere, and not with that unit \u2014 ${where}`);
            continue;
          }
          if (figureIn(n, documents)) continue;
          if (figureIn(n, statement)) {
            note(n);
            continue;
          }
          refuse(`the figure \u201C${n}\u201D is not in the documents or statement.md, and is not a result in the arithmetic table`);
        }
        for (const q of quotes) {
          if (quotedIn(documents, q)) continue;
          if (quotedIn(statement, q)) {
            note(`\u201C${q}\u201D`);
            continue;
          }
          if (quotesTheLaw) {
            onLaw.push(`\u201C${q}\u201D \u2014 ${where}`);
            continue;
          }
          refuse(`the quotation \u201C${q}\u201D is not word for word in the documents or statement.md`);
        }
      }
    }
  }
  return { errors, statementOnly, onFlag, onLaw, looselyTraced, openFlags, parsed };
}
var self = fileURLToPath(import.meta.url);
if (basename(self) === "check.mjs" && process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) {
  if (!process.argv[2]) {
    console.error("usage: node scripts/check.mjs <case folder>   \u2014 every date, figure and quotation in complaint.md against the documents and statement.md; the flags; the arithmetic; the required elements; the form");
    process.exit(2);
  }
  const { errors, statementOnly, onFlag, onLaw, looselyTraced, openFlags } = checkComplaint(resolve(process.argv[2]));
  for (const e of errors) console.log(`\u2717 ${e}`);
  const list = (title, items) => {
    if (!items.length) return;
    console.log(`
${title}`);
    for (const s of items) console.log(`  \xB7 ${s}`);
  };
  list("From statement.md, not from any document \u2014 tell the person signing:", statementOnly);
  list("Resting on a flag, not on a source \u2014 the person resolves each of these:", onFlag);
  list("Quoted as the law \u2014 confirm each against the authority itself (references/audit.md \xA7 8):", onLaw);
  list("Traced only by the bare number, not by the figure with its unit \u2014 check each one:", looselyTraced);
  list("Flags still open \u2014 the complaint renders as DRAFT until they are resolved:", openFlags);
  console.log(errors.length ? `
${errors.length} error(s). Fix each from the sources and run again.` : "\ncheck passed.");
  process.exit(errors.length ? 1 : 0);
}
export {
  FILERS,
  FLAG_KINDS,
  FORM,
  auditArithmetic,
  checkComplaint,
  parseComplaint
};
