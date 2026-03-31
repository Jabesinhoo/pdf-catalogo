import { useState } from 'react';
import { LogIn, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import ErrorModal from './ErrorModal';
import { useTheme } from '../hooks/useTheme';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, errors: null });
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorModal({ open: false, errors: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        setErrorModal({ 
          open: true, 
          errors: data.errors || data.message || 'Credenciales inválidas' 
        });
      }
    } catch (err) {
      setErrorModal({ 
        open: true, 
        errors: 'Error de conexión. Verifica tu red.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="loginOverlay">
        <div className="loginCard">
          {/* 👇 BOTÓN DE TEMA */}
          <button 
            className="loginThemeBtn" 
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
            type="button"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="loginHeader">
            <LogIn size={40} strokeWidth={1.5} />
            <h2>TecnoCotizador</h2>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="loginField">
              <label>Usuario o email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="loginField">
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="loginBtn" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>

      <ErrorModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false, errors: null })}
        title="Error de inicio de sesión"
        errors={errorModal.errors}
      />
    </>
  );
}

export default Login;