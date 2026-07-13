import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);
for (const file of [
  "data/obs.js",
  "data/gyn.js",
  "data/womens-health.js",
  "data/lecture-tags.js",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const decks = context.window.QUIZ_DECKS;
const tags = context.window.LECTURE_TAGS;
assert.ok(Array.isArray(decks) && decks.length === 3, "all three quiz decks must load");
assert.ok(tags && typeof tags === "object", "lecture tag data must load");

let questionCount = 0;
let tagCount = 0;
for (const deck of decks) {
  const deckTags = tags[deck.id];
  assert.ok(deckTags && typeof deckTags === "object", `missing lecture tags for ${deck.id}`);
  const expectedIds = Array.from(deck.questions, (q) => String(q.id)).sort();
  const actualIds = Object.keys(deckTags).sort();
  assert.deepEqual(actualIds, expectedIds, `${deck.id} must map every question exactly once`);

  for (const question of deck.questions) {
    questionCount += 1;
    const match = deckTags[String(question.id)];
    tagCount += 1;
    assert.ok(["high", "medium", "low"].includes(match.confidence), `${deck.id} ${question.id}: invalid confidence`);
    assert.ok(typeof match.rationale === "string" && match.rationale.trim(), `${deck.id} ${question.id}: missing rationale`);
    assert.ok(match.rationale.length <= 180, `${deck.id} ${question.id}: rationale is too long`);
    validateLecture(match.primary, `${deck.id} ${question.id} primary`);
    if (match.alternate != null) {
      validateLecture(match.alternate, `${deck.id} ${question.id} alternate`);
      assert.notEqual(match.alternate.lectureId, match.primary.lectureId, `${deck.id} ${question.id}: duplicate alternate`);
    }
  }
}

assert.equal(questionCount, 139, "source decks changed; review mappings before deployment");
assert.equal(tagCount, questionCount, "every source question must have one mapping");

const html = fs.readFileSync("index.html", "utf8");
assert.ok(
  html.indexOf('src="data/lecture-tags.js"') < html.indexOf('src="js/app.js"'),
  "lecture tags must load before the app",
);
const app = fs.readFileSync("js/app.js", "utf8");
assert.match(app, /lectureMatchHTML\(q\)/, "question view must render lecture tags");
assert.match(app, /\*\*Likely lecture:\*\*/, "wrong-answer export must retain lecture context");

console.log(`PASS: ${tagCount} lecture mappings cover all ${decks.length} decks.`);

function validateLecture(lecture, label) {
  assert.ok(lecture && typeof lecture === "object", `${label}: missing lecture`);
  assert.ok(Number.isInteger(lecture.lectureId) && lecture.lectureId > 0, `${label}: invalid lectureId`);
  assert.ok(Number.isInteger(lecture.testGroup) && lecture.testGroup >= 1 && lecture.testGroup <= 3, `${label}: invalid testGroup`);
  assert.ok(Number.isInteger(lecture.officialNumber) && lecture.officialNumber > 0, `${label}: invalid officialNumber`);
  assert.ok(typeof lecture.title === "string" && lecture.title.trim(), `${label}: missing title`);
}
