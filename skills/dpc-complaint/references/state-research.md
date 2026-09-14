# Verifying the state's procedure

A due process complaint is a federal document filed under a state's procedures, and the procedures differ: which agency the caption names, whether the complaint goes to the state or to the district, whether a state form is required, how it may be sent, how long the family had to bring it, and what the state requires the complaint to say beyond the six federal elements. **The skill never takes any of this from memory.** For the state in `case.json`, every one of the fields below is verified on the web during the run and recorded with its source in `work/state.json`. `scripts/validate.mjs` refuses to call the complaint FINAL while any field has no source.

## Start from the bundled table, then verify it

`references/state-rules.json` carries 51 rows compiled from official state pages in August and September 2026, each with a `sourceUrl` and a quotation of what the page said. It is a starting point, not authority: state pages move, forms are replaced, addresses change. Open the bundled `sourceUrl` first; if it still says what the table says, that is one source. Then search for the current page from the state education agency and read it as well.

The row's fields map onto `state.json` like this: `captionAgency` is the body the caption names (the table has no `seaName`; establish the SEA yourself); `filingAddress`, `filingUrl`, `filingRoutedThrough` and `alsoServeDistrict` bear on `filesWith`, `filingAddress` and `serviceRecipients`; `acceptsEmail`, `acceptsFax`, `filingEmail`, `filingFax`, `filingPortalUrl` and `filingPortalNote` bear on `channels`; `limitationsMonths` is the state's window where the research established it — **`null` means it did not, not that the window is 24 months**; `notes` is the researcher's working notes and is never copied into the complaint.

Only official sources count: the state education agency's site (`*.gov`, `*.state.*.us`, `*.k12.*`), the state's administrative-hearings office where hearings are run there, the state's published procedural safeguards notice, the state's regulations or statute. A parent-center page or a law-firm page can point you to the official one; it is not itself a source.

**Read the page's own words.** `state.json` wants quotations, and a browsing tool that summarises a page cannot supply them: run `node scripts/fetch-text.mjs <url>` (HTML or PDF; `--out <file>` to keep it; `--insecure` when the sandbox cannot verify a state site's certificate) and quote from its output. A form served as a Word file is converted with whatever the machine has (`textutil -convert txt <file>` on a Mac) and quoted from the text.

## The fields, and what a source has to say for each

Record each as `{ "value": …, "sources": ["S1", …] }`, where each `S#` is an entry in `state.sources` with `url`, `title`, `accessed` (today's date) and a short `quote` of the words that support the value.

| Field | What to establish | Where it prints |
|---|---|---|
| `seaName` | The state education agency's name as it names itself — the agency responsible for special education under IDEA (a Department of Education, of Public Instruction, a State Board), even where a separate hearings office runs the hearings | The report; the certificate of service only where the state requires a copy to the SEA (then it is also in `serviceRecipients`) |
| `captionAgency` | The body the complaint is captioned before: the SEA, or the hearings office where a separate office runs the hearings (e.g. an Office of Administrative Hearings) | The first line of the caption |
| `filesWith` | Who receives the original and who receives a copy: the SEA, the district, or the district which forwards to the SEA | The certificate of service; the report's filing instructions |
| `filingAddress` | The full mailing address for the filing (and for the SEA copy where that is separate) | The report's filing instructions |
| `channels` | Mail, hand delivery, fax, email, portal — which the state accepts, and the address, number or URL for each | The report's filing instructions |
| `limitationsMonths` | The state's window for bringing a complaint, in months (24 under 34 C.F.R. § 300.507(a)(2) unless the state has its own explicit period), and where the exceptions are stated | The limitations check on the chronology; a warning if an event is older |
| `requiredForm` | Whether the state requires its own form or a model form, and where it is. If a form is required the complaint is attached to it; say so in the report | The report's filing instructions |
| `additionalContents` | Anything the state requires a complaint to state beyond § 300.508(b) — a request for mediation or not, hearing accommodations, interpreter needs, the district's contact, the student's ID number, a statement of the resolution meeting position, and so on. An empty list is an answer, but it needs a source that shows the state's requirements were read | Section V of the complaint, one item each |
| `serviceRecipients` | Who must be served, as they should be named in the certificate: the SEA (by its name), the district's superintendent (or the office the state names), and any other recipient the state requires | The certificate of service |

Also record `notes`: anything else the person filing needs to know (resolution session timing, sufficiency challenge window, that the district's copy must go by a particular route).

## The loop

1. Load the bundled row. List the nine fields.
2. For each field: open a source, read it, write the value **as the source states it**, add the source with the quotation. Where two official sources disagree, record both and say so in `notes`. For the value: the receiving office's own filing page wins over another agency's description of it (the hearings office over the SEA's summary of the hearings office); between two pages of the same office, the newer.
3. If a field cannot be sourced — the page is down, the search finds nothing official — leave `sources` empty and write `"unverified": "why"`. Do not fill it from memory or from the bundled table alone. The complaint will be a DRAFT until it is sourced, and the report says which field.
4. Set `checkedOn` to today.
5. Run `node scripts/validate.mjs <case>` at the end: it lists every unsourced field.

## Things the state block must never do

- Name a filing address nobody opened a page for.
- Shorten or lengthen the limitations window without a source stating the state's rule.
- Invent a state form.
- Copy the bundled table's `notes` into the complaint. The table is research; the complaint carries only what was verified this run.
