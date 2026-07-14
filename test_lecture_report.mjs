import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const reportDataPath = "reports/lecture-focus-data.json";
const reportMarkdownPath = "reports/lecture-focus-report.md";
const csvPath = "reports/question-to-lecture-map.csv";
const pdfPath = "reports/S3-Ghana_MED422_Lecture_Focus_Report.pdf";
const freshnessPath = "reports/S3-Ghana_MED422_Lecture_Focus_Report.source.sha256";
const corpusManifestPath = "reports/audits/lecture-corpus-manifest.json";

const data = JSON.parse(fs.readFileSync(reportDataPath, "utf8"));
assert.deepEqual(data.totals, {
  questions: 220,
  decks: 6,
  lectures: 50,
  mockQuestions: 136,
  reviewQuestions: 84,
});
assert.deepEqual(data.confidence, { high: 200, medium: 17, low: 3 });
assert.deepEqual(data.mockConfidence, { high: 127, medium: 7, low: 2 });
assert.deepEqual(data.newConfidence, { high: 76, medium: 5 });
assert.equal(data.lectures.length, 50, "all-bank report must include all 50 lectures");
assert.equal(data.mockLectures.length, 50, "mock-scoped report must include all 50 lectures");
assert.deepEqual(data.answerProvenance, {
  circled: 83,
  inferred: 57,
  unknown: 80,
  inferredByDeck: { Gynecology: 1, "Final 1": 55, "Final 2": 1 },
  unknownByDeck: { "Final 2": 47, "Exam 1": 16, "Exam 2": 17 },
});

const allByCode = byCode(data.lectures);
const mockByCode = byCode(data.mockLectures);
assert.equal(allByCode.get("1:6").alternates, 5, "all-bank T1.L6 alternate count changed unexpectedly");
assert.equal(mockByCode.get("1:6").alternates, 1, "mock-only T1.L6 alternates must exclude review decks");
assert.equal(allByCode.get("1:3").alternates, 5, "all-bank T1.L3 alternate count changed unexpectedly");
assert.equal(mockByCode.get("1:3").alternates, 3, "mock-only T1.L3 alternates must exclude review decks");
assert.equal(allByCode.get("3:1").alternates, 4, "all-bank Subfertility alternate count changed unexpectedly");
assert.equal(mockByCode.get("3:1").alternates, 2, "mock-only Subfertility alternates must exclude review decks");
assert.equal(mockByCode.get("3:1").mock, 0, "Subfertility must remain a no-primary mock gap");

const reportMarkdown = fs.readFileSync(reportMarkdownPath, "utf8");
assert.match(reportMarkdown, /added lecture coverage for \*\*81 existing questions\*\*/);
assert.doesNotMatch(reportMarkdown, /repository added \*\*81 questions\*\*/i);
assert.match(reportMarkdown, /80 unrecorded/);
assert.match(reportMarkdown, /Unknown values remain unknown/);

const csvRows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = csvRows.shift();
assert.equal(csvRows.length, 220, "question mapping CSV must contain 220 data rows");
const deckIndex = header.indexOf("deck_id");
const questionIndex = header.indexOf("question_id");
const answerSourceIndex = header.indexOf("answer_source");
assert.ok(deckIndex >= 0 && questionIndex >= 0 && answerSourceIndex >= 0, "CSV contract columns are missing");
assert.equal(new Set(csvRows.map((row) => `${row[deckIndex]}:${row[questionIndex]}`)).size, 220, "CSV question keys must be unique");
const provenance = countBy(csvRows, (row) => row[answerSourceIndex]);
assert.deepEqual(provenance, { circled: 83, inferred: 57, unknown: 80 });
assert.ok(!Object.hasOwn(provenance, "source"), "missing provenance must not be promoted to source-confirmed");

const corpusManifestText = fs.readFileSync(corpusManifestPath, "utf8");
const corpusManifest = JSON.parse(corpusManifestText);
assert.equal(corpusManifest.lecture_count, 50, "audit corpus manifest must cover all 50 lectures");
assert.equal(corpusManifest.lectures.length, 50, "audit corpus manifest list must contain 50 lectures");
assert.equal(new Set(corpusManifest.lectures.map((lecture) => lecture.lecture_id)).size, 50, "audit corpus lecture IDs must be unique");
assert.equal(new Set(corpusManifest.lectures.map((lecture) => `${lecture.test_group}:${lecture.official_number}`)).size, 50, "audit corpus lecture codes must be unique");
assert.ok(corpusManifest.lectures.every((lecture) => /^[a-f0-9]{64}$/.test(lecture.source_pdf_sha256) && /^[a-f0-9]{64}$/.test(lecture.text_sha256)), "audit corpus hashes must be SHA-256 values");
assert.doesNotMatch(corpusManifestText, /\/(?:root|tmp)\//, "audit corpus manifest must not expose machine-local absolute paths");

const sourceHash = crypto.createHash("sha256").update(fs.readFileSync(reportMarkdownPath)).digest("hex");
const reportChecksums = readChecksums(freshnessPath);
assert.equal(reportChecksums.get("lecture-focus-report.md"), sourceHash, "tracked PDF source is stale; run scripts/render_lecture_report.py");
const pdf = fs.readFileSync(pdfPath);
assert.ok(pdf.length > 10_000 && pdf.subarray(0, 5).toString() === "%PDF-", "tracked PDF is invalid");
assert.equal(
  reportChecksums.get("S3-Ghana_MED422_Lecture_Focus_Report.pdf"),
  crypto.createHash("sha256").update(pdf).digest("hex"),
  "tracked PDF bytes do not match the renderer manifest",
);

const standaloneReports = [
  {
    slug: "final-1",
    deckId: "womens-health",
    expected: {
      questions: 55,
      distinctPrimaryLectures: 22,
      alternateMappings: 7,
      confidence: { high: 51, medium: 2, low: 2 },
      answerProvenance: { inferred: 55 },
      testGroups: { 1: 38, 2: 11, 3: 6 },
      maxPrimaryCount: 4,
    },
    pdf: "reports/S3-Ghana_MED422_Final_1_Lecture_Focus_Report.pdf",
    freshness: "reports/S3-Ghana_MED422_Final_1_Lecture_Focus_Report.source.sha256",
  },
  {
    slug: "final-2",
    deckId: "mock-final",
    expected: {
      questions: 48,
      distinctPrimaryLectures: 43,
      alternateMappings: 17,
      confidence: { high: 45, medium: 3 },
      answerProvenance: { unknown: 47, inferred: 1 },
      testGroups: { 1: 16, 2: 16, 3: 16 },
      maxPrimaryCount: 2,
    },
    pdf: "reports/S3-Ghana_MED422_Final_2_Lecture_Focus_Report.pdf",
    freshness: "reports/S3-Ghana_MED422_Final_2_Lecture_Focus_Report.source.sha256",
  },
];

for (const report of standaloneReports) {
  const markdownPath = `reports/${report.slug}-lecture-focus-report.md`;
  const dataPath = `reports/${report.slug}-lecture-focus-data.json`;
  const deckCsvPath = `reports/${report.slug}-question-to-lecture-map.csv`;
  const deckData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  for (const [key, value] of Object.entries(report.expected)) {
    assert.deepEqual(deckData[key], value, `${report.slug} ${key} changed unexpectedly`);
  }
  assert.equal(deckData.deckId, report.deckId);
  assert.equal(deckData.lectures.reduce((sum, lecture) => sum + lecture.total, 0), report.expected.questions);
  const footprintNumbers = deckData.lectures.flatMap((lecture) => lecture.questionNumbers.map(String));
  assert.equal(footprintNumbers.length, report.expected.questions, `${report.slug} footprint must include every question`);
  assert.equal(new Set(footprintNumbers).size, report.expected.questions, `${report.slug} footprint question numbers must be unique`);

  const deckCsvRows = parseCsv(fs.readFileSync(deckCsvPath, "utf8"));
  const deckHeader = deckCsvRows.shift();
  const deckIdIndex = deckHeader.indexOf("deck_id");
  const deckQuestionNumberIndex = deckHeader.indexOf("question_number");
  assert.ok(deckIdIndex >= 0 && deckQuestionNumberIndex >= 0, `${report.slug} CSV contract columns are missing`);
  assert.equal(deckCsvRows.length, report.expected.questions, `${report.slug} CSV row count is wrong`);
  assert.ok(deckCsvRows.every((row) => row[deckIdIndex] === report.deckId), `${report.slug} CSV leaked another deck`);
  assert.deepEqual(
    new Set(deckCsvRows.map((row) => row[deckQuestionNumberIndex])),
    new Set(footprintNumbers),
    `${report.slug} CSV and lecture footprint question numbers differ`,
  );

  const deckSourceHash = crypto.createHash("sha256").update(fs.readFileSync(markdownPath)).digest("hex");
  const deckChecksums = readChecksums(report.freshness);
  assert.equal(deckChecksums.get(markdownPath.split("/").at(-1)), deckSourceHash, `${report.slug} PDF source is stale; run scripts/render_lecture_report.py`);
  const deckPdf = fs.readFileSync(report.pdf);
  assert.ok(deckPdf.length > 10_000 && deckPdf.subarray(0, 5).toString() === "%PDF-", `${report.slug} PDF is invalid`);
  assert.equal(
    deckChecksums.get(report.pdf.split("/").at(-1)),
    crypto.createHash("sha256").update(deckPdf).digest("hex"),
    `${report.slug} PDF bytes do not match the renderer manifest`,
  );
}

console.log("PASS: report counts, provenance, mock scoping, standalone deck reports, CSV, and PDF freshness are valid.");

function byCode(rows) {
  const result = new Map(rows.map((row) => [`${row.testGroup}:${row.officialNumber}`, row]));
  assert.equal(result.size, 50, "lecture report codes must be unique");
  return result;
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function readChecksums(filePath) {
  const checksums = new Map();
  for (const line of fs.readFileSync(filePath, "utf8").trim().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `${filePath} contains an invalid checksum line`);
    assert.ok(!checksums.has(match[2]), `${filePath} contains a duplicate checksum name`);
    checksums.set(match[2], match[1]);
  }
  assert.equal(checksums.size, 2, `${filePath} must bind one Markdown source and one PDF`);
  return checksums;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  assert.equal(quoted, false, "CSV ended inside a quoted field");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
