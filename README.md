# OB/GYN Revision

A polished, mobile-first, zero-build static quiz web app for revising OB/GYN MCQ decks. The decks are grouped into two categories you switch between with the top tab bar: **Reviews** (Obstetrics, Gynecology) and **Mock Exams** (Final 1, Final 2, Exam 1, Exam 2). It runs entirely in the browser with no frameworks, no build step and no external assets — quiz data is loaded via plain `<script>` tags so the app works both when opened directly from disk (`file://`) and when served statically (e.g. GitHub Pages). It supports up to 5 renamable local profiles, per-profile/per-deck progress saved in `localStorage`, a question grid, per-option explanations, a "Key concept" teaching card, and one-click export of your wrong answers as a Markdown file ready to paste into ChatGPT.

## Study features

- **Retry wrong** (completion screen or question grid): clears only your wrong and "I don't know" answers — correct ones are kept — so you can re-attempt just your weak spots without resetting the whole deck.
- **Shuffle** (question grid): randomises the question order for the current deck so you learn the medicine, not the question positions. Toggle it off to return to the original order; your answers are unaffected either way.
- **Keyboard shortcuts** (desktop): `A`–`E` picks an option, `I` marks "I don't know", `←`/`→` moves between questions, `G` opens the question grid, `Esc` closes it.
- **Likely lecture tags:** every question is matched to the most relevant MED422 lecture. The compact flag opens confidence, rationale, and an alternate lecture when a question genuinely overlaps topics. Lecture context is also retained in wrong-answer exports.

## Verify lecture coverage

Run `node test_lecture_tags.mjs`. The check fails if any source question is unmapped, duplicated, or points to malformed lecture metadata.

## Progress, resume and backups

- **Everything is saved as you go** — answers, the deck tab you're on and the question you're on, per profile. Reopening the app puts you back exactly where you left off.
- **Choosing a profile takes two taps**: one to select the card, one to confirm, so nobody wanders into the wrong profile by accident. Your last-used profile comes pre-selected, so returning is a single confirming tap.
- **Back up / restore**: progress lives in the browser's `localStorage`, which is tied to the site's exact address. Redeploying to the *same* URL keeps everything; if the site ever moves to a new address (or you switch devices/browsers), use **Back up progress** on the profile screen to download a JSON file, then **Restore backup** on the new address. The backup covers all 5 profiles, including names, answers and positions.

## Open it

- **Directly:** double-click `index.html` (or open it in your browser). Everything works from `file://`.
- **Local server (optional):** run `python3 -m http.server` in this folder and visit `http://localhost:8000`.

## Host on GitHub Pages

1. Push these files to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick your branch (e.g. `main`) and the `/ (root)` folder, then **Save**.
4. Your site will be published at `https://<username>.github.io/<repo>/` within a minute or two.

## Updating the questions

Each file in `data/` pushes one deck onto `window.QUIZ_DECKS` and is loaded by a `<script>` tag in `index.html`; the app is fully data-driven and makes no assumptions about how many decks or questions there are. To add another deck, create a `data/<id>.js` file following the same schema and add a matching `<script>` tag to `index.html`.

Decks are grouped by id in `js/app.js`: `obs` and `gyn` are the **Reviews**, and everything else falls under **Mock Exams** (currently `womens-health` shown as "Final 1", `mock-final` as "Final 2", `mock-exam-1` as "Exam 1", `mock-exam-2` as "Exam 2"). A deck's display name is its `title`; its category is derived from its id, so retitling a deck never moves it between tabs.

The lecture-tagged source decks are `obs`, `gyn` and `womens-health`: when their questions are added, removed, or renumbered, update `data/lecture-tags.js` and run `node test_lecture_tags.mjs` before deployment. The remaining exam decks are standalone past papers with no lecture tags, so the app simply renders no lecture flag for them.
