import { User, LogOut } from 'lucide-react';

function UserMenu({ user, onLogout }) {
  return (
    <div className="userMenu">
      <div className="userInfo">
        <User size={16} />
        <span>{user}</span>
      </div>
      <button className="logoutBtn" onClick={onLogout} title="Cerrar sesión">
        <LogOut size={16} />
      </button>
    </div>
  );
}

export default UserMenu;