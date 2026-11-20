// Sunset Platinum — single-module guide app (plain ES module, no build step).
// Loads the trophy + roadmap data, renders the four tabs, and keeps ticks and
// notes in localStorage on this device only. Everything runs offline.
const EARNED_KEY = 'sunset-platinum-v4';
const NOTES_KEY = 'sunset-platinum-v4-notes';
const SEED_CH4 = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 16, 21];

const params = new URLSearchParams(location.search);
const trophiesDoc = await (await fetch('data/trophies.json')).json();
const roadmapDoc = await (await fetch('data/roadmap.json')).json();
const trophies = trophiesDoc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set(JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]'));
let notes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}');
if (params.get('seed') === 'ch4' && earned.size === 0) {
  earned = new Set(SEED_CH4);
  persist();
}

const $ = (id) => document.getElementById(id);
const cardsEl = $('cards');
const searchEl = $('search');
const gradeEl = $('grade-filter');
const kindEl = $('kind-filter');
const hideEl = $('hide-earned');
const spoilerEl = $('spoiler');

function persist() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function masked(t) {
  return t.hidden && !earned.has(t.id) && spoilerEl.checked;
}

function gradeCounts() {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    out[t.grade][1] += 1;
    if (earned.has(t.id)) out[t.grade][0] += 1;
  }
  return out;
}

function renderProgress() {
  $('earned-count').textContent = earned.size;
  $('progress-fill').style.width = `${(earned.size / trophies.length) * 100}%`;
  const c = gradeCounts();
  $('grade-line').textContent =
    `Platinum ${c.platinum[0]}/${c.platinum[1]} · Gold ${c.gold[0]}/${c.gold[1]} · Silver ${c.silver[0]}/${c.silver[1]} · Bronze ${c.bronze[0]}/${c.bronze[1]}`;
}

function cardFor(t) {
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
  card.id = `trophy-${t.id}`;
  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.setAttribute('aria-label', `Mark ${t.name} earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    persist();
    renderAll();
  });
  const title = document.createElement('h2');
  title.textContent = masked(t) ? '??? — hidden trophy' : t.name;
  const chip = document.createElement('span');
  chip.className = `grade-chip grade-${t.grade}`;
  chip.textContent = t.grade;
  head.append(box, title, chip);
  card.append(head);
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = masked(t) ? 'Hidden until earned — spoiler-safe mode is on.' : t.desc;
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = masked(t) ? 'Earn it first, then the guide unlocks here.' : t.guide;
  card.append(desc, guide);
  const note = document.createElement('input');
  note.className = 'note-field';
  note.type = 'text';
  note.placeholder = 'Your note…';
  note.value = notes[t.id] ?? '';
  note.addEventListener('change', () => {
    if (note.value.trim()) notes[t.id] = note.value.trim();
    else delete notes[t.id];
    persist();
  });
  card.append(note);
  const tags = document.createElement('div');
  tags.className = 'tags';
  for (const label of [`Stage ${t.stage}`, t.kind, t.hidden ? 'hidden' : 'shown']) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = label;
    tags.append(tag);
  }
  if (t.missable) {
    const warn = document.createElement('span');
    warn.className = 'tag warn';
    warn.textContent = 'watch out — do it when the moment comes';
    tags.append(warn);
  }
  card.append(tags);
  return card;
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (hideEl.checked && earned.has(t.id)) return false;
    if (q && !(t.name + ' ' + t.desc + ' ' + t.guide + ' ' + t.kind).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderGuide() {
  const list = visibleTrophies();
  cardsEl.replaceChildren(...list.map(cardFor));
  $('result-line').textContent = `${list.length} of ${trophies.length} trophies shown · ${earned.size} earned`;
}

function renderRoadmap() {
  const wrap = $('stages');
  wrap.replaceChildren();
  for (const stage of roadmapDoc.stages) {
    const got = stage.trophies.filter((id) => earned.has(id)).length;
    const el = document.createElement('article');
    el.className = 'stage';
    const head = document.createElement('div');
    head.className = 'stage-head';
    const h = document.createElement('h2');
    h.textContent = `Stage ${stage.id} — ${stage.name}`;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${got}/${stage.trophies.length} earned`;
    head.append(h, count);
    const goal = document.createElement('p');
    goal.textContent = stage.goal;
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const tip = document.createElement('p');
    tip.className = 'tip';
    tip.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = 'Tip: ';
    tip.append(strong, document.createTextNode(stage.tip));
    const names = document.createElement('p');
    names.textContent = 'Trophies: ' + stage.trophies.map((id) => byId.get(id).name).join(' · ');
    el.append(head, goal, blurb, tip, names);
    wrap.append(el);
  }
}

function renderMissables() {
  const list = trophies.filter((t) => t.missable);
  $('missable-cards').replaceChildren(...list.map(cardFor));
}

function renderNextUp() {
  const counters = $('nextup-counters');
  counters.replaceChildren();
  const c = gradeCounts();
  for (const [grade, [got, total]] of Object.entries(c)) {
    const el = document.createElement('div');
    el.className = 'counter';
    const b = document.createElement('b');
    b.textContent = `${total - got} left`;
    const s = document.createElement('span');
    s.textContent = grade;
    el.append(b, s);
    counters.append(el);
  }
  const order = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
  const remaining = trophies
    .filter((t) => !earned.has(t.id) && t.id !== 1)
    .sort((a, b) => order[a.grade] - order[b.grade] || a.stage - b.stage || a.id - b.id)
    .slice(0, 10);
  const list = $('nextup-list');
  list.replaceChildren();
  for (const t of remaining) {
    const li = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = masked(t) ? '??? — hidden trophy' : t.name;
    const chip = document.createElement('span');
    chip.className = `grade-chip grade-${t.grade}`;
    chip.textContent = t.grade;
    const why = document.createElement('span');
    why.textContent = ` — Stage ${t.stage}, ${t.kind}`;
    li.append(name, chip, why);
    list.append(li);
  }
}

function renderAll() {
  renderProgress();
  renderGuide();
  renderRoadmap();
  renderMissables();
  renderNextUp();
}

function showTab(name) {
  for (const btn of document.querySelectorAll('.tab')) {
    btn.classList.toggle('active', btn.dataset.tab === name);
  }
  for (const panel of document.querySelectorAll('.panel')) {
    panel.classList.toggle('active', panel.id === `tab-${name}`);
  }
}

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
}
for (const el of [searchEl, gradeEl, kindEl, hideEl, spoilerEl]) {
  el.addEventListener('input', renderAll);
}
$('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ earned: [...earned], notes }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sunset-platinum-progress.json';
  a.click();
});
$('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const data = JSON.parse(await file.text());
  earned = new Set((data.earned ?? []).filter((id) => byId.has(id)));
  notes = data.notes ?? {};
  persist();
  renderAll();
});

if (params.get('spoiler') === 'on') spoilerEl.checked = true;
if (params.get('tab')) showTab(params.get('tab'));
renderAll();
const openId = Number(params.get('open'));
if (openId && byId.has(openId)) {
  document.getElementById(`trophy-${openId}`)?.scrollIntoView({ block: 'center' });
}
