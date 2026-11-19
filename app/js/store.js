// store.js — saved progress, per-trophy notes, and settings, all in localStorage.
// Export writes a JSON file the reader can download; import reads one back.
// Nothing leaves the browser unless the reader chooses Export.
const PROGRESS_KEY = "sunset-platinum-progress-v1";
const NOTES_KEY = "sunset-platinum-notes-v1";
const SETTINGS_KEY = "sunset-platinum-settings-v1";

export function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function saveProgress(earned) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned]));
}

export function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveNote(notes, name, text) {
  if (text.trim()) notes[name] = text;
  else delete notes[name];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function loadSettings() {
  try {
    return { spoiler: true, theme: "night", ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return { spoiler: true, theme: "night" };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// The export file: earned names, notes, and the settings that go with them.
export function exportData(earned, notes, settings) {
  return JSON.stringify({ app: "sunset-platinum", version: 1, earned: [...earned], notes, settings }, null, 2);
}

export function importData(text) {
  const parsed = JSON.parse(text);
  const earned = new Set(Array.isArray(parsed.earned) ? parsed.earned : parsed);
  const notes = parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {};
  const settings = parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {};
  return { earned, notes, settings };
}

export function downloadFile(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
