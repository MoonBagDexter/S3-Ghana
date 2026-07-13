#!/usr/bin/env python3
"""Generate the digitized MED422 exam answer documents.

Single source of truth for:
  - mcq-answers.md   / mcq-answers.pdf   (MCQs with boxed answer + rationale)
  - saq-answers.md   / saq-answers.pdf   (written cases: blank paper + model answers)

Markdown is written for the future website build; the PDFs are rendered from the
same data via python-markdown -> HTML -> headless Chromium print-to-pdf.
"""
import html
import json
import subprocess
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

# --------------------------------------------------------------------------- #
#  MCQ DATA
#  Each item: (number, question, [options], answer_letter, correct_reason,
#              {letter: wrong_reason})
#  Options are listed verbatim; letters carry their original text.
# --------------------------------------------------------------------------- #

MCQ = [
    (1, "What is the fertilizable lifespan of the human sperm?",
     ["A. 6–8 hours", "B. 12–14 hours", "C. 48–72 hours", "D. 72–96 hours"],
     "C",
     "Once in the female reproductive tract, sperm retain the ability to fertilize an oocyte for about 48–72 hours (though some survive longer). This is the standard figure paired with the ~12–24 hour fertilizable lifespan of the ovum.",
     {"A": "6–8 hours is far too short; this underestimates sperm survival in cervical mucus.",
      "B": "12–14 hours is closer to the fertilizable lifespan of the ovum, not the sperm.",
      "D": "72–96 hours overstates the reliable fertilizing window; survival beyond 72 hours occurs but fertilizing capacity is classically quoted at 48–72 hours."}),

    (2, "Which of the following is the correct sequence of events during implantation?",
     ["A. Hatching → Adhesion → Invasion → Decidualization",
      "B. Adhesion → Hatching → Invasion → Decidualization",
      "C. Decidualization → Hatching → Adhesion → Invasion",
      "D. Hatching → Invasion → Adhesion → Decidualization"],
     "A",
     "The blastocyst first hatches from the zona pellucida, then apposes/adheres to the endometrium, then the trophoblast invades, and the surrounding stroma undergoes decidualization.",
     {"B": "Adhesion cannot precede hatching — the blastocyst must escape the zona pellucida first.",
      "C": "Decidualization is a response of the endometrial stroma to the implanting embryo, so it cannot come first.",
      "D": "Invasion must follow adhesion, not precede it; the embryo has to attach before the trophoblast can invade."}),

    (3, "What is the primary risk associated with smoking during pregnancy?",
     ["A. Increased risk of miscarriage and IUGR",
      "B. Increased risk of gestational diabetes",
      "C. Increased risk of preeclampsia",
      "D. Increased risk of venous thromboembolism"],
     "A",
     "Carbon monoxide and nicotine reduce uteroplacental perfusion and oxygen delivery, producing intrauterine growth restriction, and smoking raises the risk of miscarriage, abruption, preterm birth and stillbirth.",
     {"B": "Smoking is not a recognised risk factor for gestational diabetes.",
      "C": "Smoking is actually associated with a slightly reduced risk of preeclampsia (though this does not make it protective — overall harm is high).",
      "D": "VTE risk is driven by pregnancy itself, immobility, obesity and thrombophilia, not primarily by smoking."}),

    (4, "What is the primary mechanism by which progesterone affects respiratory function during pregnancy?",
     ["A. It increases tidal volume",
      "B. It acts on the respiratory center to increase sensitivity to CO2",
      "C. It decreases functional residual capacity",
      "D. It elevates the diaphragm"],
     "B",
     "Progesterone sensitizes the central respiratory centre to CO2, driving the increase in minute ventilation and the mild compensated respiratory alkalosis of pregnancy.",
     {"A": "Increased tidal volume is the RESULT of the heightened respiratory drive, not the mechanism itself.",
      "C": "Reduced FRC is caused by the enlarging uterus elevating the diaphragm — a mechanical effect, not progesterone's action.",
      "D": "Diaphragmatic elevation is mechanical (the growing uterus), not a progesterone effect on respiration."}),

    (5, "Which of the following antiepileptic drugs have the highest risk of congenital anomalies?",
     ["A. Sodium valproate", "B. Lamotrigine", "C. Carbamazepine", "D. Phenytoin"],
     "A",
     "Sodium valproate carries the highest teratogenic risk of the common antiepileptics — neural tube defects, cardiac and craniofacial anomalies, and dose-related neurodevelopmental impairment — and is avoided in women of childbearing potential.",
     {"B": "Lamotrigine is one of the SAFER antiepileptics in pregnancy, with comparatively low malformation rates.",
      "C": "Carbamazepine is teratogenic (neural tube defects) but distinctly less so than valproate.",
      "D": "Phenytoin causes fetal hydantoin syndrome but its overall malformation risk is lower than valproate's."}),

    (6, "Which is the most common cause of hyperthyroidism in pregnancy?",
     ["A. Toxic multinodular goitre", "B. Thyroid adenoma",
      "C. Grave's disease", "D. Gestational transient hyperthyroidism"],
     "C",
     "Graves' disease is the most common cause of true (autoimmune) hyperthyroidism in pregnancy, caused by TSH-receptor stimulating antibodies. Note: if transient/biochemical cases are counted, gestational transient hyperthyroidism (option D, hCG-mediated) is the most common cause overall — confirm which definition your course uses.",
     {"A": "Toxic multinodular goitre is an uncommon cause in the reproductive age group.",
      "B": "A solitary toxic adenoma is a rare cause of hyperthyroidism in pregnancy.",
      "D": "Gestational transient hyperthyroidism (hCG cross-stimulation of the TSH receptor, often with hyperemesis) is very common and self-limiting — this is the strongest distractor and is the answer if your syllabus counts transient cases; Graves' remains the most common persistent/pathological cause."}),

    (7, "At which gestational age should a pregnant woman with well controlled gestational diabetes be delivered?",
     ["A. 39–40+6 weeks gestation", "B. 37–38+6 weeks gestation",
      "C. 36–37+6 weeks gestation", "D. 35–36+6 weeks gestation"],
     "A",
     "For gestational diabetes that is well controlled (diet-controlled, no fetal or maternal complications), delivery is advised around 39–40+6 weeks — no later than 40+6 (NICE).",
     {"B": "37–38+6 weeks is reserved for less well controlled diabetes or where complications exist.",
      "C": "36–37+6 weeks is too early for well-controlled disease and risks iatrogenic prematurity.",
      "D": "35–36+6 weeks would only be considered for significant maternal/fetal compromise, not well-controlled GDM."}),

    (8, "When is the dating scan and first trimester screening tests best performed?",
     ["A. 9 and 11 weeks gestation", "B. 11 and 13 weeks gestation",
      "C. 13 and 15 weeks gestation", "D. 15 and 17 weeks gestation"],
     "B",
     "The combined test / dating scan (including nuchal translucency) is performed between 11+0 and 13+6 weeks, when the crown–rump length is 45–84 mm.",
     {"A": "9–11 weeks is too early — the NT measurement and CRL window are not yet reliable.",
      "C": "13–15 weeks is past the upper limit for the combined first-trimester test.",
      "D": "15–17 weeks falls in the window for the second-trimester quadruple test, not first-trimester screening."}),

    (9, "Which maternal factor carries a high risk of preeclampsia?",
     ["A. Multiple pregnancy", "B. Age > 40 years",
      "C. Family history of preeclampsia", "D. Previous history of preeclampsia"],
     "D",
     "A previous history of pre-eclampsia (or previous hypertensive disease in pregnancy) is a HIGH-risk factor warranting aspirin prophylaxis on its own.",
     {"A": "Multiple pregnancy is a MODERATE-risk factor.",
      "B": "Age > 40 years is a MODERATE-risk factor.",
      "C": "Family history of pre-eclampsia is a MODERATE-risk factor; only when several moderate factors combine do they mandate prophylaxis."}),

    (10, "A 24 year old primigravida at 17 weeks gestation attends for routine antenatal care. On performing a second trimester quadruple screen, alpha fetoprotein (AFP) was significantly elevated, whereas hCG, oestriol and inhibin A levels were within normal limits. An ultrasound scan was ordered for further evaluation. Which of the following is the most likely explanation for elevated AFP?",
     ["A. Open neural tube defect", "B. Trisomy 18", "C. Down syndrome", "D. Omphalocele"],
     "A",
     "An isolated rise in AFP with normal hCG, oestriol and inhibin A points to an open neural tube defect (or another open fetal defect), where AFP leaks into the amniotic fluid and maternal circulation.",
     {"B": "Trisomy 18 characteristically produces LOW AFP, hCG and oestriol.",
      "C": "Down syndrome shows low AFP and oestriol with high hCG and inhibin A — not an isolated AFP rise.",
      "D": "An omphalocele is covered by a membrane, so it raises AFP far less than an open defect; gastroschisis (uncovered) would, but that is not offered."}),

    (11, "Which of the following is a non-invasive prenatal test (NIPT)?",
     ["A. Chorionic villous sampling", "B. Cell free fetal DNA testing",
      "C. Amniocentesis", "D. Fetal blood sampling"],
     "B",
     "NIPT analyses cell-free fetal DNA from a maternal blood sample, carrying no procedure-related risk to the pregnancy.",
     {"A": "Chorionic villus sampling is invasive and carries a miscarriage risk.",
      "C": "Amniocentesis is invasive, sampling amniotic fluid through the abdominal wall.",
      "D": "Fetal blood sampling (cordocentesis) is invasive and the highest-risk of these procedures."}),

    (12, "Which of the following is used to detect structural fetal abnormalities most effectively?",
     ["A. Quadruple test", "B. NIPT",
      "C. Level II ultrasound (fetal anomaly scan)", "D. PAPP-A test"],
     "C",
     "The Level II (detailed anatomy / fetal anomaly) ultrasound at 18–20+6 weeks is the test that directly visualises and detects structural malformations.",
     {"A": "The quadruple test is a biochemical screen for aneuploidy and open NTDs, not a structural assessment.",
      "B": "NIPT screens for chromosomal aneuploidy from cell-free DNA; it does not image structure.",
      "D": "PAPP-A is a first-trimester serum marker used in aneuploidy risk calculation, not structural detection."}),

    (13, "Which of the following is a common presentation of missed miscarriage?",
     ["A. Severe colicky pain.", "B. Heavy vaginal bleeding with blood clots.",
      "C. Passage of conceptus tissue.", "D. No symptoms or minimal spotting."],
     "D",
     "A missed miscarriage is typically silent — the fetus has died but is retained, so the woman is often asymptomatic or has only minor spotting, and it is frequently discovered incidentally on ultrasound.",
     {"A": "Severe colicky pain suggests an inevitable or incomplete miscarriage with cervical dilatation.",
      "B": "Heavy bleeding with clots is characteristic of an incomplete or inevitable miscarriage.",
      "C": "Passage of products of conception describes an incomplete or complete miscarriage, not a missed one."}),

    (14, "A 30-year-old G2P1 woman at 7-week gestation presents with sudden onset of sharp, unilateral lower abdominal pain and light vaginal spotting. Her vital signs are: BP 100/60 mm Hg and heart rate 110 bpm. On examination she has right adnexal tenderness and closed cervical os. Serum b-hCG is 1200 mIU/ml. Transvaginal ultrasound shows no intrauterine gestational sac with a 2 cm right adnexal mass. What is the most appropriate next step?",
     ["A. Expectant management with repeat B-hCG in one week.", "B. Methotrexate therapy",
      "C. Urgent diagnostic laparoscopy", "D. Uterine curettage"],
     "C",
     "This is a symptomatic ectopic pregnancy with an adnexal mass and signs of haemodynamic compromise (tachycardia, borderline BP, acute sharp pain suggesting possible rupture). Urgent diagnostic laparoscopy is both diagnostic and therapeutic and is the safe choice when the patient is not clearly stable.",
     {"A": "Expectant management needs an asymptomatic, stable patient with low and falling hCG — she is symptomatic and tachycardic.",
      "B": "Methotrexate requires a haemodynamically STABLE patient with no rupture; her tachycardia and acute pain make medical management unsafe despite the favourable hCG and mass size.",
      "D": "Uterine curettage treats an intrauterine process and has no role in managing a tubal ectopic."}),

    (15, "Which of the following is a characteristic of complete molar pregnancy?",
     ["A. Serum b-hCG levels are usually low",
      "B. Arises from fertilization of an empty ovum by one sperm that duplicates its DNA.",
      "C. Presence of fetal tissue",
      "D. Associated with 69XXY karyotype"],
     "B",
     "A complete mole arises when an empty ovum (no maternal DNA) is fertilized by one sperm that duplicates (46,XX) or by two sperm; all genetic material is paternal and no fetal tissue forms.",
     {"A": "β-hCG is characteristically VERY HIGH in a complete mole, not low.",
      "C": "A complete mole contains no fetal tissue; fetal parts point to a partial mole.",
      "D": "69,XXY (triploid) is the karyotype of a PARTIAL mole; a complete mole is diploid (46,XX or 46,XY)."}),

    (16, "Which of the following is NOT a characteristic feature of the endometrium in a normal menstrual cycle?",
     ["A. Appearance of highly coiled endometrial glands is under the influence of progesterone",
      "B. Subnuclear vacuoles are seen in endometrial cells before ovulation.",
      "C. The superficial layer of the endometrium consists of stratum compactum and stratum spongiosum.",
      "D. Triple line sign of the endometrium on ultrasound is characteristic of periovulation"],
     "B",
     "This is the incorrect statement. Subnuclear (basal) vacuoles are the earliest histological evidence of ovulation and appear AFTER ovulation, in the early secretory phase (around days 16–17) — not before it.",
     {"A": "True — progesterone in the secretory phase produces coiled, tortuous glands.",
      "C": "True — the functional layer comprises the stratum compactum and stratum spongiosum.",
      "D": "True — the triple-line (trilaminar) endometrium is seen around the periovulatory/late proliferative phase."}),

    (17, "What is the oestradiol concentration and duration needed to initiate a luteinizing hormone surge?",
     ["A. 50 pg/ml for 48 hrs", "B. 100 pg/ml for 12 hrs",
      "C. 200 pg/ml for 24 hrs", "D. 200 pg/ml for 50 hrs"],
     "D",
     "Positive feedback triggering the LH surge requires a sustained oestradiol concentration of roughly ≥200 pg/ml maintained for about 50 hours.",
     {"A": "50 pg/ml is below the threshold and would exert negative, not positive, feedback.",
      "B": "100 pg/ml for only 12 hours is insufficient in both level and duration.",
      "C": "200 pg/ml reaches the threshold concentration but 24 hours is too short to switch feedback to positive."}),

    (18, "Which of the following best describes the two-cell theory of ovarian steroidogenesis?",
     ["A. LH stimulates theca cells to produce oestradiol.",
      "B. FSH stimulates granulosa cells to secrete androstenedione",
      "C. It describes the action of FSH and LH on granulosa and theca cells respectively.",
      "D. It describes the action of FSH and LH on theca cells and granulosa cells respectively."],
     "C",
     "In the two-cell, two-gonadotropin model, FSH acts on granulosa cells and LH acts on theca cells — i.e. FSH and LH act on granulosa and theca cells respectively. LH drives thecal androgen production; FSH drives granulosa aromatization of those androgens to oestradiol.",
     {"A": "Theca cells produce androgens (androstenedione) under LH, not oestradiol.",
      "B": "Granulosa cells secrete oestradiol under FSH; androstenedione comes from theca cells.",
      "D": "This reverses the pairing — it wrongly assigns FSH to theca and LH to granulosa."}),

    (19, "Which of the following is predictive of heavy menstrual bleeding?",
     ["A. Clots ≥ 1 cm in diameter", "B. Flooding",
      "C. Change of pad or tampon every 4 hours", "D. Low ferritin levels"],
     "D",
     "Low ferritin is the objective marker independently associated with measured menstrual blood loss > 80 ml — it reflects the iron depletion caused by chronic heavy loss. (Passing large clots and flooding are also recognised predictors, but low ferritin is the objective laboratory one here.)",
     {"A": "The validated clot threshold is > 1 inch (~2.5 cm), not ≥ 1 cm, so this option understates the size.",
      "B": "Flooding is a genuine predictor, but it is a subjective symptom; the objective predictor offered is low ferritin.",
      "C": "Changing protection every 4 hours is within the normal range; predictive flooding means changing more often than hourly."}),

    (20, "Which of the following symptoms might suggest a hypothalamic or pituitary disorder in a patient with amenorrhea?",
     ["A. Acne and hirsutism", "B. Galactorrhea, headaches, or visual field defects",
      "C. Menstrual periods lasting less than 2 days", "D. Vasomotor symptoms like hot flashes or night sweats"],
     "B",
     "Galactorrhoea, headaches and visual field defects point to a pituitary lesion (e.g. a prolactinoma compressing the optic chiasm) as the cause of amenorrhoea.",
     {"A": "Acne and hirsutism indicate hyperandrogenism (e.g. PCOS), an ovarian/adrenal problem.",
      "C": "Short periods relate to endometrial or outflow factors, not a hypothalamic–pituitary cause.",
      "D": "Hot flushes and night sweats suggest an ovarian (oestrogen-deficient/menopausal) cause."}),

    (21, "Which of the following non-pharmacologic therapies is supported by evidence for treating dysmenorrhea?",
     ["A. High-frequency transcutaneous electrical nerve stimulation", "B. Ice packs",
      "C. Aromatherapy", "D. Acupuncture"],
     "A",
     "High-frequency TENS has the best evidence among non-pharmacological options for reducing primary dysmenorrhoea pain.",
     {"B": "Local HEAT (not ice) helps dysmenorrhoea; ice packs are not supported.",
      "C": "Aromatherapy has weak, inconsistent evidence.",
      "D": "Evidence for acupuncture in dysmenorrhoea is limited and mixed compared with high-frequency TENS."}),

    (22, "A 15 year old girl presents with primary amenorrhea and well developed breasts, but no pubic or axillary hair. Pelvic ultrasound shows no uterus. What is the most likely diagnosis?",
     ["A. Turner syndrome", "B. Complete androgen insensitivity syndrome",
      "C. Pure gonadal dysgenesis", "D. Congenital adrenal syndrome"],
     "B",
     "Complete androgen insensitivity (46,XY) gives well-developed breasts (testosterone is aromatized to oestrogen), absent/scanty pubic and axillary hair (androgen receptors are non-functional), and an absent uterus (testicular anti-Müllerian hormone regressed the Müllerian ducts).",
     {"A": "Turner syndrome (45,X) causes short stature and streak gonads with POOR breast development and a present (though often infantile) uterus.",
      "C": "Pure gonadal dysgenesis gives streak gonads with poor secondary sexual development but a uterus IS present.",
      "D": "Congenital adrenal hyperplasia causes virilisation/ambiguous genitalia with a uterus present, not this picture."}),

    (23, "What is the correct sequence of pubertal events in girls?",
     ["A. Thelarche, pubarche, growth spurt, menarche",
      "B. Growth spurt, thelarche, menarche, pubarche",
      "C. Thelarche, menarche, pubarche, growth spurt",
      "D. Growth spurt, menarche, thelarche, pubarche"],
     "A",
     "In girls, puberty proceeds thelarche (breast budding) → pubarche (pubic hair) → peak growth spurt → menarche, which occurs late in the sequence.",
     {"B": "The growth spurt does not come first in girls; thelarche is the first sign.",
      "C": "Menarche comes near the end, not directly after thelarche.",
      "D": "Menarche is a late event; it cannot precede thelarche and the growth spurt."}),

    (24, "A 21 year old primigravida at 36 weeks gestation presents to the emergency department complaining of severe headache and blurring of vision. On examination, there is lower limb oedema, BP: 160/110 and urine dipstick +3 for proteins. What is the most appropriate management for this patient?",
     ["A. Methyl dopa and outpatient management",
      "B. Hospital admission for bed rest, corticosteroids and observation",
      "C. Hospital admission, antihypertensives and follow up till spontaneous labour",
      "D. Admit to hospital, magnesium sulphate, antihypertensives and termination of pregnancy."],
     "D",
     "She has severe pre-eclampsia with neurological symptoms (severe headache, visual disturbance) at 36 weeks. Management is admission, magnesium sulphate for seizure prophylaxis, antihypertensives, and delivery — the definitive treatment at this gestation.",
     {"A": "Severe pre-eclampsia with symptoms cannot be managed as an outpatient on methyldopa alone.",
      "B": "Corticosteroids for lung maturity add little at 36 weeks, and mere observation ignores the need for magnesium and delivery.",
      "C": "Expectant follow-up to spontaneous labour is unsafe with severe-range BP and symptoms; delivery is indicated."}),

    (25, "Which of the following IV medications is used to treat respiratory depression that may accompany magnesium sulphate toxicity?",
     ["A. Calcium gluconate", "B. Epinephrine", "C. Atropine", "D. Frusemide"],
     "A",
     "Calcium gluconate is the antidote to magnesium sulphate toxicity; calcium directly antagonises magnesium at the neuromuscular junction, reversing respiratory depression.",
     {"B": "Epinephrine is for anaphylaxis/cardiac arrest, not magnesium toxicity.",
      "C": "Atropine treats bradycardia and cholinergic effects, not magnesium overdose.",
      "D": "Frusemide is a diuretic; it does not reverse the neuromuscular effects of magnesium."}),

    (26, "In a patient with severe preeclampsia, what is the main reason for visual symptoms and severe persistent headache?",
     ["A. Partial embolic occlusion", "B. Intense vasospasm",
      "C. Demyelination of the optic nerve", "D. Infarcts"],
     "B",
     "The cerebral and retinal manifestations of severe pre-eclampsia are driven by intense arteriolar vasospasm (with endothelial dysfunction and vasogenic oedema), producing headache and visual disturbance.",
     {"A": "Embolic occlusion is not the mechanism of pre-eclamptic visual/headache symptoms.",
      "C": "Optic nerve demyelination describes optic neuritis, unrelated to pre-eclampsia.",
      "D": "Established infarcts are a late complication, not the main reason for the reversible symptoms."}),

    (27, "A pregnant woman at 34 weeks' gestation develops marked pruritis especially on her palms and soles, with mildly increased liver enzymes and elevated bile acids. Which of the following diagnostic possibilities is consistent with this clinical picture?",
     ["A. Pancreatitis", "B. Intrahepatic cholestasis of pregnancy",
      "C. Acute fatty liver", "D. Atopic dermatitis"],
     "B",
     "Pruritus of the palms and soles without a rash, with raised bile acids and mildly deranged transaminases in the third trimester, is the classic picture of intrahepatic cholestasis of pregnancy.",
     {"A": "Pancreatitis presents with epigastric pain and very high amylase/lipase, not isolated pruritus.",
      "C": "Acute fatty liver of pregnancy causes marked systemic illness (vomiting, hypoglycaemia, coagulopathy), not isolated itching with elevated bile acids.",
      "D": "Atopic dermatitis produces a visible rash; the hallmark here is itching WITHOUT a primary skin lesion plus elevated bile acids."}),

    (28, "A 32 year old primigravida is admitted in spontaneous labour at 39 weeks gestation. She is a known asthmatic and had repeated admissions with acute exacerbations. The last admission was at 36 weeks where she was commenced on oral prednisolone 7.5 mg/day in view of the poor asthmatic control. Which of the following is the most appropriate intervention to maintain asthma control during labour?",
     ["A. Continuous oxygen by face mask", "B. Refer to respiratory physician",
      "C. Regular inhaled long acting β2 agonist along with her current medications",
      "D. 100 mg parenteral hydrocortisone 6–8 hourly during labour."],
     "D",
     "A woman on ≥ 7.5 mg/day of oral prednisolone for over two weeks has hypothalamic–pituitary–adrenal suppression and needs parenteral hydrocortisone (e.g. 100 mg 6–8 hourly) to cover the stress of labour and prevent an adrenal crisis.",
     {"A": "Oxygen is given only if she is hypoxic; it does not maintain asthma control or cover steroid dependence.",
      "B": "Referral is not an acute intrapartum intervention and delays the needed steroid cover.",
      "C": "She should continue her regular inhalers, but this does not address the corticosteroid cover required by her oral steroid dependence."}),

    (29, "Which of the following statements is INCORRECT regarding acute fatty liver of pregnancy?",
     ["A. It is a fatal disease if not timely treated.",
      "B. May be complicated by disseminated intravascular coagulopathy",
      "C. Blood glucose levels are elevated.",
      "D. May progress to fulminant hepatic failure rapidly."],
     "C",
     "This is the incorrect statement. Acute fatty liver of pregnancy characteristically causes HYPOglycaemia (from hepatic failure), not elevated blood glucose.",
     {"A": "True — AFLP is fatal if not promptly recognised and delivered.",
      "B": "True — DIC is a well-recognised complication.",
      "D": "True — it can progress rapidly to fulminant hepatic failure."}),

    (30, "What is the most common route of intrauterine infection leading to preterm labour?",
     ["A. Haematogenous spread", "B. Ascending infection from the vagina",
      "C. Iatrogenic introduction of infection during procedures", "D. Trans-placental spread."],
     "B",
     "Ascending infection from the lower genital tract through the cervix is by far the most common route of intra-amniotic infection triggering preterm labour.",
     {"A": "Haematogenous (blood-borne) spread is a much less common route.",
      "C": "Iatrogenic introduction during procedures is rare.",
      "D": "Transplacental spread accounts for only a minority of intrauterine infections."}),

    (31, "A 30 year old woman at 32 weeks gestation presents with signs of preterm labour. What is the most appropriate next step to promote fetal lung maturity?",
     ["A. Administer IV antibiotics", "B. Immediate caesarean section",
      "C. Administer corticosteroids", "D. Begin magnesium sulphate for neuroprotection"],
     "C",
     "Antenatal corticosteroids (betamethasone/dexamethasone) accelerate fetal surfactant production and lung maturation and are the intervention that reduces respiratory distress syndrome.",
     {"A": "Antibiotics treat infection (e.g. after ruptured membranes) but do not mature the lungs.",
      "B": "Immediate caesarean is not indicated simply for threatened preterm labour and does not aid lung maturity.",
      "D": "Magnesium sulphate is given for fetal NEUROPROTECTION, not to promote lung maturity."}),

    (32, "Which of the following is a calcium channel blocker commonly used as a tocolytic agent?",
     ["A. Indomethacin", "B. Nifedipine", "C. Ritodrine", "D. Atosiban"],
     "B",
     "Nifedipine is a calcium channel blocker widely used as a tocolytic to suppress preterm uterine contractions.",
     {"A": "Indomethacin is a prostaglandin synthetase inhibitor (NSAID) tocolytic, not a calcium channel blocker.",
      "C": "Ritodrine is a β2-agonist tocolytic.",
      "D": "Atosiban is an oxytocin-receptor antagonist tocolytic."}),

    (33, "Which of the following is the most appropriate mode of delivery in an uncomplicated dichorionic diamniotic twin pregnancy where the first twin is breech at 37 weeks?",
     ["A. Vaginal breech delivery.", "B. Wait for spontaneous labour.",
      "C. Elective cesarean section.", "D. Induction of labour."],
     "C",
     "When the presenting (first) twin is non-cephalic/breech, elective caesarean section is recommended because of the risk of interlocking and cord complications with vaginal delivery.",
     {"A": "Vaginal breech delivery of a leading twin is not recommended due to the risk of locked twins.",
      "B": "Waiting for spontaneous labour does not change the unsafe presentation and delays definitive delivery.",
      "D": "Induction does not overcome the problem of a breech-presenting first twin."}),

    (34, "How frequent should ultrasound be performed in monochorionic diamniotic pregnancies after 16 weeks of gestation?",
     ["A. Every 4 weeks", "B. Every 2 weeks", "C. Every week", "D. Every 6 weeks"],
     "B",
     "Monochorionic diamniotic twins are scanned every 2 weeks from 16 weeks to detect twin-to-twin transfusion syndrome and growth discordance early.",
     {"A": "Every 4 weeks is the schedule for DICHORIONIC twins, which are lower risk.",
      "C": "Weekly scanning is more frequent than required for routine surveillance.",
      "D": "Every 6 weeks is far too infrequent for monochorionic surveillance."}),

    (35, "Which of the following cardiac conditions poses a significant health risk during pregnancy?",
     ["A. Mitral valve prolapse.", "B. Atrial fibrillation.",
      "C. History of peripartum cardiomyopathy.", "D. Ventricular septal defect (VSD)."],
     "C",
     "A history of peripartum cardiomyopathy carries a high risk of recurrence and maternal mortality in a subsequent pregnancy, making it the condition of greatest concern here.",
     {"A": "Mitral valve prolapse is usually well tolerated in pregnancy.",
      "B": "Lone atrial fibrillation is comparatively low risk in a structurally normal heart.",
      "D": "A small VSD is generally well tolerated; it is far less dangerous than prior peripartum cardiomyopathy."}),

    (36, "Mrs. (S) is a 32-year-old G3P2 woman who presents at 32 weeks gestation with swelling of the right leg. On examination, the right calf is markedly swollen, tender, and reddish. Her BMI is 31 kg/m2 and BP 110/65 mmHg. Which of the following is the best initial tool to exclude deep venous thrombosis (DVT)?",
     ["A. D-Dimer level.", "B. Compression venous Doppler.",
      "C. CT angiography.", "D. Magnetic resonance angiography."],
     "B",
     "Compression (Doppler) ultrasound of the leg veins is the first-line, safe, non-ionising investigation to diagnose or exclude DVT in pregnancy.",
     {"A": "D-dimer is physiologically raised in pregnancy and is unreliable, so it is not used to exclude DVT.",
      "C": "CT angiography involves ionising radiation/contrast and is not the initial leg-vein test.",
      "D": "MR angiography is not the first-line tool and is reserved for pelvic vein assessment when ultrasound is inconclusive."}),

    (42, "A 30 year old G3P2 woman presents at 32 weeks with painless bright red vaginal bleeding. The patient is vitally stable and bleeding is moderate in amount. Ultrasound confirms placenta previa. What is the best next step in management?",
     ["A. Induce labour with oxytocin", "B. Perform digital vaginal examination",
      "C. Immediate caesarean section", "D. Admit for observation and fetal monitoring"],
     "D",
     "With confirmed placenta praevia, a stable mother, a preterm fetus (32 weeks) and settling moderate bleeding, the correct step is admission for observation and fetal monitoring (with steroids for lung maturity), aiming to prolong the pregnancy.",
     {"A": "Inducing labour is contraindicated in placenta praevia — vaginal delivery risks catastrophic haemorrhage.",
      "B": "Digital vaginal examination is absolutely contraindicated in praevia as it can provoke torrential bleeding.",
      "C": "Immediate caesarean is reserved for uncontrolled haemorrhage or maternal/fetal compromise, not a stable patient at 32 weeks."}),

    (43, "A 30 year old primigravida at 39 weeks gestation presents in labour. On vaginal examination, the cervix is 7 cm dilated, 80% effaced and the fetal head is at -2 station. What does this most likely indicate?",
     ["A. Latent phase of labour.", "B. Active phase of labour",
      "C. Second stage of labour", "D. Fetal head is engaged"],
     "B",
     "A cervix that is 7 cm dilated indicates the active (first-stage) phase of labour, which is defined from about 6 cm to full dilatation.",
     {"A": "The latent phase is up to about 4–6 cm; 7 cm is beyond it.",
      "C": "The second stage begins at full (10 cm) dilatation, not 7 cm.",
      "D": "A head at −2 station is above the ischial spines and is NOT yet engaged (engagement is at 0 station)."}),

    (44, "During normal vaginal delivery, after the head of the fetus is delivered, it rotates to realign with the shoulders inside the birth canal. What is this movement named?",
     ["A. Flexion", "B. Internal rotation", "C. Extension", "D. Restitution"],
     "D",
     "Restitution is the passive realignment of the delivered head with the shoulders (undoing the twist of internal rotation) after the head is born.",
     {"A": "Flexion allows the smallest diameter of the head to present as it descends — it precedes delivery of the head.",
      "B": "Internal rotation turns the head within the pelvis before the head is delivered.",
      "C": "Extension is the movement by which the head is actually born under the pubic symphysis."}),

    (45, "According to NICE guidelines on intrapartum care, which of the following is considered appropriate care for a woman in spontaneous labour?",
     ["A. Routine perineal/pubic shaving prior to vaginal birth.",
      "B. Oral intake of fluids and light food is encouraged in uncomplicated labour.",
      "C. Administration of enema to reduce the need for labour augmentation.",
      "D. Vaginal examinations should be offered every 1 hour."],
     "B",
     "NICE supports allowing oral fluids and light diet in uncomplicated labour for low-risk women.",
     {"A": "Routine perineal/pubic shaving is NOT recommended.",
      "C": "Routine enemas are not recommended and do not reduce augmentation.",
      "D": "Vaginal examinations are offered every 4 hours in the first stage, not every hour."}),

    (46, "Which of the following interventions is most effective in reducing perineal trauma during vaginal delivery?",
     ["A. Warm perineal compresses and controlled delivery of the head.",
      "B. Routine episiotomy", "C. Immediate pushing at full cervical dilatation",
      "D. Fundal pressure"],
     "A",
     "Warm perineal compresses combined with controlled, slow delivery of the head reduce the risk of perineal tears and are evidence-based protective measures.",
     {"B": "Routine (as opposed to selective) episiotomy increases, rather than reduces, perineal trauma.",
      "C": "Immediate pushing at full dilatation without controlled delivery increases the risk of tears.",
      "D": "Fundal pressure is not recommended and can cause harm, including trauma."}),

    (47, "A 47 year old multiparous woman presents with complaints of severe dysmenorrhea and heavy menstrual bleeding. On bimanual examination, her uterus is found to be uniformly enlarged and tender. Transvaginal ultrasound reveals a heterogeneous globular uterus with small myometrial cysts and the results of endometrial biopsy are normal. What is the most likely diagnosis?",
     ["A. Endometritis", "B. Endometrial hyperplasia",
      "C. Adenomyosis", "D. Uterine fibroid (Leiomyoma)"],
     "C",
     "A uniformly enlarged, tender, globular uterus with a heterogeneous myometrium and small myometrial cysts on ultrasound, plus dysmenorrhoea and menorrhagia with a normal endometrial biopsy, is classic for adenomyosis.",
     {"A": "Endometritis presents with infection/pelvic pain and tenderness but not a globular uterus with myometrial cysts.",
      "B": "Endometrial hyperplasia would be reflected in the endometrial biopsy, which is normal here.",
      "D": "Fibroids typically produce an asymmetrically enlarged, nodular (not uniformly globular) uterus with discrete masses."}),

    (48, "Which of the following is the most accepted theory for the pathogenesis of endometriosis?",
     ["A. Sampson's theory of retrograde menstruation",
      "B. Meyer's coelomic metaplasia theory",
      "C. Genetic theory",
      "D. Lymphatic and vascular metastasis theory"],
     "A",
     "Sampson's theory of retrograde menstruation — viable endometrial cells refluxing through the tubes and implanting on peritoneal surfaces — is the most widely accepted explanation.",
     {"B": "Coelomic metaplasia (Meyer) helps explain some sites but is less widely accepted as the primary mechanism.",
      "C": "A genetic predisposition contributes but is not the principal pathogenetic theory.",
      "D": "Lymphatic/vascular spread accounts only for rare distant deposits, not the common pelvic disease."}),

    (49, "Which of the following is the preferred treatment for a woman with minimal to mild endometriosis who is trying to conceive?",
     ["A. Laparoscopic ablation of endometriotic lesions", "B. Progestins",
      "C. GnRH agonists", "D. Danazol"],
     "A",
     "For a woman trying to conceive, laparoscopic ablation/excision of endometriotic lesions is preferred — it treats disease while preserving (and can improve) fertility.",
     {"B": "Progestins suppress ovulation and act as contraceptives, so they are unsuitable for someone trying to conceive.",
      "C": "GnRH agonists induce a hypo-oestrogenic anovulatory state, preventing conception.",
      "D": "Danazol suppresses ovulation and is androgenic/teratogenic, so it is contraindicated when trying to conceive."}),

    (50, "A 23 year old woman, G1P0, presents at 8 weeks gestation with brownish discharge and mild pelvic discomfort. Transvaginal ultrasound shows a snowstorm pattern in the uterus consistent with complete mole and bilaterally enlarged multicystic ovaries containing clear fluid. What is the most likely type of the patient's ovarian cysts?",
     ["A. Mucous cystadenoma", "B. Endometrioma",
      "C. Serous cystadenoma", "D. Theca-lutein cysts"],
     "D",
     "Bilaterally enlarged, multicystic ovaries in the setting of a molar pregnancy are theca-lutein cysts, driven by the very high β-hCG levels; they regress once the mole is evacuated.",
     {"A": "A mucinous cystadenoma is a benign epithelial neoplasm unrelated to hCG and typically unilateral.",
      "B": "An endometrioma is a chocolate cyst of endometriosis, not related to molar pregnancy.",
      "C": "A serous cystadenoma is a benign epithelial tumour, not an hCG-driven bilateral change."}),

    (51, "What is the most serious complication that could occur on top of a corpus luteal cyst of the ovary?",
     ["A. Ovarian torsion", "B. Infection",
      "C. Haemoperitoneum and acute abdomen", "D. Ovarian malignancy"],
     "C",
     "Rupture of a corpus luteum cyst can cause significant intraperitoneal bleeding (haemoperitoneum) and an acute abdomen — potentially life-threatening and the most serious complication listed.",
     {"A": "Torsion is a recognised complication but is generally less immediately life-threatening than major haemorrhage.",
      "B": "Infection of a corpus luteum cyst is uncommon and rarely the most serious event.",
      "D": "A corpus luteum cyst is a benign functional cyst and does not undergo malignant change."}),

    (52, "A 41 year old woman presents to the gynaecology clinic with abdominal enlargement. She has a 7 cm solid ovarian tumour detected by ultrasound. Investigations performed showed right pleural effusion and a moderate amount of ascites. Which of the following is the most likely diagnosis?",
     ["A. Ovarian teratoma", "B. Ovarian fibroma",
      "C. Granulosa cell tumour", "D. Mucinous cyst adenoma"],
     "B",
     "The triad of a benign solid ovarian tumour (fibroma), ascites and a (classically right-sided) pleural effusion is Meigs' syndrome; the effusions resolve after the fibroma is removed.",
     {"A": "A teratoma is a germ-cell tumour with mixed tissue elements and is not associated with Meigs' syndrome.",
      "C": "A granulosa cell tumour is a sex-cord stromal tumour producing oestrogen; it is not the classic Meigs' triad.",
      "D": "A mucinous cystadenoma is cystic and can cause ascites (pseudomyxoma) but not the pleural effusion of Meigs' syndrome."}),

    (53, "Which of the following risks is associated with laparoscopic sterilization?",
     ["A. Amenorrhea", "B. Dysmenorrhea",
      "C. Ectopic pregnancy", "D. Abnormal uterine bleeding"],
     "C",
     "If sterilization fails and pregnancy occurs, the proportion that are ectopic is increased, so ectopic pregnancy is the recognised risk of tubal sterilization.",
     {"A": "Sterilization does not affect ovarian hormone production, so it does not cause amenorrhoea.",
      "B": "It does not cause dysmenorrhoea.",
      "D": "Tubal sterilization does not cause abnormal uterine bleeding (the 'post-tubal syndrome' is not substantiated)."}),

    (54, "Which of the following methods can be used as emergency contraception?",
     ["A. Progesterone only pills", "B. Subcutaneous implants",
      "C. Progesterone injectables", "D. Copper intrauterine device"],
     "D",
     "The copper intrauterine device is the most effective emergency contraceptive, and can be inserted up to 5 days after unprotected intercourse (or after the estimated ovulation).",
     {"A": "Standard progestogen-only pills are for ongoing contraception; the dedicated emergency pill is levonorgestrel or ulipristal, not the regular POP.",
      "B": "Subcutaneous implants are long-acting ongoing contraception, not an emergency method.",
      "C": "Progestogen injectables are for ongoing contraception, not emergency use."}),

    (55, "Which of the following is an absolute contraindication to combined oral contraceptive use?",
     ["A. Controlled hypertension", "B. History of migraine with aura",
      "C. Age over 40", "D. Fibroid uterus."],
     "B",
     "Migraine with aura is an absolute contraindication (UKMEC 4) to combined oral contraceptives because of the substantially increased risk of ischaemic stroke.",
     {"A": "Well-controlled hypertension is a relative (UKMEC 3), not absolute, contraindication.",
      "C": "Age over 40 alone is a UKMEC 2 — it does not by itself absolutely contraindicate the pill.",
      "D": "A fibroid uterus is not a contraindication to combined oral contraceptives."}),

    (56, "A 23-year-old female presents with oligomenorrhea and abnormal facial hair growth along with high serum free testosterone level. On ultrasound, the ovaries appear normal. What is the most likely diagnosis?",
     ["A. Idiopathic hirsutism", "B. Polycystic ovarian syndrome (PCOS)",
      "C. Testosterone secreting tumor", "D. Adrenal hyperplasia"],
     "B",
     "She meets the Rotterdam criteria with two of three features — oligomenorrhoea (anovulation) plus clinical and biochemical hyperandrogenism — so PCOS is diagnosed even when the ovaries look normal on ultrasound.",
     {"A": "Idiopathic hirsutism occurs with REGULAR cycles and normal androgen levels; she has oligomenorrhoea and raised testosterone.",
      "C": "A testosterone-secreting tumour causes rapid virilisation with VERY high testosterone; her presentation is chronic and only moderately raised.",
      "D": "Congenital adrenal hyperplasia usually presents earlier with raised 17-OH-progesterone; PCOS better fits this picture."}),

    (57, "What is the primary reason for irregular menstruation in women with polycystic ovarian syndrome (PCOS)?",
     ["A. Failure of follicle maturation and anovulation", "B. Hyperprolactinaemia",
      "C. Low oestrogen levels", "D. High progesterone levels"],
     "A",
     "In PCOS, follicles fail to mature and ovulate (chronic anovulation), so there is no cyclical progesterone withdrawal, giving irregular/absent menses.",
     {"B": "Hyperprolactinaemia is a separate cause of menstrual disturbance, not the mechanism in PCOS.",
      "C": "Oestrogen is typically normal or high (unopposed) in PCOS, not low.",
      "D": "Progesterone is LOW because of anovulation — that lack, not an excess, causes the irregularity."}),

    (58, "Which of the following is NOT a feature of polycystic ovarian syndrome (PCOS)?",
     ["A. Elevated LH:FSH ratio",
      "B. Decreased hepatic production of sex hormone binding globulin",
      "C. Elevated AMH", "D. High progesterone levels"],
     "D",
     "High progesterone is NOT a feature. Because PCOS is anovulatory, there is no corpus luteum and progesterone stays LOW.",
     {"A": "True feature — the LH:FSH ratio is characteristically raised.",
      "B": "True feature — insulin resistance lowers hepatic SHBG, raising free androgens.",
      "C": "True feature — AMH is elevated due to the increased number of small antral follicles."}),

    (59, "What is the recommended first-line pharmacological treatment for premenstrual dysphoric disorder (PMDD)?",
     ["A. Oral contraceptives", "B. Hormone replacement therapy",
      "C. Selective serotonin reuptake inhibitors (SSRIs)", "D. Benzodiazepines"],
     "C",
     "SSRIs are first-line pharmacological therapy for PMDD and can be given continuously or only in the luteal phase.",
     {"A": "Combined oral contraceptives (especially drospirenone-containing) help some women but are not the first-line pharmacological treatment for the mood symptoms of PMDD.",
      "B": "HRT is not a treatment for PMDD.",
      "D": "Benzodiazepines are not first-line and carry dependence risk."}),

    (60, "What distinguishes secondary vaginismus from primary vaginismus?",
     ["A. Involuntary contractions occur only during menstruation",
      "B. Caused solely by hormonal changes",
      "C. Develops after a period of normal sexual function",
      "D. Always associated with physical trauma"],
     "C",
     "Secondary vaginismus develops AFTER a period of previously normal, pain-free sexual function, whereas primary vaginismus has been present from the first attempt at penetration.",
     {"A": "Vaginismus is not confined to menstruation.",
      "B": "It is not caused solely by hormonal changes; causes are often psychological or secondary to pain.",
      "D": "It is not ALWAYS due to physical trauma — many cases have psychological or dyspareunia-related causes."}),
]

# --------------------------------------------------------------------------- #
#  SAQ DATA
# --------------------------------------------------------------------------- #

CASE1_STEM = """A 19-year-old primigravida was admitted to the Emergency Department with severe headache and reduced fetal movements. She did not discover that she is pregnant until very late and was uncertain of her last menstrual period. The first scan was at 23 weeks gestation and according to that scan she is now 37 weeks.

On her booking visit, the blood pressure was 120/68 mmHg and urine analysis negative for proteins. The booking investigations were all normal.

This morning she woke up with frontal headache which persisted despite regular paracetamol intake. She says that her vision is a bit blurred, but she cannot be more specific about this. She also reports nausea and epigastric discomfort.

**Examination**

- The blood pressure is 164/106 mmHg, repeated twice at 15 min intervals as 160/110 mmHg and 164/112 mmHg.
- She is apyrexial and the heart rate is 83 beats/min.
- Her face is swollen and fundus examination is normal.
- On abdominal examination she is tender in the epigastrium and beneath the right costal margin, but the uterus is soft and non-tender.
- The legs are mildly edematous and the lower limb reflexes are very brisk, with clonus.

**Lab investigations**

| Investigation | Patient's level | Normal range |
|---|---|---|
| Hemoglobin | 11.6 gm/dl | 11 – 14 gm/dl |
| Platelet count | 126 x10³/ml | 150 – 450 x10³/ml |
| AST | 150 IU/L | 6 – 32 IU/L |
| ALT | 80 IU/L | 15 – 70 IU/L |
| Serum creatinine | 0.8 mg/dl | 0.7 – 0.9 mg/dl |
| Serum Uric acid | 0.6 mmol/L | 0.14 – 0.3 mmol/L |
| Serum Potassium | 4.0 mmol/L | 3.3 – 4.1 mmol/L |
| Urine analysis | ++ protein | Negative |

A CTG was performed and revealed: baseline fetal heart rate 140 beat/min, reduced beat-to-beat variability (3–5 bpm), variable decelerations, and no accelerations."""

CASE1_QUESTIONS = [
    ("1. What is the most likely diagnosis? Justify based on the clinical and lab findings.", 2,
     """**Diagnosis: Severe pre-eclampsia at 37 weeks with features of evolving HELLP syndrome** (and signs of impending eclampsia).

*Justification (award for citing the criteria):*
- **New-onset hypertension after 20 weeks in the severe range** — 160/110 and 164/112 mmHg on repeat, on a background of a normal booking BP of 120/68.
- **New proteinuria** — urine ++ (booking urine was negative).
- **Severe features / end-organ involvement:** persistent headache, blurred vision and epigastric/right-upper-quadrant tenderness; brisk reflexes with clonus (neurological irritability = impending eclampsia); facial oedema.
- **Laboratory evidence:** thrombocytopenia (platelets 126), raised transaminases (AST 150, ALT 80 — both > 2× upper limit) and hyperuricaemia (0.6 mmol/L) → the low platelets + high liver enzymes suggest evolving HELLP.
- **Fetal compromise:** pathological CTG (reduced variability, variable decelerations, no accelerations) and reduced fetal movements."""),

    ("2. Mention a further investigation that should be requested.", 1,
     """Any one relevant test to confirm HELLP / assess maternal status, e.g.:
- **Peripheral blood film + LDH + bilirubin** — to confirm haemolysis and complete the HELLP picture *(best single answer)*.
- **Coagulation profile** (PT, aPTT, fibrinogen) — to detect DIC.
- 24-hour urinary protein or spot protein:creatinine ratio to quantify proteinuria; group and save."""),

    ("3. How would you manage this case?", 3,
     """**A senior-led, deliver-the-baby plan:**
1. **Admit and stabilise (ABC)** — involve senior obstetrician, anaesthetist and neonatal team; secure IV access, monitor BP, urine output, reflexes and continuous CTG.
2. **Control blood pressure** — IV labetalol (or IV hydralazine, or oral nifedipine) aiming for < 150/100 mmHg to prevent maternal stroke.
3. **Seizure prophylaxis** — IV **magnesium sulphate** (4 g loading dose over 5–10 min, then 1 g/hour maintenance) because she has impending eclampsia (headache, visual symptoms, clonus).
4. **Deliver the baby — the definitive treatment.** At 37 weeks with severe pre-eclampsia/evolving HELLP and a pathological CTG, expedite delivery; given the non-reassuring CTG, caesarean section is likely (mode depends on cervix and fetal condition).
5. **Supportive care** — strict fluid balance, monitor for pulmonary oedema and DIC, continue magnesium and BP control for ≥ 24 hours postpartum. (Antenatal steroids are not needed for lung maturity at 37 weeks.)"""),

    ("4. Mention the mechanism of action, indication and signs of magnesium sulphate toxicity.", 2,
     """- **Mechanism of action:** magnesium is a membrane stabiliser that acts as a calcium antagonist and blocks NMDA receptors, reducing neuronal excitability and causing cerebral vasodilatation → prevents and controls seizures.
- **Indications:** seizure prophylaxis in severe pre-eclampsia; treatment of eclamptic seizures; fetal neuroprotection in threatened preterm birth < 32 weeks.
- **Signs of toxicity (progressive):** loss of deep tendon (patellar) reflexes first → respiratory depression → slurred speech, flushing, muscle weakness, reduced urine output → cardiac arrhythmia/arrest at high levels. **Antidote: IV calcium gluconate.**"""),

    ("5. List 3 anti-hypertensive medications that can be used in pregnancy and their mechanism of action.", 2,
     """Any three, with mechanism:
- **Labetalol** — combined α- and β-adrenergic blocker (lowers peripheral vascular resistance and heart rate).
- **Methyldopa** — central α2-adrenergic agonist (reduces central sympathetic outflow).
- **Nifedipine** — calcium channel blocker (arterial smooth-muscle relaxation / vasodilatation).
- *(Hydralazine — direct arteriolar vasodilator, used IV for acute severe hypertension.)*"""),
]

CASE2_STEM = """A 32-year-old G4P3 attended the antenatal clinic at 36 weeks gestation requesting information about postnatal family planning. Her current pregnancy was unplanned as she was only using the safe period and external ejaculation. She has 3 children, the youngest is 16 months old, and they were all delivered vaginally at term. All babies were breastfed, and she is intending to breastfeed this baby too.

She is currently normotensive, weighing 75 Kg. Her menses are regular, recurring every 30 days, of average amount and no dysmenorrhea. She is non-smoker and has no relevant medical history."""

CASE2_QUESTIONS = [
    ("1. Mention TWO contraceptive options that could be offered to her within the time of delivery whether vaginal or cesarean?", 2,
     """Any two long-acting/permanent methods that can be placed at the time of delivery:
- **Immediate postpartum intrauterine device** — copper IUD or LNG-IUS, inserted within 10 minutes of placental delivery at vaginal birth, or at caesarean section.
- **Bilateral tubal ligation (female sterilization)** — performed at caesarean section or as immediate postpartum mini-laparotomy (she is a para-3+ with completed family — counsel and consent).
- *(Progestogen-only implant — safe to insert immediately postpartum and compatible with breastfeeding.)*"""),

    ("2. Give her THREE other options that could be started at the end of puerperium.", 3,
     """Any three methods appropriate from ~6 weeks postpartum:
- **Progestogen-only pill (POP)** — safe during breastfeeding.
- **Progestogen injectable (DMPA)** — depot progestogen, breastfeeding-compatible.
- **Progestogen-only implant** (if not already placed).
- **Barrier methods** — male/female condoms or diaphragm.
- **Combined hormonal contraception** — only becomes acceptable from ≥ 6 weeks in a breastfeeding woman (avoid before 6 weeks)."""),

    ("3. The woman asks if there is a method that would be contraindicated because of breastfeeding.", 3,
     """- **a. Contraindicated method:** combined hormonal contraception (the **combined oral contraceptive pill** / any oestrogen-containing method).
- **b. Why:** the **oestrogen** component reduces breast-milk volume and can impair lactation, and there is an added early-postpartum venous thromboembolism risk.
- **c. For how long:** it is contraindicated for the **first 6 weeks** postpartum in a breastfeeding woman (UKMEC 4 before 6 weeks; UKMEC 2 from 6 weeks to 6 months) — so avoid it at least until 6 weeks, ideally while breastfeeding is being established."""),

    ("4. If this woman told you that her menses are usually heavy with marked dysmenorrhea, which method would be most suitable for her?", 2,
     """**The levonorgestrel intrauterine system (LNG-IUS / Mirena).**
It is the most suitable because, besides providing effective long-acting contraception, it markedly **reduces menstrual blood loss** and **relieves dysmenorrhoea** — treating her heavy, painful periods at the same time."""),
]

# --------------------------------------------------------------------------- #
#  MARKDOWN BUILDERS
# --------------------------------------------------------------------------- #

def mcq_markdown():
    out = []
    out.append("# Women's Health Reset Exam 1 — MCQ Answer Key")
    out.append("")
    out.append("**Course:** MED422 — Women's Health &nbsp;·&nbsp; **60 marks** &nbsp;·&nbsp; **75 minutes**")
    out.append("")
    out.append("Each question is followed by a boxed answer giving the correct option, "
               "why it is correct, and why each other option is wrong.")
    out.append("")
    out.append("> **Note:** MCQs 37–41 are absent because page 8 of the paper is missing "
               "and could not be recovered. The numbering below follows the original paper (36 → 42).")
    out.append("")
    out.append("---")
    out.append("")
    for num, q, opts, ans, correct, wrongs in MCQ:
        out.append(f"### {num}. {q}")
        out.append("")
        # options: plain, one per line (hard break), NOT bold
        out.append("  \n".join(opts))
        out.append("")
        ans_text = next(o[3:] for o in opts if o.startswith(ans + "."))
        box = [f"> **Answer: {ans} — {ans_text}**", ">",
               f"> **Why {ans} is correct:** {correct}", ">",
               "> **Why the other options are wrong:**"]
        for letter in ["A", "B", "C", "D"]:
            if letter in wrongs:
                box.append(f"> - **{letter}.** {wrongs[letter]}")
        out.append("\n".join(box))
        out.append("")
        out.append("---")
        out.append("")
    return "\n".join(out)


def marks_label(n):
    return f"{n} mark" if n == 1 else f"{n} marks"


def saq_markdown():
    out = []
    out.append("# Women's Health Reset Exam 1 — Written (Short Answer) Section")
    out.append("")
    out.append("**Course:** MED422 — Women's Health")
    out.append("")
    out.append("This document has **two parts**:")
    out.append("")
    out.append("1. **Part A — Question paper** with blank answer spaces (print and write on it).")
    out.append("2. **Part B — Model answers**, with marks weighted as on the paper.")
    out.append("")
    out.append("---")
    out.append("")
    # ---- PART A : blank ----
    out.append("# Part A — Question Paper (blank)")
    out.append("")
    for case_title, stem, questions in [
        ("Case 1", CASE1_STEM, CASE1_QUESTIONS),
        ("Case 2", CASE2_STEM, CASE2_QUESTIONS),
    ]:
        out.append(f"## {case_title}")
        out.append("")
        out.append(stem)
        out.append("")
        out.append("**Questions**")
        out.append("")
        for qtext, marks, _ in questions:
            out.append(f"**{qtext}** *({marks_label(marks)})*")
            out.append("")
            out.append('<div class="answer-lines"></div>')
            out.append("")
        out.append("---")
        out.append("")
    # ---- PART B : answers ----
    out.append("# Part B — Model Answers")
    out.append("")
    for case_title, stem, questions in [
        ("Case 1", CASE1_STEM, CASE1_QUESTIONS),
        ("Case 2", CASE2_STEM, CASE2_QUESTIONS),
    ]:
        total = sum(m for _, m, _ in questions)
        out.append(f"## {case_title} — Model Answers ({marks_label(total)})")
        out.append("")
        for qtext, marks, ans in questions:
            out.append(f"### {qtext} *({marks_label(marks)})*")
            out.append("")
            out.append(f"> {ans}".replace("\n", "\n> "))
            out.append("")
        out.append("---")
        out.append("")
    return "\n".join(out)


# --------------------------------------------------------------------------- #
#  HTML / PDF RENDERING
# --------------------------------------------------------------------------- #

CSS = """
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 11.2pt;
       line-height: 1.5; color: #1a1a1a; }
h1 { font-size: 20pt; border-bottom: 3px solid #b3006b; padding-bottom: 6px;
     color: #7a0047; }
h2 { font-size: 15pt; color: #7a0047; margin-top: 22px;
     border-bottom: 1px solid #ddd; padding-bottom: 3px; }
h3 { font-size: 12pt; margin-top: 18px; margin-bottom: 6px; color: #111;
     page-break-after: avoid; }
p { margin: 6px 0; }
hr { border: none; border-top: 1px solid #e2e2e2; margin: 14px 0; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10.5pt; }
th, td { border: 1px solid #bbb; padding: 5px 8px; text-align: left; }
th { background: #f3e6ef; }
/* Answer box = blockquote */
blockquote { border: 1.5px solid #2e7d32; border-left: 6px solid #2e7d32;
             background: #f2f9f2; border-radius: 6px; padding: 10px 14px;
             margin: 10px 0 16px 0; page-break-inside: avoid; }
blockquote p { margin: 5px 0; }
blockquote ul { margin: 4px 0 4px 0; padding-left: 20px; }
blockquote li { margin: 3px 0; }
blockquote strong { color: #1b5e20; }
/* the note banner at top of MCQ doc (blockquote before first hr) */
.note blockquote { border-color: #b58900; border-left-color: #b58900;
                   background: #fdf6e3; }
/* question option lines */
h3 + p { margin-top: 4px; }
/* blank answer lines for the written paper */
.answer-lines { height: 96px;
    background-image: repeating-linear-gradient(
        transparent, transparent 23px, #c9c9c9 23px, #c9c9c9 24px);
    margin: 4px 0 14px 0; border-bottom: 1px solid #c9c9c9; }
"""

def deck_js():
    """Build the quiz-app deck for the OB/GYN Revision site.

    Matches the window.QUIZ_DECKS schema used by data/obs.js and data/gyn.js.
    answerSource is 'inferred' because these answers are AI-derived from the
    exam paper (no marked key was provided), which surfaces the app's built-in
    disclaimer.
    """
    questions = []
    for num, q, opts, ans, correct, wrongs in MCQ:
        options = []
        for o in opts:
            key, text = o.split(".", 1)
            options.append({"key": key.strip(), "text": text.strip()})
        explanations = {ans: "Correct. " + correct}
        for letter, reason in wrongs.items():
            explanations[letter] = "Incorrect. " + reason
        questions.append({
            "num": num,
            "question": q,
            "options": options,
            "correct": ans,
            "answerSource": "inferred",
            "explanations": explanations,
            "id": num,
        })
    deck = {"id": "womens-health", "title": "Women's Health", "questions": questions}
    payload = json.dumps(deck, ensure_ascii=False, indent=2)
    return ("window.QUIZ_DECKS = window.QUIZ_DECKS || [];\n"
            "window.QUIZ_DECKS.push(\n" + payload + "\n);\n")


def render_pdf(md_text, out_pdf, title):
    import markdown as md
    body = md.markdown(md_text, extensions=["extra", "sane_lists", "nl2br"])
    html_doc = f"""<!doctype html><html><head><meta charset="utf-8">
<title>{html.escape(title)}</title><style>{CSS}</style></head>
<body>{body}</body></html>"""
    html_path = out_pdf.replace(".pdf", ".html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_doc)
    subprocess.run([
        CHROME, "--headless", "--no-sandbox", "--disable-gpu",
        "--no-pdf-header-footer", f"--print-to-pdf={out_pdf}",
        "file://" + os.path.abspath(html_path),
    ], check=True, capture_output=True)
    os.remove(html_path)


def main():
    mcq_md = mcq_markdown()
    saq_md = saq_markdown()

    with open(os.path.join(ROOT, "mcq-answers.md"), "w", encoding="utf-8") as f:
        f.write(mcq_md)
    with open(os.path.join(ROOT, "saq-answers.md"), "w", encoding="utf-8") as f:
        f.write(saq_md)

    render_pdf(mcq_md, os.path.join(ROOT, "mcq-answers.pdf"),
               "Women's Health Reset Exam 1 — MCQ Answer Key")
    render_pdf(saq_md, os.path.join(ROOT, "saq-answers.pdf"),
               "Women's Health Reset Exam 1 — Written Section")

    data_dir = os.path.join(ROOT, "data")
    if os.path.isdir(data_dir):
        with open(os.path.join(data_dir, "womens-health.js"), "w", encoding="utf-8") as f:
            f.write(deck_js())
        print("Generated: mcq-answers.md/.pdf, saq-answers.md/.pdf, data/womens-health.js")
    else:
        print("Generated: mcq-answers.md/.pdf, saq-answers.md/.pdf (no data/ dir — skipped deck)")


if __name__ == "__main__":
    main()
