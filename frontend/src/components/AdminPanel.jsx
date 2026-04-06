import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Briefcase,
  ToggleLeft,
  ToggleRight,
  X,
  AlertCircle,
  Trash2,
  KeyRound,
  CheckCircle
} from 'lucide-react';
import ErrorModal from './ErrorModal';

function AdminPanel({ user, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, errors: null });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  
  // Estado para el modal de confirmación de eliminación
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ 
    open: false, 
    userId: null, 
    username: '' 
  });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [selectedRoleUser, setSelectedRoleUser] = useState(null);
  const [newRole, setNewRole] = useState('asesor');
  
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'asesor'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        setErrorModal({ open: true, errors: data.message || 'Error cargando usuarios' });
      }
    } catch (err) {
      setErrorModal({ open: true, errors: 'Error de conexión al cargar usuarios' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorModal({ open: false, errors: null });

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          role: newUser.role
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateForm(false);
        setNewUser({ username: '', email: '', password: '', fullName: '', role: 'asesor' });
        loadUsers();
        setSuccessModal({ open: true, message: 'Usuario creado exitosamente' });
      } else {
        setErrorModal({ open: true, errors: data.errors || data.message || 'Error al crear usuario' });
      }
    } catch (err) {
      setErrorModal({ open: true, errors: 'Error de conexión al crear usuario' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !currentStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        loadUsers();
        setSuccessModal({ 
          open: true, 
          message: `Usuario ${!currentStatus ? 'activado' : 'desactivado'} exitosamente` 
        });
      } else {
        setErrorModal({ open: true, errors: data.message || 'Error cambiando estado' });
      }
    } catch (err) {
      setErrorModal({ open: true, errors: 'Error de conexión al cambiar estado' });
    }
  };

  // Función para abrir el modal de confirmación
  const openConfirmDelete = (userId, username) => {
    setConfirmDeleteModal({ open: true, userId, username });
  };

  // Función para ejecutar la eliminación
  const handleDeleteUser = async () => {
    const { userId, username } = confirmDeleteModal;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        loadUsers();
        setSuccessModal({ open: true, message: `Usuario "${username}" eliminado exitosamente` });
      } else {
        setErrorModal({ open: true, errors: data.message || 'Error eliminando usuario' });
      }
    } catch (err) {
      setErrorModal({ open: true, errors: 'Error de conexión al eliminar usuario' });
    } finally {
      setConfirmDeleteModal({ open: false, userId: null, username: '' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setErrorModal({ open: true, errors: 'Las contraseñas no coinciden' });
      return;
    }
    
    if (newPassword.length < 4) {
      setErrorModal({ open: true, errors: 'La contraseña debe tener al menos 4 caracteres' });
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowPasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
        setConfirmPassword('');
        loadUsers();
        setSuccessModal({ open: true, message: 'Contraseña actualizada correctamente' });
      } else {
        setErrorModal({ open: true, errors: data.message || 'Error cambiando contraseña' });
      }
    } catch (err) {
      setErrorModal({ open: true, errors: 'Error de conexión al cambiar contraseña' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeRole = async (e) => {
    e.preventDefault();
    setRoleLoading(true);
    
    try {
      const response = await fetch(`/api/admin/users/${selectedRoleUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowRoleModal(false);
        setSelectedRoleUser(null);
        setNewRole('asesor');
        loadUsers();
        setSuccessModal({ open: true, message: 'Rol actualizado correctamente' });
      } else {
        setErrorModal({ open: true, errors: data.message || 'Error cambiando rol' });
      }
    } catch (err) {
      setErrorModal({ open: true, errors: 'Error de conexión al cambiar rol' });
    } finally {
      setRoleLoading(false);
    }
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const openRoleModal = (user) => {
    setSelectedRoleUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <>
      <div className="adminModalOverlay" onClick={onClose}>
        <div className="adminModal" onClick={(e) => e.stopPropagation()}>
          <div className="adminModalHeader">
            <div className="adminModalTitle">
              <Shield size={24} />
              <h2>Panel de Administración</h2>
            </div>
            <button className="adminCloseBtn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="adminContent">
            <div className="adminActions">
              <button 
                className="adminCreateBtn"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <UserPlus size={16} />
                <span>{showCreateForm ? 'Cancelar' : 'Nuevo Usuario'}</span>
              </button>
            </div>

            {showCreateForm && (
              <div className="adminCreateForm">
                <h3>Crear Nuevo Usuario</h3>
                <form onSubmit={handleCreateUser}>
                  <div className="formGrid">
                    <div className="formField">
                      <label>
                        <User size={14} />
                        <span>Usuario</span>
                      </label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        placeholder="Ej: jperez"
                        required
                      />
                    </div>

                    <div className="formField">
                      <label>
                        <Mail size={14} />
                        <span>Email</span>
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="ejemplo@correo.com"
                        required
                      />
                    </div>

                    <div className="formField">
                      <label>
                        <Briefcase size={14} />
                        <span>Nombre completo</span>
                      </label>
                      <input
                        type="text"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                        placeholder="Juan Pérez"
                        required
                      />
                    </div>

                    <div className="formField">
                      <label>
                        <Lock size={14} />
                        <span>Contraseña</span>
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Mínimo 4 caracteres"
                        required
                      />
                    </div>

                    <div className="formField">
                      <label>
                        <Shield size={14} />
                        <span>Rol</span>
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      >
                        <option value="asesor">Asesor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="formActions">
                    <button type="submit" className="adminSubmitBtn" disabled={loading}>
                      {loading ? 'Creando...' : 'Crear Usuario'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="usersList">
              <h3>Usuarios del Sistema</h3>
              {loading && !showCreateForm && <div className="adminLoading">Cargando...</div>}
              
              <div style={{ overflowX: 'auto' }}>
                <table className="usersTable">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Último acceso</th>
                      <th colSpan="4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={u.id === user.id ? 'currentUser' : ''}>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>{u.full_name}</td>
                        <td>
                          <span className={`roleBadge ${u.role}`}>
                            {u.role === 'admin' ? 'Admin' : 'Asesor'}
                          </span>
                        </td>
                        <td>
                          <span className={`statusBadge ${u.is_active ? 'active' : 'inactive'}`}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{formatDate(u.last_login)}</td>
                        <td>
                          <button
                            className="toggleStatusBtn"
                            onClick={() => handleToggleStatus(u.id, u.is_active)}
                            disabled={u.id === user.id}
                            title={u.id === user.id ? 'No puedes desactivarte' : ''}
                          >
                            {u.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        </td>
                        <td>
                          <button
                            className="changeRoleBtn"
                            onClick={() => openRoleModal(u)}
                            disabled={u.id === user.id}
                            title={u.id === user.id ? 'No puedes cambiarte el rol a ti mismo' : 'Cambiar rol'}
                          >
                            <Shield size={16} />
                          </button>
                        </td>
                        <td>
                          <button
                            className="changePasswordBtn"
                            onClick={() => openPasswordModal(u)}
                            title="Cambiar contraseña"
                          >
                            <KeyRound size={16} />
                          </button>
                        </td>
                        <td>
                          <button
                            className="deleteUserBtn"
                            onClick={() => openConfirmDelete(u.id, u.username)}
                            disabled={u.id === user.id}
                            title={u.id === user.id ? 'No puedes eliminarte' : 'Eliminar usuario'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para cambiar contraseña */}
      {showPasswordModal && selectedUser && (
        <div className="modalOverlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                <KeyRound size={24} />
                <h3>Cambiar contraseña</h3>
              </div>
              <button className="closeBtn" onClick={() => setShowPasswordModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="formField" style={{ marginBottom: '16px' }}>
                <label>Usuario: <strong>{selectedUser.username}</strong></label>
              </div>

              <div className="formField" style={{ marginBottom: '16px' }}>
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  required
                />
              </div>

              <div className="formField" style={{ marginBottom: '24px' }}>
                <label>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>

              <div className="modalActions">
                <button type="button" className="ghostBtn" onClick={() => setShowPasswordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primaryBtn" disabled={passwordLoading}>
                  {passwordLoading ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para cambiar rol */}
      {showRoleModal && selectedRoleUser && (
        <div className="modalOverlay" onClick={() => setShowRoleModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                <Shield size={24} />
                <h3>Cambiar rol de usuario</h3>
              </div>
              <button className="closeBtn" onClick={() => setShowRoleModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangeRole}>
              <div className="formField" style={{ marginBottom: '16px' }}>
                <label>Usuario: <strong>{selectedRoleUser.username}</strong></label>
              </div>

              <div className="formField" style={{ marginBottom: '24px' }}>
                <label>Nuevo rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <option value="asesor">Asesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="modalActions">
                <button type="button" className="ghostBtn" onClick={() => setShowRoleModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primaryBtn" disabled={roleLoading}>
                  {roleLoading ? 'Actualizando...' : 'Cambiar rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar usuario */}
      {confirmDeleteModal.open && (
        <div className="confirmModalOverlay" onClick={() => setConfirmDeleteModal({ open: false, userId: null, username: '' })}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmModalHeader">
              <div className="confirmModalTitle">
                <AlertCircle size={24} className="confirmModalIcon" />
                <h3>Confirmar eliminación</h3>
              </div>
              <button 
                className="confirmModalClose" 
                onClick={() => setConfirmDeleteModal({ open: false, userId: null, username: '' })}
              >
                <X size={18} />
              </button>
            </div>
            <div className="confirmModalBody">
              <p>
                ¿Estás seguro de eliminar al usuario <strong>"{confirmDeleteModal.username}"</strong>?
                <br /><br />
                Esta acción <strong style={{ color: 'var(--danger)' }}>no se puede deshacer</strong> y eliminará permanentemente al usuario del sistema.
              </p>
            </div>
            <div className="confirmModalFooter">
              <button 
                className="confirmModalBtn confirmModalBtn--cancel"
                onClick={() => setConfirmDeleteModal({ open: false, userId: null, username: '' })}
              >
                Cancelar
              </button>
              <button 
                className="confirmModalBtn confirmModalBtn--confirm"
                onClick={handleDeleteUser}
              >
                Eliminar usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {successModal.open && (
        <div className="modalOverlay" onClick={() => setSuccessModal({ open: false, message: '' })}>
          <div className="modalCard successModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                <CheckCircle size={24} color="#10b981" />
                <h3>¡Éxito!</h3>
              </div>
              <button className="closeBtn" onClick={() => setSuccessModal({ open: false, message: '' })}>
                <X size={18} />
              </button>
            </div>

            <div className="modalContent">
              <p>{successModal.message}</p>
            </div>

            <div className="modalActions">
              <button 
                className="primaryBtn" 
                onClick={() => setSuccessModal({ open: false, message: '' })}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false, errors: null })}
        title="Error en administración"
        errors={errorModal.errors}
      />
    </>
  );
}

export default AdminPanel;