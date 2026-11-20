// Sunset Platinum — GTA VI trophy guide & tracker.
// Plain ES module, no build step, no network beyond this folder's own files.
// State lives in localStorage; export downloads a JSON file, import reads one back.

const KEY = "sunset-platinum-v2";
const KINDS = ["story", "activity", "exploration", "collectible", "combat", "misc"];
const GRADES = ["platinum", "gold", "silver", "bronze"];
const GRADE_LABEL = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };

const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");

let DATA = null; // { trophies, counts, sources, ... }
let ROADMAP = null;
let state = { earned: {}, notes: {}, spoilers: false };
let openId = null; // trophy id whose guide is expanded in the guide view
let filters = { q: "", kind: "all", grade: "all", hideEarned: false };

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.earned = parsed.earned && typeof parsed.earned === "object" ? parsed.earned : {};
      state.notes = parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {};
      state.spoilers = parsed.spoilers === true;
    }
  } catch { /* a fresh profile just starts empty */ }
}

function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage may be off */ }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function earnedCount() {
  return DATA.trophies.filter((t) => state.earned[t.id]).length;
}

function hiddenFrom(t) {
  return state.spoilers && t.hidden && !state.earned[t.id];
}

function sourceText(keys) {
  const map = DATA.sources;
  return keys.map((k) => {
    if (k === "exophase") return 'the official list on <a href="https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/">Exophase</a>';
    if (k === "psnprofiles") return 'PSNProfiles for PSN&rsquo;s count where it has one (<a href="https://psnprofiles.com/trophies/43531-grand-theft-auto-vi">PSNProfiles</a>)';
    return 'our own advice from the official description, not yet checked in the game';
  }).join("; ");
}

function renderProgress() {
  const n = earnedCount();
  const total = DATA.trophies.length;
  $("#earnedCount").textContent = String(n);
  $("#progressFill").style.width = `${Math.round((n / total) * 100)}%`;
  $("#progressNote").textContent = `${Math.round((n / total) * 100)}% to the platinum`;
  const bar = $("#progressBar");
  bar.setAttribute("aria-valuenow", String(n));
  bar.setAttribute("aria-valuemax", String(total));
}

function renderGradeCounts() {
  const box = $("#gradeCounts");
  box.innerHTML = GRADES.map((g) => {
    const total = DATA.trophies.filter((t) => t.grade === g).length;
    const got = DATA.trophies.filter((t) => t.grade === g && state.earned[t.id]).length;
    return `<li><span>${GRADE_LABEL[g]}</span><b>${got} / ${total}</b></li>`;
  }).join("");
}

function cardHTML(t, opts = {}) {
  const earned = Boolean(state.earned[t.id]);
  const hidden = hiddenFrom(t);
  const name = hidden ? "Hidden trophy" : esc(t.name);
  const desc = hidden ? "Hidden on PlayStation until earned — the guide stays hidden too." : esc(t.description);
  const isOpen = openId === t.id && !hidden;
  const note = state.notes[t.id] || "";
  return `<article class="card${earned ? " earned" : ""}" data-id="${t.id}">
    <div class="card-head">
      <input type="checkbox" data-act="toggle" data-id="${t.id}" ${earned ? "checked" : ""} aria-label="Mark ${esc(t.name)} earned">
      <div class="card-title">
        <h3>${name}${hidden ? ' <span class="hidden-tag">· story trophy</span>' : ""}</h3>
        <p class="desc">${desc}</p>
        <div class="meta">
          <span class="tag grade-${t.grade}">${GRADE_LABEL[t.grade]}</span>
          <span class="tag">${t.kind}</span>
          ${t.targetLabel ? `<span class="tag target">${esc(t.targetLabel)}</span>` : ""}
          ${t.missable ? `<span class="tag flag">Setup — do it when the moment comes</span>` : ""}
          ${t.hidden ? `<span class="tag">Hidden</span>` : ""}
        </div>
        ${hidden ? "" : `<button type="button" class="guide-btn" data-act="guide" data-id="${t.id}">${isOpen ? "Hide guide" : "Show guide"}</button>
        <div class="guide" ${isOpen ? "" : "hidden"}>
          <p>${esc(t.guide)}</p>
          ${t.missableNote ? `<p><span class="note-label">Watch out — </span>${esc(t.missableNote)}</p>` : ""}
          <p class="sources">Sources: ${sourceText(t.sources)}.</p>
        </div>`}
        <textarea class="notes" data-act="note" data-id="${t.id}" rows="1" placeholder="Your notes for this trophy — which gang, which spot, what worked…" aria-label="Notes for ${esc(t.name)}">${esc(note)}</textarea>
      </div>
    </div>
  </article>`;
}

function applyFilters(list) {
  const q = filters.q.trim().toLowerCase();
  return list.filter((t) => {
    if (filters.hideEarned && state.earned[t.id]) return false;
    if (filters.kind !== "all" && t.kind !== filters.kind) return false;
    if (filters.grade !== "all" && t.grade !== filters.grade) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGuide() {
  const list = applyFilters(DATA.trophies);
  const shown = list.length;
  view.innerHTML = `
    <div class="view-head">
      <h2>Guide &amp; checklist</h2>
      <p>All 55 official trophies with a guide for each, in our own words and cited. Tick a trophy when you earn it — progress saves in this browser.</p>
    </div>
    <div class="toolbar">
      <input type="search" id="searchBox" placeholder="Search name, description or guide…" value="${esc(filters.q)}" aria-label="Search trophies">
      <label class="check"><input type="checkbox" id="hideEarned" ${filters.hideEarned ? "checked" : ""}> Hide earned</label>
    </div>
    <div class="toolbar">
      <div class="chips" id="kindChips">
        <button type="button" class="chip${filters.kind === "all" ? " on" : ""}" data-kind="all">All kinds</button>
        ${KINDS.map((k) => `<button type="button" class="chip${filters.kind === k ? " on" : ""}" data-kind="${k}">${k}</button>`).join("")}
      </div>
    </div>
    <div class="toolbar">
      <div class="chips" id="gradeChips">
        <button type="button" class="chip${filters.grade === "all" ? " on" : ""}" data-grade="all">All grades</button>
        ${GRADES.map((g) => `<button type="button" class="chip${filters.grade === g ? " on" : ""}" data-grade="${g}">${GRADE_LABEL[g]}</button>`).join("")}
      </div>
    </div>
    <p class="fine" style="color:var(--muted);font-size:13.5px;margin:0 0 12px">Showing ${shown} of ${DATA.trophies.length} trophies · ${earnedCount()} earned</p>
    <div class="list">
      ${list.length ? list.map((t) => cardHTML(t)).join("") : `<div class="empty">No trophies match these filters. Clear the search or pick another kind or grade.</div>`}
    </div>`;

  $("#searchBox").addEventListener("input", (e) => { filters.q = e.target.value; renderGuideKeepFocus(); });
  $("#hideEarned").addEventListener("change", (e) => { filters.hideEarned = e.target.checked; renderGuide(); });
  $("#kindChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kind]");
    if (b) { filters.kind = b.dataset.kind; renderGuide(); }
  });
  $("#gradeChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-grade]");
    if (b) { filters.grade = b.dataset.grade; renderGuide(); }
  });
}

// Re-render after a search keystroke without losing the caret.
function renderGuideKeepFocus() {
  const box = $("#searchBox");
  const pos = box ? box.selectionStart : 0;
  renderGuide();
  const next = $("#searchBox");
  if (next) { next.focus(); next.setSelectionRange(pos, pos); }
}

function renderRoadmap() {
  const stages = ROADMAP.stages.map((s) => {
    const inStage = DATA.trophies.filter((t) => t.stage === s.id);
    const done = inStage.filter((t) => state.earned[t.id]).length;
    const pct = inStage.length ? Math.round((done / inStage.length) * 100) : 0;
    return `<section class="stage${done === inStage.length ? " done" : ""}">
      <h3>${esc(s.title)}</h3>
      <p class="goal">${esc(s.goal)}</p>
      <p>${esc(s.advice)}</p>
      <div class="bar-row">
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <span>${done} / ${inStage.length} · ${pct}%</span>
      </div>
      <div class="chips">${inStage.map((t) => `<span class="mini-chip${state.earned[t.id] ? " earned" : ""}">${hiddenFrom(t) ? "Hidden trophy" : esc(t.name)}</span>`).join("")}</div>
    </section>`;
  }).join("");
  view.innerHTML = `
    <div class="view-head">
      <h2>Roadmap to the platinum</h2>
      <p>Five stages in the order that wastes the least replaying. Built from the official trophy descriptions alone.</p>
    </div>
    ${stages}`;
}

function renderMissables() {
  const flagged = DATA.trophies.filter((t) => t.missable);
  view.innerHTML = `
    <div class="view-head">
      <h2>Missables</h2>
      <p>The trophies that need a specific setup — a partner beside you, one clean run, one exact moment.</p>
    </div>
    <div class="warn">
      <p><strong>No trophy here is confirmed permanently missable.</strong> Nothing in the official descriptions says a trophy locks you out for good — these six are flagged because each one needs a specific setup, and a failed attempt usually just means setting it up again.</p>
      <p>${esc(ROADMAP.note)}</p>
    </div>
    <div class="list">${flagged.map((t) => cardHTML(t)).join("")}</div>`;
}

function renderNext() {
  const remaining = {};
  GRADES.forEach((g) => {
    remaining[g] = DATA.trophies.filter((t) => t.grade === g && !state.earned[t.id]).length;
  });
  const stageName = (id) => (ROADMAP.stages.find((s) => s.id === id) || {}).title || "";
  const upcoming = DATA.trophies
    .filter((t) => !state.earned[t.id])
    .sort((a, b) => (a.stage - b.stage) || (a.id - b.id))
    .slice(0, 8);
  view.innerHTML = `
    <div class="view-head">
      <h2>Next up</h2>
      <p>The nearest unearned trophies, in roadmap order — story first, then strangers, then the map, then the grinds.</p>
    </div>
    <div class="kpi">
      ${GRADES.map((g) => `<div><b>${remaining[g]}</b><span>${GRADE_LABEL[g]} left to earn</span></div>`).join("")}
    </div>
    <div class="list">
      ${upcoming.map((t, i) => {
        const hidden = hiddenFrom(t);
        return `<article class="card">
          <div class="next-item">
            <span class="num">${i + 1}</span>
            <div class="card-title">
              <h3>${hidden ? "Hidden trophy" : esc(t.name)}</h3>
              <p class="desc">${hidden ? "Hidden on PlayStation until earned." : esc(t.description)}</p>
              <p class="why">${esc(stageName(t.stage))} · ${GRADE_LABEL[t.grade]} · ${t.kind}${t.targetLabel ? ` · ${esc(t.targetLabel)}` : ""}${t.missable ? " · setup trophy — do it when the moment comes" : ""}</p>
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>`;
}

function route() {
  const hash = location.hash || "#/guide";
  const [path, query] = hash.slice(2).split("?");
  const params = new URLSearchParams(query || "");
  openId = params.get("open") ? Number(params.get("open")) : null;
  const name = ["guide", "roadmap", "missables", "next"].includes(path) ? path : "guide";
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.route === name));
  if (name === "guide") {
    renderGuide();
    // Deep links (?open=<id>) bring the trophy into view, so an open
    // guide is visible rather than below the fold.
    if (openId) {
      const el = view.querySelector(`[data-id="${openId}"]`);
      if (el) el.scrollIntoView({ block: "start" });
    }
  }
  else if (name === "roadmap") renderRoadmap();
  else if (name === "missables") renderMissables();
  else renderNext();
  renderProgress();
  renderGradeCounts();
}

function exportProgress() {
  const payload = { app: "sunset-platinum", version: 2, earned: Object.keys(state.earned).map(Number).sort((a, b) => a - b), notes: state.notes, spoilers: state.spoilers };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sunset-platinum-progress.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = new Set(DATA.trophies.map((t) => t.id));
      const earned = {};
      (parsed.earned || []).forEach((id) => { if (ids.has(Number(id))) earned[Number(id)] = true; });
      const notes = {};
      Object.entries(parsed.notes || {}).forEach(([id, text]) => { if (ids.has(Number(id))) notes[Number(id)] = String(text).slice(0, 2000); });
      state = { earned, notes, spoilers: parsed.spoilers === true };
      $("#spoilerToggle").checked = state.spoilers;
      saveState();
      route();
    } catch {
      alert("That file is not a Sunset Platinum progress export.");
    }
  };
  reader.readAsText(file);
}

async function boot() {
  const [trophies, roadmap] = await Promise.all([
    fetch("data/trophies.json").then((r) => r.json()),
    fetch("data/roadmap.json").then((r) => r.json()),
  ]);
  DATA = trophies;
  ROADMAP = roadmap;
  loadState();
  $("#spoilerToggle").checked = state.spoilers;
  $("#spoilerToggle").addEventListener("change", (e) => { state.spoilers = e.target.checked; saveState(); route(); });
  $("#exportBtn").addEventListener("click", exportProgress);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ""; });
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Reset all progress, notes and settings? This cannot be undone.")) {
      state = { earned: {}, notes: {}, spoilers: false };
      $("#spoilerToggle").checked = false;
      saveState();
      route();
    }
  });
  view.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.act === "toggle") {
      if (btn.checked) state.earned[id] = true; else delete state.earned[id];
      saveState();
      renderProgress();
      renderGradeCounts();
      // Keep the list as-is; only the header counts change on toggle.
      btn.closest(".card").classList.toggle("earned", btn.checked);
    } else if (btn.dataset.act === "guide") {
      openId = openId === id ? null : id;
      route();
    }
  });
  view.addEventListener("change", (e) => {
    const el = e.target.closest("[data-act='note']");
    if (!el) return;
    const id = Number(el.dataset.id);
    const text = el.value.slice(0, 2000);
    if (text) state.notes[id] = text; else delete state.notes[id];
    saveState();
  });
  document.querySelectorAll("#nav button").forEach((b) => {
    b.addEventListener("click", () => { location.hash = `#/${b.dataset.route}`; });
  });
  window.addEventListener("hashchange", route);
  route();
}

boot();
