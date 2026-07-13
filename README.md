# OB/GYN Revision

A polished, mobile-first, zero-build static quiz web app for revising two OB/GYN MCQ decks (Obstetrics and Gynecology). It runs entirely in the browser with no frameworks, no build step and no external assets — quiz data is loaded via plain `<script>` tags so the app works both when opened directly from disk (`file://`) and when served statically (e.g. GitHub Pages). It supports up to 5 renamable local profiles, per-profile/per-deck progress saved in `localStorage`, a question grid, per-option explanations, a "Key concept" teaching card, and one-click export of your wrong answers as a Markdown file ready to paste into ChatGPT.

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

Replace `data/obs.js` and `data/gyn.js` with the real decks. Each file just pushes a deck onto `window.QUIZ_DECKS`; the app is fully data-driven and makes no assumptions about how many questions each deck has. See the sample files for the exact question schema.
