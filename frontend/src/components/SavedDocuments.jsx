import { useState, useMemo } from "react";
import {
    FileText,
    BookOpen,
    Download,
    Edit,
    Trash2,
    ChevronDown,
    ChevronRight,
    Search,
    Calendar,
    Filter,
    X,
    FileSearch,
    RefreshCw
} from "lucide-react";

function SavedDocuments({
    documents = [],
    onLoad,
    onDelete,
    onDownload,
    onRegenerate, // 👈 NUEVO: función para regenerar PDF
    loading = false,
    onRefresh
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [sortBy, setSortBy] = useState("date");

    const getIcon = (type) => {
        return type === "quote" ? <FileText size={16} /> : <BookOpen size={16} />;
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "Fecha inválida";
        }
    };

    const handleDownload = (doc) => {
  if (doc.pdfUrl) {
    // Si es una URL blob o una URL normal
    window.open(doc.pdfUrl, "_blank", "noopener,noreferrer");
    return;
  }
  
  // Si no hay URL, cargar el documento y regenerar
  if (window.confirm('Este documento no tiene un PDF asociado. ¿Deseas generarlo ahora?')) {
    onLoad(doc);
    // Dar tiempo para que React actualice el estado
    setTimeout(() => {
      onRegenerate?.();
    }, 200);
  }
};

    const filteredDocuments = useMemo(() => {
        if (!documents.length) return [];

        let filtered = [...documents];

        if (filterType !== "all") {
            filtered = filtered.filter(doc => doc.type === filterType);
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(doc => {
                const title = (doc.title || "").toLowerCase();
                const customer = (doc.customerName || "").toLowerCase();
                const type = doc.type === "quote" ? "cotización" : "catálogo";
                return title.includes(term) || customer.includes(term) || type.includes(term);
            });
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name":
                    return (a.title || "").localeCompare(b.title || "");
                case "products":
                    return (b.productCount || 0) - (a.productCount || 0);
                case "date":
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        return filtered;
    }, [documents, searchTerm, filterType, sortBy]);

    const clearFilters = () => {
        setSearchTerm("");
        setFilterType("all");
        setSortBy("date");
    };

    if (!documents.length && !loading) return null;

    return (
        <section className="panel savedDocuments">
            <div className="panelHeader compact" style={{ cursor: 'pointer' }}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div style={{ flex: 1 }}>
                        <h3>Documentos guardados</h3>
                        <p>
                            {loading ? 'Cargando...' : `${documents.length} documento${documents.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>

                {onRefresh && (
                    <button
                        className="iconBtn small"
                        onClick={onRefresh}
                        title="Actualizar lista"
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                )}
            </div>

            {isOpen && (
                <>
                    <div className="savedDocs__filters">
                        <div className="savedDocs__search">
                            <Search size={16} className="savedDocs__searchIcon" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="savedDocs__searchInput"
                                disabled={loading}
                            />
                            {searchTerm && (
                                <button
                                    className="savedDocs__clearBtn"
                                    onClick={() => setSearchTerm("")}
                                    disabled={loading}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="savedDocs__filterRow">
                            <div className="savedDocs__filterGroup">
                                <Filter size={14} className="savedDocs__filterIcon" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="savedDocs__select"
                                    disabled={loading}
                                >
                                    <option value="all">Todos los tipos</option>
                                    <option value="quote">Cotizaciones</option>
                                    <option value="catalog">Catálogos</option>
                                </select>
                            </div>

                            <div className="savedDocs__filterGroup">
                                <Calendar size={14} className="savedDocs__filterIcon" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="savedDocs__select"
                                    disabled={loading}
                                >
                                    <option value="date">Más recientes</option>
                                    <option value="name">Nombre A-Z</option>
                                    <option value="products">Más productos</option>
                                </select>
                            </div>

                            {(searchTerm || filterType !== "all" || sortBy !== "date") && (
                                <button
                                    className="savedDocs__clearFilters"
                                    onClick={clearFilters}
                                    disabled={loading}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="savedDocumentsList">
                        {loading ? (
                            <div className="savedDocs__loading">
                                <RefreshCw size={24} className="spin" />
                                <p>Cargando documentos...</p>
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="savedDocs__empty">
                                <FileSearch size={24} />
                                <p>No se encontraron documentos</p>
                                {(searchTerm || filterType !== "all") && (
                                    <button
                                        className="savedDocs__clearBtn"
                                        onClick={clearFilters}
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredDocuments.map((doc) => (
                                <div key={doc.id} className="savedDocumentCard">
                                    <div className="savedDocumentIcon">
                                        {getIcon(doc.type)}
                                    </div>

                                    <div className="savedDocumentInfo">
                                        <div className="savedDocumentTitle">
                                            <strong>{doc.title || (doc.type === "quote" ? "Cotización" : "Catálogo")}</strong>
                                            <span className="savedDocumentType">
                                                {doc.type === "quote" ? "Cotización" : "Catálogo"}
                                            </span>
                                        </div>

                                        <div className="savedDocumentMeta">
                                            <span>{doc.productCount || 0} producto{(doc.productCount || 0) !== 1 ? 's' : ''}</span>
                                            <span>•</span>
                                            <span>{formatDate(doc.createdAt)}</span>
                                        </div>

                                        {doc.type === "quote" && doc.customerName && (
                                            <div className="savedDocumentCustomer">
                                                Cliente: {doc.customerName}
                                            </div>
                                        )}
                                    </div>

                                    <div className="savedDocumentActions">
                                        <button
                                            className="iconBtn small"
                                            onClick={() => onLoad(doc)}
                                            title="Cargar documento"
                                            disabled={loading}
                                        >
                                            <Edit size={14} />
                                        </button>

                                        <button
                                            className="iconBtn small"
                                            onClick={() => handleDownload(doc)}  // 👈 FUNCIÓN MODIFICADA
                                            title="Descargar PDF"
                                            disabled={loading}
                                        >
                                            <Download size={14} />
                                        </button>

                                        <button
                                            className="iconBtn small danger"
                                            onClick={() => {
                                                if (window.confirm('¿Eliminar este documento?')) {
                                                    onDelete(doc.id);
                                                }
                                            }}
                                            title="Eliminar"
                                            disabled={loading}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

export default SavedDocuments;