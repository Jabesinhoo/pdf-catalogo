const STORAGE_KEY = "tn-saved-documents";

export function getSavedDocuments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveDocument(document) {
  const current = getSavedDocuments();
  
  // Crear documento con metadatos
  const newDoc = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: document.type,
    title: document.title || (document.type === "quote" ? "Cotización" : "Catálogo"),
    products: document.products,
    quoteMeta: document.quoteMeta,
    orientation: document.orientation,
    createdAt: new Date().toISOString(),
    productCount: document.products.length,
    customerName: document.quoteMeta?.customerName,
    pdfUrl: document.pdfUrl,
  };
  
  const updated = [newDoc, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function updateDocument(id, updates) {
  const current = getSavedDocuments();
  const updated = current.map(doc => 
    doc.id === id ? { ...doc, ...updates } : doc
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteDocument(id) {
  const current = getSavedDocuments();
  const updated = current.filter(doc => doc.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function loadDocument(id) {
  const current = getSavedDocuments();
  return current.find(doc => doc.id === id);
}