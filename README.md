# OB/GYN Revision

A polished, mobile-first, zero-build static quiz web app for revising OB/GYN MCQ decks (Obstetrics, Gynecology and Women's Health). It runs entirely in the browser with no frameworks, no build step and no external assets — quiz data is loaded via plain `<script>` tags so the app works both when opened directly from disk (`file://`) and when served statically (e.g. GitHub Pages). It supports up to 5 renamable local profiles, per-profile/per-deck progress saved in `localStorage`, a question grid, per-option explanations, a "Key concept" teaching card, and one-click export of your wrong answers as a Markdown file ready to paste into ChatGPT.

## Study features

- **Retry wrong** (completion screen or question grid): clears only your wrong and "I don't know" answers — correct ones are kept — so you can re-attempt just your weak spots without resetting the whole deck.
- **Shuffle** (question grid): randomises the question order for the current deck so you learn the medicine, not the question positions. Toggle it off to return to the original order; your answers are unaffected either way.
- **Keyboard shortcuts** (desktop): `A`–`E` picks an option, `I` marks "I don't know", `←`/`→` moves between questions, `G` opens the question grid, `Esc` closes it.
- **Likely lecture tags:** every question is matched to the most relevant MED422 lecture. The compact flag opens confidence, rationale, and an alternate lecture when a question genuinely overlaps topics. Lecture context is also retained in wrong-answer exports.

## Verify lecture coverage

Run `node test_lecture_tags.mjs`. The check fails if any source question is unmapped, duplicated, or points to malformed lecture metadata.

## Open it

- **Directly:** double-click `index.html` (or open it in your browser). Everything works from `file://`.
- **Local server (optional):** run `python3 -m http.server` in this folder and visit `http://localhost:8000`.

## Host on GitHub Pages

1. Push these files to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick your branch (e.g. `main`) and the `/ (root)` folder, then **Save**.
4. Your site will be published at `https://<username>.github.io/<repo>/` within a minute or two.

## Updating the questions

Replace `data/obs.js`, `data/gyn.js`, or `data/womens-health.js` with updated decks. Each file pushes a deck onto `window.QUIZ_DECKS`; the app is fully data-driven and makes no assumptions about how many questions each deck has. When questions are added, removed, or renumbered, update `data/lecture-tags.js` and run `node test_lecture_tags.mjs` before deployment.
