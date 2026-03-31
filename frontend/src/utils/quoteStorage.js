const STORAGE_KEY = "tn-quote-meta";

export function getSavedQuoteMeta() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveQuoteMeta(quoteMeta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quoteMeta));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedQuoteMeta() {
  localStorage.removeItem(STORAGE_KEY);
}