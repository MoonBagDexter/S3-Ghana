# Adversarial audit — new Mock Exam 1 and Mock Exam 2 mappings

## Scope and method

- Audited all **33/33** question-to-lecture mappings independently against `/tmp/s3_lecture_texts_v2/index.json` and the verified lecture text files.
- Checked each primary, every proposed alternate, the supplied BM25 top eight, and all review flags.
- Deep-reviewed the required risk cases: medium-confidence mappings, BM25 rank >3/not retrieved, transverse lie, smoking, fetal HC landmarks, CVS timing, and menopause.
- Treated answer-level textual support as stronger than a neat exam/lecture partition or title-only topical similarity.
- Approved replacement objects are limited to the four materially changed cases in `/tmp/s3_mock_exam_1_2_approved_corrections.json`.

## Executive result

- **Primary changed:** Mock Exam 1 Q8 (smoking) and Mock Exam 2 Q8 (HC landmarks).
- **Metadata materially corrected with primary retained:** Mock Exam 2 Q1 (transverse lie; confidence/rationale downgraded because the keyed answer conflicts with the verified lecture algorithm).
- **Alternate materially added with primary retained:** Mock Exam 1 Q15 (multiple-pregnancy aspirin; L13 supplies the 12-week timing absent from L10).
- **All other 29 mappings retained.**
- No repository files were edited.

## Explicit test of the one-question-per-lecture partition

The submitted mappings form an exact combinatorial partition:

- Mock Exam 1: 16 distinct primaries, all Test 1, with official numbers 1–16 exactly once.
- Mock Exam 2: 17 distinct primaries, all Test 2, with official numbers 1–17 exactly once.

That pattern is **not fully supported by question content**. It appears to have forced the two Q8 mappings:

1. Mock Exam 1 Q8 was assigned to Test-1 L3 even though an exact search of `L03_T1_04.txt` finds no smoking statement; `L25_T2_08.txt:416-420` explicitly says smoking causes IUGR.
2. Mock Exam 2 Q8 was assigned to Test-2 L26 even though L26 only lists HC as generic biometry (`L26_T2_09.txt:90-93`) and contains none of *thalami*, *cavum/septum pellucidum*, or *falx*; Test-1 L3 explicitly states the answer landmarks (`L03_T1_04.txt:606-609`).

After the approved primary corrections, Mock Exam 1 has 15 Test-1 primaries plus L25 (Test 2), and Mock Exam 2 has 16 Test-2 primaries plus L3 (Test 1). The partition must therefore **not** be used as an assignment constraint.

## Mock Exam 1 — all 16 cases

| Q | Disposition | Audited mapping | Corpus evidence and adversarial finding |
|---|---|---|---|
| 1 | Retained | **L7 — Polycystic ovary syndrome** (high) | Rotterdam requires 2/3: hyperandrogenism, oligo/anovulation, or PCOM, after excluding mimics (`L07_T1_07.txt:56-65`). Normal-looking ovaries therefore do not exclude PCOS. BM25 rank 3 is a lexical artifact; the content match is exact. |
| 2 | Retained; timing scrutinized | **L5 — Prenatal screening and diagnosis** (high) | The lecture distinguishes diagnostic CVS/amniocentesis/cordocentesis (`L05_T1_05.txt:37-41`) and states CVS is **not before 10 weeks**, best at 11–14, versus amniocentesis ≥15 and cordocentesis ≥20 (`L05_T1_05.txt:85-92`, `:165-172`). Thus CVS is the only listed method available at the stem's 10-week boundary. See defect note below. |
| 3 | Retained | **L14 — Medical Diseases & Pregnancy 1** (high) | For suspected DVT, compression venous Doppler is explicitly the initial test; D-dimer is unreliable in pregnancy (`L14_T1_14.txt:105-119`, `:251-268`). |
| 4 | Retained | **L8 — Bleeding in early pregnancy** (high) | Inevitable miscarriage is open os with products not yet passed, whereas incomplete miscarriage requires partial passage (`L08_T1_08.txt:162-167`, `:195-201`, `:361-372`). The low gestational sac plus open os/heavy cramps supports inevitable miscarriage. |
| 5 | Retained | **L16 — Medical Diseases & Pregnancy 3** (high) | AFLP is a dangerous third-trimester liver disorder; distinguishing findings include hypoglycaemia and DIC/coagulopathy, with urgent stabilization and delivery (`L16_T1_16.txt:80-96`). Elevated glucose is therefore the incorrect statement. |
| 6 | Retained | **L4 — Sexual development & Puberty** (high) | Thelarche is explicitly Tanner B2 breast-bud development and the first female pubertal sign (`L04_T1_03.txt:63-75`, `:148-150`). The stem's “The larche” is a typographical defect, not a mapping issue. |
| 7 | Retained | **L2 — Menstrual cycle and reproductive endocrinology** (high) | The lecture gives E2 >200 pg/mL for about 50 hours and explains that sustained high E2 causes positive feedback and the LH surge (`L02_T1_01.txt:71-80`, `:130-139`). |
| 8 | **Primary corrected** | **L25 — Disorders of fetal growth**; alt **L3 — Preconceptional counselling and antenatal care** (medium) | `L25_T2_08.txt:416-420` explicitly states “smoking causes IUGR.” L3 contains no smoking occurrence, so it cannot remain primary merely to complete the Test-1 partition; it is retained only as a scope-level antenatal-counselling alternate. Confidence is medium because the verified corpus explicitly supports IUGR but does not directly state the keyed option's additional miscarriage component. |
| 9 | Retained | **L15 — Medical Diseases & Pregnancy 2**; alt **L3** (high) | L15 gives the standard risk-factor OGTT window as 24–28 weeks (`L15_T1_15.txt:59-71`, `:115-126`); L3 independently gives universal 24–28-week screening (`L03_T1_04.txt:108-114`). Primary and alternate are both genuine, with L15 the more specific diabetes source. |
| 10 | Retained | **L11 — Hyperemesis gravidarum** (high) | HEG is defined by protracted pregnancy vomiting with >5% prepregnancy weight loss, dehydration, and electrolyte imbalance (`L11_T1_11.txt:30-41`, `:108-116`). Option C states the key threshold. |
| 11 | Retained | **L12 — Abnormal uterine bleeding** (high) | The lecture enumerates PALM and COEIN and explicitly says pregnancy is not part of PALM-COEIN (`L12_T1_12.txt:59-74`). |
| 12 | Retained | **L6 — Amenorrhea–dysmenorrhea–PMS**; alt **L4** (high) | L6 defines hypergonadotropic hypogonadism as high FSH/LH from ovarian failure and names Turner syndrome as the commonest chromosomal cause of primary amenorrhea (`L06_T1_06.txt:69-87`, `:145-149`, `:209-219`). L4 genuinely covers 45,X streak-gonad/DSD context (`L04_T1_03.txt:457-460`, `:493-496`) but L6 is the answer-level source. |
| 13 | Retained | **L9 — Antepartum hemorrhage**; alt **L1** (high) | L9 explicitly identifies previous CS, often with placenta previa, as the most significant PAS risk (`L09_T1_09.txt:79-90`); L1 also gives the classic prior-CS + anterior-previa accreta association (`L01_T1_02.txt:638-647`). |
| 14 | Retained | **L13 — Hypertension in pregnancy** (high) | The lecture places previous severe/early preeclampsia in the major-risk column and family history, multiple pregnancy, and age ≥40 in the moderate-risk column (`L13_T1_13.txt:179-188`). The option's unqualified “previous history” is broader than the lecture wording, but A is still the intended/best mapped choice. |
| 15 | **Alternate added; primary retained** | **L10 — Multifetal gestation**; alt **L13 — Hypertension in pregnancy** (high) | Despite no BM25 top-eight retrieval, L10 explicitly lists aspirin 150 mg among antenatal drugs in multiple pregnancy (`L10_T1_10.txt:89-102`, `:143-150`). L10 does not state the start week; L13 explicitly gives aspirin from 12 weeks until birth (`L13_T1_13.txt:440-445`), so L13 is now a supported timing alternate. |
| 16 | Retained | **L1 — Fetus, placenta, membranes and amniotic fluid** (high) | Decidua basalis under the embryo forms the maternal placenta; capsularis covers the embryo and parietalis/vera lines the rest of the cavity (`L01_T1_02.txt:160-168`, `:233-240`). |

## Mock Exam 2 — all 17 cases

| Q | Disposition | Audited mapping | Corpus evidence and adversarial finding |
|---|---|---|---|
| 1 | **Confidence/rationale corrected; primary retained** | **L30 — Fetal malposition & Malpresentations**; alt **L42 — Cesarean section** (medium) | The topic match is direct, but L30 says transverse/oblique lie at term should receive a trial of ECV with stabilized induction, with CS if ECV is unsuccessful/unsuitable (`L30_T2_13.txt:65-70`, `:83-89`, `:529-540`). The stem does not state failed/declined/contraindicated ECV; therefore the keyed immediate-CS answer conflicts with the verified lecture's unqualified initial-management rule. L42 remains a genuine alternate because it lists malpresentation as a CS indication (`L42_T3_05.txt:24-30`). |
| 2 | Retained | **L33 — Urinary incontinence** (high) | Leak with cough/sneeze is stress incontinence; urgency/frequency is detrusor overactivity; mixed incontinence combines both (`L33_T2_16.txt:29-40`, `:110-117`). |
| 3 | Retained; BM25 miss scrutinized | **L21 — Benign lesions of uterus & Cervix** (high) | L21 directly covers fibroids/myomas, menorrhagia, postmenopausal sarcoma red flags, failure of medical treatment in large lesions, and hysterectomy as definitive treatment (`L21_T2_04.txt:52-80`, `:268-278`). Its absence from BM25 top eight is a terminology miss (“myoma” versus “fibroid”), not evidence against the mapping. |
| 4 | Retained | **L20 — RH isoimmunization** (high) | The lecture's ABO comparison states mother O/baby A or B, anti-A/B mainly IgM, first baby can be affected, and fetal A/B antigens are immature (`L20_T2_03.txt:42-44`, `:75-84`). Option A is exactly supported even though ABO is nested in an Rh-titled lecture. |
| 5 | Retained | **L35 — Operative vaginal delivery** (high) | Subgaleal/subaponeurotic hemorrhage is listed among classic vacuum fetal complications, contrasted with forceps injuries (`L35_T2_17.txt:39-51`, `:89-92`). |
| 6 | Retained | **L29 — Endometriosis and adenomyosis** (high) | Definitive diagnosis is laparoscopy with visualization and biopsy; the table calls laparoscopy the gold standard (`L29_T2_12.txt:27-34`, `:103-116`, `:203-211`). Among the offered choices, histopathology is the confirmatory component. |
| 7 | Retained | **L32 — Pelvic organ prolapse** (high) | DeLancey level-1 apical support is the uterosacral plus transcervical/cardinal ligaments supporting uterus and vault (`L32_T2_15.txt:26-32`, `:184-193`). Cardinal/transverse cervical is the only offered relevant support ligament. |
| 8 | **Primary corrected** | **L3 — Preconceptional counselling and antenatal care**; alt **L26 — Role of Ultrasound in obstetric** (high) | L3 explicitly says HC uses the axial plane with thalami, CSP, and falx visible (`L03_T1_04.txt:606-609`; see also `:697-701`). L26 lists HC generically among second/third-trimester biometry (`L26_T2_09.txt:90-93`) but exact searches find none of the three landmarks. L3 must therefore be primary despite being a Test-1 lecture. |
| 9 | Retained | **L18 — Infections & vaccinations in pregnancy** (high) | The GBS table gives intrapartum IV penicillin and a 60–80% risk reduction; its algorithm applies risk-factor-based intrapartum prophylaxis (`L18_T2_01.txt:59-63`, `:258-274`). |
| 10 | Retained | **L22 — Anatomy of the pelvis & mechanism of normal labor** (high) | The plane of least dimensions is explicitly the smallest plane at the ischial spines/zero station (`L22_T2_05.txt:83-92`, `:242-250`). |
| 11 | Retained | **L24 — Management of normal labour** (high) | The partogram section gives expected cervical dilatation of 1 cm/hour and the action line four hours right of the alert line (`L24_T2_07.txt:33-40`, `:305-315`). This is exact to the corpus, though the 1-cm/hour alert-line model is guideline-version sensitive. |
| 12 | Retained | **L28 — Benign diseases of the ovary** (high) | Follicular cysts are anechoic, usually asymptomatic/incidental, arise from failed atresia of a nondominant follicle, and resolve conservatively in 4–8 weeks (`L28_T2_11.txt:23-31`, `:83-94`). Routine cystectomy is therefore the non-applicable statement. |
| 13 | Retained | **L23 — Infections of the genital tract** (high) | Candidiasis is curdy white, odorless, intensely itchy/inflamed; fishy odor is a BV feature (`L23_T2_06.txt:41-55`, `:121-143`). BM25 rank 2 behind the vulval-conditions lecture is explained by shared “vulval” terms; L23 is the exact discriminating source. |
| 14 | Retained | **L25 — Disorders of fetal growth**; alt **L26** (high) | L25 uses UA Doppler in IUGR surveillance and identifies absent/reversed EDF as ominous (`L25_T2_08.txt:38-49`, `:179-188`); normal UA Doppler is therefore the only reassuring option. L26 independently links UA absent/reversed EDF with placental resistance, hypoxia, and fetal death (`L26_T2_09.txt:47-56`, `:140-150`), so the alternate is genuine. |
| 15 | Retained; menopause wording scrutinized | **L19 — Menopause** (high) | Menopause is clinically retrospective after 12 months' amenorrhea; a biochemical clue is **two** FSH values >30 IU/L at least six weeks apart with low estradiol, while osteoporosis is the key long-term hazard (`L19_T2_02.txt:44-64`, `:74-78`). D is the only defensible option, but its singular FSH phrasing is incomplete and should not replace the clinical definition. |
| 16 | Retained | **L31 — Endometrial hyperplasia and endometrial cancer** (high) | Endometrial cancer is most common in high-income countries, predominantly postmenopausal, and linked to obesity and nulliparity through unopposed estrogen (`L31_T2_14.txt:23-42`). Option A is exact. |
| 17 | Retained | **L27 — Psychosocial problems & women's health** (high) | The lecture defines vaginismus and recommends pelvic-floor therapy/PFMT with education and relaxation (`L27_T2_10.txt:43-52`, `:82-94`). Pelvic-floor exercises are the only matching therapy. |

## BM25/review-flag adjudication

- **Mock Exam 1 Q8:** original L3 was BM25 rank 6; approved L25 is rank 3 and has the only direct smoking→IUGR sentence.
- **Mock Exam 1 Q15:** L10 was absent from the BM25 top eight, but exact lecture content overrides retrieval failure; L13 was added as an alternate for the 12-week timing.
- **Mock Exam 2 Q3:** L21 was absent from the top eight, but the lecture directly covers large symptomatic/postmenopausal fibroids and hysterectomy; retained.
- **Mock Exam 2 Q8:** original L26 was rank 5 and generic only; approved L3 was BM25 rank 1 and explicitly supplies all three landmarks.
- Other lower-ranked but important matches were checked: Exam 1 Q1 L7 (rank 3), Exam 2 Q6 L29 (rank 2), and Exam 2 Q13 L23 (rank 2); all are exact content matches and were retained.

## Defects and caveats

1. **Partition-induced misassignments:** the exact one-per-Test-1/Test-2-lecture pattern is aesthetically perfect but fails content review for both Q8s.
2. **Mock Exam 2 Q1 answer-key conflict:** absent a stated ECV contraindication/failure/decline, verified L30 supports ECV + stabilized induction before CS. The mapping remains L30, but high confidence in the original rationale was not defensible.
3. **Mock Exam 1 Q8 partial corpus support:** the verified text directly supports smoking→IUGR but not the miscarriage half of the combined keyed option; medium confidence is appropriate.
4. **Mock Exam 1 Q2 boundary wording:** L5 says CVS is permissible from ≥10 weeks but “best 11–14.” The question's exact 10-week gestation is a boundary case, though CVS remains the only offered diagnostic procedure available then.
5. **Mock Exam 1 Q15 split evidence:** L10 supports aspirin as an antenatal drug in multiple pregnancy but omits the start week; L13 supplies “from 12 weeks.” Also, L13 lists multiple pregnancy as moderate rather than major risk, making universal-routine wording protocol-sensitive.
6. **Mock Exam 2 Q3 clinical framing:** age 59 plus heavy prolonged bleeding and very large/multiple “myomas” is a postmenopausal malignancy red flag. L21 still supports hysterectomy, but the case should not imply that presumed benign fibroids need no endometrial/sarcoma evaluation.
7. **Mock Exam 2 Q11 version sensitivity:** the lecture uses the classic partogram alert-line rate of 1 cm/hour. This maps exactly to the verified corpus but should not be generalized across newer labor-progress guidelines.
8. **Mock Exam 2 Q15 diagnostic phrasing:** FSH >30 IU/L alone is not the clinical definition and the lecture asks for two levels plus low estradiol; option D is merely the best available statement.
9. **Minor stem typo:** Mock Exam 1 Q6 says “The larche”; the intended term is **thelarche**.

## Output integrity

- Corrections file contains only the four approved replacement mapping objects and uses the complete mapping schema: `primary`, `alternate`, `confidence`, and `rationale`.
- Deck/question keys: `mock-exam-1` Q8/Q15 and `mock-exam-2` Q1/Q8.
