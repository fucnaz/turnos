import React, { useState, useEffect } from 'react';
import BookingPortal from './components/BookingPortal';
import AdminDashboard from './components/AdminDashboard';
import { isFirebaseConfigured, getCurrentUser, loginAdmin } from './services/dataService';
import { Stethoscope, LogIn, Globe, Sliders, AlertTriangle } from 'lucide-react';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [toast, setToast] = useState(null);

  // Admin Login Credentials Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check login session on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setIsAdminLoggedIn(true);
    }
  }, [isAdminMode]);

  // Toast feedback helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast("Ingresa correo y contraseña", "error");
      return;
    }

    setLoginLoading(true);
    try {
      await loginAdmin(loginEmail, loginPassword);
      setIsAdminLoggedIn(true);
      setLoginEmail('');
      setLoginPassword('');
      showToast("Inicio de sesión exitoso", "success");
    } catch (err) {
      showToast(err.message || "Credenciales incorrectas", "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
  };

  return (
    <div className="app-container">
      {/* Dynamic Header */}
      <header className="app-header">
        <div className="logo">
          <Stethoscope size={28} />
          <span>TurnoGo</span>
        </div>
        
        <div className="nav-buttons">
          {isAdminMode ? (
            <button 
              className="btn btn-primary"
              onClick={() => setIsAdminMode(false)}
            >
              <Globe size={16} />
              Portal de Turnos
            </button>
          ) : (
            <button 
              className="btn"
              onClick={() => setIsAdminMode(true)}
            >
              <Sliders size={16} />
              Administración
            </button>
          )}
        </div>
      </header>

      {/* Offline Mode Alert Banner */}
      {!isFirebaseConfigured && (
        <div className="setup-warning">
          <h3>
            <AlertTriangle size={18} /> Modo Demo Local (Sin conexión)
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Firebase no está configurado. La aplicación está guardando los datos localmente en su navegador 
            (LocalStorage). Para conectar a su base de datos Firebase real, complete los valores en el archivo 
            <code>.env</code> en el directorio raíz del proyecto y reinicie el servidor de desarrollo.
          </p>
          {isAdminMode && !isAdminLoggedIn && (
            <p style={{ fontSize: '0.825rem', color: '#f59e0b', marginTop: '0.5rem', fontWeight: 600 }}>
              💡 Contraseña offline para demo: <code>admin123</code> (con cualquier correo admin en .env)
            </p>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="main-content">
        {isAdminMode ? (
          /* Admin Dashboard & Login Flow */
          isAdminLoggedIn ? (
            <AdminDashboard 
              onLogout={handleLogout} 
              onShowToast={showToast} 
            />
          ) : (
            <div style={{ maxWidth: '440px', margin: '4rem auto 0 auto', width: '100%' }}>
              <div className="glass-panel">
                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Administración</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Inicia sesión para gestionar especialistas y turnos.
                </p>

                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="login-email">Correo Electrónico Admin</label>
                    <input 
                      type="email" 
                      id="login-email" 
                      className="form-control"
                      placeholder="admin@turnogo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label htmlFor="login-password">Contraseña</label>
                    <input 
                      type="password" 
                      id="login-password" 
                      className="form-control"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loginLoading}
                  >
                    <LogIn size={18} />
                    {loginLoading ? "Verificando..." : "Ingresar"}
                  </button>
                </form>
              </div>
            </div>
          )
        ) : (
          /* Client facing booking portal */
          <BookingPortal onShowToast={showToast} />
        )}
      </main>

      {/* Animated Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
