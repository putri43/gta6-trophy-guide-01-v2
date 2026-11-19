// main.js — boots Sunset Platinum: loads the data, wires the header progress,
// switches the four views by hash (#/guide, #/roadmap, #/missables, #/next),
// and re-renders whenever progress, filters or settings change.
import { loadTrophies, loadRoadmap } from "./data.js";
import { loadProgress, saveProgress, loadNotes, saveNote, loadSettings, saveSettings, exportData, importData, downloadFile } from "./store.js";
import { countEarned, progressPercent } from "./stats.js";
import { renderGuide, renderRoadmap, renderMissables, renderNext } from "./views.js";

const VIEWS = ["guide", "roadmap", "missables", "next"];

const state = {
  doc: null,
  roadmap: null,
  earned: loadProgress(),
  notes: loadNotes(),
  settings: loadSettings(),
  filters: { query: "", kind: "all", grade: "all", earned: "all", missableOnly: false },
  selected: "The Shootist",
  view: "guide",
};

const viewEl = document.getElementById("view");
const earnedCount = document.getElementById("earnedCount");
const progressFill = document.getElementById("progressFill");
const progressBar = document.getElementById("progressBar");
const progressNote = document.getElementById("progressNote");

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.settings.theme === "paper" ? "paper" : "night");
}

function updateHeader() {
  const done = countEarned(state.doc.trophies, state.earned);
  const pct = progressPercent(done, state.doc.trophies.length);
  earnedCount.textContent = String(done);
  progressFill.style.width = `${pct}%`;
  progressBar.setAttribute("aria-valuenow", String(done));
  progressNote.textContent = done === 55 ? "Platinum earned — Leonida Legend!" : `${pct}% to the platinum · ${55 - done} to go`;
}

function render() {
  applyTheme();
  updateHeader();
  viewEl.replaceChildren();
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });
  if (state.view === "guide") renderGuide(viewEl, state, actions);
  else if (state.view === "roadmap") renderRoadmap(viewEl, state);
  else if (state.view === "missables") renderMissables(viewEl, state);
  else renderNext(viewEl, state);
}

function rerender() {
  render();
}

const actions = {
  toggleEarned(name) {
    if (state.earned.has(name)) state.earned.delete(name);
    else state.earned.add(name);
    saveProgress(state.earned);
    rerender();
  },
  select(name) {
    state.selected = name;
    rerender();
  },
  setQuery(query) {
    state.filters.query = query;
    // Re-render only the list, not the search box the reader is typing in:
    // keep focus by updating the count and rows in place via a full render
    // that restores the query — the search input is rebuilt with its value.
    rerender();
    const input = viewEl.querySelector('input[type="search"]');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  },
  setKind(kind) {
    state.filters.kind = kind;
    rerender();
  },
  setGrade(grade) {
    state.filters.grade = grade;
    rerender();
  },
  setEarnedFilter(value) {
    state.filters.earned = value;
    rerender();
  },
  setMissableOnly(value) {
    state.filters.missableOnly = value;
    rerender();
  },
  setSpoiler(value) {
    state.settings.spoiler = value;
    saveSettings(state.settings);
    rerender();
  },
  toggleTheme() {
    state.settings.theme = state.settings.theme === "night" ? "paper" : "night";
    saveSettings(state.settings);
    rerender();
  },
  saveNote(name, text) {
    saveNote(state.notes, name, text);
  },
  exportProgress() {
    downloadFile("sunset-platinum-progress.json", exportData(state.earned, state.notes, state.settings));
  },
  async importProgress(file) {
    if (!file) return;
    try {
      const imported = importData(await file.text());
      state.earned = imported.earned;
      state.notes = imported.notes;
      state.settings = { ...state.settings, ...imported.settings };
      saveProgress(state.earned);
      localStorage.setItem("sunset-platinum-notes-v1", JSON.stringify(state.notes));
      saveSettings(state.settings);
    } catch {
      alert("That file is not a Sunset Platinum progress export.");
    }
    rerender();
  },
};

function routeFromHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  state.view = VIEWS.includes(hash) ? hash : "guide";
}

window.addEventListener("hashchange", () => {
  routeFromHash();
  render();
});

document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    location.hash = `#/${btn.dataset.view}`;
  });
});

state.doc = await loadTrophies();
state.roadmap = await loadRoadmap();
routeFromHash();
render();
