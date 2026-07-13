/* ============================================================
   OB/GYN Revision — app logic
   Vanilla ES6+, no build step, no external assets.
   Fully data-driven from window.QUIZ_DECKS.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Data ---------- */
  var DECKS = (window.QUIZ_DECKS || []).slice();
  var LECTURE_TAGS = window.LECTURE_TAGS || {};
  if (!DECKS.length) {
    document.getElementById("app").innerHTML =
      '<div class="empty-note">No quiz data loaded.</div>';
    return;
  }

  var ACCENTS = ["#6d8cff", "#f2709c", "#34d399", "#f59e0b", "#a78bfa"];
  var NUM_PROFILES = 5;

  var LS = {
    profiles: "obgyn:profiles",
    lastProfile: "obgyn:lastProfile",
    uiScale: "obgyn:uiScale",
    progress: function (i) { return "obgyn:progress:" + i; },
    ui: function (i) { return "obgyn:ui:" + i; }
  };

  /* ---------- Deck categories (two-level tabs) ----------
     Decks split into two groups: the study "Reviews" and the "Mock Exams".
     Membership is derived from the deck id (mock-* is an exam) so the app
     stays data-driven and new decks slot into the right group automatically. */
  var CATEGORY_DEFS = [
    { id: "reviews", title: "Reviews" },
    { id: "mock", title: "Mock Exams" }
  ];
  function categoryOf(deckId) {
    return /^mock-/.test(deckId) ? "mock" : "reviews";
  }
  function decksInCategory(catId) {
    return DECKS.filter(function (d) { return categoryOf(d.id) === catId; });
  }
  function firstDeckIdIn(catId) {
    var ds = decksInCategory(catId);
    return ds.length ? ds[0].id : DECKS[0].id;
  }
  // Only surface categories that actually contain decks.
  var CATEGORIES = CATEGORY_DEFS.filter(function (c) { return decksInCategory(c.id).length; });

  /* ---------- State ---------- */
  var state = {
    profileIdx: null,
    pendingProfile: null, // picker: tapped once, awaiting confirmation tap
    deckId: DECKS[0].id,
    lastDeckInCat: {},  // category id -> last deck viewed in it (so switching back returns there)
    pos: {},            // deckId -> current position in the deck's order (preserved per deck)
    order: {},          // deckId -> array of question indexes when shuffled, or null for natural order
    progress: {},       // deckId -> { questionId: {picked, status} } for current profile
    gridOpen: false,
    reviewFilter: false,
    showCompletion: false
  };
  DECKS.forEach(function (d) { state.pos[d.id] = 0; state.order[d.id] = null; });
  state.lastDeckInCat[categoryOf(state.deckId)] = state.deckId;

  var profiles = loadProfiles();
  var app = document.getElementById("app");

  /* ---------- Storage helpers ---------- */
  function loadProfiles() {
    try {
      var p = JSON.parse(localStorage.getItem(LS.profiles));
      if (Array.isArray(p) && p.length === NUM_PROFILES) return p;
    } catch (e) {}
    var d = [];
    for (var i = 0; i < NUM_PROFILES; i++) d.push("Student " + (i + 1));
    return d;
  }
  function saveProfiles() {
    try { localStorage.setItem(LS.profiles, JSON.stringify(profiles)); } catch (e) {}
  }
  function loadProgress(idx) {
    try {
      var p = JSON.parse(localStorage.getItem(LS.progress(idx)));
      if (p && typeof p === "object") return p;
    } catch (e) {}
    return {};
  }
  function saveProgress() {
    try {
      localStorage.setItem(LS.progress(state.profileIdx), JSON.stringify(state.progress));
    } catch (e) {}
  }

  /* ---------- UI scale (zoom) ----------
     One shared setting for the device (not per profile): the whole app is
     scaled with CSS zoom so − fits more on screen and + makes everything
     bigger. Layout is fluid, so content refills the viewport at any scale. */
  var SCALE_MIN = 0.6, SCALE_MAX = 1.4, SCALE_STEP = 0.1;

  function clampScale(v) {
    v = Math.round(v * 10) / 10;
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));
  }
  function loadScale() {
    try {
      var v = parseFloat(localStorage.getItem(LS.uiScale));
      if (!isNaN(v)) return clampScale(v);
    } catch (e) {}
    return 1;
  }
  var uiScale = loadScale();

  function applyScale() {
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    var out = document.getElementById("zoomOut");
    var zin = document.getElementById("zoomIn");
    if (out) out.disabled = uiScale <= SCALE_MIN + 0.001;
    if (zin) zin.disabled = uiScale >= SCALE_MAX - 0.001;
  }
  function changeScale(dir) {
    var next = clampScale(uiScale + dir * SCALE_STEP);
    if (next === uiScale) return;
    uiScale = next;
    try { localStorage.setItem(LS.uiScale, String(uiScale)); } catch (e) {}
    applyScale();
    toast("Size " + Math.round(uiScale * 100) + "%");
  }

  /* Per-profile UI state (active deck tab, current question and shuffle
     order in each deck), so a reload or redeploy puts you back exactly
     where you were. */
  function validOrder(o, deck) {
    if (!Array.isArray(o) || o.length !== deck.questions.length) return false;
    var seen = {};
    for (var i = 0; i < o.length; i++) {
      var v = o[i];
      if (typeof v !== "number" || v < 0 || v >= o.length || v % 1 !== 0 || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }
  function loadUi(idx) {
    var ui = null;
    try { ui = JSON.parse(localStorage.getItem(LS.ui(idx))); } catch (e) {}
    var out = { deckId: DECKS[0].id, pos: {}, order: {} };
    DECKS.forEach(function (d) { out.pos[d.id] = 0; out.order[d.id] = null; });
    if (!ui || typeof ui !== "object") return out;
    if (typeof ui.deckId === "string" &&
        DECKS.some(function (d) { return d.id === ui.deckId; })) {
      out.deckId = ui.deckId;
    }
    DECKS.forEach(function (d) {
      if (ui.order && validOrder(ui.order[d.id], d)) out.order[d.id] = ui.order[d.id];
      var p = ui.pos ? parseInt(ui.pos[d.id], 10) : NaN;
      if (!isNaN(p) && p >= 0 && p < d.questions.length) out.pos[d.id] = p;
    });
    return out;
  }
  function saveUi() {
    if (state.profileIdx == null) return;
    try {
      localStorage.setItem(LS.ui(state.profileIdx),
        JSON.stringify({ deckId: state.deckId, pos: state.pos, order: state.order }));
    } catch (e) {}
  }

  /* ---------- Backup / restore ----------
     localStorage only survives a redeploy if the site keeps the exact same
     URL, and mobile browsers may evict it after inactivity. These helpers
     let students download all progress as a JSON file and restore it on the
     new deployment (or another device). */
  function buildBackup() {
    var data = {
      app: "obgyn-revision",
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles: profiles.slice(),
      progress: {},
      ui: {}
    };
    for (var i = 0; i < NUM_PROFILES; i++) {
      data.progress[i] = i === state.profileIdx ? state.progress : loadProgress(i);
      data.ui[i] = i === state.profileIdx
        ? { deckId: state.deckId, pos: state.pos, order: state.order }
        : loadUi(i);
    }
    return data;
  }

  function exportBackup() {
    var data = buildBackup();
    var any = false;
    Object.keys(data.progress).forEach(function (k) {
      if (Object.keys(data.progress[k]).length) any = true;
    });
    if (!any) { toast("No progress to back up yet"); return; }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "obgyn-progress-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("Progress backup downloaded");
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); } catch (e) { data = null; }
      if (!data || data.app !== "obgyn-revision" || !data.progress || typeof data.progress !== "object") {
        toast("Not a valid progress backup file");
        return;
      }
      var existing = 0;
      for (var i = 0; i < NUM_PROFILES; i++) {
        var p = loadProgress(i);
        Object.keys(p).forEach(function (dk) { existing += Object.keys(p[dk] || {}).length; });
      }
      if (existing > 0 &&
          !confirm("Restoring this backup will replace the progress currently saved on this device. Continue?")) {
        return;
      }
      if (Array.isArray(data.profiles)) {
        for (var n = 0; n < NUM_PROFILES; n++) {
          if (typeof data.profiles[n] === "string" && data.profiles[n].trim()) {
            profiles[n] = data.profiles[n].trim();
          }
        }
        saveProfiles();
      }
      for (var j = 0; j < NUM_PROFILES; j++) {
        var prog = data.progress[j] || data.progress[String(j)];
        try {
          localStorage.setItem(LS.progress(j), JSON.stringify(prog && typeof prog === "object" ? prog : {}));
        } catch (e) {}
        var ui = data.ui && (data.ui[j] || data.ui[String(j)]);
        try {
          localStorage.setItem(LS.ui(j), JSON.stringify(ui && typeof ui === "object" ? ui : {}));
        } catch (e) {}
      }
      if (state.profileIdx != null) state.progress = loadProgress(state.profileIdx);
      renderProfilePicker();
      toast("Progress restored");
    };
    reader.onerror = function () { toast("Could not read that file"); };
    reader.readAsText(file);
  }

  /* ---------- Small utils ---------- */
  function deckById(id) {
    for (var i = 0; i < DECKS.length; i++) if (DECKS[i].id === id) return DECKS[i];
    return DECKS[0];
  }
  function currentDeck() { return deckById(state.deckId); }
  // Map a position in the current viewing order to a question index, and back.
  function qIndexAtPos(deckId, pos) {
    var o = state.order[deckId];
    return o ? o[pos] : pos;
  }
  function posOfIndex(deckId, qIdx) {
    var o = state.order[deckId];
    return o ? o.indexOf(qIdx) : qIdx;
  }
  function currentQuestion() {
    return currentDeck().questions[qIndexAtPos(state.deckId, state.pos[state.deckId])];
  }
  function getRecord(deckId, qid) {
    var d = state.progress[deckId];
    return d ? d[qid] : undefined;
  }
  function setRecord(deckId, qid, rec) {
    if (!state.progress[deckId]) state.progress[deckId] = {};
    state.progress[deckId][qid] = rec;
    saveProgress();
  }
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function initial(name) {
    var t = (name || "").trim();
    if (!t) return "?";
    // Array.from splits by code point so emoji/surrogate-pair names don't render as garbage.
    return Array.from(t)[0].toUpperCase();
  }

  function lectureMatch(deckId, questionId) {
    var deckMatches = LECTURE_TAGS[deckId];
    return deckMatches ? deckMatches[String(questionId)] || null : null;
  }

  function lectureCode(lecture) {
    if (!lecture) return "";
    return "Test " + lecture.testGroup + " · Lecture " + lecture.officialNumber;
  }

  function lectureMatchHTML(q) {
    var match = lectureMatch(state.deckId, q.id);
    if (!match || !match.primary) return "";
    var confidenceText = match.confidence === "high" ? "Strong match" :
      (match.confidence === "medium" ? "Likely match" : "Possible match");
    var alternate = match.alternate
      ? '<div class="lecture-alternate"><span>Also possible</span><strong>' +
          esc(match.alternate.title) + '</strong><small>' + esc(lectureCode(match.alternate)) + "</small></div>"
      : "";
    return (
      '<details class="lecture-match confidence-' + esc(match.confidence) + '">' +
        '<summary title="Reveal the likely lecture (hidden so it does not give the answer away)">' +
          '<span class="lecture-flag" aria-hidden="true">&#9873;</span>' +
          '<span class="lecture-kicker">Likely lecture</span>' +
          '<span class="lecture-reveal-hint">Tap to reveal</span>' +
        "</summary>" +
        '<div class="lecture-detail">' +
          '<div><span>Primary</span><strong>' + esc(match.primary.title) +
            '</strong><small>' + esc(lectureCode(match.primary)) + "</small></div>" +
          '<div><span>Match</span><strong class="lecture-confidence">' + esc(confidenceText) + "</strong></div>" +
          (match.rationale ? '<p>' + esc(match.rationale) + "</p>" : "") +
          alternate +
          '<p class="lecture-note">Lecture matching is a study aid, not part of the original question.</p>' +
        "</div>" +
      "</details>"
    );
  }

  function deckStats(deckId) {
    var deck = deckById(deckId);
    var recs = state.progress[deckId] || {};
    var correct = 0, wrong = 0, idk = 0;
    deck.questions.forEach(function (q) {
      var r = recs[q.id];
      if (!r) return;
      if (r.status === "correct") correct++;
      else if (r.status === "wrong") wrong++;
      else if (r.status === "idk") idk++;
    });
    var answered = correct + wrong + idk;
    var total = deck.questions.length;
    return {
      correct: correct, wrong: wrong, idk: idk,
      answered: answered, total: total, remaining: total - answered,
      pctCorrect: answered ? Math.round((correct / answered) * 100) : 0,
      complete: answered === total && total > 0
    };
  }
  function profileTotals(idx) {
    var prog = idx === state.profileIdx ? state.progress : loadProgress(idx);
    var a = 0, t = 0;
    DECKS.forEach(function (d) {
      t += d.questions.length;
      var recs = prog[d.id] || {};
      d.questions.forEach(function (q) { if (recs[q.id]) a++; });
    });
    return { answered: a, total: t };
  }

  /* ============================================================
     Profile picker
     ============================================================ */
  function renderProfilePicker() {
    state.gridOpen = false;
    var pending = state.pendingProfile;
    var cards = profiles.map(function (name, i) {
      var tot = profileTotals(i);
      var isPending = i === pending;
      return (
        '<div class="profile-card' + (isPending ? " selected" : "") + '" data-profile="' + i + '">' +
          '<button class="edit" data-edit="' + i + '" title="Rename">&#9998;</button>' +
          '<div class="avatar" style="background:' + ACCENTS[i] + '">' + esc(initial(name)) + "</div>" +
          '<div class="name">' + esc(name) + "</div>" +
          (isPending
            ? '<div class="stat confirm-hint">Tap again to confirm &#10003;</div>'
            : '<div class="stat">' + tot.answered + "/" + tot.total + " answered</div>") +
        "</div>"
      );
    }).join("");

    app.innerHTML =
      '<div class="screen profiles">' +
        "<h1>OB/GYN Revision</h1>" +
        '<p class="subtitle">' +
          (pending != null
            ? "Continue as <strong>" + esc(profiles[pending]) + "</strong>? Tap the card again to confirm."
            : "Choose a profile to continue") +
        "</p>" +
        '<div class="profile-grid">' + cards + "</div>" +
        '<div class="backup-row">' +
          '<button class="mini-btn" id="exportBackup">&#11015; Back up progress</button>' +
          '<button class="mini-btn" id="importBackup">&#11014; Restore backup</button>' +
          '<input type="file" id="importFile" accept=".json,application/json" hidden />' +
        "</div>" +
        '<p class="backup-note">Progress lives in this browser. Back it up before the site moves to a new address, and restore it there.</p>' +
      "</div>";

    app.querySelectorAll(".profile-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var i = parseInt(card.getAttribute("data-profile"), 10);
        if (state.pendingProfile === i) {
          state.pendingProfile = null;
          enterProfile(i);
        } else {
          state.pendingProfile = i;
          renderProfilePicker();
        }
      });
    });
    app.querySelectorAll(".edit").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var i = parseInt(btn.getAttribute("data-edit"), 10);
        var name = prompt("Rename profile", profiles[i]);
        if (name != null) {
          name = name.trim();
          if (name) { profiles[i] = name; saveProfiles(); renderProfilePicker(); }
        }
      });
    });
    var exp = app.querySelector("#exportBackup");
    if (exp) exp.addEventListener("click", exportBackup);
    var impBtn = app.querySelector("#importBackup");
    var impFile = app.querySelector("#importFile");
    if (impBtn && impFile) {
      impBtn.addEventListener("click", function () { impFile.click(); });
      impFile.addEventListener("change", function () {
        if (impFile.files && impFile.files[0]) importBackup(impFile.files[0]);
        impFile.value = "";
      });
    }
  }

  function enterProfile(idx) {
    state.profileIdx = idx;
    state.progress = loadProgress(idx);
    var ui = loadUi(idx);
    state.deckId = ui.deckId;
    state.lastDeckInCat[categoryOf(state.deckId)] = state.deckId;
    state.pos = ui.pos;
    state.order = ui.order;
    state.showCompletion = false;
    try { localStorage.setItem(LS.lastProfile, String(idx)); } catch (e) {}
    render();
  }

  /* ============================================================
     Main render (header + question view)
     ============================================================ */
  function render() {
    if (state.profileIdx == null) { renderProfilePicker(); return; }
    app.innerHTML =
      '<div class="screen quiz">' +
        '<header class="app-header" id="hdr"></header>' +
        '<main class="content anim" id="qview"></main>' +
        '<footer class="nav-bar" id="navbar">' +
          '<button class="nav-btn" data-nav="prev">&#8592; Prev</button>' +
          '<button class="nav-btn primary" data-nav="next">Next &#8594;</button>' +
        "</footer>" +
      "</div>";
    var navbar = document.getElementById("navbar");
    navbar.querySelector('[data-nav="prev"]').addEventListener("click", function () { navigate(-1); });
    navbar.querySelector('[data-nav="next"]').addEventListener("click", function () { navigate(1); });
    paintHeader();
    paintContent(true);
    attachSwipe(document.getElementById("qview"));
  }

  /* The Prev/Next bar lives outside the question view in a fixed footer,
     so the buttons never move no matter how long the question is —
     only their enabled state is updated here. */
  function paintNav() {
    var bar = document.getElementById("navbar");
    if (!bar) return;
    var total = currentDeck().questions.length;
    var idx = state.pos[state.deckId];
    var onCompletion = state.showCompletion && deckStats(state.deckId).complete;
    bar.querySelector('[data-nav="prev"]').disabled = onCompletion ? false : idx <= 0;
    bar.querySelector('[data-nav="next"]').disabled = onCompletion
      ? true
      : (idx >= total - 1 && !deckStats(state.deckId).complete);
  }

  function paintHeader() {
    var hdr = document.getElementById("hdr");
    if (!hdr) return;
    var s = deckStats(state.deckId);
    var pct = s.total ? Math.round((s.answered / s.total) * 100) : 0;
    var accent = ACCENTS[state.profileIdx];

    var currentCat = categoryOf(state.deckId);
    var catTabs = CATEGORIES.map(function (c) {
      return '<button class="cat-tab' + (c.id === currentCat ? " active" : "") +
        '" data-cat="' + esc(c.id) + '">' + esc(c.title) + "</button>";
    }).join("");
    var tabs = decksInCategory(currentCat).map(function (d) {
      return '<button class="deck-tab' + (d.id === state.deckId ? " active" : "") +
        '" data-deck="' + esc(d.id) + '">' + esc(d.title) + "</button>";
    }).join("");

    hdr.innerHTML =
      '<div class="header-row">' +
        '<button class="avatar-btn" id="profileBtn" title="Switch profile" aria-label="Switch profile" ' +
          'style="background:' + accent + '">' + esc(initial(profiles[state.profileIdx])) + "</button>" +
        '<div class="header-title">OB/GYN Revision</div>' +
        '<button class="icon-btn zoom-btn" id="zoomOut" title="Make everything smaller" aria-label="Make everything smaller">&minus;</button>' +
        '<button class="icon-btn zoom-btn" id="zoomIn" title="Make everything bigger" aria-label="Make everything bigger">+</button>' +
        '<button class="icon-btn" id="gridBtn" title="Question grid" aria-label="Question grid">&#9638;</button>' +
      "</div>" +
      (CATEGORIES.length > 1 ? '<div class="cat-tabs">' + catTabs + "</div>" : "") +
      '<div class="deck-tabs">' + tabs + "</div>" +
      '<div class="progress-wrap">' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-meta">' + s.answered + "/" + s.total + " &middot; " + s.pctCorrect + "% correct</div>" +
      "</div>";

    hdr.querySelector("#profileBtn").addEventListener("click", backToProfiles);
    hdr.querySelector("#zoomOut").addEventListener("click", function () { changeScale(-1); });
    hdr.querySelector("#zoomIn").addEventListener("click", function () { changeScale(1); });
    hdr.querySelector("#gridBtn").addEventListener("click", openGrid);
    applyScale(); // sync the +/- disabled states with the current scale
    hdr.querySelectorAll(".cat-tab").forEach(function (t) {
      t.addEventListener("click", function () { switchCategory(t.getAttribute("data-cat")); });
    });
    hdr.querySelectorAll(".deck-tab").forEach(function (t) {
      t.addEventListener("click", function () { switchDeck(t.getAttribute("data-deck")); });
    });
  }

  function backToProfiles() {
    state.profileIdx = null;
    state.pendingProfile = null;
    state.showCompletion = false;
    renderProfilePicker();
  }

  function switchCategory(catId) {
    if (categoryOf(state.deckId) === catId) return;
    var target = state.lastDeckInCat[catId];
    if (!target || categoryOf(target) !== catId) target = firstDeckIdIn(catId);
    switchDeck(target);
  }

  function switchDeck(deckId) {
    if (deckId === state.deckId) return;
    state.deckId = deckId;
    state.lastDeckInCat[categoryOf(deckId)] = deckId;
    state.showCompletion = false;
    saveUi();
    paintHeader();
    paintContent(true);
  }

  /* ---------- Content painting ---------- */
  function paintContent(animate) {
    var view = document.getElementById("qview");
    if (!view) return;
    view.innerHTML = state.showCompletion && deckStats(state.deckId).complete
      ? completionHTML()
      : questionHTML(currentQuestion());
    if (animate) {
      view.scrollTop = 0; // the question view is its own scroll container
      view.classList.remove("anim");
      void view.offsetWidth; // reflow to restart animation
      view.classList.add("anim");
    }
    bindContent();
    paintNav();
  }

  function questionHTML(q) {
    var deck = currentDeck();
    var idx = state.pos[state.deckId];
    var total = deck.questions.length;
    var rec = getRecord(state.deckId, q.id);
    var answered = !!rec;

    var optsHTML = q.options.map(function (o) {
      var cls = "option";
      var mark = "";
      if (answered) {
        cls += " locked";
        if (o.key === q.correct) { cls += " correct"; mark = "&#10003;"; }
        else if (rec.picked === o.key) { cls += " wrong"; mark = "&#10007;"; }
        var expl = q.explanations && q.explanations[o.key] ? q.explanations[o.key] : "";
        return (
          '<button class="' + cls + '" data-key="' + esc(o.key) + '" data-locked="1">' +
            '<span class="badge">' + esc(o.key) + "</span>" +
            '<span class="opt-body">' +
              '<span class="opt-text">' + esc(o.text) + "</span>" +
              (expl ? '<span class="explain">' + esc(expl) + "</span>" : "") +
            "</span>" +
            (mark ? '<span class="mark">' + mark + "</span>" : "") +
          "</button>"
        );
      }
      return (
        '<button class="' + cls + '" data-key="' + esc(o.key) + '">' +
          '<span class="badge">' + esc(o.key) + "</span>" +
          '<span class="opt-body"><span class="opt-text">' + esc(o.text) + "</span></span>" +
        "</button>"
      );
    }).join("");

    var shuffled = !!state.order[state.deckId];
    var html =
      '<div class="q-meta"><div class="q-count">Question ' + (idx + 1) + " of " + total +
        (shuffled ? ' <span class="q-count-note">&#128256; shuffled &middot; #' + esc(q.num) + "</span>" : "") +
      "</div>" + lectureMatchHTML(q) + "</div>";
    if (q.caseStem) {
      html += '<div class="case-card"><div class="label">Case</div><p>' + esc(q.caseStem) + "</p></div>";
    }
    html += '<div class="q-text">' + esc(q.question) + "</div>";
    html += '<div class="options">' + optsHTML + "</div>";

    if (!answered) {
      html += '<button class="idk-btn" data-idk="1">I don\'t know &#129335;</button>';
    } else {
      if (q.teaching) {
        html +=
          '<div class="teaching-card"><div class="label">&#128161; Key concept</div><p>' +
          esc(q.teaching) + "</p></div>";
      }
      if (q.answerSource === "inferred") {
        html += '<div class="inferred-note">Answer not marked in the original deck — inferred.</div>';
      }
    }

    html +=
      '<div class="kbd-hint">A&ndash;E answer &middot; I don\'t know &middot; &#8592;/&#8594; navigate &middot; G grid &middot; +/&minus; size</div>';
    return html;
  }

  function completionHTML() {
    var deck = currentDeck();
    var s = deckStats(state.deckId);
    return (
      '<div class="completion">' +
        "<h2>Deck complete! &#127881;</h2>" +
        '<div class="score">' + s.correct + "/" + s.total +
          ' <small>(' + Math.round((s.correct / s.total) * 100) + "%)</small></div>" +
        '<div class="breakdown">' +
          '<span class="count-chip correct">&#10003; ' + s.correct + " correct</span>" +
          '<span class="count-chip wrong">&#10007; ' + s.wrong + " wrong</span>" +
          '<span class="count-chip idk">&#129335; ' + s.idk + " didn\'t know</span>" +
        "</div>" +
        '<div class="completion-actions">' +
          ((s.wrong + s.idk > 0)
            ? '<button class="mini-btn primary" data-act="retry">&#128257; Retry wrong (' + (s.wrong + s.idk) + ")</button>"
            : "") +
          '<button class="mini-btn" data-act="download">&#11015; Download wrong answers</button>' +
          '<button class="mini-btn" data-act="review">&#128269; Review wrong only</button>' +
          '<button class="mini-btn danger" data-act="reset">&#8635; Reset deck</button>' +
        "</div>" +
      "</div>"
    );
  }

  function bindContent() {
    var view = document.getElementById("qview");
    if (!view) return;

    view.querySelectorAll(".option").forEach(function (btn) {
      if (btn.getAttribute("data-locked") === "1") return;
      btn.addEventListener("click", function () {
        selectAnswer(currentQuestion(), btn.getAttribute("data-key"));
      });
    });
    var idk = view.querySelector(".idk-btn");
    if (idk) idk.addEventListener("click", function () { selectAnswer(currentQuestion(), null); });

    // completion actions
    var dl = view.querySelector('[data-act="download"]');
    if (dl) dl.addEventListener("click", downloadWrong);
    var rv = view.querySelector('[data-act="review"]');
    if (rv) rv.addEventListener("click", function () {
      state.reviewFilter = true; state.showCompletion = false; openGrid();
    });
    var rt = view.querySelector('[data-act="retry"]');
    if (rt) rt.addEventListener("click", retryWrong);
    var rs = view.querySelector('[data-act="reset"]');
    if (rs) rs.addEventListener("click", resetDeck);
  }

  /* ---------- Answering ---------- */
  function selectAnswer(q, key) {
    if (getRecord(state.deckId, q.id)) return; // already locked
    var status = key == null ? "idk" : (key === q.correct ? "correct" : "wrong");
    setRecord(state.deckId, q.id, { picked: key == null ? null : key, status: status });
    var complete = deckStats(state.deckId).complete;
    if (complete) state.showCompletion = true;
    paintHeader();
    paintContent(false); // no animation -> preserves scroll position on reveal
  }

  /* ---------- Navigation ---------- */
  function navigate(dir) {
    if (state.showCompletion) {
      if (dir < 0) { state.showCompletion = false; paintContent(true); }
      return;
    }
    var total = currentDeck().questions.length;
    var idx = state.pos[state.deckId];
    var ni = idx + dir;
    if (ni < 0) return;                 // swipe/click past first: nothing
    if (ni >= total) {                  // past last
      if (deckStats(state.deckId).complete) {
        state.showCompletion = true;
        paintHeader();
        paintContent(true);
      }
      return;
    }
    state.pos[state.deckId] = ni;
    saveUi();
    paintContent(true);
  }

  /* ============================================================
     Grid overlay
     ============================================================ */
  function openGrid() {
    state.gridOpen = true;
    renderGrid();
  }
  function closeGrid() {
    state.gridOpen = false;
    var o = document.getElementById("overlay");
    if (o) o.parentNode.removeChild(o);
    var back = document.getElementById("gridBtn");
    if (back) back.focus();
  }

  function renderGrid() {
    var existing = document.getElementById("overlay");
    if (existing) existing.parentNode.removeChild(existing);

    var deck = currentDeck();
    var recs = state.progress[state.deckId] || {};
    var s = deckStats(state.deckId);
    var curQIdx = qIndexAtPos(state.deckId, state.pos[state.deckId]);

    var tiles = deck.questions.map(function (q, i) {
      var r = recs[q.id];
      var cls = "tile";
      var isWrong = r && (r.status === "wrong" || r.status === "idk");
      if (r) cls += " " + r.status;
      if (i === curQIdx && !state.showCompletion) cls += " current";
      if (state.reviewFilter && !isWrong) cls += " dimmed";
      var label = "Question " + q.num +
        (r ? (r.status === "correct" ? ", correct" : r.status === "wrong" ? ", wrong" : ", didn't know")
           : ", unanswered");
      var match = lectureMatch(state.deckId, q.id);
      if (match && match.primary) label += ", likely lecture " + match.primary.title;
      return '<button class="' + cls + '" data-tile="' + i + '" title="' +
        esc(match && match.primary ? match.primary.title : label) + '" aria-label="' + esc(label) + '">' +
        esc(q.num) + "</button>";
    }).join("");

    var overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", deck.title + " question grid");
    overlay.innerHTML =
      '<div class="overlay-header">' +
        '<div class="overlay-top">' +
          "<h2>" + esc(deck.title) + " &mdash; Questions</h2>" +
          '<button class="icon-btn" id="closeGrid" title="Close" aria-label="Close question grid">&times;</button>' +
        "</div>" +
        '<div class="counts">' +
          '<span class="count-chip">' + s.answered + "/" + s.total + " answered</span>" +
          '<span class="count-chip correct">&#10003; ' + s.correct + "</span>" +
          '<span class="count-chip wrong">&#10007; ' + s.wrong + "</span>" +
          '<span class="count-chip idk">&#129335; ' + s.idk + "</span>" +
          '<span class="count-chip">' + s.remaining + " left</span>" +
        "</div>" +
        '<div class="overlay-actions">' +
          '<button class="mini-btn toggle' + (state.reviewFilter ? " on" : "") + '" id="filterBtn">' +
            "&#128269; Wrong only</button>" +
          '<button class="mini-btn toggle' + (state.order[state.deckId] ? " on" : "") + '" id="shuffleBtn">' +
            "&#128256; Shuffle</button>" +
          '<button class="mini-btn" id="retryBtn">&#128257; Retry wrong</button>' +
          '<button class="mini-btn" id="dlBtn">&#11015; Download wrong</button>' +
          '<button class="mini-btn danger" id="resetBtn">&#8635; Reset progress</button>' +
        "</div>" +
      "</div>" +
      '<div class="grid-scroll"><div class="tile-grid">' + tiles + "</div>" +
        (state.reviewFilter && (s.wrong + s.idk === 0)
          ? '<div class="empty-note">Nothing wrong yet — great work!</div>' : "") +
      "</div>";

    app.appendChild(overlay);

    overlay.querySelector("#closeGrid").addEventListener("click", closeGrid);
    overlay.querySelector("#filterBtn").addEventListener("click", function () {
      state.reviewFilter = !state.reviewFilter;
      renderGrid();
    });
    overlay.querySelector("#shuffleBtn").addEventListener("click", toggleShuffle);
    overlay.querySelector("#retryBtn").addEventListener("click", retryWrong);
    overlay.querySelector("#dlBtn").addEventListener("click", downloadWrong);
    overlay.querySelector("#resetBtn").addEventListener("click", resetDeck);
    overlay.querySelectorAll(".tile").forEach(function (t) {
      t.addEventListener("click", function () {
        var i = parseInt(t.getAttribute("data-tile"), 10);
        state.pos[state.deckId] = posOfIndex(state.deckId, i);
        state.showCompletion = false;
        saveUi();
        closeGrid();
        paintHeader();
        paintContent(true);
      });
    });
    overlay.querySelector("#closeGrid").focus();
  }

  /* ---------- Shuffle ---------- */
  function toggleShuffle() {
    var id = state.deckId;
    var deck = currentDeck();
    var curQIdx = qIndexAtPos(id, state.pos[id]);
    if (state.order[id]) {
      // Back to natural order, keeping the current question in view.
      state.order[id] = null;
      state.pos[id] = curQIdx;
      toast("Original order restored");
    } else {
      var arr = deck.questions.map(function (_, i) { return i; });
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      state.order[id] = arr;
      state.pos[id] = 0;
      toast("Questions shuffled");
    }
    saveUi();
    state.showCompletion = false;
    if (state.gridOpen) renderGrid();
    paintHeader();
    paintContent(false);
  }

  /* ---------- Retry wrong ---------- */
  function retryWrong() {
    var deck = currentDeck();
    var recs = state.progress[state.deckId] || {};
    var clearedIdx = [];
    deck.questions.forEach(function (q, i) {
      var r = recs[q.id];
      if (r && r.status !== "correct") { delete recs[q.id]; clearedIdx.push(i); }
    });
    if (!clearedIdx.length) { toast("Nothing to retry — no wrong answers"); return; }
    saveProgress();
    state.reviewFilter = false;
    state.showCompletion = false;
    // Jump to whichever cleared question comes first in the current viewing order.
    var firstPos = null;
    clearedIdx.forEach(function (qi) {
      var p = posOfIndex(state.deckId, qi);
      if (firstPos == null || p < firstPos) firstPos = p;
    });
    state.pos[state.deckId] = firstPos;
    saveUi();
    if (state.gridOpen) closeGrid();
    paintHeader();
    paintContent(true);
    toast("Retrying " + clearedIdx.length + " question" + (clearedIdx.length === 1 ? "" : "s"));
  }

  /* ---------- Reset ---------- */
  function resetDeck() {
    var deck = currentDeck();
    if (!confirm('Reset all progress for "' + deck.title + '" (' +
      profiles[state.profileIdx] + ")? This cannot be undone.")) return;
    state.progress[state.deckId] = {};
    saveProgress();
    state.pos[state.deckId] = 0;
    saveUi();
    state.showCompletion = false;
    if (state.gridOpen) renderGrid();
    paintHeader();
    paintContent(true);
  }

  /* ============================================================
     Export wrong answers as Markdown
     ============================================================ */
  function buildWrongMarkdown() {
    var deck = currentDeck();
    var recs = state.progress[state.deckId] || {};
    var lines = [];
    lines.push("These are exam questions I got wrong. For each, explain why the correct answer is right and why my answer is wrong.");
    lines.push("");
    var count = 0;
    deck.questions.forEach(function (q) {
      var r = recs[q.id];
      if (!r || r.status === "correct") return;
      count++;
      lines.push("## Question " + q.num);
      var match = lectureMatch(state.deckId, q.id);
      if (match && match.primary) {
        lines.push("");
        lines.push("**Likely lecture:** " + match.primary.title + " (" + lectureCode(match.primary) +
          "; " + match.confidence + " confidence)");
        if (match.alternate) lines.push("**Also possible:** " + match.alternate.title);
      }
      if (q.caseStem) { lines.push(""); lines.push("**Case:** " + q.caseStem); }
      lines.push("");
      lines.push(q.question);
      lines.push("");
      q.options.forEach(function (o) { lines.push("- " + o.key + ". " + o.text); });
      lines.push("");
      if (r.status === "idk" || !r.picked) {
        lines.push("My answer: I didn't know");
      } else {
        var po = q.options.filter(function (o) { return o.key === r.picked; })[0];
        lines.push("My answer: " + r.picked + " (" + (po ? po.text : "") + ")");
      }
      var co = q.options.filter(function (o) { return o.key === q.correct; })[0];
      lines.push("Correct answer: " + q.correct + " (" + (co ? co.text : "") + ")");
      lines.push("");
    });
    if (count === 0) lines.push("_No wrong or unknown answers yet._");
    return { text: lines.join("\n"), count: count };
  }

  function downloadWrong() {
    var out = buildWrongMarkdown();
    if (out.count === 0) { toast("Nothing wrong to export yet"); return; }
    var blob = new Blob([out.text], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var pname = (profiles[state.profileIdx] || "profile").replace(/[^\w\-]+/g, "_");
    a.href = url;
    a.download = "wrong-answers-" + pname + "-" + state.deckId + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("Downloaded " + out.count + " question" + (out.count === 1 ? "" : "s"));
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var old = document.getElementById("toast");
    if (old) old.parentNode.removeChild(old);
    var t = document.createElement("div");
    t.className = "toast";
    t.id = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.textContent = msg;
    document.body.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 2200);
  }

  /* ============================================================
     Touch swipe (question area only)
     ============================================================ */
  function attachSwipe(el) {
    if (!el) return;
    var x0 = 0, y0 = 0, tracking = false;
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0;
      var dy = t.clientY - y0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navigate(dx < 0 ? 1 : -1); // swipe left -> next, right -> prev
      }
    }, { passive: true });
  }

  /* ============================================================
     Keyboard navigation
     ============================================================ */
  document.addEventListener("keydown", function (e) {
    if (state.profileIdx == null) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Escape") {
      if (state.gridOpen) { closeGrid(); return; }
    }
    if (state.gridOpen) return;

    if (e.key === "ArrowLeft") { navigate(-1); return; }
    if (e.key === "ArrowRight") { navigate(1); return; }
    if (e.key === "+" || e.key === "=") { changeScale(1); return; }
    if (e.key === "-" || e.key === "_") { changeScale(-1); return; }

    var k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (k === "G") { openGrid(); return; }
    if (state.showCompletion) return;

    var q = currentQuestion();
    if (!q || getRecord(state.deckId, q.id)) return; // already answered
    if (k === "I") { selectAnswer(q, null); return; }
    if (/^[A-Z]$/.test(k)) {
      // Match option keys case-insensitively, but record the option's actual key.
      for (var oi = 0; oi < q.options.length; oi++) {
        if (String(q.options[oi].key).toUpperCase() === k) {
          selectAnswer(q, q.options[oi].key);
          return;
        }
      }
    }
  });

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    applyScale();

    // Ask the browser not to evict our saved data under storage pressure
    // (helps progress survive long gaps between study sessions on mobile).
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
      }
    } catch (e) {}

    // Profile deep link: ?p=1..5[&name=X] opens that profile directly.
    // The name is applied only while the slot still has its default name,
    // so a later in-app rename isn't clobbered by revisiting the link.
    var params = new URLSearchParams(location.search);
    var p = parseInt(params.get("p"), 10);
    if (p >= 1 && p <= NUM_PROFILES) {
      var idx0 = p - 1;
      var name = (params.get("name") || "").trim().slice(0, 30);
      if (name && profiles[idx0] === "Student " + p) {
        profiles[idx0] = name;
        saveProfiles();
      }
      enterProfile(idx0);
      return;
    }
    // Plain URL always shows the picker — only a deep link (?p=N) jumps
    // straight into a profile. Pre-highlight the last-used profile, but
    // require a confirmation tap rather than entering it automatically.
    var last = null;
    try { last = localStorage.getItem(LS.lastProfile); } catch (e) {}
    if (last != null && last !== "" && !isNaN(parseInt(last, 10))) {
      var idx = parseInt(last, 10);
      if (idx >= 0 && idx < NUM_PROFILES) state.pendingProfile = idx;
    }
    renderProfilePicker();
  }

  boot();
})();
