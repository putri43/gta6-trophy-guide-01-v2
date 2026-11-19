// stats.js — progress numbers: the header count, per-stage progress, and the
// Next Up planner's ordering (missables first, then the earliest unfinished stage).
export function countEarned(trophies, earned) {
  return trophies.filter((t) => earned.has(t.name)).length;
}

export function countByGrade(trophies, earned) {
  const out = {};
  for (const t of trophies) {
    out[t.grade] = out[t.grade] || { total: 0, earned: 0 };
    out[t.grade].total += 1;
    if (earned.has(t.name)) out[t.grade].earned += 1;
  }
  return out;
}

export function stageProgress(trophies, earned, stageId) {
  const inStage = trophies.filter((t) => t.stage === stageId);
  const done = inStage.filter((t) => earned.has(t.name)).length;
  return { total: inStage.length, done };
}

// Next Up: unfinished missables first (their chance may not come back), then the
// earliest roadmap stage with work left, story trophies before grinds.
export function nextUp(trophies, earned, limit = 8) {
  const todo = trophies.filter((t) => !earned.has(t.name));
  const missables = todo.filter((t) => t.missable);
  const rest = todo.filter((t) => !t.missable).sort((a, b) => a.stage - b.stage || a.id - b.id);
  const picked = [...missables, ...rest].slice(0, limit);
  return picked.map((t) => ({
    trophy: t,
    why: t.missable
      ? "Missable-flagged — its setup is specific, so do it when the chance comes."
      : t.kind === "story"
        ? `Roadmap stage ${t.stage} — the story comes first and unlocks the rest.`
        : `Roadmap stage ${t.stage} — ${t.targetLabel ?? "one trophy"} toward the platinum.`,
  }));
}

export function progressPercent(done, total) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
