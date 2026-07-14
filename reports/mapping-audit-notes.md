# S3 Ghana MED422 mapping audit notes

## Final scope

- **220/220 questions** mapped across six decks.
- **50 canonical lectures** from the verified MED422 Opus corpus.
- Final confidence: **200 strong, 17 likely, 3 possible**.
- **55** questions include one genuine alternate lecture.
- The three added decks contributed **81 mappings: 76 strong, 5 likely, 0 possible**.

The app labels are inferred study guidance, not metadata supplied by the original exams.

## Evidence workflow

1. Preserved the prior 139-question mapping baseline.
2. Re-extracted the complete current six-deck inventory and all 50 verified Opus lecture texts.
3. Mapped the 81 added questions in independent deck-level passes.
4. Challenged every proposed primary against BM25 retrieval over the verified lecture corpus; retrieval was a review signal, not the final medical decision.
5. Re-audited all inherited low/medium mappings and every substantive correction candidate from the prior 139.
6. Ran independent adversarial reviews over all 81 new mappings.
7. Canonicalized every final lecture ID, Test group, official number, and exact title.
8. Enforced exact question-ID coverage and concise rationales of at most 180 characters.

For the original 139 mappings, the automated retrieval cross-check placed every primary inside the top eight verified lectures and ranked **107/139 first**. The remaining confidence and disagreement cases were manually adjudicated.

The lecture PDFs and extracted texts are not redistributed in this repository. Audit line citations refer to the deterministic local text extraction used during review; `audits/lecture-corpus-manifest.json` records the source PDF filename, extracted-text filename, character count, and SHA-256 hashes for all 50 lectures so the exact corpus can be checked or reconstructed by an authorized holder.

## Approved corrections

### Original 139-question baseline — 11

- **Obstetrics Q33:** PPH prevention mapping retained; confidence high → medium because the marked rectal misoprostol regimen is not verified in the mapped corpus.
- **Obstetrics Q35:** uterine-rupture mapping retained; confidence high → medium because the question's immediate pelvic-exam step conflicts with the verified management sequence.
- **Gynecology Q14–15:** cervical-cancer lecture retained; confidence high → medium because para-aortic nodal disease is staged differently in the verified lecture.
- **Gynecology Q17:** cervical-cancer lecture retained; confidence high → medium because the verified IA1 algorithm does not support simple hysterectomy after clear cone margins.
- **Gynecology Q22:** removed malignant-ovarian-tumors as an unsupported alternate for gonadoblastoma.
- **Gynecology Q38:** primary changed to Minimally invasive surgery; Amenorrhea became alternate because the question asks for hysteroscopic treatment of Asherman syndrome.
- **Gynecology Q47:** primary changed to Fetal malposition; Sexual development became alternate because the tested bicornuate-uterus complication is breech.
- **Final 1 Q19:** Abnormal uterine bleeding retained; confidence high → low because low ferritin as a predictor is not supported by the verified lecture.
- **Final 1 Q21:** Amenorrhea–dysmenorrhea–PMS retained; confidence high → low because the exact high-frequency TENS claim is absent.
- **Final 1 Q46:** Management of normal labour retained; confidence high → medium because warm compresses/controlled head delivery are not stated in the verified source.

### Added 81 questions — 7

- **Final 2 Q1:** primary changed to Sexual development & Puberty; Amenorrhea became alternate for the near-verbatim imperforate-hymen case.
- **Final 2 Q23:** primary changed to Preconceptional counselling and antenatal care; Ultrasound became alternate for “earliest sonographic evidence.”
- **Final 2 Q47:** PCOS replaced Subfertility as the alternate for hypothalamic low-FSH/LH amenorrhea.
- **Exam 1 Q8:** primary changed from Antenatal care to Disorders of fetal growth because the latter explicitly links smoking with IUGR.
- **Exam 1 Q15:** Hypertension in pregnancy added as an alternate because it supplies aspirin's start-from-12-weeks timing.
- **Exam 2 Q1:** transverse-lie mapping retained in Fetal malposition but downgraded to medium because the keyed immediate-CS answer omits the lecture's ECV-first qualifiers.
- **Exam 2 Q8:** primary changed from generic Ultrasound to Antenatal care because it explicitly states the HC plane and landmarks.

The Exam 1 and Exam 2 initial mappings formed a visually perfect one-question-per-Test-1/Test-2-lecture partition. The adversarial audit rejected that pattern as an assignment constraint and corrected both Q8s based on actual content.

## Important question-bank caveats

These do not invalidate the lecture tags, but they matter when studying from the keyed answers:

- **Final 2 Q12:** asks for oxygen “concentration,” while options are flow rates in L/min.
- **Final 2 Q18:** the exact Pinard/Doppler timing technique is not present in the verified corpus; topic mapping is therefore medium confidence.
- **Final 2 Q19:** the unqualified heparin statement creates possible single-best-answer ambiguity.
- **Final 2 Q22:** “vulvodynia” is absent from the verified corpus; the vulval-conditions lecture is the closest topical home.
- **Final 2 Q23:** the corpus distinguishes first visible evidence (gestational sac) from the earliest definitive sign (yolk sac).
- **Final 2 Q40:** only three options were captured.
- **Final 2 Q41:** the original item was truncated; its answer/options were reconstructed and remain marked `inferred`, although the endometriosis lecture independently supports Sampson's theory.
- **Final 2 Q43:** ovarian cancer is the clear lecture, but the exact phrase “most common route is transcoelomic” is not stated in the verified pack.
- **Exam 1 Q2:** CVS at exactly 10 weeks is a boundary case; the lecture says not before 10 weeks and best at 11–14.
- **Exam 1 Q6:** “The larche” is a typo for **thelarche**.
- **Exam 1 Q8:** the corpus directly supports smoking → IUGR but not every component of the combined keyed option.
- **Exam 2 Q1:** the answer key selects immediate cesarean without stating failed, declined, or unsuitable ECV.
- **Exam 2 Q3:** a 59-year-old with large “myomas” has postmenopausal malignancy red flags even though hysterectomy remains the best offered treatment.
- **Exam 2 Q6:** the lecture's definitive diagnosis is laparoscopy with visualization and biopsy; histopathology is only the best offered confirmatory component.
- **Exam 2 Q11:** the 1 cm/hour partogram rule is guideline-version sensitive but matches the verified lecture.
- **Exam 2 Q15:** a single FSH >30 IU/L is incomplete wording; the lecture requires two levels with low estradiol, while menopause is clinically retrospective after 12 months.
- Several inherited cervical-cancer questions use older staging/treatment framing; the lecture assignment is correct, but confidence was downgraded where the keyed answer conflicts with the restricted verified lecture.

## Full evidence

- `audits/original-139-focused-audit.md`
- `audits/final-2-audit.md`
- `audits/exam-1-2-audit.md`
- `audits/lecture-corpus-manifest.json`
- `question-to-lecture-map.md`
- `question-to-lecture-map.csv`
