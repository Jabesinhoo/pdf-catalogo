const STORAGE_KEY = "tn-saved-quotes";

export function getSavedQuotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveQuote(payload) {
  const current = getSavedQuotes();
  const next = [payload, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteQuote(id) {
  const next = getSavedQuotes().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}