import React, { useState, useEffect } from 'react';
import BookingPortal from './components/BookingPortal';
import AdminDashboard from './components/AdminDashboard';
import SpecialistDashboard from './components/SpecialistDashboard';
import { isFirebaseConfigured, getCurrentUser, loginUser } from './services/dataService';
import { Stethoscope, LogIn, Globe, Sliders, AlertTriangle } from 'lucide-react';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [toast, setToast] = useState(null);

  // Admin/Specialist Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check login session on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentSession(user);
    } else {
      setCurrentSession(null);
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
      const loggedUser = await loginUser(loginEmail, loginPassword);
      setCurrentSession(loggedUser);
      setLoginEmail('');
      setLoginPassword('');
      showToast(`¡Bienvenido, ${loggedUser.role === 'admin' ? 'Administrador' : loggedUser.name}!`, "success");
    } catch (err) {
      showToast(err.message || "Credenciales incorrectas", "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentSession(null);
  };

  const handleNavClick = (targetId) => {
    window.dispatchEvent(new CustomEvent('nav-navigate', { detail: { targetId } }));
  };

  return (
    <div className="app-container">
      {/* Dynamic Header */}
      <header className="app-header">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => handleNavClick('hero')}>
          <Stethoscope size={28} />
          <span>TurnoGo</span>
        </div>
        
        {/* Navbar Links - Only in client mode */}
        {!isAdminMode && (
          <nav className="nav-links">
            <button className="nav-link" onClick={() => handleNavClick('hero')}>Inicio</button>
            <button className="nav-link" onClick={() => handleNavClick('servicios')}>Servicios</button>
            <button className="nav-link" onClick={() => handleNavClick('quienes-somos')}>Quiénes Somos</button>
            <button className="nav-link" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }} onClick={() => handleNavClick('booking-wizard')}>Reservar Turno</button>
          </nav>
        )}
        
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
          {isAdminMode && !currentSession && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.825rem', color: '#f59e0b', textAlign: 'left', display: 'inline-block' }}>
              <p>💡 <strong>Credenciales demo offline:</strong></p>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                <li>Admin: <code>admin@turnogo.com</code> / Contraseña: <code>admin123</code></li>
                <li>Especialista: <code>sofia@turnogo.com</code> / Contraseña: <code>123</code></li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="main-content">
        {isAdminMode ? (
          /* Admin / Specialist Dashboard & Login Flow */
          currentSession ? (
            currentSession.role === 'admin' ? (
              <AdminDashboard 
                onLogout={handleLogout} 
                onShowToast={showToast} 
              />
            ) : (
              <SpecialistDashboard 
                currentSession={currentSession}
                onLogout={handleLogout}
                onShowToast={showToast}
              />
            )
          ) : (
            <div style={{ maxWidth: '440px', margin: '4rem auto 0 auto', width: '100%' }}>
              <div className="glass-panel">
                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Acceso Profesional</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Inicia sesión como administrador o especialista.
                </p>

                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="login-email">Correo Electrónico</label>
                    <input 
                      type="email" 
                      id="login-email" 
                      className="form-control"
                      placeholder="ejemplo@turnogo.com"
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

      {/* Footer - Only in client mode */}
      {!isAdminMode && (
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo" style={{ cursor: 'pointer', marginBottom: '1rem' }} onClick={() => handleNavClick('hero')}>
                <Stethoscope size={24} />
                <span>TurnoGo</span>
              </div>
              <p>Atención médica de calidad al alcance de tu mano. Reserva turnos online en segundos con profesionales altamente calificados.</p>
            </div>
            
            <div className="footer-links">
              <h4>Secciones</h4>
              <ul>
                <li><button className="nav-link" style={{ padding: 0, textAlign: 'left' }} onClick={() => handleNavClick('hero')}>Inicio</button></li>
                <li><button className="nav-link" style={{ padding: 0, textAlign: 'left' }} onClick={() => handleNavClick('servicios')}>Servicios</button></li>
                <li><button className="nav-link" style={{ padding: 0, textAlign: 'left' }} onClick={() => handleNavClick('quienes-somos')}>Quiénes Somos</button></li>
                <li><button className="nav-link" style={{ padding: 0, textAlign: 'left', color: 'var(--primary-color)' }} onClick={() => handleNavClick('booking-wizard')}>Reservar Turno</button></li>
              </ul>
            </div>
            
            <div className="footer-contact">
              <h4>Contacto</h4>
              <p>📍 Av. de la Salud 1234, CABA</p>
              <p>📞 +54 11 5555-5555</p>
              <p>✉️ contacto@turnogo.com</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} TurnoGo. Todos los derechos reservados.</p>
          </div>
        </footer>
      )}

      {/* Animated Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
