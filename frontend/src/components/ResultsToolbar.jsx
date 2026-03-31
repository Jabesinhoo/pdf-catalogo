import { FileText, Plus, RefreshCw, Trash2, BookOpen } from "lucide-react";

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
  onNewCatalog,        // 👈 NUEVA PROPIEDAD para nuevo catálogo
  batchSelectedCount = 0,
  generating = false,
  documentType = "catalog",
}) {
  return (
    <section className="toolbar">
      <div>
        <strong>{selectedCount}</strong> seleccionados de{" "}
        <strong>{totalCount}</strong>
        {count !== totalCount ? <> · visibles: <strong>{count}</strong></> : null}
        {batchSelectedCount > 0 && (
          <span className="batchInfo">
            {" · "}
            <strong>{batchSelectedCount}</strong> seleccionados para eliminar
          </span>
        )}
      </div>

      <div className="toolbarControls">
        <input
          type="text"
          placeholder="Filtrar productos cargados"
          value={localFilter}
          onChange={(e) => setLocalFilter?.(e.target.value)}
        />

        <button className="ghostBtn smallBtn" onClick={onAddManual} type="button">
          <Plus size={14} />
          <span>Crear producto</span>
        </button>

        {/* 👇 BOTÓN NUEVA COTIZACIÓN - Solo en modo cotización */}
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

        {/* 👇 BOTÓN NUEVO CATÁLOGO - Solo en modo catálogo */}
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

        <button
          className="ghostBtn smallBtn"
          onClick={onSelectAllForBatch}
          type="button"
        >
          Seleccionar todos 
        </button>

        <button
          className="ghostBtn smallBtn"
          onClick={onDeselectAllForBatch}
          type="button"
        >
          Deseleccionar todos 
        </button>
        
        {batchSelectedCount > 0 && (
          <button
            className="dangerBtn smallBtn"
            onClick={onDeleteBatch}
            type="button"
          >
            <Trash2 size={14} />
            <span>Eliminar seleccionados ({batchSelectedCount})</span>
          </button>
        )}

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
    </section>
  );
}

export default ResultsToolbar;