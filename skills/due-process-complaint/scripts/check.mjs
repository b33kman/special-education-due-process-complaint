// Built from src/ by `npm run build`; edit the source, not this file.
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/check.mjs
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var FORM = [
  { key: "introduction", re: /^introduction$/i, required: true },
  { key: "contact", re: /^contact and residence information$/i, required: true },
  { key: "facts", re: /^statement of facts$/i },
  { key: "problems", re: /^statement of the problems$/i, required: true },
  { key: "resolution", re: /^proposed resolution$/i, required: true },
  { key: "hearing", re: /^requests concerning the hearing$/i },
  { key: "state", re: /^additional information required in .+$/i },
  { key: "signature", re: /^signature$/i, required: true },
  { key: "service", re: /^certificate of service$/i, required: true }
];
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
function claimsIn(block) {
  let t = block.replace(/^\([a-z]\)\s+/, "").replace(/\[#[^\]]*\]/g, " ");
  const quotes = [...t.matchAll(/(\(?)["“]([^"“”]{2,})["”](\)?)/g)].filter((m) => !(m[1] && m[3])).map((m) => m[2].replace(/[.,;:]+$/, ""));
  const dates = [...t.matchAll(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2}),\\s+(\\d{4})\\b`, "gi"))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${Number(m[2])}/${m[3]}` }));
  for (const d of dates) t = t.replace(d.text, " ");
  const months = [...t.matchAll(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{4})\\b`, "gi"))].map((m) => ({ text: m[0], key: `${monthNumber(m[1])}/${m[2]}` }));
  for (const m of months) t = t.replace(m.text, " ");
  t = t.replace(/\b\d+\s+(?:C\.F\.R|U\.S\.C)\.?\s*(?:§+\s*)?[\w.()–-]*/g, " ").replace(/§+\s*[\d.()a-z,–\s-]+/gi, " ");
  const numbers = [...t.matchAll(/(?<![\w.]|[A-Za-z]-)(\$?\d[\d,]*(?:\.\d+)?%?)(?:\s+([a-z]+))?/gi)].map((m) => ({ n: m[1].replace(/,/g, ""), unit: m[2] ?? "" }));
  return { dates, months, numbers, quotes };
}
var figureIn = (n, text) => new RegExp(`${n.startsWith("$") ? "\\$\\s?" : ""}(?<![\\d.])${escapeRe(n.replace(/[$%]/g, ""))}(?![\\d])${n.endsWith("%") ? "\\s?(?:%|percent)" : ""}`, "i").test(String(text).replace(/,/g, ""));
function checkComplaint(dir) {
  const errors = [];
  const statementOnly = [];
  const file = join(dir, "complaint.md");
  if (!existsSync(file)) return { errors: ["there is no complaint.md in the case folder"], statementOnly, parsed: null };
  const parsed = parseComplaint(readFileSync(file, "utf8"));
  const { meta, sections } = parsed;
  const textDir = join(dir, "work", "text");
  const documents = existsSync(textDir) ? readdirSync(textDir).filter((f) => f.endsWith(".txt")).map((f) => readFileSync(join(textDir, f), "utf8")).join("\n") : "";
  if (!documents) errors.push("no document text in work/text/ \u2014 run pdf-text.mjs first");
  const statement = existsSync(join(dir, "statement.md")) ? readFileSync(join(dir, "statement.md"), "utf8") : "";
  const sources = `${documents}
${statement}`;
  for (const k of ["forum", "state", "petitioner", "respondent", "date", "student", "address", "school"]) {
    if (!meta[k]) errors.push(`the front matter has no ${k}:`);
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
    if (!s) errors.push(`the complaint has no ${f.key === "problems" ? "\u201CStatement of the problems\u201D" : f.key === "resolution" ? "\u201CProposed resolution\u201D" : `\u201C${f.re.source.replace(/[\^$\\/i]/g, "")}\u201D`} section`);
    else if (!s.blocks.some((b) => !/^\*.*\*$/.test(b) && !b.startsWith("###"))) errors.push(`the \u201C${s.heading}\u201D section is empty`);
  }
  const body = sections.filter((s) => !["signature", "service"].includes(s.key));
  const bodyText = body.flatMap((s) => s.blocks).join("\n");
  const intro = sections.find((s) => s.key === "introduction")?.blocks.join("\n") ?? "";
  const contact = sections.find((s) => s.key === "contact")?.blocks.join("\n") ?? "";
  if (meta.student && !contains(intro, meta.student)) errors.push(`the introduction does not name the child as the front matter does (\u201C${meta.student}\u201D)`);
  if (meta.address && !contains(contact, meta.address)) errors.push(`the contact and residence section does not give the address as the front matter does (\u201C${meta.address}\u201D)`);
  if (meta.school && !contains(bodyText, meta.school)) errors.push(`the complaint does not name the school (\u201C${meta.school}\u201D)`);
  for (const [k, parts] of [["student", String(meta.student ?? "").split(/\s+/)], ["address", String(meta.address ?? "").split(/,\s*/)], ["school", [meta.school]]]) {
    for (const part of parts.filter(Boolean)) if (!contains(sources, part)) errors.push(`${k}: \u201C${part}\u201D is not in the documents or statement.md`);
  }
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
        if (s.key !== "problems") errors.push(`${s.heading}: \u201C[#${m[1]}]\u201D points at a paragraph of the chronology \u2014 a paragraph number belongs to a claim, and a remedy names its own figures`);
        else if (!labels.has(m[1])) errors.push(`${s.heading}: \u201C[#${m[1]}]\u201D points to no paragraph \u2014 start the paragraph it means with [#${m[1]}]`);
      }
    }
  }
  const problems = sections.find((s) => s.key === "problems");
  if (problems) {
    let claim = null;
    let words = 0;
    const claimDone = () => {
      if (claim && words < 10) errors.push(`\u201C${claim}\u201D says only which paragraphs bear on the problem \u2014 say what the problem is, with its key dates and figures`);
    };
    for (const block of problems.blocks) {
      if (block.startsWith("###")) {
        claimDone();
        claim = block.replace(/^#+\s*/, "").trim();
        words = 0;
        continue;
      }
      if (/^\*.*\*$/.test(block)) continue;
      words += (block.replace(/\[#[^\]]*\]/g, " ").replace(/\bparagraphs?\b/gi, " ").match(/[A-Za-z0-9][A-Za-z0-9''’-]*/g) ?? []).length;
    }
    claimDone();
  }
  const docDates = datesIn(documents), stmtDates = datesIn(statement);
  const docMonths = monthsIn(documents), stmtMonths = monthsIn(statement);
  for (const s of body) {
    for (const block of s.blocks) {
      if (block.startsWith("###") || /^\*.*\*$/.test(block)) continue;
      const where = `${s.heading}: \u201C${block.slice(0, 80)}${block.length > 80 ? "\u2026" : ""}\u201D`;
      const { dates, months, numbers, quotes } = claimsIn(block);
      for (const d of dates) {
        if (docDates.has(d.key)) continue;
        if (stmtDates.has(d.key)) statementOnly.push(`${d.text} \u2014 ${where}`);
        else errors.push(`${where} \u2014 the date \u201C${d.text}\u201D is not in the documents or statement.md`);
      }
      for (const m of months) {
        if (docMonths.has(m.key)) continue;
        if (stmtMonths.has(m.key)) statementOnly.push(`${m.text} \u2014 ${where}`);
        else errors.push(`${where} \u2014 \u201C${m.text}\u201D is not in the documents or statement.md`);
      }
      for (const { n, unit } of numbers) {
        const withUnit = unit && !/%$/.test(n) ? `${n} ${unit}` : "";
        if (withUnit ? contains(documents, withUnit) : figureIn(n, documents)) continue;
        if (withUnit ? contains(statement, withUnit) : figureIn(n, statement)) {
          statementOnly.push(`${withUnit || n} \u2014 ${where}`);
          continue;
        }
        if (figureIn(n, documents)) continue;
        if (figureIn(n, statement)) statementOnly.push(`${n} \u2014 ${where}`);
        else errors.push(`${where} \u2014 the figure \u201C${n}\u201D is not in the documents or statement.md`);
      }
      for (const q of quotes) {
        if (quotedIn(documents, q)) continue;
        if (quotedIn(statement, q)) statementOnly.push(`\u201C${q}\u201D \u2014 ${where}`);
        else errors.push(`${where} \u2014 the quotation \u201C${q}\u201D is not word for word in the documents or statement.md`);
      }
    }
  }
  return { errors, statementOnly, parsed };
}
var self = fileURLToPath(import.meta.url);
if (basename(self) === "check.mjs" && process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) {
  if (!process.argv[2]) {
    console.error("usage: node scripts/check.mjs <case folder>   \u2014 every date, figure and quotation in complaint.md against the documents and statement.md; the required elements; the form");
    process.exit(2);
  }
  const { errors, statementOnly } = checkComplaint(resolve(process.argv[2]));
  for (const e of errors) console.log(`\u2717 ${e}`);
  if (statementOnly.length) {
    console.log("\nFrom statement.md, not from any document \u2014 tell the person signing:");
    for (const s of statementOnly) console.log(`  \xB7 ${s}`);
  }
  console.log(errors.length ? `
${errors.length} error(s). Fix each from the sources and run again.` : "\ncheck passed.");
  process.exit(errors.length ? 1 : 0);
}
export {
  FORM,
  checkComplaint,
  parseComplaint
};
