import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileSearch,
  ImageOff,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

function buildCategoryTree(categories = []) {
  const normalized = categories.map((category) => ({
    ...category,
    id: String(category.id || ""),
    parent: String(category.parent || ""),
    name: category.name || "Sin nombre",
    slug: category.slug || "",
    count: Number(category.count || 0),
    image: category.image || "",
  }));

  const byParent = new Map();
  const byId = new Map();

  normalized.forEach((category) => {
    byId.set(category.id, category);

    const parentId = category.parent || "__root__";
    if (!byParent.has(parentId)) {
      byParent.set(parentId, []);
    }

    byParent.get(parentId).push(category);
  });

  function sortItems(items = []) {
    return [...items].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "es", {
        sensitivity: "base",
      })
    );
  }

  function visit(parentId) {
    const children = sortItems(byParent.get(parentId) || []);

    return children.map((item) => ({
      ...item,
      children: visit(item.id),
    }));
  }

  const rootCandidates = normalized.filter((item) => {
    return !item.parent || !byId.has(item.parent);
  });

  return sortItems(rootCandidates).map((item) => ({
    ...item,
    children: visit(item.id),
  }));
}

function filterCategoryTree(nodes, term) {
  if (!term) return nodes;

  const cleanTerm = term.trim().toLowerCase();

  function visit(list) {
    return list
      .map((node) => {
        const selfMatch =
          String(node.name || "").toLowerCase().includes(cleanTerm) ||
          String(node.slug || "").toLowerCase().includes(cleanTerm);

        const filteredChildren = visit(node.children || []);

        if (selfMatch || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  return visit(nodes);
}

function CategoryNode({
  node,
  level = 0,
  expandedMap,
  setExpandedMap,
  selectedCategories,
  onToggleCategory,
  forceOpen = false,
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = forceOpen || Boolean(expandedMap[node.id]);

  function toggleExpand() {
    if (!hasChildren) return;

    setExpandedMap((prev) => ({
      ...prev,
      [node.id]: !prev[node.id],
    }));
  }

  return (
    <div className="searchPanel__categoryNode" style={{ marginLeft: `${level * 0.75}rem` }}>
      <div className="searchPanel__categoryRow">
        <button
          type="button"
          className="searchPanel__categoryExpand"
          onClick={toggleExpand}
          disabled={!hasChildren}
          aria-label={hasChildren ? `Expandir ${node.name}` : `Categoría ${node.name}`}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />
          ) : (
            <span className="searchPanel__categoryExpandSpacer" />
          )}
        </button>

        <label
          className={
            selectedCategories.includes(node.slug)
              ? "searchPanel__categoryCard active"
              : "searchPanel__categoryCard"
          }
        >
          <input
            type="checkbox"
            checked={selectedCategories.includes(node.slug)}
            onChange={() => onToggleCategory(node.slug)}
          />

          <div className="searchPanel__categoryThumb">
            {node.image ? (
              <img src={node.image} alt={node.name} loading="lazy" />
            ) : (
              <ImageOff size={16} strokeWidth={2} />
            )}
          </div>

          <div className="searchPanel__categoryMeta">
            <strong>{node.name}</strong>
            <span>{node.count} productos</span>
          </div>
        </label>
      </div>

      {hasChildren && isExpanded ? (
        <div className="searchPanel__categoryChildren">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedMap={expandedMap}
              setExpandedMap={setExpandedMap}
              selectedCategories={selectedCategories}
              onToggleCategory={onToggleCategory}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SearchPanel({
  mode,
  setMode,
  queryText,
  setQueryText,
  orientation,
  setOrientation,
  loading,
  runSearch,
  resetCatalog,
  error,
  categories = [],
  selectedCategories = [],
  setSelectedCategories,
  stockStatuses = [],
  setStockStatuses,
}) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [expandedMap, setExpandedMap] = useState({});

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const filteredTree = useMemo(() => {
    return filterCategoryTree(categoryTree, categoryFilter);
  }, [categoryTree, categoryFilter]);

  const canSearch = queryText.trim() || selectedCategories.length > 0;

  function toggleCategory(slug) {
    setSelectedCategories((prev) =>
      prev.includes(slug)
        ? prev.filter((item) => item !== slug)
        : [...prev, slug]
    );
  }

  function toggleStock(status) {
    setStockStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status]
    );
  }

  const modeOptions = [
    { value: "url", label: "URL" },
    { value: "name", label: "Nombre" },
    { value: "sku", label: "SKU" },
  ];

  const orientationOptions = [
    { value: "portrait", label: "Vertical" },
    { value: "landscape", label: "Horizontal" },
  ];

  const placeholder =
    mode === "url"
      ? "Pega una URL de categoría de Tecnonacho"
      : mode === "name"
        ? "Escribe uno o varios nombres, uno por línea"
        : "Escribe uno o varios SKU, uno por línea";

  return (
    <section className="panel searchPanel">
      <div className="panelHeader">
        <div>
          <h3>Buscar productos</h3>
          <p>Busca por URL, nombre, SKU o seleccionando categorías.</p>
        </div>
      </div>

      <div className="searchPanel__topActions">
        <div className="searchPanel__actionButtons">
          <button
            className="primaryBtn"
            onClick={() => runSearch({ append: false, replace: true })}
            disabled={loading || !canSearch}
            type="button"
          >
            <Search size={16} strokeWidth={2} />
            <span>{loading ? "Buscando..." : "Nueva búsqueda"}</span>
          </button>

          <button
            className="secondaryBtn"
            onClick={() => runSearch({ append: true })}
            disabled={loading || !canSearch}
            type="button"
          >
            <Plus size={16} strokeWidth={2} />
            <span>{loading ? "Agregando..." : "Agregar productos a los anteriores"}</span>
          </button>

          <button className="ghostBtn" onClick={resetCatalog} type="button">
            <RotateCcw size={16} strokeWidth={2} />
            <span>Limpiar todo</span> 
          </button>
        </div>

        <div className="searchPanel__orientationBox">
          <p className="fieldLabel">Orientación PDF</p>

          <div className="searchPanel__segmented">
            {orientationOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                className={
                  orientation === item.value
                    ? "searchPanel__segmentedBtn active"
                    : "searchPanel__segmentedBtn"
                }
                onClick={() => setOrientation(item.value)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="searchPanel__section">
        <p className="fieldLabel">Modo de búsqueda</p>

        <div className="tabs">
          {modeOptions.map((item) => (
            <button
              key={item.value}
              className={mode === item.value ? "tab active" : "tab"}
              onClick={() => setMode(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="fieldLabel">Valor de búsqueda</label>
        <textarea
          className="queryTextarea"
          rows="4"
          placeholder={placeholder}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
        />
      </div>

      <div className="searchPanel__section">
        <div className="searchPanel__sectionHead">
          <div className="searchPanel__sectionTitle">
            <SlidersHorizontal size={16} strokeWidth={2} />
            <span>Filtros de stock</span>
          </div>
        </div>

        <div className="chipsWrap">
          <label className="chipCheck">
            <input
              type="checkbox"
              checked={stockStatuses.includes("instock")}
              onChange={() => toggleStock("instock")}
            />
            <span>Con stock</span>
          </label>

          <label className="chipCheck">
            <input
              type="checkbox"
              checked={stockStatuses.includes("outofstock")}
              onChange={() => toggleStock("outofstock")}
            />
            <span>Sin stock</span>
          </label>

          <label className="chipCheck">
            <input
              type="checkbox"
              checked={stockStatuses.includes("onbackorder")}
              onChange={() => toggleStock("onbackorder")}
            />
            <span>Backorder</span>
          </label>
        </div>
      </div>

      <div className="searchPanel__section">
        <div className="searchPanel__sectionHead">
          <button
            type="button"
            className="searchPanel__collapseBtn"
            onClick={() => setCategoriesOpen((prev) => !prev)}
          >
            {categoriesOpen ? (
              <ChevronDown size={16} strokeWidth={2} />
            ) : (
              <ChevronRight size={16} strokeWidth={2} />
            )}
            <span>Categorías de Tecnonacho</span>
          </button>

          <div className="searchPanel__sectionMeta">
            <span>{categories.length} categorías</span>
            <span>{selectedCategories.length} seleccionadas</span>
          </div>
        </div>

        {/* 👇 AGREGAR BOTONES DE SELECCIÓN MASIVA */}
        

        {categoriesOpen ? (
          <>
            <div className="searchPanel__categorySearch">
              <Search size={16} strokeWidth={2} />
              <input
                type="text"
                placeholder="Buscar categoría por nombre o slug"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>

            <div className="searchPanel__categoriesWrap">
              {filteredTree.length === 0 ? (
                <div className="searchPanel__emptyCategories">
                  <FileSearch size={18} strokeWidth={2} />
                  <p>No encontré categorías con ese filtro.</p>
                </div>
              ) : (
                filteredTree.map((node) => (
                  <CategoryNode
                    key={node.id}
                    node={node}
                    expandedMap={expandedMap}
                    setExpandedMap={setExpandedMap}
                    selectedCategories={selectedCategories}
                    onToggleCategory={toggleCategory}
                    forceOpen={Boolean(categoryFilter.trim())}
                  />
                ))
              )}
            </div>
          </>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

export default SearchPanel;