// The machine-readable half of references/authorities.md and references/state-rules.json.
//
// check.mjs is a self-contained file that runs with nothing installed and no folder beside it, so
// it cannot read those two documents at run time: what they carry is embedded here and bundled in.
// tests/skill.test.mjs binds the two together — every case below must appear in
// references/authorities.md under the heading that gives it its scope, with the same citation, and
// every state's circuit must match its row in references/state-rules.json. Edit the documents and
// this file together, or the test fails.

/** A reporter citation, normalized to volume and reporter: (580, "U.S.") -> "580 u.s." */
export const citeKey = (volume, reporter) => `${Number(volume)} ${String(reporter).replace(/\s+/g, '').toLowerCase()}`

/** Every case references/authorities.md § 2 lists, with where it binds. */
export const TIER1 = [
  // Binding everywhere.
  { name: 'Endrew F.', volume: 580, reporter: 'U.S.', page: 386, scope: 'national' },
  { name: 'Rowley', volume: 458, reporter: 'U.S.', page: 176, scope: 'national' },
  { name: 'Burlington', volume: 471, reporter: 'U.S.', page: 359, scope: 'national', placementOnly: true },
  { name: 'Carter', volume: 510, reporter: 'U.S.', page: 7, scope: 'national', placementOnly: true },
  // Second Circuit: Connecticut, New York and Vermont only.
  { name: 'R.E.', volume: 694, reporter: 'F.3d', page: 167, scope: '2d' },
  { name: 'C.F.', volume: 746, reporter: 'F.3d', page: 68, scope: '2d' },
  { name: 'L.O.', volume: 822, reporter: 'F.3d', page: 95, scope: '2d' },
  { name: 'A.M.', volume: 845, reporter: 'F.3d', page: 523, scope: '2d' },
  { name: 'Newington', volume: 546, reporter: 'F.3d', page: 111, scope: '2d' },
  { name: 'Woodstock', volume: 370, reporter: "F. App'x", page: 202, scope: '2d' },
  { name: 'Trumbull', volume: 975, reporter: 'F.3d', page: 152, scope: '2d' },
  { name: 'Frank G.', volume: 459, reporter: 'F.3d', page: 356, scope: '2d', placementOnly: true },
  { name: 'Gagliardo', volume: 489, reporter: 'F.3d', page: 105, scope: '2d', placementOnly: true },
]

/** The United States Court of Appeals whose decisions bind a complaint filed in each state. */
export const CIRCUIT_OF = {
  ME: '1st', MA: '1st', NH: '1st', RI: '1st',
  CT: '2d', NY: '2d', VT: '2d',
  DE: '3d', NJ: '3d', PA: '3d',
  MD: '4th', NC: '4th', SC: '4th', VA: '4th', WV: '4th',
  LA: '5th', MS: '5th', TX: '5th',
  KY: '6th', MI: '6th', OH: '6th', TN: '6th',
  IL: '7th', IN: '7th', WI: '7th',
  AR: '8th', IA: '8th', MN: '8th', MO: '8th', NE: '8th', ND: '8th', SD: '8th',
  AK: '9th', AZ: '9th', CA: '9th', HI: '9th', ID: '9th', MT: '9th', NV: '9th', OR: '9th', WA: '9th',
  CO: '10th', KS: '10th', NM: '10th', OK: '10th', UT: '10th', WY: '10th',
  AL: '11th', FL: '11th', GA: '11th',
  DC: 'D.C.',
}

/** Every state and the District of Columbia, by the name a caption writes. */
export const CODE_OF_STATE = Object.fromEntries(Object.entries({
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}).map(([code, name]) => [name.toLowerCase(), code]))

/** The circuit for a state written either way: "California" or "CA". Null if the state is unknown. */
export function circuitForState(state) {
  const raw = String(state ?? '').trim()
  const code = CODE_OF_STATE[raw.toLowerCase()] ?? (raw.length === 2 ? raw.toUpperCase() : null)
  return (code && CIRCUIT_OF[code]) ?? null
}

/** The reporters a special education citation uses, federal and state. A state reporter is listed
 *  so a fabricated state case is caught by the citation rule rather than falling through to the
 *  figure check, which refused it with a message about an unsourced number. */
export const REPORTERS = "U\\.\\s?S\\.|F\\.\\s?2d|F\\.\\s?3d|F\\.\\s?4th|F\\.\\s?App'x|F\\.\\s?Supp\\.(?:\\s?\\dd?)?|S\\.\\s?Ct\\.|N\\.E\\.(?:\\s?\\dd)?|N\\.W\\.(?:\\s?\\dd)?|S\\.E\\.(?:\\s?\\dd)?|S\\.W\\.(?:\\s?\\dd)?|So\\.(?:\\s?\\dd)?|P\\.(?:\\s?\\dd)?|A\\.(?:\\s?\\dd)?|Cal\\.\\s?Rptr\\.(?:\\s?\\dd)?|N\\.Y\\.S\\.(?:\\s?\\dd)?"

/** Every reporter citation in a passage, long form or short ("580 U.S. at 399"). */
export function citationsIn(text) {
  const re = new RegExp(`\\b(\\d{1,4})\\s+(${REPORTERS})\\s+(at\\s+)?(\\d{1,4})`, 'g')
  const out = []
  for (const m of String(text ?? '').matchAll(re)) {
    out.push({
      raw: m[0].replace(/\s+/g, ' '),
      key: citeKey(m[1], m[2]),
      page: Number(m[4]),
      short: Boolean(m[3]),
      // What was written before the citation, where the case name sits.
      before: String(text).slice(Math.max(0, m.index - 140), m.index),
    })
  }
  return out
}

/** A listed case's short name as written, for matching what the writer put before the citation.
 *  Matched as a literal rather than word by word: four of these names are initials ("R.E.",
 *  "C.F.", "L.O.", "A.M."), and a word filter dropped every part of them, which left the name
 *  check with nothing to compare and let any name through on those four citations. */
const nameNeedle = (name) => name.replace(/[*_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Is this citation one references/authorities.md lists — the same reporter, the same first page, and
 * the name the file gives it — and does it bind where the complaint is filed?
 *
 * The volume and reporter alone are not enough. Keyed on those only, a fabricated case name bolted
 * onto a real citation passed: "Marquez v. Willow Creek Unified Sch. Dist., 580 U.S. 386 (2017)"
 * is not Endrew F., and a guard that cannot tell them apart does not guard the thing it was
 * written for.
 */
export function tier1For(key, circuit, { page, short, before } = {}) {
  const hit = TIER1.find((c) => citeKey(c.volume, c.reporter) === key)
  if (!hit) return { listed: false, inScope: false }
  // A short form ("580 U.S. at 399") cites a pin, not the first page.
  if (!short && page !== undefined && page !== hit.page) {
    return { listed: false, inScope: false, wrongPage: hit.page, name: hit.name }
  }
  if (before !== undefined) {
    const seen = String(before).replace(/\s+/g, ' ').toLowerCase()
    if (!seen.includes(nameNeedle(hit.name))) return { listed: false, inScope: false, expectedName: hit.name }
  }
  return { listed: true, inScope: hit.scope === 'national' || hit.scope === String(circuit).trim(), scope: hit.scope, name: hit.name }
}
