// filters.js — which trophies the checklist shows, and what the spoiler setting hides.
// A story trophy is "spoiled" when the spoiler setting is on, the trophy is a story
// trophy, and the reader has not earned it yet. Hidden PSN trophies are flagged
// separately: they are secret on PlayStation, but this guide names them — the
// spoiler setting is what keeps the story unspoiled, not the hidden flag.
export function isSpoiled(trophy, earned, settings) {
  return settings.spoiler && trophy.kind === "story" && !earned.has(trophy.name);
}

export function applyFilters(trophies, earned, filters) {
  const q = filters.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (filters.kind !== "all" && t.kind !== filters.kind) return false;
    if (filters.grade !== "all" && t.grade !== filters.grade) return false;
    if (filters.earned === "earned" && !earned.has(t.name)) return false;
    if (filters.earned === "todo" && earned.has(t.name)) return false;
    if (filters.missableOnly && !t.missable) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.targetLabel ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

export function kindLabel(kind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
