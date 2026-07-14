# Final 2 lecture-mapping adversarial audit

## Scope and method

- Independently reviewed all **48/48** proposed mappings in `/tmp/s3_mock-final_audit_input.json` against the 50-file verified corpus indexed by `/tmp/s3_lecture_texts_v2/index.json`.
- Checked the proposed primary in every case, then challenged it against BM25 candidates. BM25 was treated as a retrieval signal, not as ground truth.
- Applied deeper review to all medium-confidence items, primaries below BM25 rank 3, every mapping with an alternate, and q41's inferred/reconstructed answer provenance.
- Corrections were approved only when the primary, alternate, confidence, or rationale materially needed to change.

## Mapping totals

| Measure | Result |
|---|---:|
| Questions audited | 48 |
| Approved correction records | 3 (q1, q23, q47) |
| Mapping records unchanged | 45 |
| Final high / medium / low confidence | 45 / 3 / 0 |
| Final mappings with an alternate | 17 |
| Distinct final primary lectures | 43 |
| Final primary distribution by test group | T1: 16, T2: 16, T3: 16 |

The approved-corrections JSON contains only q1, q23, and q47, each as a complete mapping record.

## Approved corrections

### q1 — switch primary and alternate

- **Approved:** primary **L4, Sexual development & Puberty**; alternate **L6, Amenorrhea–dysmenorrhea–PMS**; confidence remains high.
- **Evidence:** L4 contains an essentially verbatim case: age 14, cyclic lower abdominal pain, primary amenorrhea, and a bulging bluish introital membrane, followed by imperforate hymen as the answer and an explicit distinction from a higher transverse septum (`L04_T1_03.txt:631-643`). L6 supports the general cryptomenorrhea/outflow-obstruction category (`L06_T1_06.txt:66-68,140-143`) but is less case-specific.
- **Why material:** the proposed mapping reversed the strongest and secondary sources.

### q23 — switch primary and alternate

- **Approved:** primary **L3, Preconceptional counselling and antenatal care**; alternate **L26, Role of Ultrasound in obstetric**; confidence remains high.
- **Evidence:** L3 explicitly labels the gestational sac at 4–5 weeks as the earliest sign (`L03_T1_04.txt:91-95,223-230`) and contains the same MCQ with gestational sac as the keyed answer (`L03_T1_04.txt:448-455`). L26 gives the same 4–5–6 sequence, but separately calls the yolk sac the earliest *definitive* sign (`L26_T2_09.txt:22-29`).
- **Why material:** L3 is exact for the question's unqualified “earliest sonographic evidence” wording; BM25's rank-1 L26 remains a strong alternate but introduces a definitive-versus-first distinction.

### q47 — replace the alternate

- **Approved:** primary remains **L6, Amenorrhea–dysmenorrhea–PMS**; alternate becomes **L7, Polycystic ovary syndrome**, replacing L36 Subfertility; confidence remains medium.
- **Evidence:** L6 maps functional stress/weight-loss/exercise amenorrhea to hypothalamic low FSH/LH (`L06_T1_06.txt:151-159`). L7 independently gives “low weight/stress/exercise; LOW LH & FSH” and identifies low LH/FSH in a stressed woman as hypothalamic amenorrhea (`L07_T1_07.txt:171-177,528-534`). L36 discusses ovulation induction and body weight but does not state the low-gonadotropin stress pattern (`L36_T3_01.txt:64-70`).
- **Why material:** L7 directly supports the tested physiology and is a substantively stronger alternate. Confidence stays medium because none of the corpus files explicitly uses the question's “WHO Class I” label.

## Scrutinized but retained

### Explicit priority flags retained

| Q | Challenge | Corpus evidence and decision |
|---:|---|---|
| 4 | Primary L30 was BM25 rank 4. | **Retain L30 high.** It directly states brow = mento-vertical 13.5 cm, the largest diameter (`L30_T2_13.txt:49-55`). L22 also states the measurement (`L22_T2_05.txt:57-60`) and remains an appropriate anatomy alternate. The higher BM25 hits were driven by generic labour wording. |
| 16 | Primary L7 was BM25 rank 6. | **Retain L7 high.** The dedicated PCOS lecture explicitly gives oligo/amenorrhea as the menstrual presentation (`L07_T1_07.txt:120-126`) and defines oligo-/anovulation in the Rotterdam framework (`L07_T1_07.txt:57-64`). Lexical ranking was misleading. |
| 18 | Medium confidence; exact auscultation technique challenged. | **Retain L24 medium.** L24 is the corpus's direct intrapartum fetal-surveillance source and contrasts intermittent auscultation with CTG (`L24_T2_07.txt:42-58,141-152`). It does not state the Pinard/Doppler, simultaneous maternal pulse, one-minute, or post-contraction details, so medium—not high—remains appropriate. |
| 22 | Medium confidence; vulvodynia term challenged globally. | **Retain L46 medium.** A corpus-wide search found no occurrence of “vulvodynia.” L46 is nevertheless the closest dedicated benign vulval-conditions lecture and covers noninfectious burning/pain syndromes (`L46_T3_13.txt:36-43,56-63`). The existing rationale already correctly describes it as the closest source rather than claiming an explicit definition. |

q47 was the fifth explicit priority flag and is corrected above rather than retained unchanged.

### Alternate-bearing mappings retained unchanged

| Q | Decision and evidence |
|---:|---|
| 2 | **Retain L50 primary / L49 alternate.** L50 gives the atony ladder through tamponade before surgery (`L50_T3_17.txt:40-44`); L49 is only the broader maternal-collapse/haemorrhage source (`L49_T3_16.txt:15-18,34-48`). |
| 3 | **Retain L44 / L43.** L44 explicitly states POP is safe in breastfeeding (`L44_T3_06.txt:50-57`); L43 covers postpartum breastfeeding and contraceptive counselling generally (`L43_T3_12.txt:17-25,54-56`). |
| 4 | **Retain L30 / L22.** Both directly support brow/13.5 cm, with malpresentation more directly framing the clinical presentation (`L30_T2_13.txt:49-67`; `L22_T2_05.txt:57-60`). |
| 10 | **Retain L19 / L27.** Both state brain fog with memory/cognitive complaints (`L19_T2_02.txt:68-72`; `L27_T2_10.txt:68-74`); the dedicated menopause lecture remains the better primary. |
| 13 | **Retain L10 / L26.** L10 teaches T sign = monochorionic and links the day-4–8 split to MCDA (`L10_T1_10.txt:41-48,80-84`); L26 independently maps the T sign to monochorionic twins (`L26_T2_09.txt:64-68,126-130`). |
| 17 | **Retain L32 / L19.** L32 directly combines menopausal vaginal oestrogen with first-line ring pessary management (`L32_T2_15.txt:79-88`); L19 supports vaginal atrophy/oestrogen and notes prolapse (`L19_T2_02.txt:118-122,470-471`). |
| 26 | **Retain L39 / L28.** L39 gives unilateral colicky pain with vomiting as the torsion presentation (`L39_T3_11.txt:50-55`); L28 covers acute pain/nausea-vomiting and emergency detorsion (`L28_T2_11.txt:36-43`). |
| 31 | **Retain L37 / L4.** L37 explicitly calls GnRH analogues the treatment of choice for central precocious puberty (`L37_T3_02.txt:61-66`); L4 also supports GnRH analogue treatment (`L04_T1_03.txt:439-446`). |
| 32 | **Retain L35 / L30.** L35 places brow/mentoposterior face among operative-vaginal contraindications while noting forceps can deliver an after-coming breech head (`L35_T2_17.txt:84-87,109-115`). L30 explains why persistent brow cannot engage (`L30_T2_13.txt:63-67`). |
| 33 | **Retain L40 / L14.** L40 directly lists coagulation disorders/low platelets as neuraxial contraindications (`L40_T3_03.txt:14-18`); L14 gives the platelet threshold for avoiding spinal/epidural (`L14_T1_14.txt:80-90`). |
| 40 | **Retain L38 / L50.** L38 directly identifies severe moulding plus caput as obstructive/CPD findings (`L38_T3_10.txt:50-52,168-175`). L50 is a valid broader obstructed-labour alternate (`L50_T3_17.txt:26-29,53-64`). |
| 42 | **Retain L37 / L4.** L37 says CAH is the commonest 46XX DSD and 21-hydroxylase deficiency is the commonest CAH defect (`L37_T3_02.txt:38-47`); L4 independently states CAH/46XX ambiguous genitalia (`L04_T1_03.txt:110-119`). |
| 44 | **Retain L28 / L39.** L28 explicitly states corpus-luteum cyst bleeding/rupture can cause haemoperitoneum and acute abdomen (`L28_T2_11.txt:24-31,85-92`); L39 supports progression to haemoperitoneum, syncope, and shock (`L39_T3_11.txt:47-55`). |
| 48 | **Retain L7 / L36.** L7 makes lifestyle with 5–10% weight loss the first step and then places fertility drugs/surgery later (`L07_T1_07.txt:91-95,133-137`). L36 remains a useful subfertility alternate for the later ovulation-induction options (`L36_T3_01.txt:64-70,107-110`). |

q1 and q23 remain alternate-bearing after their primary/alternate swaps, and q47 remains alternate-bearing after replacement; all three are documented under approved corrections.

### q41 inferred-answer scrutiny

- **Retain L29, high confidence, no alternate.** The lecture's aetiology tree labels retrograde menstruation/implantation as the classic theory and separately lists coelomic, genetic/immunological, and vascular/lymphatic theories (`L29_T2_12.txt:57-65`). This directly supports Sampson's implantation theory as the reconstructed answer.
- The mapping is strong even though the exam-item provenance is not: the input states that q41's original capture was truncated and that its options/key were reconstructed (`s3_mock-final_audit_input.json:960-980`). This is recorded as a source defect below.

## Routine retained mappings

The remaining 27 mappings were also checked against their proposed primary source and BM25 challengers; none materially required a mapping-field change:

**q5, q6, q7, q8, q9, q11, q12, q14, q15, q19, q20, q21, q24, q25, q27, q28, q29, q30, q34, q35, q36, q37, q38, q39, q43, q45, q46.**

Representative direct anchors include symmetric IUGR/chromosomal causes (`L25_T2_08.txt:29-34`), atypical hyperplasia/TAH+BSO (`L31_T2_14.txt:82-88`), hydronephrosis/IIIB (`L45_T3_07.txt:167-174`), HCV/HIV transmission (`L16_T1_16.txt:63-75`), PAS delivery timing (`L09_T1_09.txt:79-91`), oocyte lifespan (`L01_T1_02.txt:53-61`), post-term NST+AFI surveillance (`L41_T3_04.txt:34-40`), parvovirus fetal anaemia (`L18_T2_01.txt:39-45`), and robotic acquisition/maintenance cost (`L47_T3_14.txt:52-59`).

## Source and item defects / limitations

1. **q12 unit wording:** the stem asks for an oxygen “concentration,” but every option is a flow rate in L/min. L49 specifies high-flow oxygen at 15 L/min (`L49_T3_16.txt:45-48,135-140`), so the mapping is unaffected.
2. **q18 coverage gap:** no corpus file contains the exact Pinard/Doppler, simultaneous maternal-pulse, one-minute, or contraction-timing rule tested by the item. L24 supports the topic but not the keyed technique detail; medium confidence is appropriate.
3. **q19 possible single-best-answer ambiguity:** the item asks for one incorrect statement. D (“crisis risk is reduced”) is clearly intended as false, but C's unqualified “prophylactic heparin is indicated in pregnancy” can also read as routine antenatal prophylaxis. The mapped lecture's explicit SCD statement is LMWH for six weeks postpartum (`L14_T1_14.txt:70-78`), so C needs qualification by risk/admission context. This does not change the SCD lecture mapping.
4. **q22 corpus omission:** “vulvodynia” does not occur anywhere in the verified corpus. L46 is a topical nearest-neighbour mapping, not an explicit answer source.
5. **q23 terminology split:** L26 distinguishes the first visible structure (gestational sac) from the earliest *definitive* sign (yolk sac) (`L26_T2_09.txt:22-29`). The item says only “evidence,” which is why the exact L3 wording is now primary.
6. **q40 incomplete option set:** the input contains only A–C, unlike the surrounding four-option items. This is an item-capture defect, not a mapping defect.
7. **q41 reconstructed source:** the original exam capture was truncated; its full options and answer key are inferred/reconstructed. The lecture supports the inference, but answer provenance should remain marked inferred.
8. **q43 explicit-answer gap:** L48 is unquestionably the dedicated epithelial ovarian-cancer source and shows abdominal-peritoneal stage III disease (`L48_T3_15.txt:116-125`) plus omental deposits in work-up, but it never explicitly states the phrase “most common route is transcoelomic.” The high-confidence topic mapping is retained; the exact answer statement is not directly quoted in the corpus.

## Conclusion

Approved exactly three material mapping corrections: q1 and q23 receive stronger exact-match primaries, and q47 receives a physiologically relevant alternate. All other mappings are retained. No repository files were edited.
