import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const dataFiles = [
  "data/obs.js",
  "data/gyn.js",
  "data/womens-health.js",
  "data/mock-final.js",
  "data/mock-exam-1.js",
  "data/mock-exam-2.js",
];
const expectedDeckCounts = {
  obs: 35,
  gyn: 49,
  "womens-health": 55,
  "mock-final": 48,
  "mock-exam-1": 16,
  "mock-exam-2": 17,
};
const context = { window: {} };
vm.createContext(context);
for (const file of [...dataFiles, "data/lecture-tags.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const decks = context.window.QUIZ_DECKS;
const tags = context.window.LECTURE_TAGS;
const catalog = JSON.parse(fs.readFileSync("data/lecture-catalog.json", "utf8"));
const catalogById = new Map(catalog.map((lecture) => [lecture.id, lecture]));
assert.ok(Array.isArray(decks) && decks.length === 6, "all six quiz decks must load");
assert.ok(tags && typeof tags === "object", "lecture tag data must load");
assert.equal(catalog.length, 50, "canonical MED422 lecture catalog must contain 50 lectures");
assert.deepEqual(Object.keys(tags).sort(), Object.keys(expectedDeckCounts).sort(), "tag data must cover exactly the six source decks");

let questionCount = 0;
let tagCount = 0;
const seenQuestionKeys = new Set();
for (const deck of decks) {
  assert.equal(deck.questions.length, expectedDeckCounts[deck.id], `${deck.id}: unexpected source question count`);
  const deckTags = tags[deck.id];
  assert.ok(deckTags && typeof deckTags === "object", `missing lecture tags for ${deck.id}`);
  const expectedIds = Array.from(deck.questions, (q) => String(q.id)).sort(numericSort);
  const actualIds = Object.keys(deckTags).sort(numericSort);
  assert.deepEqual(actualIds, expectedIds, `${deck.id} must map every question exactly once`);

  for (const question of deck.questions) {
    questionCount += 1;
    const stableKey = `${deck.id}:${question.id}`;
    assert.ok(!seenQuestionKeys.has(stableKey), `${stableKey}: duplicate source question key`);
    seenQuestionKeys.add(stableKey);
    const match = deckTags[String(question.id)];
    tagCount += 1;
    assert.ok(["high", "medium", "low"].includes(match.confidence), `${stableKey}: invalid confidence`);
    assert.ok(typeof match.rationale === "string" && match.rationale.trim(), `${stableKey}: missing rationale`);
    assert.ok(match.rationale.length <= 180, `${stableKey}: rationale is too long`);
    validateLecture(match.primary, `${stableKey} primary`);
    if (match.alternate != null) {
      validateLecture(match.alternate, `${stableKey} alternate`);
      assert.notEqual(match.alternate.lectureId, match.primary.lectureId, `${stableKey}: duplicate alternate`);
    }
  }
}

assert.equal(questionCount, 220, "source decks changed; review mappings before deployment");
assert.equal(tagCount, questionCount, "every source question must have one mapping");

const html = fs.readFileSync("index.html", "utf8");
for (const file of dataFiles) {
  assert.ok(html.includes(`src="${file}"`), `${file} must load in index.html`);
  assert.ok(
    html.indexOf(`src="${file}"`) < html.indexOf('src="data/lecture-tags.js"'),
    `${file} must load before lecture tags`,
  );
}
assert.ok(
  html.indexOf('src="data/lecture-tags.js"') < html.indexOf('src="js/app.js"'),
  "lecture tags must load before the app",
);
const app = fs.readFileSync("js/app.js", "utf8");
assert.match(app, /lectureMatchHTML\(q\)/, "question view must render lecture tags");
assert.match(app, /\*\*Likely lecture:\*\*/, "wrong-answer export must retain lecture context");
assert.match(app, /label \+= ", likely lecture " \+ match\.primary\.title/, "question grid must expose lecture context accessibly");

console.log(`PASS: ${tagCount} canonical lecture mappings cover all ${decks.length} decks.`);

function validateLecture(lecture, label) {
  assert.ok(lecture && typeof lecture === "object", `${label}: missing lecture`);
  const canonical = catalogById.get(lecture.lectureId);
  assert.ok(canonical, `${label}: unknown lectureId ${lecture.lectureId}`);
  assert.equal(lecture.testGroup, canonical.test_group, `${label}: testGroup is not canonical`);
  assert.equal(lecture.officialNumber, canonical.official_number, `${label}: officialNumber is not canonical`);
  assert.equal(lecture.title, canonical.title, `${label}: title is not canonical`);
}

function numericSort(a, b) {
  return Number(a) - Number(b);
}
