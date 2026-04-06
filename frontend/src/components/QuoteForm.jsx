import { useState } from "react";
import { 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  Hash, 
  Briefcase, 
  Phone, 
  Mail, 
  Clock, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";

function QuoteForm({
  value,
  onChange,
  quoteMeta,
  updateQuoteMeta,
  generating = false,
  onGenerate,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const data = value ?? quoteMeta ?? {
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
    documentTitle: "COTIZACIÓN",
    quoteNumber: "",
    paymentNote: "ESTE PRECIO ES SOLO PARA PAGOS EN EFECTIVO O TRANSFERENCIA",
  };

  function handleChange(field, fieldValue) {
    if (typeof onChange === "function") {
      onChange(field, fieldValue);
      return;
    }

    if (typeof updateQuoteMeta === "function") {
      updateQuoteMeta(field, fieldValue);
    }
  }

  return (
    <section className="panel">
      <div className="panelHeader" style={{ cursor: "pointer" }} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="panelHeaderLeft">
          <FileText size={20} strokeWidth={2} />
          <div>
            <h3>Datos de la cotización</h3>
            <p>Los datos se guardan automáticamente</p>
          </div>
        </div>
        <button 
          type="button" 
          className="collapseBtn"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          aria-label={isCollapsed ? "Expandir" : "Colapsar"}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="quoteForm__grid quoteForm__grid--horizontal">
            {/* Fila 1: Datos empresa */}
            <div className="quoteForm__field">
              <label>
                <span>Empresa</span>
                <input
                  type="text"
                  value={data.companyName || ""}
                  readOnly
                  className="input-readonly"
                />
              </label>
            </div>

            <div className="quoteForm__field">
              <label>
                <span>NIT</span>
                <input
                  type="text"
                  value={data.nit || ""}
                  readOnly
                  className="input-readonly"
                />
              </label>
            </div>

            <div className="quoteForm__field">
              <label>
                <Calendar size={14} />
                <span>Fecha</span>
                <input
                  type="date"
                  value={data.date || ""}
                  onChange={(e) => handleChange("date", e.target.value)}
                />
              </label>
            </div>

            {/* Fila 2: Cliente y moneda */}
            <div className="quoteForm__field">
              <label>
                <User size={14} />
                <span>Cliente</span>
                <input
                  type="text"
                  value={data.customerName || ""}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </label>
            </div>

            <div className="quoteForm__field">
              <label>
                <DollarSign size={14} />
                <span>Moneda</span>
                <input
                  type="text"
                  value={data.currency || "COP"}
                  onChange={(e) => handleChange("currency", e.target.value)}
                />
              </label>
            </div>

            <div className="quoteForm__field">
              <label>
                <Clock size={14} />
                <span>Vigencia (días)</span>
                <input
                  type="number"
                  min="1"
                  value={data.validityDays ?? 1}
                  onChange={(e) =>
                    handleChange("validityDays", Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
            </div>

            {/* Fila 3: Título y número */}
            <div className="quoteForm__field">
              <label>
                <Hash size={14} />
                <span>Título</span>
                <input
                  type="text"
                  value={data.documentTitle || "COTIZACIÓN"}
                  onChange={(e) => handleChange("documentTitle", e.target.value)}
                />
              </label>
            </div>
            <div className="quoteForm__field">
              <label>
                <Briefcase size={14} />
                <span>Cargo</span>
                <input
                  type="text"
                  value={data.role || ""}
                  onChange={(e) => handleChange("role", e.target.value)}
                  placeholder="Ej: Asesor Comercial"
                />
              </label>
            </div>

            {/* Fila 4: Datos asesor */}
            <div className="quoteForm__field">
              <label>
                <User size={14} />
                <span>Asesor</span>
                <input
                  type="text"
                  value={data.authorName || ""}
                  onChange={(e) => handleChange("authorName", e.target.value)}
                  placeholder="Tu nombre"
                />
              </label>
            </div>

            <div className="quoteForm__field">
              <label>
                <Phone size={14} />
                <span>Teléfono</span>
                <input
                  type="text"
                  value={data.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Ej: 300 123 4567"
                />
              </label>
            </div>

            <div className="quoteForm__field">
              <label>
                <Mail size={14} />
                <span>Correo</span>
                <input
                  type="text"
                  value={data.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </label>
            </div>

            {/* Nota de pago personalizable */}
            <div className="quoteForm__field quoteForm__field--full">
              <label>
                <MessageSquare size={14} />
                <span>Nota de pago</span>
                <textarea
                  rows="3"
                  value={data.paymentNote || ""}
                  onChange={(e) => handleChange("paymentNote", e.target.value)}
                  placeholder="ESTE PRECIO ES SOLO PARA PAGOS EN EFECTIVO O TRANSFERENCIA"
                  className="quoteForm__textarea"
                />
                <span className="quoteForm__hint">
                  Esta nota aparecerá en la cotización. Puedes personalizarla según tus necesidades.
                </span>
              </label>
            </div>
          </div>

          {typeof onGenerate === "function" ? (
            <div className="quoteForm__actions">
              <button
                type="button"
                className="primaryBtn"
                onClick={onGenerate}
                disabled={generating}
              >
                <FileText size={16} />
                <span>{generating ? "Generando PDF..." : "Generar cotización"}</span>
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default QuoteForm;