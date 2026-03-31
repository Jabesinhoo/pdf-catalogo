import { BookOpen, FileText, LayoutDashboard, Moon, Sun } from "lucide-react";

function SidebarDocumentNav({ documentType = "catalog", onChange, theme, toggleTheme }) {
  return (
    <aside className="docSidebar">
      <div className="docSidebarHeader">
        <div className="docSidebarBrand">
          <LayoutDashboard size={18} strokeWidth={2} />
          <span>TecnoCotizador</span>
        </div>
        <p>Que va a hacer</p>
      </div>

      <nav className="docSidebarNav">
        <button
          type="button"
          className={documentType === "catalog" ? "docSidebarItem active" : "docSidebarItem"}
          onClick={() => onChange?.("catalog")}
        >
          <div className="docSidebarIcon">
            <BookOpen size={18} strokeWidth={2} />
          </div>

          <div className="docSidebarCopy">
            <strong>Catálogo</strong>
            <span>Arma un catálogo</span>
          </div>
        </button>

        <button
          type="button"
          className={documentType === "quote" ? "docSidebarItem active" : "docSidebarItem"}
          onClick={() => onChange?.("quote")}
        >
          <div className="docSidebarIcon">
            <FileText size={18} strokeWidth={2} />
          </div>

          <div className="docSidebarCopy">
            <strong>Cotización</strong>
            <span>Arma una cotización</span>
          </div>
        </button>
      </nav>

      {/* 👇 BOTÓN DE TEMA - IMPORTANTE */}
      <div className="docSidebarTheme">
        <button
          className="themeSidebarBtn"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
        >
          {theme === "light" ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
          <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
        </button>
      </div>
    </aside>
  );
}

export default SidebarDocumentNav;