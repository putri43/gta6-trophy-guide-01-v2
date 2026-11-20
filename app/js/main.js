// Sunset Platinum — boot and routing. Loads the trophy list and the roadmap,
// renders the tab the address hash names, and wires every control by delegation
// so the views stay plain functions.
import { loadState, saveState, toggleEarned, earnedCount, setNote, bumpCount, exportState, importState, resetState } from './store.js';
import { renderTrophies, renderRoadmap, renderMissables, renderNext, renderSettings, gradeBadge } from './views.js';

const view = document.getElementById('view');
const tabs = document.getElementById('tabs');
let trophies = [];
let roadmap = { stages: [], note: '' };
let state = loadState();
let ui = { tab: 'trophies', query: '', kind: 'all', grade: 'all', missableOnly: false, openId: null };

function updateHeader() {
  const earned = earnedCount(state);
  const total = trophies.length || 55;
  const pct = Math.round((earned / total) * 100);
  document.getElementById('earnedCount').textContent = String(earned);
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressLabel').textContent = `${pct}% to the platinum`;
  const left = {};
  for (const t of trophies) {
    if (!state.earned[String(t.id)]) left[t.grade] = (left[t.grade] || 0) + 1;
  }
  document.getElementById('gradeLine').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<b>${left[g] || 0}</b> ${g} left`)
    .join(' · ');
}

function parseHash() {
  const raw = (location.hash || '#/trophies').replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const params = new URLSearchParams(query || '');
  const open = Number(params.get('open'));
  ui = {
    ...ui,
    tab: ['trophies', 'roadmap', 'missables', 'next', 'settings'].includes(path) ? path : 'trophies',
    openId: Number.isFinite(open) && open > 0 ? open : null,
  };
}

function render() {
  parseHash();
  for (const a of tabs.querySelectorAll('a')) {
    a.classList.toggle('active', a.dataset.tab === ui.tab);
  }
  if (ui.tab === 'roadmap') view.innerHTML = renderRoadmap(trophies, roadmap, state);
  else if (ui.tab === 'missables') view.innerHTML = renderMissables(trophies, state);
  else if (ui.tab === 'next') view.innerHTML = renderNext(trophies, roadmap, state);
  else if (ui.tab === 'settings') view.innerHTML = renderSettings(state);
  else view.innerHTML = renderTrophies(trophies, state, ui);
  const detail = document.getElementById('detail');
  updateHeader();
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

view.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    event.stopPropagation();
    state = toggleEarned(state, Number(toggle.dataset.toggle));
    render();
    return;
  }
  const counter = event.target.closest('[data-count]');
  if (counter) {
    const id = Number(counter.dataset.id);
    const t = trophies.find((x) => x.id === id);
    if (t && t.target) {
      bumpCount(state, id, Number(counter.dataset.count), t.target);
      render();
    }
    return;
  }
  const chip = event.target.closest('[data-kind]');
  if (chip) {
    ui.kind = chip.dataset.kind;
    render();
    return;
  }
  const missable = event.target.closest('[data-missable]');
  if (missable) {
    ui.missableOnly = !ui.missableOnly;
    render();
    return;
  }
  const open = event.target.closest('[data-open]');
  if (open) {
    const id = Number(open.dataset.open);
    ui.openId = ui.openId === id ? null : id;
    history.replaceState(null, '', `#/trophies${ui.openId ? `?open=${ui.openId}` : ''}`);
    render();
    const detail = document.getElementById('detail');
    if (detail) detail.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (event.target.id === 'exportBtn') {
    download('sunset-platinum-progress.json', exportState(state));
    return;
  }
  if (event.target.id === 'importBtn') {
    document.getElementById('importFile').click();
    return;
  }
  if (event.target.id === 'resetBtn') {
    if (window.confirm('Reset all earned trophies, notes and counters?')) {
      state = resetState();
      render();
    }
  }
});

view.addEventListener('input', (event) => {
  if (event.target.id === 'search') {
    ui.query = event.target.value;
    const pos = event.target.selectionStart;
    render();
    const next = document.getElementById('search');
    if (next) {
      next.focus();
      next.setSelectionRange(pos, pos);
    }
  }
  if (event.target.id === 'gradeFilter') {
    ui.grade = event.target.value;
    render();
  }
  if (event.target.id === 'spoilerToggle') {
    state.spoiler = event.target.checked;
    saveState(state);
    render();
  }
  if (event.target.dataset && event.target.dataset.note) {
    setNote(state, Number(event.target.dataset.note), event.target.value);
  }
});

view.addEventListener('change', (event) => {
  if (event.target.id === 'importFile' && event.target.files && event.target.files[0]) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = importState(String(reader.result));
        render();
        const msg = document.getElementById('settingsMsg');
        if (msg) msg.textContent = `Imported progress from ${file.name}.`;
      } catch {
        const msg = document.getElementById('settingsMsg');
        if (msg) msg.textContent = 'That file is not valid progress data.';
      }
    };
    reader.readAsText(file);
  }
});

window.addEventListener('hashchange', render);

async function boot() {
  const [trophyRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  const trophyDoc = await trophyRes.json();
  trophies = trophyDoc.trophies || trophyDoc;
  roadmap = await roadmapRes.json();
  render();
}

boot().catch((err) => {
  view.innerHTML = `<h2>Could not load the guide</h2><p class="lede">The trophy data failed to load. ${String(err && err.message ? err.message : err)}</p>`;
});
