import SidebarDocumentNav from "../components/SidebarDocumentNav";
import UserMenu from "../components/UserMenu";
import { Shield, BarChart3 } from "lucide-react";

function MainLayout({ 
  children, 
  documentType, 
  onDocumentTypeChange, 
  theme, 
  toggleTheme,
  user,
  onLogout,
  onOpenAdmin,
  onOpenStats,
  isAdmin
}) {
  return (
    <div className="app">
      <div className="workspaceShell">
        <SidebarDocumentNav
          documentType={documentType}
          onChange={onDocumentTypeChange}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <main className="workspaceMain">
          <div className="workspaceHeader">
            <h2>{documentType === "quote" ? "Cotización" : "Catálogo"}</h2>
            <div className="workspaceActions">
              {isAdmin && (
                <>
                  <button 
                    className="adminBtn" 
                    onClick={onOpenStats} 
                    title="Estadísticas"
                  >
                    <BarChart3 size={18} />
                  </button>
                  <button 
                    className="adminBtn" 
                    onClick={onOpenAdmin} 
                    title="Panel de Administración"
                  >
                    <Shield size={18} />
                  </button>
                </>
              )}
              <UserMenu user={user.fullName || user.username} onLogout={onLogout} />
            </div>
          </div>
          <div className="contentWrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;