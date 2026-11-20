// Sunset Platinum — views. Each render function returns HTML for one tab.
// The spoiler rule lives here: with spoilers on, a hidden trophy the player has
// not earned yet shows a masked name and description, and no guide.
import { isEarned, getNote, getCount } from './store.js';

const KINDS = ['story', 'mission', 'stranger', 'activity', 'collectible', 'combat', 'economy', 'secret'];
const KIND_LABELS = {
  story: 'Story', mission: 'Missions', stranger: 'Strangers', activity: 'Activities',
  collectible: 'Collectibles', combat: 'Combat', economy: 'Money', secret: 'Secrets',
};

export function gradeBadge(t) {
  return `<span class="medal ${t.grade}"></span><span class="grade-name">${t.grade}</span>`;
}

export function masked(t, state) {
  return state.spoiler && t.hidden && !isEarned(state, t.id);
}

function visibleTrophies(trophies, state, ui) {
  const q = (ui.query || '').trim().toLowerCase();
  return trophies.filter((t) => {
    if (ui.kind && ui.kind !== 'all' && t.kind !== ui.kind) return false;
    if (ui.grade && ui.grade !== 'all' && t.grade !== ui.grade) return false;
    if (ui.missableOnly && !t.missable) return false;
    if (q) {
      if (masked(t, state)) return false;
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function trophyRow(t, state) {
  const earned = isEarned(state, t.id);
  const hide = masked(t, state);
  const name = hide ? 'Hidden trophy' : t.name;
  const desc = hide ? 'Earn this trophy to reveal its name and description.' : t.description;
  const tags = [
    `<span class="tag">${KIND_LABELS[t.kind] || t.kind}</span>`,
    t.missable ? '<span class="tag missable">Missable</span>' : '',
    hide ? '<span class="tag hidden-tag">Hidden</span>' : '',
  ].join('');
  return `<button class="trophy${earned ? ' earned' : ''}" data-open="${t.id}" type="button">
    <span class="check" data-toggle="${t.id}" role="checkbox" aria-checked="${earned}" aria-label="Mark ${name} earned">${earned ? '✓' : ''}</span>
    <span><h3>${name}</h3><p class="desc">${desc}</p><span class="meta">${tags}</span></span>
    ${gradeBadge(t)}
  </button>`;
}

function detailPanel(t, state) {
  if (!t) return '';
  const earned = isEarned(state, t.id);
  const hide = masked(t, state);
  if (hide) {
    return `<section class="detail" id="detail"><h3>Hidden trophy</h3>
      <p class="official">This trophy is hidden on PlayStation until it is earned.</p>
      <p>Turn spoilers off in Settings to see its name and guide, or earn it in the game and tick it off here.</p>
      <button class="btn" data-toggle="${t.id}" type="button">${earned ? 'Mark as not earned' : 'Mark as earned'}</button>
    </section>`;
  }
  const counter = t.target
    ? `<div class="counter-row"><span>Progress toward the target:</span>
        <button data-count="-1" data-id="${t.id}" type="button" aria-label="Decrease count">−</button>
        <strong id="count-${t.id}">${getCount(state, t.id)} / ${t.target.toLocaleString('en-US')}</strong>
        <button data-count="1" data-id="${t.id}" type="button" aria-label="Increase count">+</button></div>`
    : '';
  const sources = (t.sources || []).map((s) => `<li>${s}</li>`).join('');
  return `<section class="detail" id="detail">
    <h3>${t.name}</h3>
    <p class="official">“${t.description}” — official description, ${t.grade} trophy.</p>
    <p>${t.guide}</p>
    ${t.missable ? '<p><strong>Missable:</strong> this one involves a one-time moment or setup — do it when the chance appears. No trophy is confirmed permanently missable yet.</p>' : ''}
    ${counter}
    <label for="note-${t.id}">Your notes</label>
    <textarea class="note-field" id="note-${t.id}" data-note="${t.id}" placeholder="Your own notes for this trophy…">${getNote(state, t.id)}</textarea>
    <p style="margin-top:12px"><button class="btn" data-toggle="${t.id}" type="button">${earned ? 'Mark as not earned' : 'Mark as earned'}</button></p>
    <div class="sources"><b>Sources:</b><ul>${sources}</ul></div>
  </section>`;
}

export function renderTrophies(trophies, state, ui) {
  const open = ui.openId ? trophies.find((t) => t.id === ui.openId) : null;
  const list = visibleTrophies(trophies, state, ui);
  const chips = ['all', ...KINDS].map((k) => {
    const label = k === 'all' ? 'All kinds' : KIND_LABELS[k];
    const active = (ui.kind || 'all') === k ? ' on' : '';
    return `<button class="chip${active}" data-kind="${k}" type="button">${label}</button>`;
  }).join('');
  const rows = list.map((t) => trophyRow(t, state)).join('');
  return `<h2>Trophies</h2>
  <p class="lede">All 55 official trophies. Tick them off as you earn them — progress is saved in your browser. Hidden story trophies stay masked while spoilers are on.</p>
  <div class="toolbar">
    <input type="search" id="search" placeholder="Search trophies…" value="${ui.query || ''}" aria-label="Search trophies">
    <select id="gradeFilter" aria-label="Filter by grade">
      <option value="all"${(ui.grade || 'all') === 'all' ? ' selected' : ''}>All grades</option>
      <option value="platinum"${ui.grade === 'platinum' ? ' selected' : ''}>Platinum</option>
      <option value="gold"${ui.grade === 'gold' ? ' selected' : ''}>Gold</option>
      <option value="silver"${ui.grade === 'silver' ? ' selected' : ''}>Silver</option>
      <option value="bronze"${ui.grade === 'bronze' ? ' selected' : ''}>Bronze</option>
    </select>
    <button class="chip${ui.missableOnly ? ' on' : ''}" data-missable type="button">Missable only</button>
  </div>
  <div class="chips">${chips}</div>
  ${detailPanel(open, state)}
  <div class="trophy-list">${rows || '<p class="empty">No trophies match these filters.</p>'}</div>`;
}

export function renderRoadmap(trophies, roadmap, state) {
  const byId = new Map(trophies.map((t) => [t.id, t]));
  const stages = roadmap.stages.map((s) => {
    const done = s.ids.filter((id) => isEarned(state, id)).length;
    const pct = Math.round((done / s.ids.length) * 100);
    const chips = s.ids.map((id) => {
      const t = byId.get(id);
      if (!t) return '';
      const label = masked(t, state) ? 'Hidden trophy' : t.name;
      return `<a class="mini-chip${isEarned(state, id) ? ' done' : ''}" href="#/trophies?open=${id}">${label}</a>`;
    }).join('');
    return `<section class="stage"><h3>${s.name} — ${done}/${s.ids.length}</h3>
      <div class="stage-bar"><div style="width:${pct}%"></div></div>
      <p>${s.blurb}</p><p class="tip">${s.tip}</p>
      <div class="stage-chips">${chips}</div></section>`;
  }).join('');
  return `<h2>Roadmap to the platinum</h2>
  <p class="lede">Five stages, in the order we would play them. Each stage lists its trophies — click one to open its guide. ${roadmap.note || ''}</p>
  ${stages}`;
}

export function renderMissables(trophies, state) {
  const flagged = trophies.filter((t) => t.missable);
  const cards = flagged.map((t) => {
    const hide = masked(t, state);
    const name = hide ? 'Hidden trophy' : t.name;
    const guide = hide ? 'Earn this trophy to reveal its guide, or turn spoilers off in Settings.' : t.guide;
    return `<section class="stage"><h3>${name}</h3>
      <p>${guide}</p>
      <p><a href="#/trophies?open=${t.id}">Open the full guide →</a></p></section>`;
  }).join('');
  return `<h2>Missables</h2>
  <div class="warn"><h3>Do these when the chance appears</h3>
  <p>No trophy is confirmed permanently missable yet. The six below involve one-time moments or setups, so they are the ones to watch for while you play — the rest can be mopped up after the story.</p></div>
  ${cards}`;
}

export function renderNext(trophies, roadmap, state) {
  const remaining = {};
  for (const t of trophies) {
    if (!isEarned(state, t.id)) remaining[t.grade] = (remaining[t.grade] || 0) + 1;
  }
  const gradeLine = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${remaining[g] || 0} ${g}`)
    .join(' · ');
  const cards = roadmap.stages.map((s) => {
    const next = s.ids.filter((id) => !isEarned(state, id)).slice(0, 3);
    if (next.length === 0) {
      return `<section class="next-card"><h3>${s.name}</h3><p>Stage complete — every trophy here is earned.</p></section>`;
    }
    const items = next.map((id) => {
      const t = trophies.find((x) => x.id === id);
      const name = masked(t, state) ? 'Hidden trophy' : t.name;
      return `<li><a href="#/trophies?open=${id}">${name}</a> — ${t.grade}${t.missable ? ' · missable' : ''}</li>`;
    }).join('');
    return `<section class="next-card"><h3>${s.name}</h3><ul>${items}</ul></section>`;
  }).join('');
  return `<h2>Next Up</h2>
  <p class="lede">The next trophies to chase, stage by stage. Still to earn: ${gradeLine}.</p>
  ${cards}`;
}

export function renderSettings(state) {
  return `<h2>Settings</h2>
  <p class="lede">Your progress is saved in this browser only. Export it to a file before clearing browser data, and import it back on any device.</p>
  <label class="switch-row"><input type="checkbox" id="spoilerToggle"${state.spoiler ? ' checked' : ''}> Hide story trophies until earned (spoiler setting)</label>
  <div class="settings-row">
    <button class="btn" id="exportBtn" type="button">Export progress</button>
    <button class="btn ghost" id="importBtn" type="button">Import progress…</button>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
    <button class="btn ghost" id="resetBtn" type="button">Reset all progress</button>
  </div>
  <p class="lede" id="settingsMsg"></p>`;
}
