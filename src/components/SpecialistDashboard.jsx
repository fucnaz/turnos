import React, { useState, useEffect } from 'react';
import { 
  getBookings, 
  deleteBooking, 
  addBooking, 
  logoutAdmin 
} from '../services/dataService';
import { 
  LogOut, 
  Plus, 
  Trash2, 
  Clock, 
  ClipboardList, 
  CalendarDays,
  User,
  Phone,
  FileText,
  X,
  ShieldAlert
} from 'lucide-react';

export default function SpecialistDashboard({ currentSession, onLogout, onShowToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Over-booking form modal
  const [showModal, setShowModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientInsurance, setClientInsurance] = useState('PARTICULAR');
  const [clientNotes, setClientNotes] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBookings() {
      try {
        const list = await getBookings();
        // Filter by current logged-in specialist ID
        const myBookings = list.filter(b => b.specialistId === currentSession.specialistId);
        setBookings(myBookings);
      } catch (err) {
        console.error(err);
        onShowToast("Error al cargar turnos del especialista", "error");
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, [currentSession.specialistId]);

  const handleLogoutClick = async () => {
    try {
      await logoutAdmin();
      onLogout();
      onShowToast("Sesión de especialista cerrada", "success");
    } catch (err) {
      onShowToast("Error al cerrar sesión", "error");
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm("¿Estás seguro de cancelar este turno?")) return;
    try {
      await deleteBooking(id);
      setBookings(bookings.filter(b => b.id !== id));
      onShowToast("Turno cancelado exitosamente", "success");
    } catch (e) {
      onShowToast("Error al cancelar turno", "error");
    }
  };

  const handleOpenOverbooking = () => {
    setClientName('');
    setClientPhone('');
    setClientInsurance('PARTICULAR');
    setClientNotes('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('09:00');
    setShowModal(true);
  };

  const handleSaveOverbooking = async (e) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !bookingDate || !bookingTime) {
      onShowToast("Completa todos los campos obligatorios", "error");
      return;
    }

    setSaving(true);
    const newBooking = {
      specialistId: currentSession.specialistId,
      clientName,
      clientPhone,
      clientInsurance,
      notes: clientNotes,
      date: bookingDate,
      time: bookingTime,
      createdAt: new Date().toISOString(),
      isOverbooking: true // flag to identify manual over-bookings
    };

    try {
      const saved = await addBooking(newBooking);
      setBookings([...bookings, saved]);
      setShowModal(false);
      onShowToast("Sobre-turno agendado correctamente", "success");
    } catch (e) {
      onShowToast("Error al registrar sobre-turno", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>Cargando agenda de especialista...</div>;
  }

  // Group or filter statistics
  const totalMyBookings = bookings.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMyBookings = bookings.filter(b => b.date === todayStr).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', textTransform: 'uppercase', fontWeight: 600 }}>
            Portal Profesional
          </span>
          <h2 style={{ fontSize: '1.75rem', marginTop: '0.2rem' }}>Dra/Dr. {currentSession.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Gestión de tus turnos y sobre-turnos.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={handleOpenOverbooking}>
            <Plus size={18} /> Agregar Sobre-turno
          </button>
          <button className="btn btn-text" onClick={handleLogoutClick}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(225, 15, 15, 0.08)', color: 'var(--primary-color)' }}>
            <ClipboardList size={24} />
          </div>
          <div className="stat-info">
            <h4>Mis Turnos Agendados</h4>
            <p>{totalMyBookings}</p>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'var(--morning-bg)', color: 'var(--morning-color)' }}>
            <CalendarDays size={24} />
          </div>
          <div className="stat-info">
            <h4>Turnos para Hoy</h4>
            <p>{todayMyBookings}</p>
          </div>
        </div>
      </div>

      {/* My Agenda Table */}
      <div className="glass-panel">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={20} color="var(--primary-color)" /> Mi Agenda de Atención
        </h3>

        {bookings.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Teléfono</th>
                  <th>Obra Social</th>
                  <th>Notas</th>
                  <th>Tipo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {[...bookings]
                  .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
                  .map(b => (
                    <tr key={b.id} style={b.isOverbooking ? { background: 'rgba(245, 158, 11, 0.03)' } : {}}>
                      <td>
                        {new Date(b.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td><strong>{b.time} hs</strong></td>
                      <td><strong>{b.clientName}</strong></td>
                      <td>{b.clientPhone}</td>
                      <td><span className="badge badge-both" style={{ textTransform: 'none' }}>{b.clientInsurance || 'PARTICULAR'}</span></td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.notes || '-'}</span>
                      </td>
                      <td>
                        {b.isOverbooking ? (
                          <span className="badge badge-morning" style={{ fontSize: '0.7rem' }}>Sobre-turno</span>
                        ) : (
                          <span className="badge badge-none" style={{ fontSize: '0.7rem' }}>Normal</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-text" 
                          style={{ padding: '0.3rem', color: 'var(--vacation-color)' }} 
                          onClick={() => handleCancelBooking(b.id)}
                          title="Cancelar Turno"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
            No tienes turnos programados en tu agenda.
          </p>
        )}
      </div>

      {/* Over-booking (Sobre-turno) Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="var(--morning-color)" /> Registrar Sobre-turno
              </h3>
              <button className="btn btn-text" style={{ padding: '0.2rem' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Este formulario creará un turno directamente en tu agenda, <strong>sin validar</strong> si el horario 
              está libre u ocupado por otro paciente.
            </p>

            <form onSubmit={handleSaveOverbooking}>
              <div className="form-group">
                <label>Nombre y Apellido del Paciente *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-control"
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    placeholder="Ej. Juan Pérez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Teléfono de Contacto *</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="tel" 
                    className="form-control"
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    placeholder="Ej. 11 5555-5555"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Obra Social / Cobertura *</label>
                <select 
                  className="form-control" 
                  value={clientInsurance}
                  onChange={(e) => setClientInsurance(e.target.value)}
                  required
                >
                  {['PAMI', 'IPS', 'BOREAL', 'AVALIAN', 'SWISS MEDICAL', 'NOBIS', 'MEDIFE', 'OSDE', 'PARTICULAR'].map(insurance => (
                    <option key={insurance} value={insurance}>{insurance}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Fecha *</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Hora *</label>
                  <input 
                    type="time" 
                    className="form-control"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label>Notas u Observaciones (Opcional)</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <textarea 
                    className="form-control"
                    rows="3"
                    style={{ paddingLeft: '2.25rem', width: '100%', resize: 'none' }}
                    placeholder="Detalles complementarios..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 0 }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Confirmar Sobre-turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
