// Sunset Platinum — saved progress. One small store: earned ticks, per-trophy
// notes, per-trophy counters for counted trophies, and the spoiler setting.
// Everything lives in localStorage under one key; export/import move it as JSON.
const KEY = 'sunset-platinum-v3';

function blankState() {
  return { earned: {}, notes: {}, counts: {}, spoiler: true };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return blankState();
    return {
      earned: parsed.earned && typeof parsed.earned === 'object' ? parsed.earned : {},
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      spoiler: parsed.spoiler !== false,
    };
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the page still works for this visit.
  }
}

export function isEarned(state, id) {
  return state.earned[String(id)] === true;
}

export function toggleEarned(state, id) {
  const key = String(id);
  if (state.earned[key]) delete state.earned[key];
  else state.earned[key] = true;
  saveState(state);
  return state;
}

export function earnedCount(state) {
  return Object.keys(state.earned).length;
}

export function setNote(state, id, text) {
  const key = String(id);
  const clean = String(text || '').slice(0, 2000);
  if (clean.trim()) state.notes[key] = clean;
  else delete state.notes[key];
  saveState(state);
}

export function getNote(state, id) {
  return state.notes[String(id)] || '';
}

export function getCount(state, id) {
  const n = Number(state.counts[String(id)]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function bumpCount(state, id, delta, cap) {
  const key = String(id);
  const next = Math.max(0, Math.min(cap, getCount(state, id) + delta));
  if (next === 0) delete state.counts[key];
  else state.counts[key] = next;
  saveState(state);
  return next;
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(text) {
  const parsed = JSON.parse(String(text));
  if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
  const next = blankState();
  if (parsed.earned && typeof parsed.earned === 'object') next.earned = parsed.earned;
  if (parsed.notes && typeof parsed.notes === 'object') next.notes = parsed.notes;
  if (parsed.counts && typeof parsed.counts === 'object') next.counts = parsed.counts;
  if (typeof parsed.spoiler === 'boolean') next.spoiler = parsed.spoiler;
  saveState(next);
  return next;
}

export function resetState() {
  const next = blankState();
  saveState(next);
  return next;
}
