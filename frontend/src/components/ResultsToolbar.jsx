import { 
  FileText, 
  Plus, 
  RefreshCw, 
  Trash2, 
  BookOpen, 
  CheckSquare, 
  Square,
  Search
} from "lucide-react";
import SortControls from "./SortControls";

function ResultsToolbar({
  count = 0,
  totalCount = 0,
  selectedCount = 0,
  allSelected = false,
  localFilter = "",
  setLocalFilter,
  onSelectAll,
  onDeselectAll,
  onAddManual,
  onGeneratePdf,
  onSelectAllForBatch,
  onDeselectAllForBatch,
  onDeleteBatch,
  onNewQuote,
  onNewCatalog,
  batchSelectedCount = 0,
  generating = false,
  documentType = "catalog",
  sortBy = "name",
  sortOrder = "asc",
  onSortChange,
}) {
  return (
    <section className="toolbar">
      <div className="toolbar-left">
        <div className="results-info">
          <strong>{selectedCount}</strong> seleccionados de{" "}
          <strong>{totalCount}</strong>
          {count !== totalCount ? <> · visibles: <strong>{count}</strong></> : null}
          {batchSelectedCount > 0 && (
            <span className="batch-badge">
              <Trash2 size={12} />
              <strong>{batchSelectedCount}</strong> para eliminar
            </span>
          )}
        </div>

        <div className="toolbar-actions">
          <button className="secondaryBtn smallBtn" onClick={onAddManual} type="button">
            <Plus size={14} />
            <span>Crear producto</span>
          </button>

          {documentType === "quote" && (
            <button 
              className="secondaryBtn smallBtn" 
              onClick={onNewQuote} 
              type="button"
              title="Empezar una nueva cotización desde cero"
            >
              <RefreshCw size={14} />
              <span>Nueva cotización</span>
            </button>
          )}

          {documentType === "catalog" && (
            <button 
              className="secondaryBtn smallBtn" 
              onClick={onNewCatalog} 
              type="button"
              title="Empezar un nuevo catálogo desde cero"
            >
              <BookOpen size={14} />
              <span>Nuevo catálogo</span>
            </button>
          )}
          
          <button
            className="secondaryBtn smallBtn"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            type="button"
          >
            {allSelected ? "Deseleccionar todos (PDF)" : "Seleccionar todos (PDF)"}
          </button>
        </div>
      </div>

      <div className="toolbar-center">
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
        />
      </div>

      <div className="toolbar-right">
        <div className="toolbar-batch-actions">
          <button
            className="iconBtn small"
            onClick={onSelectAllForBatch}
            type="button"
            title="Seleccionar todos para eliminar"
          >
            <CheckSquare size={16} />
          </button>
          <button
            className="iconBtn small"
            onClick={onDeselectAllForBatch}
            type="button"
            title="Deseleccionar todos"
          >
            <Square size={16} />
          </button>
          {batchSelectedCount > 0 && (
            <button
              className="iconBtn small dangerBtn"
              onClick={onDeleteBatch}
              type="button"
              title={`Eliminar ${batchSelectedCount} producto${batchSelectedCount !== 1 ? 's' : ''}`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <button
          className="primaryBtn smallBtn"
          onClick={onGeneratePdf}
          disabled={generating || selectedCount === 0}
          type="button"
        >
          <FileText size={14} />
          <span>{generating ? "Generando..." : documentType === "quote" ? "Generar cotización" : "Generar PDF"}</span>
        </button>
      </div>

      <div className="toolbar-search">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Filtrar productos..."
          value={localFilter}
          onChange={(e) => setLocalFilter?.(e.target.value)}
        />
      </div>
    </section>
  );
}

export default ResultsToolbar;