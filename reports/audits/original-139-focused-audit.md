# Focused audit of 18 original S3–Ghana mappings

## Scope and method

I independently adjudicated every case in `/tmp/s3_old_focused_audit_candidates.json` against the verified lecture corpus in `/tmp/s3_lecture_texts_v2/` and the lecture identities in `index.json`. The timed-out auditor's proposals were treated only as candidates, not evidence. A correction was approved only when the verified corpus materially supported a primary, alternate, or confidence change. Mere title/rationale polish was not treated as a correction.

**Shorthand below:** `Lx` means lecture ID x; `P/A/C` means primary / alternate / confidence. “No proposal” means the incomplete auditor supplied `null`. Final mappings use canonical titles from the index.

## Decisions

### 1. `obs/33` — prevention of PPH; marked rectal misoprostol
- **Old:** P L50; A L24; high.
- **Proposal:** P L50; A L24; medium.
- **Final:** **P L50; A L24; medium — APPROVE confidence downgrade.**
- **Evidence:** L50 directly teaches third-stage PPH prophylaxis, but specifies oxytocin and limits misoprostol to oxytocin-unavailable settings (`L50_T3_17.txt:44-46`, reiterated at `448-449`). L24 supports active third-stage management with oxytocin (`L24_T2_07.txt:59-66`, `173-181`). Neither verifies the deck's 600–800 µg rectal, post-placental regimen. The lecture assignment is strong, but exact answer-level support is version-sensitive.

### 2. `obs/35` — suspected uterine rupture; immediate pelvic examination
- **Old:** P L50; no A; high.
- **Proposal:** P L50; no A; medium.
- **Final:** **P L50; no A; medium — APPROVE confidence downgrade.**
- **Evidence:** L50 gives the same rupture pattern—severe pain, sudden cessation of contractions, and rapid shock (`L50_T3_17.txt:31-35`, `157-162`). Its management is anti-shock/transfusion followed by repair or hysterectomy, not immediate pelvic examination. L38 only mentions rupture as a cause/red flag and does not improve answer-level coverage (`L38_T3_10.txt:58-62`, `256-263`).

### 3. `obs/3` — upper limit of second stage in a multipara
- **Old:** P L24; A L22; medium.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L24 defines second-stage timing by parity and gives a multiparous limit of one hour (`L24_T2_07.txt:59-60`, `134-135`); L22 likewise gives parous ≤1 hour (`L22_T2_05.txt:113-118`, `281-287`). The deck selects an older 30-minute cutoff, already captured by medium confidence. L35 also uses one hour without epidural (`L35_T2_17.txt:20-24`), so it does not justify remapping.

### 4. `obs/28` — ureteral lithiasis diagnosis
- **Old:** P L39; no A; medium.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L39 explicitly retains urinary stones in the non-gynecologic acute-abdomen differential (`L39_T3_11.txt:60-63`, `100-106`). It does not develop the flank-to-groin/hematuria pattern, so medium—not high—is appropriate. No BM25 alternative provides a more direct verified home.

### 5. `obs/29` — serum calcium after the stone diagnosis
- **Old:** P L39; no A; low.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L39 only lists urinary stones as a non-gynecologic differential (`L39_T3_11.txt:62-63`, `82-88`, `100-106`) and does not teach calcium-stone metabolic evaluation. Because this is a follow-on to `obs/28`, L39 remains the best bounded mapping, but only at low confidence.

### 6. `gyn/14` — cervical cancer stage with upper vagina and para-aortic nodes
- **Old:** P L45; no A; high.
- **Proposal:** P L45; no A; medium.
- **Final:** **P L45; no A; medium — APPROVE confidence downgrade.**
- **Evidence:** L45 directly defines IIA as upper two-thirds vaginal involvement without parametrial invasion (`L45_T3_07.txt:159-169`, `515-522`). The same verified lecture classifies para-aortic nodal disease as IIIC2 (`170-174`, `529-535`, `629-630`). Thus the marked IIA answer reflects an older clinical-staging convention and is not an unqualified exact match.

### 7. `gyn/15` — management of the same cervical-cancer case
- **Old:** P L45; no A; high.
- **Proposal:** P L45; no A; medium.
- **Final:** **P L45; no A; medium — APPROVE confidence downgrade.**
- **Evidence:** L45 supports radical hysterectomy plus pelvic nodal assessment for IB–IIA (`L45_T3_07.txt:66-71`, `177-182`, `225-228`). But its modern nodal framework makes para-aortic disease IIIC2 and favors chemoradiation for advanced disease. The marked modified-radical-hysterectomy option therefore has only version-sensitive support.

### 8. `gyn/17` — margin-negative IA1 cervical cancer; simple hysterectomy
- **Old:** P L45; no A; high.
- **Proposal:** P L45; no A; medium.
- **Final:** **P L45; no A; medium — APPROVE confidence downgrade.**
- **Evidence:** The 2-mm invasion is IA1, but L45 says margin-negative IA1 needs no further treatment; wider excision or simple hysterectomy is for involved margins (`L45_T3_07.txt:66-69`, `217-226`, `583-591`). L45 is unquestionably the right lecture, but the marked treatment is not the verified algorithm's exact answer.

### 9. `gyn/22` — 45,X/46,XY mosaicism and gonadoblastoma
- **Old:** P L4; A L48; high.
- **Proposal:** P L4; no A; high.
- **Final:** **P L4; no A; high — APPROVE removal of alternate.**
- **Evidence:** L4 explicitly links 45,X/46,XY mixed gonadal dysgenesis with gonadoblastoma risk (`L04_T1_03.txt:416-420`; removal of Y-bearing streak gonads at `505-506`). L48 surveys ovarian tumor classes but does not mention gonadoblastoma (`L48_T3_15.txt:18-20`, `78-83`). L48 is therefore not a substantive alternate.

### 10. `gyn/38` — Asherman syndrome treatment
- **Old:** P L6; A L47; high.
- **Proposal:** P L47; A L6; high.
- **Final:** **P L47; A L6; high — APPROVE primary/alternate swap.**
- **Evidence:** The question asks for treatment. L47 explicitly states that hysteroscopic adhesiolysis treats Asherman syndrome (`L47_T3_14.txt:19-23`, `42-47`, `122-128`). L6 directly supports recognition of post-D&C intrauterine adhesions (`L06_T1_06.txt:91-92`, `140-144`) but does not state the treatment. This makes L47 the materially stronger primary.

### 11. `gyn/47` — most likely complication of bicornuate uterus
- **Old:** P L4; A L30; medium.
- **Proposal:** P L30; A L4; high.
- **Final:** **P L30; A L4; high — APPROVE primary/alternate swap and confidence increase.**
- **Evidence:** L30 explicitly lists a bicornuate uterine anomaly as a predisposition to breech (`L30_T2_13.txt:72-77`). L4 establishes bicorporeal uterus as a failed-fusion anomaly with generic obstetric complications (`L04_T1_03.txt:141-145`, `348-354`) but does not identify breech. L30 directly supports the tested answer.

### 12. `gyn/28` — endometrial biopsy for suspected luteal phase defect
- **Old:** P L2; A L36; medium.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L2 teaches progesterone-driven secretory endometrium (`L02_T1_01.txt:157-166`, `201-205`) and includes an out-of-phase secretory endometrial biopsy vignette (`633-637`). L36 is a genuine broader subfertility alternate but emphasizes day-21 serum progesterone rather than biopsy (`L36_T3_01.txt:58-64`, `116-123`). Medium confidence correctly reflects partial rather than explicit diagnostic-algorithm support.

### 13. `gyn/29` — day 26 timing of that biopsy
- **Old:** P L2; A L36; medium.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L2 places the secretory/luteal phase on days 14–28 (`L02_T1_01.txt:157-166`, `223-232`) and supports cycle-based endometrial assessment, but does not explicitly specify day 26. L36 discusses day-21 serum progesterone, not late-luteal biopsy (`L36_T3_01.txt:62-64`, `126-130`). Existing medium confidence and ordering remain appropriate.

### 14. `gyn/48` — urinary anomalies associated with bicornuate uterus
- **Old:** P L4; no A; medium.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L4 directly covers bicorporeal/bicornuate failed fusion (`L04_T1_03.txt:141-145`, `348-354`). The verified corpus does not explicitly state the general Müllerian–urinary anomaly association; L4's renal-US reference is instead under 45,X/46,XY mixed gonadal dysgenesis (`416-420`). Medium confidence already captures this answer-level gap, and no better verified lecture exists.

### 15. `womens-health/19` — low ferritin as predictor of HMB
- **Old:** P L12; no A; high.
- **Proposal:** P L12; no A; low.
- **Final:** **P L12; no A; low — APPROVE confidence downgrade.**
- **Evidence:** L12 is the correct topical home and defines HMB as >80 mL (`L12_T1_12.txt:51-57`), but it does not teach low ferritin as a predictor. Instead it says ferritin is not routinely required (`73-77`, `372-383`, `553-554`). This does not make the deck's answer factual authority; the mapping is best-available but answer-level support is weak.

### 16. `womens-health/21` — high-frequency TENS for dysmenorrhea
- **Old:** P L6; no A; high.
- **Proposal:** P L6; no A; low.
- **Final:** **P L6; no A; low — APPROVE confidence downgrade.**
- **Evidence:** L6 is the clear dysmenorrhea lecture (`L06_T1_06.txt:95-109`) and expands TENS only in its abbreviation key (`48-50`). The verified text contains no claim that high-frequency TENS is effective or superior to the distractors. No alternate lecture provides direct support, so L6 remains primary at low confidence.

### 17. `womens-health/46` — warm compresses and controlled head delivery
- **Old:** P L24; no A; high.
- **Proposal:** P L24; no A; medium.
- **Final:** **P L24; no A; medium — APPROVE confidence downgrade.**
- **Evidence:** L24 has a second-stage/perineum section and teaches episiotomy technique (`L24_T2_07.txt:59-64`, `347-355`), but it does not mention warm perineal compresses or controlled delivery of the vertex. A corpus-wide search found only an irrelevant controlled delivery of the after-coming breech head in L30 (`L30_T2_13.txt:228-235`). L24 is the best topical match, not an exact one.

### 18. `womens-health/43` — 7-cm cervix and −2 station
- **Old:** P L22; A L24; medium.
- **Proposal:** No proposal.
- **Final:** **KEEP old mapping.**
- **Evidence:** L22 defines active first stage after the latent 3–4 cm period and separately defines engagement/zero station (`L22_T2_05.txt:65-70`, `113-118`). L24 explicitly defines established active labour as 4–10 cm (`L24_T2_07.txt:18-24`, `116-121`). Together they directly support “active phase” at 7 cm and “not engaged” at −2. Either ordering is defensible; no material change is warranted.

## Outcome

- **18/18 candidates adjudicated.**
- **11 approved corrections:** 8 confidence-only changes, 2 primary/alternate swaps (one with a confidence increase), and 1 unsupported-alternate removal.
- **7 mappings retained unchanged.**
- The correction JSON contains only the 11 approved material changes, each as a complete replacement mapping.
