# Authorities: what may be cited, and on whose word

Read this before you research the law and draft the claims (steps 6 and 7 of `SKILL.md`). It governs every case, statute and regulation that
reaches the complaint.

One rule stands over the rest: **never write a citation, pin cite, quotation or holding you have not
confirmed in this session.** A plausible citation to a case that does not say what you said is the
one error that costs a filing its credibility, and it is the error a model makes most readily. Flag;
never guess.

## 1. The three tiers

Classify every authority before you cite it.

- **Tier 1 — listed here.** The cases in § 2 that apply to this filer, and the federal regulations
  and statutes in § 5. Cite with the pin cite given, and with no pin cite where none is given.
- **Tier 2 — read in this session.** Text the person attached or pasted, or a page you opened and
  read, in this session. May be quoted, with a pin cite. **A case citation still carries
  [VERIFY-#]** unless § 2 lists it: nothing outside the session can confirm what you read, so
  `check.mjs` refuses an unlisted reporter citation that has no flag. That is the point — the flag
  keeps the complaint a draft until the person has run the citation down themselves. Quoting a
  statute or a regulation you have read is different: source that paragraph `[@law]`, which lists
  the quotation for the audit to confirm instead of refusing it.
- **Tier 3 — everything else.** New research, a search result's summary, anything you recall.
  Cite with **[VERIFY-#]** only: no quotation, no pin cite, no description of the holding beyond
  the proposition you are citing it for. **Put the full citation in the text before the marker,
  never only inside it**, so the person can run it down.

A Tier 3 authority is promoted to Tier 2 only when its text is in front of you. A web tool's summary
of a case is not the case. Never call anything verified unless you read it here.

## 2. The cases to consider

### Binding everywhere

Always consider these. They are Tier 1 in every state and the District of Columbia.

- *Endrew F. ex rel. Joseph F. v. Douglas Cnty. Sch. Dist. RE-1*, 580 U.S. 386, 399 (2017) — the
  FAPE standard.
- *Bd. of Educ. of Hendrick Hudson Cent. Sch. Dist. v. Rowley*, 458 U.S. 176, 206–07 (1982) — the
  two-part inquiry.

Cite these two only where the person has confirmed a unilateral placement (claim 17):

- *Sch. Comm. of Burlington v. Dep't of Educ.*, 471 U.S. 359, 369–70 (1985) — reimbursement.
- *Florence Cnty. Sch. Dist. Four v. Carter*, 510 U.S. 7, 14 (1993) — a private placement need not
  meet state standards.

### Second Circuit — Connecticut, New York and Vermont only

Tier 1 for a complaint filed in those three states. **Outside them these are not binding.** You may
cite one out of circuit only as persuasive authority, only where binding authority is silent, and
only with the circuit named in the sentence so the reader sees what it is.

- *R.E. v. N.Y.C. Dep't of Educ.*, 694 F.3d 167, 186–88 (2d Cir. 2012) — an IEP is reviewed
  prospectively, as written.
- *C.F. ex rel. R.F. v. N.Y.C. Dep't of Educ.*, 746 F.3d 68 (2d Cir. 2014) — applies *R.E.*
- *L.O. ex rel. K.T. v. N.Y.C. Dep't of Educ.*, 822 F.3d 95 (2d Cir. 2016) — cumulative procedural
  violations.
- *A.M. v. N.Y.C. Dep't of Educ.*, 845 F.3d 523 (2d Cir. 2017) — an IEP contrary to the evaluative
  consensus.
- *P. ex rel. Mr. & Mrs. P. v. Newington Bd. of Educ.*, 546 F.3d 111, 120 (2d Cir. 2008) — least
  restrictive environment.
- *A.P. ex rel. Powers v. Woodstock Bd. of Educ.*, 370 F. App'x 202 (2d Cir. 2010) (summary order) —
  the materiality standard for failure to implement; **the Board prevailed on its facts**, and that
  parenthetical goes in the complaint wherever this case is cited.
- *D.S. ex rel. M.S. v. Trumbull Bd. of Educ.*, 975 F.3d 152 (2d Cir. 2020) — the scope of an
  independent educational evaluation: **a functional behavior assessment is not an evaluation under
  the IDEA, and dissatisfaction with one does not entitle a parent to a publicly funded independent
  evaluation. The Board prevailed on that holding**, and that parenthetical goes in the complaint
  wherever this case is cited. The parents prevailed only on the separate limitations question.

And these two only with a confirmed unilateral placement:

- *Frank G. v. Bd. of Educ. of Hyde Park*, 459 F.3d 356, 364–65 (2d Cir. 2006) — the appropriateness
  of the placement.
- *Gagliardo v. Arlington Cent. Sch. Dist.*, 489 F.3d 105, 112 (2d Cir. 2007) — the placement must
  meet the student's unique needs.

### Every other circuit

**This file carries no circuit cases outside the Second.** That is deliberate: an unverified
citation is worse than none. For a complaint filed anywhere else, the circuit's own law is Tier 3
until you read it — research it under § 4, cite it with **[VERIFY-#]**, and say in the Attorney
Review Notes that the circuit authority is unconfirmed.

The filer's circuit is the `circuit` field on the state's row in `references/state-rules.json`. Read
it; do not work it out from memory.

## 3. Choosing among authorities

In this order:

1. The Supreme Court of the United States.
2. The United States Court of Appeals for the filer's own circuit.
3. The federal district courts of the filer's state, and the state's own appellate courts where they
   decide special education cases.
4. The state's review officer or hearing officer decisions, cited by their own decision or appeal
   number and date, with the official link in the Attorney Review Notes. These are examples, not
   binding authority, and the complaint says so.
5. Out-of-circuit federal authority, only where everything above is silent, named as persuasive.

Avoid an authority that is outdated, overruled, vacated or superseded. You cannot run a citator, so
never imply that you have: list every case whose current validity you could not confirm for the
person's own citator check (`references/audit.md` § 3).

Do not cite a case that helps the District unless it states a rule you need. Where you do, disclose
in a parenthetical that the District or Board prevailed.

## 4. Researching the law for this complaint

Research fresh for every complaint. Do not carry an authority over from another draft, and do not
rely on an exemplar.

Research, in whatever the host gives you:

- Supreme Court decisions on the issues pleaded.
- The filer's circuit, from the `circuit` field on the state's row.
- Federal district court decisions in the filer's state.
- The state's review officer and hearing officer decisions.
- 20 U.S.C. §§ 1401, 1412, 1414, 1415 and the rest of the IDEA as the issues require.
- 34 C.F.R. part 300.
- The state's own special education statute and regulations (§ 5).

**When you cannot confirm a citation on the open web**, say so plainly and offer the person a route:

> I could not confirm this citation on a public source. If you have a legal research service —
> Lexis, Westlaw, Fastcase, vLex or Bloomberg Law — connecting it to this app would let me check
> the citation, the pin cite and whether the case is still good law. Otherwise I will cite it with
> a VERIFY flag for you to check.

Offer it once, accept the answer, and carry on either way. Where a service is connected, anything
you read through it is Tier 2. Where it is not, the authority stays Tier 3 and flagged.

If the host gives you no web access at all, say so at the handover and flag every authority outside
§ 2 with **[VERIFY-#]**. Do not quietly draft from memory.

## 5. Statutes and regulations

- Use these federal sources: 20 U.S.C. §§ 1401, 1412, 1414, 1415; 34 C.F.R. part 300.
- **Pair each federal rule with the filing state's counterpart.** Every state has its own special
  education statute and regulations, and many require more than federal law: a shorter evaluation or
  response timeline, staffing or caseload rules, extra meeting or notice requirements, a right to
  copies of records. Research the filing state's own rules, plead any the record shows were
  violated (claim 18), and cite them as that state writes them.
- **Never guess a subsection number.** Flag any subsection you have not confirmed against the
  official text with **[VERIFY-#]**.
- Do not state that a state requires something because a neighbouring state does.

### The burden of proof is a question you research, not one you assume

Who bears the burden in a due process hearing is set by federal law and can be reassigned by a
state. The Supreme Court has decided which party bears the burden of persuasion in an IDEA hearing
(*Schaffer v. Weast*), and some states place it on the school district by statute — New York, for
example, at N.Y. Educ. Law § 4404(1)(c), except on the appropriateness of a unilateral placement.

So: confirm the federal rule and the filing state's own rule on their official text before the
Jurisdiction, Timeliness, and Burden section asserts either. Until you have read the text, both are
Tier 3 — cite with **[VERIFY-#]**, no pin cite. Do not carry one state's allocation into another
state's complaint.

## 6. Where citations go, and where they do not

Put legal citations in:

- Jurisdiction, Timeliness, and Burden.
- Each claim.
- Pendency.
- Proposed Resolution.

**Put no legal citation in a factual section.** The Statement of Facts cites record documents: the
document and its date or page. A legal citation among the facts is what makes a pleading read as a
brief.

## 7. How a citation is written

- Full citation on the first reference, short form afterwards.
- Quote only Tier 2 text, and give a pin cite with the quotation.
- State no holding broader than the proposition this file lists the case for.
- Disclose in a parenthetical when a case is non-precedential (a summary order, an unpublished
  disposition) or was decided for the District or Board.
- Describe an authority's holding or outcome only if you read its text in this session. That applies
  to authorities named only in the Attorney Review Notes as well.
- Flag any case not in § 2 with **[VERIFY-#]**, whether or not you read it. For the nine circuits
  § 2 carries no case for, that is every circuit citation you write, and `check.mjs` enforces it.

No misquotations. No invented pin cites. No case cited for a proposition it does not carry.
