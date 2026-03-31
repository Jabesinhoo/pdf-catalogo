import { useEffect, useMemo, useState } from "react";
import "./App.css";
import MainLayout from "./layouts/MainLayout";
import Login from "./components/Login";
import AdminPanel from "./components/AdminPanel";
import AdminStats from "./components/AdminStats";
import SavedDocuments from "./components/SavedDocuments";
import SearchPanel from "./components/SearchPanel";
import SearchHistory from "./components/SearchHistory";
import ResultsToolbar from "./components/ResultsToolbar";
import ProductCard from "./components/ProductCard";
import EditProductModal from "./components/EditProductModal";
import QuoteForm from "./components/QuoteForm";
import ConfirmModal from "./components/ConfirmModal";
import MassIvaEditor from "./components/MassIvaEditor";
import { useTheme } from "./hooks/useTheme";
import { createEmptyProduct } from "./utils/productFactory";
import { apiFetch } from "./services/api";
import { useSessionKeepAlive } from './hooks/useSessionKeepAlive';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DraggableProductCard from './components/DraggableProductCard';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function splitQueries(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeProducts(existingProducts, newProducts) {
  const map = new Map();

  for (const product of existingProducts) {
    const key = product.id || product.productUrl || product.sku || `${product.name || "producto"}-${Math.random()}`;
    map.set(key, {
      ...product,
      quantity: Number(product.quantity) || 1,
      ivaRate: Number(product.ivaRate ?? 0) || 0,
      totalPrice: product.totalPrice || "",
      selected: product.selected ?? true,
      images: product.images || []
    });
  }

  for (const product of newProducts) {
    const key = product.id || product.productUrl || product.sku || `${product.name || "producto"}-${Math.random()}`;
    if (!map.has(key)) {
      map.set(key, {
        ...product,
        quantity: Number(product.quantity) || 1,
        ivaRate: Number(product.ivaRate ?? 0) || 0,
        totalPrice: product.totalPrice || "",
        selected: product.selected ?? true,
        images: product.images || []
      });
    }
  }

  return Array.from(map.values());
}

function normalizeProduct(product = {}) {
  return {
    id: product.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: product.name || "",
    sku: product.sku || "",
    price: product.price || "",
    quantity: Math.max(1, Number(product.quantity) || 1),
    ivaRate: Math.max(0, Number(product.ivaRate ?? 0) || 0),
    ivaType: product.ivaType || 'gravado',
    totalPrice: product.totalPrice || "",
    shortDescription: product.shortDescription || "",
    image: product.image || "",
    images: product.images || [],
    productUrl: product.productUrl || "",
    selected: product.selected ?? true,
  };
}

function App() {
  const { theme, toggleTheme } = useTheme();

  // ===== AUTENTICACIÓN =====
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // ===== ESTADOS PRINCIPALES =====
  const [documentType, setDocumentType] = useState("catalog");
  const [mode, setMode] = useState("url");
  const [queryText, setQueryText] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [stockStatuses, setStockStatuses] = useState(["instock"]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [orientation, setOrientation] = useState("portrait");
  const [localFilter, setLocalFilter] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [lastPdfUrl, setLastPdfUrl] = useState("");
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [undoToast, setUndoToast] = useState({ show: false, message: "", onUndo: null });
  
  // Selección masiva para eliminar
  const [batchSelectedIds, setBatchSelectedIds] = useState([]);

  // Modales de confirmación
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [showNewCatalogModal, setShowNewCatalogModal] = useState(false);

  const [quoteMeta, setQuoteMeta] = useState({
    companyName: "TECNONACHO S.A.S",
    nit: "901.067.698-7",
    date: new Date().toISOString().slice(0, 10),
    customerName: "",
    currency: "COP",
    role: "",
    authorName: "",
    phone: "",
    email: "",
    validityDays: 1,
    documentTitle: "CATÁLOGO",
    quoteNumber: "",
    paymentNote: "ESTE PRECIO ES SOLO PARA PAGOS EN EFECTIVO O TRANSFERENCIA",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [draft, setDraft] = useState({
    name: "", sku: "", price: "", quantity: 1, ivaRate: 0, ivaType: 'gravado',
    totalPrice: "", shortDescription: "", image: "", images: [], productUrl: "", selected: true,
  });

  // ===== VERIFICAR SESIÓN AL INICIAR =====
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
          setAuthUser(data.user);
          localStorage.setItem('tecnocotizador_user', data.user.username);
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);
  
  useSessionKeepAlive(authUser ? 5 * 60 * 1000 : null);
  
  function handleOpenStats() {
    setShowStatsPanel(true);
  }
  
  function handleLogin(userData) {
    setAuthUser(userData);
    localStorage.setItem('tecnocotizador_user', userData.username);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error en logout:', error);
    }
    setAuthUser(null);
    localStorage.removeItem('tecnocotizador_user');
    setSavedDocuments([]);
  }

  // ===== FUNCIONES PARA DOCUMENT TYPE =====
  function handleDocumentTypeChange(type) {
    setDocumentType(type);
    setError("");
    setQuoteMeta((prev) => ({
      ...prev,
      documentTitle: type === "quote" ? "COTIZACIÓN" : "CATÁLOGO",
    }));
  }

  // ===== FUNCIONES PARA POSTGRESQL =====
  async function loadDocumentsFromDB() {
    if (!authUser) return;

    try {
      setDbLoading(true);
      const response = await fetch(`/api/documents?userId=${encodeURIComponent(authUser.username)}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setSavedDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setDbLoading(false);
    }
  }

  async function saveDocumentToDB(document) {
    if (!authUser) return null;

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...document,
          userId: authUser.username
        })
      });

      const data = await response.json();
      return data.success ? data.document : null;
    } catch (error) {
      console.error('Error guardando:', error);
      return null;
    }
  }

  async function deleteDocumentFromDB(id) {
    if (!authUser) return false;

    try {
      const response = await fetch(`/api/documents/${id}?userId=${encodeURIComponent(authUser.username)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSavedDocuments(prev => prev.filter(doc => doc.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error eliminando:', error);
      return false;
    }
  }

  useEffect(() => {
    if (authUser) {
      loadDocumentsFromDB();
    }
  }, [authUser]);

  // ===== FUNCIONES PARA CATEGORÍAS =====
  useEffect(() => {
    async function loadCategories() {
      try {
        setError("");
        const data = await apiFetch("/products/categories", {
          credentials: 'include'
        });
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando categorías:", err);
        setError(err.message || "No se pudieron cargar las categorías.");
      }
    }
    if (authUser) {
      loadCategories();
    }
  }, [authUser]);

  // ===== FUNCIONES PARA PRODUCTOS =====
  const visibleProducts = useMemo(() => {
    const term = localFilter.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      String(product.name || "").toLowerCase().includes(term) ||
      String(product.sku || "").toLowerCase().includes(term) ||
      String(product.shortDescription || "").toLowerCase().includes(term) ||
      String(product.price || "").toLowerCase().includes(term)
    );
  }, [products, localFilter]);

  const selectedProducts = useMemo(() => products.filter((p) => p.selected), [products]);
  const selectedCount = selectedProducts.length;
  const allSelected = products.length > 0 && products.every((p) => p.selected);

  // 👇 FUNCIÓN PARA ARRASTRAR Y REORDENAR PRODUCTOS (DENTRO DEL COMPONENTE)
  const moveProduct = (dragIndex, hoverIndex) => {
    setProducts((prevProducts) => {
      const newProducts = [...prevProducts];
      const draggedProduct = newProducts[dragIndex];
      newProducts.splice(dragIndex, 1);
      newProducts.splice(hoverIndex, 0, draggedProduct);
      return newProducts;
    });
  };

  async function fetchSearch(modeValue, value) {
    const data = await apiFetch("/products/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ mode: modeValue, value, categories: selectedCategories, stockStatuses }),
    });
    return data.products || [];
  }

  async function runSearch({ append, replace = false }) {
    try {
      setLoading(true);
      setError("");

      const queries = splitQueries(queryText);

      if (!queries.length && selectedCategories.length === 0) {
        throw new Error("Escribe una búsqueda o selecciona al menos una categoría.");
      }

      let allNewProducts = [];
      const historyItems = [];
      const effectiveQueries = queries.length ? queries : [""];

      for (const query of effectiveQueries) {
        const result = await fetchSearch(mode, query);
        allNewProducts = mergeProducts(allNewProducts, result);

        historyItems.push({
          id: `${mode}-${query || "solo-filtros"}-${Date.now()}-${Math.random()}`,
          mode,
          value: query || "(solo filtros)",
          count: result.length,
          createdAt: new Date().toISOString(),
        });
      }

      if (replace) {
        setProducts(allNewProducts);
        setSearchHistory(historyItems);
      } else if (append) {
        setProducts((prev) => mergeProducts(prev, allNewProducts));
        setSearchHistory((prev) => [...historyItems, ...prev]);
      } else {
        setProducts((prev) => mergeProducts(prev, allNewProducts));
        setSearchHistory((prev) => [...historyItems, ...prev]);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }

  function resetCatalog() {
    if (products.length > 0 && !window.confirm("¿Estás seguro de limpiar todo el catálogo?")) return;
    setProducts([]);
    setSearchHistory([]);
    setLocalFilter("");
    setLastPdfUrl("");
    setError("");
    setSelectedCategories([]);
    setStockStatuses(["instock"]);
    setBatchSelectedIds([]);
  }

  function handleToggleProduct(productId) {
    setProducts((prev) => prev.map((product) =>
      product.id === productId ? { ...product, selected: !product.selected } : product
    ));
  }

  function handleSelectAll() {
    setProducts((prev) => prev.map((product) => ({ ...product, selected: true })));
  }

  function handleDeselectAll() {
    setProducts((prev) => prev.map((product) => ({ ...product, selected: false })));
  }

  function handleRemoveProduct(productId) {
    const productToRemove = products.find(p => p.id === productId);
    const productIndex = products.findIndex(p => p.id === productId);

    if (!window.confirm('¿Eliminar este producto?')) return;

    setProducts((prev) => prev.filter((product) => product.id !== productId));
    setBatchSelectedIds(prev => prev.filter(id => id !== productId));

    setUndoToast({
      show: true,
      message: "Producto eliminado",
      onUndo: () => {
        setProducts((prev) => {
          const newProducts = [...prev];
          newProducts.splice(productIndex, 0, productToRemove);
          return newProducts;
        });
        setUndoToast({ show: false, message: "", onUndo: null });
      },
    });

    setTimeout(() => setUndoToast((prev) => ({ ...prev, show: false })), 5000);
  }

  // ===== FUNCIONES PARA SELECCIÓN MASIVA =====
  function handleSelectAllForBatch() {
    setBatchSelectedIds(products.map(p => p.id));
  }

  function handleDeselectAllForBatch() {
    setBatchSelectedIds([]);
  }

  function handleToggleBatchSelection(productId) {
    setBatchSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  function handleDeleteBatch() {
    if (batchSelectedIds.length === 0) return;

    if (window.confirm(`¿Eliminar ${batchSelectedIds.length} producto${batchSelectedIds.length !== 1 ? 's' : ''}?`)) {
      const removedProducts = products.filter(p => batchSelectedIds.includes(p.id));

      setProducts(prev => prev.filter(p => !batchSelectedIds.includes(p.id)));
      setBatchSelectedIds([]);

      setUndoToast({
        show: true,
        message: `${removedProducts.length} producto${removedProducts.length !== 1 ? 's' : ''} eliminado${removedProducts.length !== 1 ? 's' : ''}`,
        onUndo: () => {
          setProducts(prev => [...prev, ...removedProducts]);
        },
      });

      setTimeout(() => {
        setUndoToast((prev) => ({ ...prev, show: false }));
      }, 5000);
    }
  }

  // ===== FUNCIÓN PARA APLICAR IVA EN MASA =====
  function handleApplyIvaToSelected(ivaType, ivaRate) {
    if (batchSelectedIds.length === 0) return;

    setProducts(prev => prev.map(product => {
      if (batchSelectedIds.includes(product.id)) {
        return {
          ...product,
          ivaType: ivaType,
          ivaRate: ivaType === 'excluido' ? 0 : ivaRate
        };
      }
      return product;
    }));
  }

  function handleCreateManualProduct() {
    const product = normalizeProduct(createEmptyProduct());
    setProducts((prev) => [{ ...product, selected: true }, ...prev]);
  }

  function handleDuplicateProduct(product) {
    const duplicatedProduct = {
      ...product,
      id: `copy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: `${product.name} (copia)`,
      selected: true,
      quantity: product.quantity || 1,
      ivaRate: product.ivaRate || 0,
      totalPrice: "",
    };
    setProducts(prev => [duplicatedProduct, ...prev]);
  }

  function handleOpenEdit(product) {
    setEditingProductId(product.id);
    setDraft({
      name: product.name || "",
      sku: product.sku || "",
      price: product.price || "",
      quantity: Number(product.quantity) || 1,
      ivaRate: Number(product.ivaRate ?? 0) || 0,
      ivaType: product.ivaType || 'gravado',
      totalPrice: product.totalPrice || "",
      shortDescription: product.shortDescription || "",
      image: product.image || "",
      images: product.images || [],
      productUrl: product.productUrl || "",
      selected: product.selected ?? true,
    });
    setIsEditOpen(true);
  }

  function handleCloseEdit() {
    setIsEditOpen(false);
    setEditingProductId(null);
  }

  function handleDraftChange(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddImage(imageDataUrl) {
    setDraft((prev) => ({
      ...prev,
      images: [...(prev.images || []), imageDataUrl],
    }));
  }

  function handleRemoveImage(index) {
    setDraft((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  }

  async function handleDraftImageChange(file) {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setDraft((prev) => ({ ...prev, image: dataUrl }));
    } catch {
      setError("No se pudo cargar la imagen.");
    }
  }

  function handleSaveEdit() {
    if (!editingProductId) return;

    const next = normalizeProduct({ ...draft, id: editingProductId });

    setProducts((prev) => prev.map((product) =>
      product.id === editingProductId ? { ...product, ...next } : product
    ));

    handleCloseEdit();
  }

  function handleUpdateProduct(productId, updates) {
    setProducts((prev) => prev.map((product) =>
      product.id === productId ? { ...product, ...updates } : product
    ));
  }

  function handleQuoteMetaChange(field, value) {
    setQuoteMeta((prev) => ({ ...prev, [field]: value }));
  }

  // ===== FUNCIONES PARA NUEVA COTIZACIÓN/CATÁLOGO =====
  function openNewQuoteModal() {
    setShowNewQuoteModal(true);
  }

  function openNewCatalogModal() {
    setShowNewCatalogModal(true);
  }

  function handleNewQuoteConfirm() {
    setProducts([]);
    setSearchHistory([]);
    setLocalFilter("");
    setError("");
    setSelectedCategories([]);
    setStockStatuses(["instock"]);
    setBatchSelectedIds([]);

    setQuoteMeta({
      ...quoteMeta,
      customerName: "",
      quoteNumber: "",
      paymentNote: "ESTE PRECIO ES SOLO PARA PAGOS EN EFECTIVO O TRANSFERENCIA",
    });

    setShowNewQuoteModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNewCatalogConfirm() {
    setProducts([]);
    setSearchHistory([]);
    setLocalFilter("");
    setError("");
    setSelectedCategories([]);
    setStockStatuses(["instock"]);
    setBatchSelectedIds([]);

    setShowNewCatalogModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeNewQuoteModal() {
    setShowNewQuoteModal(false);
  }

  function closeNewCatalogModal() {
    setShowNewCatalogModal(false);
  }

  // ===== GENERAR PDF =====
  async function generatePdf(saveOnly = false) {
    try {
      setGenerating(true);
      setError("");
      setLastPdfUrl("");

      if (!selectedProducts.length) {
        throw new Error("Selecciona al menos un producto.");
      }

      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          documentType,
          products: selectedProducts,
          orientation,
          quoteMeta
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          throw new Error(data.message || "No se pudo generar el PDF.");
        }

        const text = await response.text();
        throw new Error(text || "No se pudo generar el PDF.");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        setLastPdfUrl(downloadUrl);

        const savedDoc = await saveDocumentToDB({
          type: documentType,
          title: documentType === "quote" ? quoteMeta.customerName || "Cotización" : "Catálogo",
          products: selectedProducts,
          quoteMeta,
          orientation,
          pdfUrl: downloadUrl,
          productCount: selectedProducts.length,
          customerName: quoteMeta.customerName
        });

        if (savedDoc) {
          setSavedDocuments(prev => [savedDoc, ...prev]);
        }

        if (!saveOnly) {
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = documentType === "quote" ? `cotizacion-${Date.now()}.pdf` : `catalogo-${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
          }, 1000);
        }
        return;
      }

      const blob = await response.blob();
      const fallbackUrl = URL.createObjectURL(blob);
      setLastPdfUrl(fallbackUrl);

      const savedDoc = await saveDocumentToDB({
        type: documentType,
        title: documentType === "quote" ? quoteMeta.customerName || "Cotización" : "Catálogo",
        products: selectedProducts,
        quoteMeta,
        orientation,
        pdfUrl: fallbackUrl,
        productCount: selectedProducts.length,
        customerName: quoteMeta.customerName
      });

      if (savedDoc) {
        setSavedDocuments(prev => [savedDoc, ...prev]);
      }

      if (!saveOnly) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => {
          URL.revokeObjectURL(fallbackUrl);
        }, 5000);
      }
    } catch (err) {
      setError(err.message || "No se pudo generar el PDF.");
    } finally {
      setGenerating(false);
    }
  }

  // ===== FUNCIONES PARA DOCUMENTOS GUARDADOS =====
  function handleLoadDocument(doc) {
    if (products.length > 0 && !window.confirm("¿Cargar este documento? Se perderán los cambios actuales.")) return;

    const loadedProducts = (doc.products || []).map(product => ({
      ...product,
      selected: true,
      quantity: product.quantity || 1,
      ivaRate: product.ivaRate || 0
    }));

    setDocumentType(doc.type);
    setProducts(loadedProducts);
    setQuoteMeta(doc.quoteMeta || quoteMeta);
    setOrientation(doc.orientation || "portrait");
    setError("");
    setBatchSelectedIds([]);
  }

  function handleDeleteDocument(id) {
    deleteDocumentFromDB(id);
  }

  function handleDownloadDocument(doc) {
    if (doc.pdfUrl) {
      window.open(doc.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (window.confirm('Este documento no tiene un PDF asociado. ¿Deseas generarlo ahora?')) {
      handleLoadDocument(doc);
      setTimeout(() => {
        generatePdf(false);
      }, 500);
    }
  }

  function handleRefreshDocuments() {
    loadDocumentsFromDB();
  }

  // ===== RENDER =====
  if (authLoading) {
    return (
      <div className="loadingScreen">
        <div className="loadingSpinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!authUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <MainLayout
      documentType={documentType}
      onDocumentTypeChange={handleDocumentTypeChange}
      theme={theme}
      toggleTheme={toggleTheme}
      user={authUser}
      onLogout={handleLogout}
      onOpenAdmin={() => setShowAdminPanel(true)}
      onOpenStats={handleOpenStats}
      isAdmin={authUser.role === 'admin'}
    >
      <SavedDocuments
        documents={savedDocuments}
        onLoad={handleLoadDocument}
        onDelete={handleDeleteDocument}
        onDownload={handleDownloadDocument}
        onRegenerate={() => generatePdf(false)}
        loading={dbLoading}
        onRefresh={handleRefreshDocuments}
      />

      {documentType === "quote" && (
        <QuoteForm
          value={quoteMeta}
          onChange={handleQuoteMetaChange}
          generating={generating}
          onGenerate={() => generatePdf(false)}
        />
      )}

      <SearchPanel
        mode={mode}
        setMode={setMode}
        queryText={queryText}
        setQueryText={setQueryText}
        orientation={orientation}
        setOrientation={setOrientation}
        loading={loading}
        runSearch={runSearch}
        resetCatalog={resetCatalog}
        error={error}
        categories={categories}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        stockStatuses={stockStatuses}
        setStockStatuses={setStockStatuses}
      />

      <SearchHistory items={searchHistory} />

      <ResultsToolbar
        count={visibleProducts.length}
        totalCount={products.length}
        selectedCount={selectedCount}
        allSelected={allSelected}
        localFilter={localFilter}
        setLocalFilter={setLocalFilter}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onAddManual={handleCreateManualProduct}
        onGeneratePdf={() => generatePdf(false)}
        onSelectAllForBatch={handleSelectAllForBatch}
        onDeselectAllForBatch={handleDeselectAllForBatch}
        onDeleteBatch={handleDeleteBatch}
        onNewQuote={openNewQuoteModal}
        onNewCatalog={openNewCatalogModal}
        batchSelectedCount={batchSelectedIds.length}
        generating={generating}
        documentType={documentType}
      />

      <MassIvaEditor
        batchSelectedIds={batchSelectedIds}
        products={products}
        onApplyIvaToSelected={handleApplyIvaToSelected}
      />

      <section className="productGrid">
        {visibleProducts.length === 0 ? (
          <div className="emptyState">
            <h3>No hay productos</h3>
            <p>Busca productos para comenzar</p>
          </div>
        ) : (
          <DndProvider backend={HTML5Backend}>
            {visibleProducts.map((product, index) => (
              <DraggableProductCard
                key={product.id}
                index={index}
                product={product}
                moveProduct={moveProduct}
                documentType={documentType}
                checked={product.selected}
                onToggle={() => handleToggleProduct(product.id)}
                onEdit={() => handleOpenEdit(product)}
                onDuplicate={() => handleDuplicateProduct(product)}
                onRemove={() => handleRemoveProduct(product.id)}
                onChange={(updates) => handleUpdateProduct(product.id, updates)}
                userRole={authUser?.role}
                isSelectedForBatch={batchSelectedIds.includes(product.id)}
                onSelectForBatch={handleToggleBatchSelection}
              />
            ))}
          </DndProvider>
        )}
      </section>

      {undoToast.show && (
        <div className="undoToast">
          <span>{undoToast.message}</span>
          <button className="undoToastBtn" onClick={undoToast.onUndo}>Deshacer</button>
        </div>
      )}

      <EditProductModal
        isOpen={isEditOpen}
        draft={draft}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        onChange={handleDraftChange}
        onImageChange={handleDraftImageChange}
        onAddImage={handleAddImage}
        onRemoveImage={handleRemoveImage}
        documentType={documentType}
        currency={quoteMeta.currency}
      />

      {showAdminPanel && (
        <AdminPanel
          user={authUser}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {showStatsPanel && (
        <AdminStats 
          onClose={() => setShowStatsPanel(false)}
        />
      )}

      <ConfirmModal
        isOpen={showNewQuoteModal}
        onClose={closeNewQuoteModal}
        onConfirm={handleNewQuoteConfirm}
        title="Nueva cotización"
        message="¿Estás seguro? se iniciará una cotización en blanco."
        confirmText="Sí, empezar nueva"
        cancelText="Cancelar"
      />

      <ConfirmModal
        isOpen={showNewCatalogModal}
        onClose={closeNewCatalogModal}
        onConfirm={handleNewCatalogConfirm}
        title="Nuevo catálogo"
        message="¿Estás seguro? se iniciará un catálogo en blanco."
        confirmText="Sí, empezar nuevo"
        cancelText="Cancelar"
      />
    </MainLayout>
  );
}

export default App;