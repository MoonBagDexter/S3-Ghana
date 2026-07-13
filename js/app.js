/* ============================================================
   OB/GYN Revision — app logic
   Vanilla ES6+, no build step, no external assets.
   Fully data-driven from window.QUIZ_DECKS.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Data ---------- */
  var DECKS = (window.QUIZ_DECKS || []).slice();
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
    progress: function (i) { return "obgyn:progress:" + i; },
    ui: function (i) { return "obgyn:ui:" + i; }
  };

  /* ---------- State ---------- */
  var state = {
    profileIdx: null,
    pendingProfile: null, // picker: tapped once, awaiting confirmation tap
    deckId: DECKS[0].id,
    pos: {},            // deckId -> current question index (preserved per deck)
    progress: {},       // deckId -> { questionId: {picked, status} } for current profile
    gridOpen: false,
    reviewFilter: false,
    showCompletion: false
  };
  DECKS.forEach(function (d) { state.pos[d.id] = 0; });

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

  /* Per-profile UI state (active deck tab + current question in each deck),
     so a reload or redeploy puts you back exactly where you were. */
  function loadUi(idx) {
    var ui = null;
    try { ui = JSON.parse(localStorage.getItem(LS.ui(idx))); } catch (e) {}
    var out = { deckId: DECKS[0].id, pos: {} };
    DECKS.forEach(function (d) { out.pos[d.id] = 0; });
    if (!ui || typeof ui !== "object") return out;
    if (typeof ui.deckId === "string" &&
        DECKS.some(function (d) { return d.id === ui.deckId; })) {
      out.deckId = ui.deckId;
    }
    if (ui.pos && typeof ui.pos === "object") {
      DECKS.forEach(function (d) {
        var p = parseInt(ui.pos[d.id], 10);
        if (!isNaN(p) && p >= 0 && p < d.questions.length) out.pos[d.id] = p;
      });
    }
    return out;
  }
  function saveUi() {
    if (state.profileIdx == null) return;
    try {
      localStorage.setItem(LS.ui(state.profileIdx),
        JSON.stringify({ deckId: state.deckId, pos: state.pos }));
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
        ? { deckId: state.deckId, pos: state.pos }
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
  function currentQuestion() { return currentDeck().questions[state.pos[state.deckId]]; }
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
    return t ? t.charAt(0).toUpperCase() : "?";
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
    state.pos = ui.pos;
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
      '<div class="screen">' +
        '<header class="app-header" id="hdr"></header>' +
        '<main class="content anim" id="qview"></main>' +
      "</div>";
    paintHeader();
    paintContent(true);
    attachSwipe(document.getElementById("qview"));
  }

  function paintHeader() {
    var hdr = document.getElementById("hdr");
    if (!hdr) return;
    var s = deckStats(state.deckId);
    var pct = s.total ? Math.round((s.answered / s.total) * 100) : 0;
    var accent = ACCENTS[state.profileIdx];

    var tabs = DECKS.map(function (d) {
      return '<button class="deck-tab' + (d.id === state.deckId ? " active" : "") +
        '" data-deck="' + esc(d.id) + '">' + esc(d.title) + "</button>";
    }).join("");

    hdr.innerHTML =
      '<div class="header-row">' +
        '<button class="avatar-btn" id="profileBtn" title="Switch profile" ' +
          'style="background:' + accent + '">' + esc(initial(profiles[state.profileIdx])) + "</button>" +
        '<div class="header-title">OB/GYN Revision</div>' +
        '<button class="icon-btn" id="gridBtn" title="Question grid">&#9638;</button>' +
      "</div>" +
      '<div class="deck-tabs">' + tabs + "</div>" +
      '<div class="progress-wrap">' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-meta">' + s.answered + "/" + s.total + " &middot; " + s.pctCorrect + "% correct</div>" +
      "</div>";

    hdr.querySelector("#profileBtn").addEventListener("click", backToProfiles);
    hdr.querySelector("#gridBtn").addEventListener("click", openGrid);
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

  function switchDeck(deckId) {
    if (deckId === state.deckId) return;
    state.deckId = deckId;
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
      view.classList.remove("anim");
      void view.offsetWidth; // reflow to restart animation
      view.classList.add("anim");
    }
    bindContent();
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

    var html =
      '<div class="q-count">Question ' + (idx + 1) + " of " + total + "</div>";
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

    var last = idx >= total - 1;
    html +=
      '<div class="nav-row">' +
        '<button class="nav-btn" data-nav="prev"' + (idx <= 0 ? " disabled" : "") + ">&#8592; Prev</button>" +
        '<button class="nav-btn primary" data-nav="next"' +
          ((last && !deckStats(state.deckId).complete) ? " disabled" : "") + ">Next &#8594;</button>" +
      "</div>";
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
          '<button class="mini-btn primary" data-act="download">&#11015; Download wrong answers</button>' +
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

    var prev = view.querySelector('[data-nav="prev"]');
    if (prev) prev.addEventListener("click", function () { navigate(-1); });
    var next = view.querySelector('[data-nav="next"]');
    if (next) next.addEventListener("click", function () { navigate(1); });

    // completion actions
    var dl = view.querySelector('[data-act="download"]');
    if (dl) dl.addEventListener("click", downloadWrong);
    var rv = view.querySelector('[data-act="review"]');
    if (rv) rv.addEventListener("click", function () {
      state.reviewFilter = true; state.showCompletion = false; openGrid();
    });
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
  }

  function renderGrid() {
    var existing = document.getElementById("overlay");
    if (existing) existing.parentNode.removeChild(existing);

    var deck = currentDeck();
    var recs = state.progress[state.deckId] || {};
    var s = deckStats(state.deckId);
    var curIdx = state.pos[state.deckId];

    var tiles = deck.questions.map(function (q, i) {
      var r = recs[q.id];
      var cls = "tile";
      var isWrong = r && (r.status === "wrong" || r.status === "idk");
      if (r) cls += " " + r.status;
      if (i === curIdx && !state.showCompletion) cls += " current";
      if (state.reviewFilter && !isWrong) cls += " dimmed";
      return '<button class="' + cls + '" data-tile="' + i + '">' + esc(q.num) + "</button>";
    }).join("");

    var overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "overlay";
    overlay.innerHTML =
      '<div class="overlay-header">' +
        '<div class="overlay-top">' +
          "<h2>" + esc(deck.title) + " &mdash; Questions</h2>" +
          '<button class="icon-btn" id="closeGrid" title="Close">&times;</button>' +
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
    overlay.querySelector("#dlBtn").addEventListener("click", downloadWrong);
    overlay.querySelector("#resetBtn").addEventListener("click", resetDeck);
    overlay.querySelectorAll(".tile").forEach(function (t) {
      t.addEventListener("click", function () {
        var i = parseInt(t.getAttribute("data-tile"), 10);
        state.pos[state.deckId] = i;
        state.showCompletion = false;
        saveUi();
        closeGrid();
        paintHeader();
        paintContent(true);
      });
    });
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
    if (e.key === "Escape") {
      if (state.gridOpen) { closeGrid(); return; }
    }
    if (state.gridOpen) return;
    if (e.key === "ArrowLeft") navigate(-1);
    else if (e.key === "ArrowRight") navigate(1);
  });

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    // Ask the browser not to evict our saved data under storage pressure
    // (helps progress survive long gaps between study sessions on mobile).
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
      }
    } catch (e) {}

    // Pre-highlight the last-used profile, but always require a
    // confirmation tap rather than entering a profile automatically.
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
