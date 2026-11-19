// views.js — renders the four views: Guide (checklist + detail pane), Roadmap,
// Missables, and Next Up. Every view is built from the same state, so ticking a
// trophy anywhere updates the header count, the roadmap bars and the planner.
import { KINDS } from "./data.js";
import { isSpoiled, applyFilters, gradeLabel, kindLabel } from "./filters.js";
import { countEarned, countByGrade, stageProgress, nextUp, progressPercent } from "./stats.js";

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function medalDot(trophy) {
  const dot = el("span", `medal ${trophy.grade}`);
  dot.title = gradeLabel(trophy.grade);
  return dot;
}

function sourceLine(doc, trophy) {
  return trophy.sources.map((key) => doc.sources[key] ?? key).join(" · ");
}

// --- Guide view: toolbar + checklist + detail pane -------------------------
export function renderGuide(view, state, actions) {
  const { doc, earned, settings } = state;
  const trophies = doc.trophies;

  const toolbar = el("div", "toolbar");
  const search = el("input");
  search.type = "search";
  search.placeholder = "Search trophies, descriptions, guides…";
  search.value = state.filters.query;
  search.setAttribute("aria-label", "Search trophies");
  search.addEventListener("input", () => actions.setQuery(search.value));
  toolbar.append(search);

  const chips = el("div", "chips");
  const allChip = el("button", "chip" + (state.filters.kind === "all" ? " active" : ""), "All kinds");
  allChip.type = "button";
  allChip.addEventListener("click", () => actions.setKind("all"));
  chips.append(allChip);
  for (const kind of KINDS) {
    const chip = el("button", "chip" + (state.filters.kind === kind.id ? " active" : ""), kind.label);
    chip.type = "button";
    chip.addEventListener("click", () => actions.setKind(kind.id));
    chips.append(chip);
  }
  toolbar.append(chips);

  const grade = el("select");
  grade.setAttribute("aria-label", "Filter by grade");
  for (const value of ["all", "platinum", "gold", "silver", "bronze"]) {
    const opt = el("option", null, value === "all" ? "All grades" : gradeLabel(value));
    opt.value = value;
    if (state.filters.grade === value) opt.selected = true;
    grade.append(opt);
  }
  grade.addEventListener("change", () => actions.setGrade(grade.value));
  toolbar.append(grade);

  const earnedSel = el("select");
  earnedSel.setAttribute("aria-label", "Filter by earned state");
  for (const [value, label] of [["all", "Earned + to do"], ["todo", "To do"], ["earned", "Earned"]]) {
    const opt = el("option", null, label);
    opt.value = value;
    if (state.filters.earned === value) opt.selected = true;
    earnedSel.append(opt);
  }
  earnedSel.addEventListener("change", () => actions.setEarnedFilter(earnedSel.value));
  toolbar.append(earnedSel);

  const missableLabel = el("label", "switch");
  const missableBox = el("input");
  missableBox.type = "checkbox";
  missableBox.checked = state.filters.missableOnly;
  missableBox.addEventListener("change", () => actions.setMissableOnly(missableBox.checked));
  missableLabel.append(missableBox, document.createTextNode(" Missable only"));
  toolbar.append(missableLabel);

  const spoilerLabel = el("label", "switch");
  const spoilerBox = el("input");
  spoilerBox.type = "checkbox";
  spoilerBox.checked = settings.spoiler;
  spoilerBox.addEventListener("change", () => actions.setSpoiler(spoilerBox.checked));
  spoilerLabel.append(spoilerBox, document.createTextNode(" Hide story spoilers"));
  toolbar.append(spoilerLabel);

  const themeBtn = el("button", "btn", settings.theme === "night" ? "☀ Paper theme" : "☾ Night theme");
  themeBtn.type = "button";
  themeBtn.addEventListener("click", () => actions.toggleTheme());
  toolbar.append(themeBtn);

  const exportBtn = el("button", "btn", "Export progress");
  exportBtn.type = "button";
  exportBtn.addEventListener("click", () => actions.exportProgress());
  toolbar.append(exportBtn);

  const importLabel = el("label", "btn");
  importLabel.textContent = "Import progress";
  const importInput = el("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.style.display = "none";
  importInput.addEventListener("change", () => actions.importProgress(importInput.files[0]));
  importLabel.append(importInput);
  toolbar.append(importLabel);

  view.append(toolbar);

  const shown = applyFilters(trophies, earned, state.filters);
  const done = countEarned(trophies, earned);
  const countLine = el("p", "count-line");
  countLine.innerHTML = "";
  countLine.append(
    document.createTextNode(`Showing `),
    el("b", null, String(shown.length)),
    document.createTextNode(` of 55 trophies · `),
    el("b", null, `${done} earned`),
    document.createTextNode(` · ${progressPercent(done, 55)}% to the platinum`),
  );
  view.append(countLine);

  const grid = el("div", "guide-grid");
  const list = el("div", "trophy-list");
  for (const t of shown) {
    list.append(renderTrophyRow(t, state, actions));
  }
  if (shown.length === 0) {
    list.append(el("p", "empty-detail", "No trophies match these filters. Clear the search or pick another kind."));
  }
  grid.append(list);
  grid.append(renderDetail(doc, state, actions));
  view.append(grid);
}

function renderTrophyRow(trophy, state, actions) {
  const { earned, settings } = state;
  const spoiled = isSpoiled(trophy, earned, settings);
  const row = el("button", "trophy" + (earned.has(trophy.name) ? " earned" : "") + (state.selected === trophy.name ? " selected" : ""));
  row.type = "button";
  row.addEventListener("click", (event) => {
    if (event.target.tagName === "INPUT") return;
    actions.select(trophy.name);
  });

  const box = el("input");
  box.type = "checkbox";
  box.checked = earned.has(trophy.name);
  box.setAttribute("aria-label", `Mark ${trophy.name} earned`);
  box.addEventListener("click", (event) => event.stopPropagation());
  box.addEventListener("change", () => actions.toggleEarned(trophy.name));
  row.append(box, medalDot(trophy));

  const body = el("div");
  body.append(el("div", "name", spoiled ? "Hidden story trophy" : trophy.name));
  body.append(el("div", "desc", spoiled ? "Story trophy — earn it to reveal the name and description." : trophy.description));
  const meta = el("div", "meta");
  meta.append(el("span", "tag", kindLabel(trophy.kind)));
  if (trophy.targetLabel) meta.append(el("span", "tag", trophy.targetLabel));
  if (trophy.hidden) meta.append(el("span", "tag hidden-t", "Hidden on PSN"));
  if (trophy.missable) meta.append(el("span", "tag missable", "⚠ Missable — see guide"));
  if (state.notes[trophy.name]) meta.append(el("span", "tag", "✎ Note saved"));
  body.append(meta);
  row.append(body);
  row.append(el("span", "grade-label", gradeLabel(trophy.grade)));
  return row;
}

// --- Detail pane: one trophy's guide, with its sources ----------------------
export function renderDetail(doc, state, actions) {
  const pane = el("aside", "detail");
  const trophy = doc.trophies.find((t) => t.name === state.selected);
  if (!trophy) {
    pane.append(el("p", "empty-detail", "Pick a trophy from the list to read its guide — what to do, where and how, when it can be missed, and where each fact comes from."));
    return pane;
  }
  const { earned, settings, notes } = state;
  const spoiled = isSpoiled(trophy, earned, settings);
  const isEarned = earned.has(trophy.name);

  pane.append(el("h2", null, spoiled ? "Hidden story trophy" : trophy.name));
  pane.append(el("p", "official", spoiled ? "Official description hidden until earned." : `“${trophy.description}”`));
  const gradeLine = el("p", "grade-line");
  gradeLine.append(
    document.createTextNode(`${gradeLabel(trophy.grade)} trophy · ${kindLabel(trophy.kind)}`),
    trophy.targetLabel ? document.createTextNode(` · PSN target: ${trophy.targetLabel}`) : document.createTextNode(""),
    trophy.hidden ? document.createTextNode(" · Hidden on PlayStation until earned") : document.createTextNode(""),
  );
  pane.append(gradeLine);

  if (spoiled) {
    pane.append(el("p", "guide-text", "Spoiler protection is on: the guide for this story trophy stays hidden until you earn it. Turn “Hide story spoilers” off above to read it now, or earn the trophy and come back."));
  } else {
    pane.append(el("h3", null, "How to get it"));
    pane.append(el("p", "guide-text", trophy.guide));
    if (trophy.missable) {
      const warn = el("div", "warn-box", `⚠ Missable flag — ${trophy.missableNote}`);
      pane.append(warn);
    }
    pane.append(el("h3", null, "Sources"));
    const src = el("p", "sources", sourceLine(doc, trophy));
    pane.append(src);
    pane.append(el("p", "sources", "The guide above is written for this page from the official description. Where a step is not pinned down by that description, the guide says so — it never invents a location."));
  }

  const noteBox = el("div", "note-box");
  noteBox.append(el("label", null, "Your note (saved in this browser)"));
  const area = el("textarea");
  area.value = notes[trophy.name] ?? "";
  area.placeholder = "e.g. “Gang 3 of 9 done — the docks crew is left.”";
  area.addEventListener("change", () => actions.saveNote(trophy.name, area.value));
  noteBox.append(area);
  pane.append(noteBox);

  const actionsRow = el("div", "actions");
  const toggle = el("button", "btn primary", isEarned ? "✓ Earned — unmark" : "Mark as earned");
  toggle.type = "button";
  toggle.addEventListener("click", () => actions.toggleEarned(trophy.name));
  actionsRow.append(toggle);
  pane.append(actionsRow);
  return pane;
}

// --- Roadmap view ------------------------------------------------------------
export function renderRoadmap(view, state) {
  const { doc, roadmap, earned } = state;
  view.append(el("p", "intro", "The order to earn them in, built from the official descriptions: which story chapters and missions, which collectibles and counts. Finish a stage before the next — the story opens the map and the activities the later stages need. " + roadmap.note));
  for (const stage of roadmap.stages) {
    const inStage = doc.trophies.filter((t) => t.stage === stage.id);
    const prog = stageProgress(doc.trophies, earned, stage.id);
    const card = el("section", "stage");
    const head = el("div", "stage-head");
    head.append(el("h2", null, stage.title));
    head.append(el("span", "stage-count", `${prog.done} of ${prog.total} earned · ${progressPercent(prog.done, prog.total)}%`));
    card.append(head);
    const bar = el("div", "stage-bar");
    bar.append(el("div"));
    bar.firstChild.style.width = `${progressPercent(prog.done, prog.total)}%`;
    card.append(bar);
    card.append(el("p", null, stage.goal));
    card.append(el("p", null, stage.advice));
    card.append(el("p", "trophy-names", inStage.map((t) => (isSpoiled(t, earned, state.settings) ? "Hidden story trophy" : t.name)).join(" · ")));
    view.append(card);
  }
}

// --- Missables view ------------------------------------------------------------
export function renderMissables(view, state) {
  const { doc, earned } = state;
  view.append(el("p", "intro", "No trophy in the official list is confirmed permanently missable from its description alone — story trophies cannot be missed, and most others can be retried. The six below are flagged because each one needs a specific setup in a single attempt, so they are the ones to do deliberately, when the chance comes, instead of hoping they happen."));
  const flagged = doc.trophies.filter((t) => t.missable);
  const list = el("div", "missable-list");
  for (const t of flagged) {
    const card = el("div", "next-item");
    card.append(el("span", "rank", earned.has(t.name) ? "✓" : "⚠"));
    const body = el("div");
    body.append(el("b", null, t.name));
    body.append(el("div", "why", t.missableNote));
    body.append(el("div", "why", t.description));
    card.append(body);
    list.append(card);
  }
  view.append(list);
  const safe = el("div", "card");
  safe.append(el("h2", null, "Safe: everything else"));
  safe.append(el("p", null, "Every story trophy (chapters, missions, contact finales) pops when you finish that mission — none of it can be missed. Collectibles stay where they are until you pick them up, and the counted grinds (stunts, races, challenges) carry across the whole game. The only thing that costs you time is leaving the six flagged trophies above to the very end."));
  view.append(safe);
}

// --- Next Up view --------------------------------------------------------------
export function renderNext(view, state) {
  const { doc, earned } = state;
  const byGrade = countByGrade(doc.trophies, earned);
  const stats = el("div", "stat-grid");
  for (const grade of ["platinum", "gold", "silver", "bronze"]) {
    const box = el("div", "stat");
    box.append(el("b", null, `${byGrade[grade].earned}/${byGrade[grade].total}`));
    box.append(el("span", null, `${gradeLabel(grade)} earned`));
    stats.append(box);
  }
  view.append(stats);
  view.append(el("p", "intro", "Your next trophies, in the order this guide suggests: flagged missables first (their setup may not come back), then the earliest unfinished roadmap stage. Tick one off in the Guide tab and the list re-sorts itself."));
  const picks = nextUp(doc.trophies, earned, 8);
  picks.forEach((pick, i) => {
    const item = el("div", "next-item");
    item.append(el("span", "rank", String(i + 1)));
    const body = el("div");
    const spoiled = isSpoiled(pick.trophy, earned, state.settings);
    body.append(el("b", null, spoiled ? "Hidden story trophy" : pick.trophy.name));
    body.append(el("div", "why", pick.why));
    body.append(el("div", "why", spoiled ? "Story trophy — earn it to reveal its description." : pick.trophy.description));
    item.append(body);
    view.append(item);
  });
  if (picks.length === 0) {
    view.append(el("p", null, "Every trophy is earned — the platinum is yours. Congratulations, Leonida Legend."));
  }
}
