import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const reportDir = path.join(root, "reports");
const dataFiles = [
  "data/obs.js",
  "data/gyn.js",
  "data/womens-health.js",
  "data/mock-final.js",
  "data/mock-exam-1.js",
  "data/mock-exam-2.js",
  "data/lecture-tags.js",
];
const mockIds = new Set(["womens-health", "mock-final", "mock-exam-1", "mock-exam-2"]);
const reviewIds = new Set(["obs", "gyn"]);
const previousPassIds = new Set(["obs", "gyn", "womens-health"]);
const newDeckIds = new Set(["mock-final", "mock-exam-1", "mock-exam-2"]);

const context = { window: {} };
vm.createContext(context);
for (const file of dataFiles) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const decks = context.window.QUIZ_DECKS;
const tags = context.window.LECTURE_TAGS;
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/lecture-catalog.json"), "utf8"));
const catalogById = new Map(catalog.map((lecture) => [lecture.id, lecture]));
const deckById = new Map(decks.map((deck) => [deck.id, deck]));
const rows = [];

for (const deck of decks) {
  const deckTags = tags[deck.id] || {};
  for (const question of deck.questions) {
    const match = deckTags[String(question.id)];
    if (!match) throw new Error(`Missing lecture match: ${deck.id} question ${question.id}`);
    validateMatch(match, deck.id, question.id);
    rows.push({
      deckId: deck.id,
      deckTitle: deck.title,
      category: mockIds.has(deck.id) ? "Mock Exams" : "Reviews",
      questionId: String(question.id),
      questionNum: question.num ?? question.id,
      question: [question.caseStem, question.question].filter(Boolean).join(" "),
      correct: question.correct || "",
      answerSource: question.answerSource ?? "unknown",
      ...match,
    });
  }
}

const expectedTotal = decks.reduce((sum, deck) => sum + deck.questions.length, 0);
if (rows.length !== expectedTotal) throw new Error(`Expected ${expectedTotal} rows, got ${rows.length}`);

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "question-to-lecture-map.csv"), buildCsv(rows));
fs.writeFileSync(path.join(reportDir, "question-to-lecture-map.md"), buildQuestionAppendix(rows));
const report = buildFocusReport(rows);
fs.writeFileSync(path.join(reportDir, "lecture-focus-report.md"), report.markdown);
fs.writeFileSync(path.join(reportDir, "lecture-focus-data.json"), JSON.stringify(report.data, null, 2) + "\n");
const deckReportDefinitions = [
  { deckId: "womens-health", slug: "final-1", label: "Final 1" },
  { deckId: "mock-final", slug: "final-2", label: "Final 2" },
];
for (const definition of deckReportDefinitions) {
  const deckRows = rows.filter((row) => row.deckId === definition.deckId);
  const deckReport = buildDeckFocusReport(deckRows, definition);
  fs.writeFileSync(path.join(reportDir, `${definition.slug}-lecture-focus-report.md`), deckReport.markdown);
  fs.writeFileSync(path.join(reportDir, `${definition.slug}-lecture-focus-data.json`), JSON.stringify(deckReport.data, null, 2) + "\n");
  fs.writeFileSync(path.join(reportDir, `${definition.slug}-question-to-lecture-map.csv`), buildCsv(deckRows));
}
console.log(`Generated lecture reports for ${rows.length} questions across ${decks.length} decks, including Final 1 and Final 2 standalone reports.`);

function validateMatch(match, deckId, questionId) {
  if (!match || !match.primary) throw new Error(`${deckId} ${questionId}: missing primary lecture`);
  if (!["high", "medium", "low"].includes(match.confidence)) {
    throw new Error(`${deckId} ${questionId}: invalid confidence ${match.confidence}`);
  }
  if (!match.rationale || match.rationale.length > 180) {
    throw new Error(`${deckId} ${questionId}: rationale missing or longer than 180 characters`);
  }
  validateLecture(match.primary, `${deckId} ${questionId} primary`);
  if (match.alternate) {
    validateLecture(match.alternate, `${deckId} ${questionId} alternate`);
    if (match.alternate.lectureId === match.primary.lectureId) {
      throw new Error(`${deckId} ${questionId}: alternate duplicates primary`);
    }
  }
}

function validateLecture(value, label) {
  const canonical = catalogById.get(value.lectureId);
  if (!canonical) throw new Error(`${label}: unknown lecture ID ${value.lectureId}`);
  for (const key of ["testGroup", "officialNumber", "title"]) {
    const sourceKey = key === "testGroup" ? "test_group" : key === "officialNumber" ? "official_number" : key;
    if (value[key] !== canonical[sourceKey]) {
      throw new Error(`${label}: ${key} does not match the canonical catalog`);
    }
  }
}

function emptyLectureCount(lecture) {
  return {
    lectureId: lecture.id,
    testGroup: lecture.test_group,
    officialNumber: lecture.official_number,
    title: lecture.title,
    total: 0,
    mock: 0,
    reviews: 0,
    alternates: 0,
    decks: Object.fromEntries(decks.map((deck) => [deck.id, 0])),
  };
}

function countLectures(sourceRows) {
  const counts = new Map(catalog.map((lecture) => [lecture.id, emptyLectureCount(lecture)]));
  for (const row of sourceRows) {
    const item = counts.get(row.primary.lectureId);
    item.total += 1;
    item.decks[row.deckId] += 1;
    if (mockIds.has(row.deckId)) item.mock += 1;
    if (reviewIds.has(row.deckId)) item.reviews += 1;
    if (row.alternate) counts.get(row.alternate.lectureId).alternates += 1;
  }
  return [...counts.values()];
}

function buildFocusReport(sourceRows) {
  const counts = countLectures(sourceRows);
  const mockRows = sourceRows.filter((row) => mockIds.has(row.deckId));
  const reviewRows = sourceRows.filter((row) => reviewIds.has(row.deckId));
  const previousRows = sourceRows.filter((row) => previousPassIds.has(row.deckId));
  const newRows = sourceRows.filter((row) => newDeckIds.has(row.deckId));
  const previousCountsById = new Map(countLectures(previousRows).map((row) => [row.lectureId, row]));
  const newCounts = countLectures(newRows).sort(sortBy("total"));
  const newlySurfaced = newCounts.filter((row) => row.total > 0 && previousCountsById.get(row.lectureId).total === 0);
  const mockCounts = countLectures(mockRows).sort(sortBy("mock"));
  const allCounts = counts.slice().sort(sortBy("total"));
  const confidence = countBy(sourceRows, (row) => row.confidence);
  const mockConfidence = countBy(mockRows, (row) => row.confidence);
  const newConfidence = countBy(newRows, (row) => row.confidence);
  const overallGroups = groupCounts(sourceRows);
  const mockGroups = groupCounts(mockRows);
  const recurring = mockCounts.filter((row) => mockDeckBreadth(row) >= 2 && row.mock > 0);
  const zeroMock = mockCounts.filter((row) => row.mock === 0).sort(officialSort);
  const zeroAll = counts.filter((row) => row.total === 0).sort(officialSort);
  const answerProvenance = countBy(sourceRows, (row) => row.answerSource);
  const inferredAnswers = sourceRows.filter((row) => row.answerSource === "inferred");
  const unknownAnswers = sourceRows.filter((row) => row.answerSource === "unknown");
  const inferredByDeck = countBy(inferredAnswers, (row) => row.deckTitle);
  const unknownByDeck = countBy(unknownAnswers, (row) => row.deckTitle);
  const inferredDeckSummary = decks
    .filter((deck) => inferredByDeck[deck.title])
    .map((deck) => `${deck.title} ${inferredByDeck[deck.title]}`)
    .join(", ");
  const unknownDeckSummary = decks
    .filter((deck) => unknownByDeck[deck.title])
    .map((deck) => `${deck.title} ${unknownByDeck[deck.title]}`)
    .join(", ");
  const topMock = mockCounts.filter((row) => row.mock > 0).slice(0, 15);
  const topAll = allCounts.filter((row) => row.total > 0).slice(0, 15);

  const lines = [
    "# S3 Ghana MED422 likely-lecture cluster report",
    "",
    `**Corpus:** ${sourceRows.length} questions across ${decks.length} decks and ${catalog.length} canonical MED422 lectures.`,
    "",
    "> Counts use the **primary likely lecture** only. Alternates are reported separately. These are study-priority signals from this question bank—not a guarantee of future exam weighting.",
    "",
    "## How to use this report",
    "",
    "1. Prioritize lectures that recur across several mock-exam decks; this is a stronger signal than a large cluster confined to one paper.",
    "2. Use the mock-exam ranking for exam focus. Use the all-bank ranking to plan broad revision, because the Obstetrics/Gynecology review decks intentionally cluster by subject.",
    "3. Open the app's **Likely lecture** flag on any question for its rationale, confidence, and genuine alternate overlap.",
    "4. Treat zero-count lectures as absent from this bank, not automatically unimportant to the official course.",
    "",
    "## Corpus and mapping quality",
    "",
    "| Category | Deck | Questions | Strong | Likely | Possible |",
    "|---|---:|---:|---:|---:|---:|",
  ];

  for (const deck of decks) {
    const deckRows = sourceRows.filter((row) => row.deckId === deck.id);
    const deckConfidence = countBy(deckRows, (row) => row.confidence);
    lines.push(`| ${mockIds.has(deck.id) ? "Mock Exams" : "Reviews"} | ${md(deck.title)} | ${deckRows.length} | ${deckConfidence.high || 0} | ${deckConfidence.medium || 0} | ${deckConfidence.low || 0} |`);
  }
  lines.push(
    `| **All** | **6 decks** | **${sourceRows.length}** | **${confidence.high || 0}** | **${confidence.medium || 0}** | **${confidence.low || 0}** |`,
    "",
    `Alternates were used for **${sourceRows.filter((row) => row.alternate).length}/${sourceRows.length}** questions where content genuinely crosses lecture boundaries.`,
    "",
    "## What changed since the previous 139-question pass",
    "",
    `This mapping pass added lecture coverage for **${newRows.length} existing questions**: Final 2 (${deckById.get("mock-final").questions.length}), Exam 1 (${deckById.get("mock-exam-1").questions.length}), and Exam 2 (${deckById.get("mock-exam-2").questions.length}). The previous Obstetrics, Gynecology, and Final 1 set remains ${previousRows.length} questions.`,
    "",
    `Newly covered-question mapping confidence: **${newConfidence.high || 0} strong**, **${newConfidence.medium || 0} likely**, **${newConfidence.low || 0} possible**.`,
    "",
    "| Rank | Lecture | Final 2 | Exam 1 | Exam 2 | New total | New share |",
    "|---:|---|---:|---:|---:|---:|---:|",
  );
  newCounts.filter((row) => row.total > 0).slice(0, 15).forEach((row, index) => {
    lines.push(`| ${index + 1} | ${code(row)} — ${md(row.title)} | ${row.decks["mock-final"]} | ${row.decks["mock-exam-1"]} | ${row.decks["mock-exam-2"]} | ${row.total} | ${pct(row.total, newRows.length)} |`);
  });
  lines.push(
    "",
    "### Lectures newly surfaced by the added decks",
    "",
    newlySurfaced.length ? newlySurfaced.map((row) => `- ${code(row)} — ${row.title}: ${row.total} new primary match${row.total === 1 ? "" : "es"}`).join("\n") : "- None; every lecture in the new decks already appeared in the original 139-question corpus.",
    "",
    "## Mock-exam focus — strongest priority signal",
    "",
    `This section isolates **${mockRows.length} questions** from Final 1, Final 2, Exam 1, and Exam 2.`,
    "",
    "| Rank | Lecture | Mock questions | Share | Mock decks represented | Alternate mentions |",
    "|---:|---|---:|---:|---:|---:|",
  );
  topMock.forEach((row, index) => lines.push(`| ${index + 1} | ${code(row)} — ${md(row.title)} | ${row.mock} | ${pct(row.mock, mockRows.length)} | ${mockDeckBreadth(row)}/4 | ${row.alternates} |`));

  lines.push(
    "",
    "### Cross-paper recurrence",
    "",
    "Lectures below appear as a primary match in at least two different mock-exam decks.",
    "",
    "| Lecture | Final 1 | Final 2 | Exam 1 | Exam 2 | Mock total | Breadth |",
    "|---|---:|---:|---:|---:|---:|---:|",
  );
  recurring.forEach((row) => lines.push(`| ${code(row)} — ${md(row.title)} | ${row.decks["womens-health"]} | ${row.decks["mock-final"]} | ${row.decks["mock-exam-1"]} | ${row.decks["mock-exam-2"]} | ${row.mock} | ${mockDeckBreadth(row)}/4 |`));

  lines.push(
    "",
    "## All-bank revision footprint",
    "",
    `This includes the **${reviewRows.length}-question** Obstetrics/Gynecology review banks plus all mock exams.`,
    "",
    "| Rank | Lecture | All questions | Share | Reviews | Mock exams |",
    "|---:|---|---:|---:|---:|---:|",
  );
  topAll.forEach((row, index) => lines.push(`| ${index + 1} | ${code(row)} — ${md(row.title)} | ${row.total} | ${pct(row.total, sourceRows.length)} | ${row.reviews} | ${row.mock} |`));

  lines.push(
    "",
    "## Test-group distribution",
    "",
    "| Scope | Test 1 | Test 2 | Test 3 | Total |",
    "|---|---:|---:|---:|---:|",
    `| Mock exams | ${mockGroups[1] || 0} (${pct(mockGroups[1] || 0, mockRows.length)}) | ${mockGroups[2] || 0} (${pct(mockGroups[2] || 0, mockRows.length)}) | ${mockGroups[3] || 0} (${pct(mockGroups[3] || 0, mockRows.length)}) | ${mockRows.length} |`,
    `| All decks | ${overallGroups[1] || 0} (${pct(overallGroups[1] || 0, sourceRows.length)}) | ${overallGroups[2] || 0} (${pct(overallGroups[2] || 0, sourceRows.length)}) | ${overallGroups[3] || 0} (${pct(overallGroups[3] || 0, sourceRows.length)}) | ${sourceRows.length} |`,
    "",
    "## Top clusters inside each deck",
    "",
  );

  for (const deck of decks) {
    const deckRows = sourceRows.filter((row) => row.deckId === deck.id);
    const deckCountMap = countBy(deckRows, (row) => row.primary.lectureId);
    const top = [...catalog]
      .map((lecture) => ({ lecture, count: deckCountMap[lecture.id] || 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || officialSort(a.lecture, b.lecture))
      .slice(0, 8);
    lines.push(`### ${md(deck.title)} — ${deckRows.length} questions`, "", "| Lecture | Questions | Deck share |", "|---|---:|---:|");
    top.forEach(({ lecture, count }) => lines.push(`| T${lecture.test_group}.L${lecture.official_number} — ${md(lecture.title)} | ${count} | ${pct(count, deckRows.length)} |`));
    lines.push("");
  }

  lines.push(
    "## Complete lecture-by-deck matrix",
    "",
    "Sorted by mock-exam primary count, then all-bank count. A zero means no question had that lecture as its primary match.",
    "",
    "| Lecture | Obs | Gyn | Final 1 | Final 2 | Exam 1 | Exam 2 | Mock | All | Alt mentions |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  );
  [...counts].sort((a, b) => b.mock - a.mock || b.total - a.total || officialSort(a, b)).forEach((row) => {
    lines.push(`| ${code(row)} — ${md(row.title)} | ${row.decks.obs} | ${row.decks.gyn} | ${row.decks["womens-health"]} | ${row.decks["mock-final"]} | ${row.decks["mock-exam-1"]} | ${row.decks["mock-exam-2"]} | ${row.mock} | ${row.total} | ${row.alternates} |`);
  });

  lines.push(
    "",
    "## Coverage gaps and cautions",
    "",
    `- **${zeroMock.length}/${catalog.length} lectures** have no primary match in the four mock-exam decks.`,
    `- **${zeroAll.length}/${catalog.length} lectures** have no primary match anywhere in the six-deck corpus.`,
    `- Mapping confidence: **${confidence.high || 0} strong**, **${confidence.medium || 0} likely**, **${confidence.low || 0} possible**.`,
    `- Mock-only confidence: **${mockConfidence.high || 0} strong**, **${mockConfidence.medium || 0} likely**, **${mockConfidence.low || 0} possible**.`,
    `- **Answer-key provenance:** ${answerProvenance.circled || 0} circled from captured papers, ${inferredAnswers.length} inferred (${inferredDeckSummary}), and ${unknownAnswers.length} unrecorded (${unknownDeckSummary}). Unknown values remain unknown rather than being treated as source-confirmed. This is separate from lecture-match confidence.`,
    "- **Final 2 Q41:** the original item capture was truncated; its options/key were reconstructed. The Endometriosis lecture independently supports the mapped Sampson-theory answer.",
    "- Frequency measures what this collected bank repeated. It does not replace the official lecture roster, announced scope, or marked/highlighted lecturer priorities.",
    "",
    "### No primary match in mock exams",
    "",
    zeroMock.length ? zeroMock.map((row) => `- ${code(row)} — ${row.title}${row.alternates ? ` (${row.alternates} alternate mention${row.alternates === 1 ? "" : "s"})` : ""}`).join("\n") : "- None.",
    "",
    "### No primary match anywhere",
    "",
    zeroAll.length ? zeroAll.map((row) => `- ${code(row)} — ${row.title}${row.alternates ? ` (${row.alternates} alternate mention${row.alternates === 1 ? "" : "s"})` : ""}`).join("\n") : "- None.",
    "",
    "## Detailed evidence",
    "",
    "- `question-to-lecture-map.md` — every question, primary/alternate lecture, confidence, and rationale.",
    "- `question-to-lecture-map.csv` — spreadsheet-ready version including full question text.",
    "- `lecture-focus-data.json` — machine-readable counts for future updates.",
    "",
  );

  return {
    markdown: lines.join("\n"),
    data: {
      totals: { questions: sourceRows.length, decks: decks.length, lectures: catalog.length, mockQuestions: mockRows.length, reviewQuestions: reviewRows.length },
      confidence,
      mockConfidence,
      newConfidence,
      testGroups: { all: overallGroups, mock: mockGroups },
      lectures: counts,
      mockLectures: mockCounts,
      newDeckLectureCounts: newCounts,
      newlySurfacedLectureIds: newlySurfaced.map((row) => row.lectureId),
      zeroMockLectureIds: zeroMock.map((row) => row.lectureId),
      zeroAllLectureIds: zeroAll.map((row) => row.lectureId),
      answerProvenance: { ...answerProvenance, inferredByDeck, unknownByDeck },
    },
  };
}

function buildDeckFocusReport(sourceRows, definition) {
  if (!sourceRows.length) throw new Error(`No rows found for ${definition.deckId}`);
  if (sourceRows.some((row) => row.deckId !== definition.deckId)) {
    throw new Error(`${definition.label}: standalone report received rows from another deck`);
  }

  const lectureRows = countLectures(sourceRows)
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || officialSort(a, b));
  const confidence = countBy(sourceRows, (row) => row.confidence);
  const answerProvenance = countBy(sourceRows, (row) => row.answerSource);
  const testGroups = groupCounts(sourceRows);
  const alternateRows = sourceRows.filter((row) => row.alternate);
  const lowerConfidenceRows = sourceRows.filter((row) => row.confidence !== "high");
  const questionNumbersByLecture = new Map();
  for (const row of sourceRows) {
    const values = questionNumbersByLecture.get(row.primary.lectureId) || [];
    values.push(row.questionNum);
    questionNumbersByLecture.set(row.primary.lectureId, values);
  }

  const repeatedLectures = lectureRows.filter((row) => row.total >= 2);
  const highPriorityLectures = lectureRows.filter((row) => row.total >= 3);
  const highPriorityQuestions = highPriorityLectures.reduce((sum, row) => sum + row.total, 0);
  const maxCount = lectureRows[0].total;
  const leaders = lectureRows.filter((row) => row.total === maxCount);
  const singletonLectures = lectureRows.filter((row) => row.total === 1);
  const title = `S3 Ghana MED422 — ${definition.label} lecture-focus report`;
  const lines = [
    `# ${title}`,
    "",
    `**Scope:** ${sourceRows.length} questions from ${definition.label} only · ${lectureRows.length}/${catalog.length} canonical lectures represented · ${alternateRows.length} genuine cross-lecture overlaps.`,
    "",
    "> Counts use each question’s primary likely lecture. They are revision signals from this paper—not guarantees of future exam weighting. Answer-key provenance and lecture-match confidence are kept separate.",
    "",
    "## Bottom line",
    "",
  ];

  if (definition.deckId === "womens-health") {
    lines.push(
      `- **Concentrated paper:** ${highPriorityLectures.length} lectures with at least 3 questions account for **${highPriorityQuestions}/${sourceRows.length} (${pct(highPriorityQuestions, sourceRows.length)})** of the deck.`,
      `- **First priority:** ${leaders.map((row) => `${code(row)} ${row.title}`).join(" and ")} lead with **${maxCount} questions each**.`,
      `- **Test 1 dominates:** ${testGroups[1] || 0}/${sourceRows.length} questions (${pct(testGroups[1] || 0, sourceRows.length)}) map to Test 1 lectures.`,
      `- Best use: master the ${leaders.length} leaders, then the ${highPriorityLectures.length - leaders.length} other three-question clusters before the two-question and singleton topics.`,
    );
  } else {
    lines.push(
      `- **Broad-coverage paper:** ${lectureRows.length} distinct primary lectures appear across ${sourceRows.length} questions; no lecture appears more than **${maxCount} times**.`,
      `- Only **${repeatedLectures.length} lectures** repeat; the other ${singletonLectures.length} represented lectures appear once each.`,
      `- **Even test-group spread:** Test 1, Test 2, and Test 3 each contribute **${testGroups[1] || 0} questions**.`,
      `- Best use: revise broadly across all three tests, then give the ${repeatedLectures.length} repeated lectures a short extra pass. Do not overfit to a narrow cluster.`,
    );
  }

  lines.push("", "## Revision order", "");
  if (definition.deckId === "womens-health") {
    const tiers = [
      ["Tier 1 — highest priority", lectureRows.filter((row) => row.total >= 4)],
      ["Tier 2 — major clusters", lectureRows.filter((row) => row.total === 3)],
      ["Tier 3 — supporting topics", lectureRows.filter((row) => row.total === 2)],
      ["Tier 4 — single questions", lectureRows.filter((row) => row.total === 1)],
    ];
    for (const [tier, tierRows] of tiers) {
      const questions = tierRows.reduce((sum, row) => sum + row.total, 0);
      lines.push(`### ${tier}`, "", `**${questions} questions · ${pct(questions, sourceRows.length)} of Final 1**`, "");
      for (const row of tierRows) {
        lines.push(
          `- **${code(row)} — ${md(row.title)}**`,
          `    - ${row.total} question${row.total === 1 ? "" : "s"}: ${formatQuestionList(questionNumbersByLecture.get(row.lectureId))}`,
        );
      }
      lines.push("");
    }
  } else {
    lines.push(
      `### Give these ${repeatedLectures.length} an extra pass`,
      "",
      "These are the only lectures repeated in Final 2.",
      "",
    );
    for (const row of repeatedLectures) {
      lines.push(
        `- **${code(row)} — ${md(row.title)}**`,
        `    - ${formatQuestionList(questionNumbersByLecture.get(row.lectureId))} · ${pct(row.total, sourceRows.length)} of the paper`,
      );
    }
    lines.push(
      "",
      "### Then revise broadly",
      "",
      `The remaining ${singletonLectures.length} questions each map to a different lecture. Final 2 rewards breadth more than narrow topic prediction.`,
    );
  }

  lines.push("", "## Test-group distribution", "");
  for (const testGroup of [1, 2, 3]) {
    const groupRows = lectureRows.filter((row) => row.testGroup === testGroup);
    lines.push(
      `- **Test ${testGroup}: ${testGroups[testGroup] || 0} questions (${pct(testGroups[testGroup] || 0, sourceRows.length)})**`,
      `    - ${groupRows.length} distinct primary lectures`,
    );
  }

  lines.push(
    "",
    "## Complete lecture footprint",
    "",
    "Every retained question appears below under its primary likely lecture.",
    "",
  );
  for (const row of lectureRows) {
    lines.push(
      `- **${code(row)} — ${md(row.title)}**`,
      `    - ${row.total} question${row.total === 1 ? "" : "s"} · ${pct(row.total, sourceRows.length)} · ${formatQuestionList(questionNumbersByLecture.get(row.lectureId))}`,
    );
  }

  lines.push(
    "",
    "## Mapping quality and answer provenance",
    "",
    `- **Lecture match:** ${confidence.high || 0} strong · ${confidence.medium || 0} likely · ${confidence.low || 0} possible`,
    `- **Answer key:** ${answerProvenance.circled || 0} circled · ${answerProvenance.inferred || 0} inferred/reconstructed · ${answerProvenance.unknown || 0} unknown`,
    "",
  );

  if (definition.deckId === "womens-health") {
    lines.push("All 55 Final 1 answer keys are marked **inferred** in the legacy deck data. This is a provenance limitation, not a downgrade of the lecture mapping: 51/55 lecture matches are strong.", "");
  } else {
    lines.push("Final 2 has 47 questions with **unknown/unrecorded** answer provenance. Q41 alone is explicitly inferred/reconstructed from a truncated capture. Unknown is not treated as source-confirmed.", "");
  }

  lines.push("## Lower-confidence mappings", "");
  if (lowerConfidenceRows.length) {
    for (const row of lowerConfidenceRows) {
      lines.push(
        `### Q${md(row.questionNum)} — ${lectureLabel(row.primary)}`,
        "",
        `**${confidenceLabel(row.confidence)} match.** ${md(deckLowerConfidenceRationale(row, definition.deckId))}`,
        "",
      );
    }
  } else {
    lines.push("- None; every lecture match is strong.");
  }

  lines.push(
    "",
    `## Cross-lecture overlaps — ${alternateRows.length}/${sourceRows.length}`,
    "",
    "These are genuine overlaps, not duplicate assignments.",
    "",
  );
  if (alternateRows.length) {
    for (const row of alternateRows) {
      lines.push(
        `- **Q${md(row.questionNum)}**`,
        `    - Primary: ${lectureLabel(row.primary)}`,
        `    - Alternate: ${lectureLabel(row.alternate)}`,
      );
    }
  } else {
    lines.push("- None.");
  }

  lines.push("", "## Source and item cautions", "");
  for (const caution of deckCautions(definition.deckId)) lines.push(`- ${caution}`);

  lines.push(
    "",
    "## Detailed evidence",
    "",
    `- \`${definition.slug}-question-to-lecture-map.csv\` — all ${sourceRows.length} questions with full text, primary/alternate lecture, confidence, rationale, keyed answer, and provenance.`,
    `- \`${definition.slug}-lecture-focus-data.json\` — machine-readable deck-only counts and mappings.`,
    "- The quiz’s **Likely lecture** flag shows the same mapping beside each live question.",
    "",
  );

  return {
    markdown: lines.join("\n"),
    data: {
      deckId: definition.deckId,
      deckTitle: definition.label,
      layout: "mobile-portrait",
      questions: sourceRows.length,
      canonicalLectures: catalog.length,
      distinctPrimaryLectures: lectureRows.length,
      alternateMappings: alternateRows.length,
      confidence,
      answerProvenance,
      testGroups,
      maxPrimaryCount: maxCount,
      lectures: lectureRows.map(({ mock, reviews, decks, ...row }) => ({
        ...row,
        questionNumbers: questionNumbersByLecture.get(row.lectureId),
      })),
      lowerConfidenceQuestions: lowerConfidenceRows.map((row) => ({
        questionId: row.questionId,
        questionNumber: row.questionNum,
        confidence: row.confidence,
        primary: row.primary,
        rationale: row.rationale,
      })),
      alternateQuestions: alternateRows.map((row) => ({
        questionId: row.questionId,
        questionNumber: row.questionNum,
        primary: row.primary,
        alternate: row.alternate,
      })),
    },
  };
}

function deckCautions(deckId) {
  if (deckId === "womens-health") {
    return [
      "**Answer-key provenance:** all 55 keyed answers are inherited as inferred rather than visibly circled/source-confirmed.",
      "**Source numbering:** this retained deck contains Q1–36 and Q42–60; Q37–41 are absent from the source, which is why 55 questions extend through Q60.",
      "**Q19:** low ferritin is not explicitly supported by the verified AUB lecture as a predictor of heavy menstrual bleeding.",
      "**Q21:** the dysmenorrhea lecture is the topical home, but the exact high-frequency TENS efficacy claim is absent from the verified text.",
      "**Q46:** the normal-labour lecture is the best topical match, but it does not state the exact warm-compress/controlled-head-delivery detail.",
    ];
  }
  return [
    "**Q12:** the stem says oxygen “concentration,” while the options are flow rates; 15 L/min is supported by the maternal-collapse lecture.",
    "**Q18:** the exact Pinard/Doppler and timing technique is not stated in the verified normal-labour lecture.",
    "**Q19:** the sickle-cell item has potential single-best-answer ambiguity around prophylactic heparin wording.",
    "**Q22:** “vulvodynia” is absent from the verified corpus; the mapped vulval-conditions lecture is the closest topical source.",
    "**Q23:** wording differs between the first visible gestational sac and the earliest definitive yolk-sac sign; antenatal care is primary and ultrasound is alternate.",
    "**Q40:** the captured item has only three options, unlike surrounding four-option questions.",
    "**Q41:** the source capture was truncated; its options/key were reconstructed, although the Endometriosis lecture independently supports Sampson’s theory.",
    "**Q43:** the ovarian-cancer lecture strongly supports the topic, but does not explicitly state “transcoelomic” as the most common route.",
  ];
}

function deckLowerConfidenceRationale(row, deckId) {
  if (deckId === "womens-health" && String(row.questionId) === "43") {
    return "Mechanism and normal-labour lectures both directly support active labour at 7 cm and non-engagement at −2; medium reflects defensible primary/alternate ordering.";
  }
  return row.rationale;
}

function formatQuestionList(values) {
  return [...values]
    .sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)))
    .map((value) => `Q${value}`)
    .join(", ");
}

function buildQuestionAppendix(sourceRows) {
  const lines = [
    "# Complete question-to-lecture map",
    "",
    `All ${sourceRows.length} questions are mapped to one primary MED422 lecture. Alternates appear only for genuine overlap.`,
    "",
  ];
  for (const deck of decks) {
    const deckRows = sourceRows.filter((row) => row.deckId === deck.id);
    lines.push(`## ${md(deck.title)} — ${deckRows.length} questions`, "", "| Q | Likely lecture | Alternate | Confidence | Why | Question |", "|---:|---|---|---|---|---|");
    for (const row of deckRows) {
      lines.push(`| ${md(row.questionNum)} | ${lectureLabel(row.primary)} | ${row.alternate ? lectureLabel(row.alternate) : "—"} | ${confidenceLabel(row.confidence)} | ${md(row.rationale)} | ${md(shorten(row.question, 150))} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildCsv(sourceRows) {
  const columns = [
    "deck_id", "deck_title", "category", "question_id", "question_number", "question", "correct_answer", "answer_source",
    "primary_lecture_id", "primary_test", "primary_official_number", "primary_title",
    "alternate_lecture_id", "alternate_test", "alternate_official_number", "alternate_title",
    "confidence", "rationale",
  ];
  const lines = [columns.join(",")];
  for (const row of sourceRows) {
    const values = [
      row.deckId, row.deckTitle, row.category, row.questionId, row.questionNum, row.question, row.correct, row.answerSource,
      row.primary.lectureId, row.primary.testGroup, row.primary.officialNumber, row.primary.title,
      row.alternate?.lectureId ?? "", row.alternate?.testGroup ?? "", row.alternate?.officialNumber ?? "", row.alternate?.title ?? "",
      row.confidence, row.rationale,
    ];
    lines.push(values.map(csv).join(","));
  }
  return lines.join("\n") + "\n";
}

function groupCounts(sourceRows) {
  return countBy(sourceRows, (row) => row.primary.testGroup);
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function mockDeckBreadth(row) {
  return [...mockIds].filter((id) => row.decks[id] > 0).length;
}

function sortBy(field) {
  return (a, b) => b[field] - a[field] || officialSort(a, b);
}

function officialSort(a, b) {
  const at = a.testGroup ?? a.test_group;
  const bt = b.testGroup ?? b.test_group;
  const an = a.officialNumber ?? a.official_number;
  const bn = b.officialNumber ?? b.official_number;
  return at - bt || an - bn || a.id - b.id;
}

function code(lecture) {
  return `T${lecture.testGroup}.L${lecture.officialNumber}`;
}

function lectureLabel(lecture) {
  return `${code(lecture)} — ${md(lecture.title)}`;
}

function confidenceLabel(value) {
  return value === "high" ? "Strong" : value === "medium" ? "Likely" : "Possible";
}

function pct(count, total) {
  return `${(count * 100 / total).toFixed(1)}%`;
}

function shorten(value, limit) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).trimEnd()}…`;
}

function md(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function csv(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
