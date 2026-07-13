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
    progress: function (i) { return "obgyn:progress:" + i; }
  };

  /* ---------- State ---------- */
  var state = {
    profileIdx: null,
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
    var cards = profiles.map(function (name, i) {
      var tot = profileTotals(i);
      return (
        '<div class="profile-card" data-profile="' + i + '">' +
          '<button class="edit" data-edit="' + i + '" title="Rename">&#9998;</button>' +
          '<div class="avatar" style="background:' + ACCENTS[i] + '">' + esc(initial(name)) + "</div>" +
          '<div class="name">' + esc(name) + "</div>" +
          '<div class="stat">' + tot.answered + "/" + tot.total + " answered</div>" +
        "</div>"
      );
    }).join("");

    app.innerHTML =
      '<div class="screen profiles">' +
        "<h1>OB/GYN Revision</h1>" +
        '<p class="subtitle">Choose a profile to continue</p>' +
        '<div class="profile-grid">' + cards + "</div>" +
      "</div>";

    app.querySelectorAll(".profile-card").forEach(function (card) {
      card.addEventListener("click", function () {
        enterProfile(parseInt(card.getAttribute("data-profile"), 10));
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
  }

  function enterProfile(idx) {
    state.profileIdx = idx;
    state.progress = loadProgress(idx);
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
    state.showCompletion = false;
    renderProfilePicker();
  }

  function switchDeck(deckId) {
    if (deckId === state.deckId) return;
    state.deckId = deckId;
    state.showCompletion = false;
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
    // straight into a profile, so one tap never locks a device to a slot.
    renderProfilePicker();
  }

  boot();
})();
