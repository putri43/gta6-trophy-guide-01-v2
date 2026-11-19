// data.js — loads the trophy list and the roadmap from this app's own files.
// Nothing here reaches the network: both JSON files live under app/data/.
export const KINDS = [
  { id: "story", label: "Story" },
  { id: "collectible", label: "Collectibles" },
  { id: "activity", label: "Activities" },
  { id: "exploration", label: "Exploration" },
  { id: "combat", label: "Combat & heists" },
  { id: "misc", label: "Everything else" },
];

export const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

export async function loadTrophies() {
  const res = await fetch("data/trophies.json");
  const doc = await res.json();
  return doc;
}

export async function loadRoadmap() {
  const res = await fetch("data/roadmap.json");
  return res.json();
}

// The official list's make-up, for the header and the roadmap intro.
export function listMakeup(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) counts[t.grade] = (counts[t.grade] || 0) + 1;
  return counts;
}

export function trophyByName(trophies, name) {
  return trophies.find((t) => t.name === name);
}
