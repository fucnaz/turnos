import React, { useState, useEffect } from 'react';
import { 
  getSpecialists, 
  addSpecialist, 
  updateSpecialist, 
  deleteSpecialist,
  getBookings, 
  deleteBooking, 
  updateBooking,
  getSettings, 
  updateSettings,
  logoutAdmin
} from '../services/dataService';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  ClipboardList, 
  UserCheck,
  CalendarDays,
  FileText,
  Save,
  CheckCircle,
  X,
  Stethoscope
} from 'lucide-react';

export default function AdminDashboard({ onLogout, onShowToast }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'specialists', 'bookings', 'settings'
  const [specialists, setSpecialists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({
    morningStart: "08:00",
    morningEnd: "13:00",
    afternoonStart: "14:00",
    afternoonEnd: "19:00",
    slotDuration: 30
  });

  const [loading, setLoading] = useState(true);

  // Specialist Form State
  const [specFormMode, setSpecFormMode] = useState('add'); // 'add' or 'edit'
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [specForm, setSpecForm] = useState({
    name: '',
    specialty: '',
    description: '',
    photoUrl: ''
  });
  const [showSpecModal, setShowSpecModal] = useState(false);

  // Schedule editor state
  const [selectedSpecForSchedule, setSelectedSpecForSchedule] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState({});

  // Vacation editor state
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [selectedSpecForVacation, setSelectedSpecForVacation] = useState(null);
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');

  // Reschedule Form State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const specs = await getSpecialists();
        const books = await getBookings();
        const sets = await getSettings();
        setSpecialists(specs);
        setBookings(books);
        setSettings(sets);
      } catch (err) {
        console.error(err);
        onShowToast("Error al cargar datos administrativos", "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLogoutClick = async () => {
    try {
      await logoutAdmin();
      onLogout();
      onShowToast("Sesión cerrada correctamente", "success");
    } catch (err) {
      onShowToast("Error al cerrar sesión", "error");
    }
  };

  // --- SPECIALISTS MANAGEMENT ---
  const handleOpenSpecAdd = () => {
    setSpecFormMode('add');
    setSpecForm({ name: '', specialty: '', description: '', photoUrl: '' });
    setShowSpecModal(true);
  };

  const handleOpenSpecEdit = (spec) => {
    setSpecFormMode('edit');
    setEditingSpecId(spec.id);
    setSpecForm({
      name: spec.name,
      specialty: spec.specialty,
      description: spec.description || '',
      photoUrl: spec.photoUrl || ''
    });
    setShowSpecModal(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      onShowToast("Solo se permiten imágenes JPG o PNG", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio resizing
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to dataURL string (highly compressed JPEG)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setSpecForm({ ...specForm, photoUrl: compressedBase64 });
        onShowToast("Foto de perfil cargada correctamente", "success");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSpecialist = async (e) => {
    e.preventDefault();
    if (!specForm.name || !specForm.specialty) {
      onShowToast("Nombre y Especialidad son obligatorios", "error");
      return;
    }

    try {
      if (specFormMode === 'add') {
        const added = await addSpecialist(specForm);
        setSpecialists([...specialists, added]);
        onShowToast("Especialista agregado correctamente", "success");
      } else {
        await updateSpecialist(editingSpecId, specForm);
        setSpecialists(specialists.map(s => s.id === editingSpecId ? { ...s, ...specForm } : s));
        onShowToast("Especialista actualizado correctamente", "success");
      }
      setShowSpecModal(false);
    } catch (e) {
      onShowToast("Error al guardar especialista", "error");
    }
  };

  const handleDeleteSpecialistClick = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar a este especialista? Se borrarán sus horarios también.")) return;
    try {
      await deleteSpecialist(id);
      setSpecialists(specialists.filter(s => s.id !== id));
      onShowToast("Especialista eliminado correctamente", "success");
    } catch (e) {
      onShowToast("Error al eliminar especialista", "error");
    }
  };

  // --- SCHEDULES EDITOR ---
  const handleOpenScheduleEditor = (spec) => {
    setSelectedSpecForSchedule(spec);
    // Initialize schedule state
    const defaultSchedule = {
      "1": "none", "2": "none", "3": "none", "4": "none", "5": "none", "6": "none", "0": "none",
      ...(spec.weeklySchedule || {})
    };
    setWeeklySchedule(defaultSchedule);
    setShowScheduleModal(true);
  };

  const handleWeeklyScheduleChange = (dayId, value) => {
    if (value === 'custom') {
      setWeeklySchedule(prev => ({
        ...prev,
        [dayId]: { type: 'custom', start: '08:00', end: '13:00' }
      }));
    } else {
      setWeeklySchedule(prev => ({
        ...prev,
        [dayId]: value
      }));
    }
  };

  const handleWeeklyScheduleTimeChange = (dayId, field, timeVal) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: timeVal
      }
    }));
  };

  const handleSaveSchedule = async () => {
    try {
      await updateSpecialist(selectedSpecForSchedule.id, { weeklySchedule });
      setSpecialists(specialists.map(s => s.id === selectedSpecForSchedule.id ? { ...s, weeklySchedule } : s));
      setShowScheduleModal(false);
      onShowToast("Horarios semanales guardados", "success");
    } catch (e) {
      onShowToast("Error al guardar horarios", "error");
    }
  };

  // --- VACATION MANAGER ---
  const handleOpenVacationManager = (spec) => {
    setSelectedSpecForVacation(spec);
    setVacationStart('');
    setVacationEnd('');
    setShowVacationModal(true);
  };

  const handleAddVacation = async () => {
    if (!vacationStart || !vacationEnd) {
      onShowToast("Ingresa fecha de inicio y fin", "error");
      return;
    }
    if (new Date(vacationStart) > new Date(vacationEnd)) {
      onShowToast("La fecha de inicio no puede ser posterior a la de fin", "error");
      return;
    }

    const currentVacations = selectedSpecForVacation.vacations || [];
    const newVacation = { start: vacationStart, end: vacationEnd };
    const updatedVacations = [...currentVacations, newVacation];

    try {
      await updateSpecialist(selectedSpecForVacation.id, { vacations: updatedVacations });
      const updatedSpecs = specialists.map(s => 
        s.id === selectedSpecForVacation.id ? { ...s, vacations: updatedVacations } : s
      );
      setSpecialists(updatedSpecs);
      setSelectedSpecForVacation(updatedSpecs.find(s => s.id === selectedSpecForVacation.id));
      setVacationStart('');
      setVacationEnd('');
      onShowToast("Vacación agregada", "success");
    } catch (e) {
      onShowToast("Error al agregar vacación", "error");
    }
  };

  const handleDeleteVacation = async (index) => {
    const updatedVacations = (selectedSpecForVacation.vacations || []).filter((_, i) => i !== index);
    try {
      await updateSpecialist(selectedSpecForVacation.id, { vacations: updatedVacations });
      const updatedSpecs = specialists.map(s => 
        s.id === selectedSpecForVacation.id ? { ...s, vacations: updatedVacations } : s
      );
      setSpecialists(updatedSpecs);
      setSelectedSpecForVacation(updatedSpecs.find(s => s.id === selectedSpecForVacation.id));
      onShowToast("Vacación eliminada", "success");
    } catch (e) {
      onShowToast("Error al eliminar vacación", "error");
    }
  };

  // --- BOOKINGS ACTIONS ---
  const handleDeleteBookingClick = async (id) => {
    if (!window.confirm("¿Seguro que deseas cancelar este turno?")) return;
    try {
      await deleteBooking(id);
      setBookings(bookings.filter(b => b.id !== id));
      onShowToast("Turno cancelado exitosamente", "success");
    } catch (e) {
      onShowToast("Error al cancelar turno", "error");
    }
  };

  const handleOpenReschedule = (booking) => {
    setReschedulingBooking(booking);
    setRescheduleDate(booking.date);
    setRescheduleTime(booking.time);
    setShowRescheduleModal(true);
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      onShowToast("Completa fecha y hora", "error");
      return;
    }
    try {
      await updateBooking(reschedulingBooking.id, { date: rescheduleDate, time: rescheduleTime });
      setBookings(bookings.map(b => b.id === reschedulingBooking.id ? { ...b, date: rescheduleDate, time: rescheduleTime } : b));
      setShowRescheduleModal(false);
      onShowToast("Turno reprogramado exitosamente", "success");
    } catch (e) {
      onShowToast("Error al reprogramar turno", "error");
    }
  };

  // --- GLOBAL SETTINGS ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await updateSettings(settings);
      onShowToast("Configuración general guardada", "success");
    } catch (e) {
      onShowToast("Error al guardar la configuración", "error");
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>Cargando panel de administración...</div>;
  }

  // Calculate Statistics
  const totalSpecsCount = specialists.length;
  const totalBookingsCount = bookings.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookingsCount = bookings.filter(b => b.date === todayStr).length;

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="glass-panel sidebar-nav">
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
          Administración
        </h3>
        <button 
          className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <UserCheck size={18} />
          Resumen
        </button>
        <button 
          className={`sidebar-link ${activeTab === 'specialists' ? 'active' : ''}`}
          onClick={() => setActiveTab('specialists')}
        >
          <Users size={18} />
          Especialistas
        </button>
        <button 
          className={`sidebar-link ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <ClipboardList size={18} />
          Turnos
        </button>
        <button 
          className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={18} />
          Configuración
        </button>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button className="btn btn-text" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogoutClick}>
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="panel-container">
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Panel de Control</h2>
            
            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <div className="stat-icon" style={{ background: 'var(--both-bg)', color: 'var(--both-color)' }}>
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <h4>Especialistas</h4>
                  <p>{totalSpecsCount}</p>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-color)' }}>
                  <ClipboardList size={24} />
                </div>
                <div className="stat-info">
                  <h4>Total Turnos</h4>
                  <p>{totalBookingsCount}</p>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon" style={{ background: 'var(--morning-bg)', color: 'var(--morning-color)' }}>
                  <CalendarIcon size={24} />
                </div>
                <div className="stat-info">
                  <h4>Turnos Hoy</h4>
                  <p>{todayBookingsCount}</p>
                </div>
              </div>
            </div>

            {/* Today's Bookings List */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1rem' }}>Turnos para el día de hoy ({todayStr})</h3>
              
              {bookings.filter(b => b.date === todayStr).length > 0 ? (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Especialista</th>
                        <th>Paciente</th>
                        <th>Teléfono</th>
                        <th>Notas</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings
                        .filter(b => b.date === todayStr)
                        .sort((a,b) => a.time.localeCompare(b.time))
                        .map(b => {
                          const spec = specialists.find(s => s.id === b.specialistId);
                          return (
                            <tr key={b.id}>
                              <td><strong>{b.time} hs</strong></td>
                              <td>{spec ? spec.name : 'Desconocido'}</td>
                              <td>
                                <div>{b.clientName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                                  {b.clientInsurance || 'PARTICULAR'}
                                </div>
                              </td>
                              <td>{b.clientPhone}</td>
                              <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.notes || '-'}</span></td>
                              <td>
                                <button className="btn btn-text" style={{ padding: '0.3rem', color: 'var(--vacation-color)' }} onClick={() => handleDeleteBookingClick(b.id)}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay turnos programados para hoy.</p>
              )}
            </div>
          </div>
        )}

        {/* --- SPECIALISTS TAB --- */}
        {activeTab === 'specialists' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Especialistas</h2>
              <button className="btn btn-primary" onClick={handleOpenSpecAdd}>
                <Plus size={18} /> Agregar Especialista
              </button>
            </div>

            <div className="glass-panel">
              {specialists.length > 0 ? (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Foto</th>
                        <th>Nombre</th>
                        <th>Especialidad</th>
                        <th>Descripción</th>
                        <th>Horarios Semanales</th>
                        <th>Vacaciones</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialists.map(spec => (
                        <tr key={spec.id}>
                          <td>
                            <div className="specialist-img-container" style={{ width: '40px', height: '40px', margin: 0 }}>
                              {spec.photoUrl ? (
                                <img src={spec.photoUrl} alt={spec.name} className="specialist-img" />
                              ) : (
                                <Stethoscope size={20} />
                              )}
                            </div>
                          </td>
                          <td><strong>{spec.name}</strong></td>
                          <td><span className="badge badge-both" style={{ textTransform: 'none' }}>{spec.specialty}</span></td>
                          <td>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {spec.description || '-'}
                            </p>
                          </td>
                          <td>
                            <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleOpenScheduleEditor(spec)}>
                              <Clock size={14} /> Editar
                            </button>
                          </td>
                          <td>
                            <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleOpenVacationManager(spec)}>
                              <CalendarDays size={14} /> {(spec.vacations || []).length} Activas
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-text" style={{ padding: '0.3rem' }} onClick={() => handleOpenSpecEdit(spec)}>
                                <Edit2 size={16} />
                              </button>
                              <button className="btn btn-text" style={{ padding: '0.3rem', color: 'var(--vacation-color)' }} onClick={() => handleDeleteSpecialistClick(spec.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay especialistas agregados.</p>
              )}
            </div>
          </div>
        )}

        {/* --- BOOKINGS TAB --- */}
        {activeTab === 'bookings' && (
          <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Gestión de Turnos</h2>

            <div className="glass-panel">
              {bookings.length > 0 ? (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Especialista</th>
                        <th>Paciente</th>
                        <th>Teléfono</th>
                        <th>Notas</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...bookings]
                        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
                        .map(b => {
                          const spec = specialists.find(s => s.id === b.specialistId);
                          return (
                            <tr key={b.id}>
                              <td>{new Date(b.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                              <td><strong>{b.time} hs</strong></td>
                              <td>{spec ? spec.name : 'Desconocido'}</td>
                              <td>
                                <div>{b.clientName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                                  {b.clientInsurance || 'PARTICULAR'}
                                </div>
                              </td>
                              <td>{b.clientPhone}</td>
                              <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.notes || '-'}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn btn-text" style={{ padding: '0.3rem' }} onClick={() => handleOpenReschedule(b)}>
                                    <Clock size={16} /> Reprogramar
                                  </button>
                                  <button className="btn btn-text" style={{ padding: '0.3rem', color: 'var(--vacation-color)' }} onClick={() => handleDeleteBookingClick(b.id)}>
                                    <Trash2 size={16} /> Cancelar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay turnos agendados en el sistema.</p>
              )}
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Configuración General</h2>

            <div className="glass-panel" style={{ maxWidth: '600px' }}>
              <form onSubmit={handleSaveSettings}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                  Rango Horario de Turnos
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label>Inicio Turno Mañana</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={settings.morningStart}
                      onChange={(e) => setSettings({ ...settings, morningStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fin Turno Mañana</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={settings.morningEnd}
                      onChange={(e) => setSettings({ ...settings, morningEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label>Inicio Turno Tarde</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={settings.afternoonStart}
                      onChange={(e) => setSettings({ ...settings, afternoonStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fin Turno Tarde</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={settings.afternoonEnd}
                      onChange={(e) => setSettings({ ...settings, afternoonEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', marginTop: '2rem' }}>
                  Intervalo de Turnos
                </h3>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label>Duración del Bloque (minutos)</label>
                  <select 
                    className="form-control"
                    value={settings.slotDuration}
                    onChange={(e) => setSettings({ ...settings, slotDuration: parseInt(e.target.value) })}
                  >
                    <option value="15">15 minutos</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Save size={18} /> Guardar Configuración
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* Specialist Add/Edit Modal */}
      {showSpecModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{specFormMode === 'add' ? 'Agregar Especialista' : 'Editar Especialista'}</h3>
              <button className="btn btn-text" style={{ padding: '0.2rem' }} onClick={() => setShowSpecModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSpecialist}>
              <div className="form-group">
                <label>Nombre y Apellido *</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Ej. Dra. María Perez"
                  value={specForm.name}
                  onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Especialidad *</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Ej. Cardiología"
                  value={specForm.specialty}
                  onChange={(e) => setSpecForm({ ...specForm, specialty: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción / Bio</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  style={{ resize: 'none' }}
                  placeholder="Información relevante sobre el especialista..."
                  value={specForm.description}
                  onChange={(e) => setSpecForm({ ...specForm, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Foto de Perfil (Opcional)</label>
                
                {/* Visual Preview */}
                {specForm.photoUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div className="specialist-img-container" style={{ width: '50px', height: '50px', margin: 0 }}>
                      <img src={specForm.photoUrl} alt="Preview" className="specialist-img" />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vista previa</span>
                    <button 
                      type="button" 
                      className="btn btn-text" 
                      style={{ marginLeft: 'auto', padding: '0.2rem', color: 'var(--vacation-color)' }}
                      onClick={() => setSpecForm({ ...specForm, photoUrl: '' })}
                    >
                      Eliminar
                    </button>
                  </div>
                )}

                {/* Upload Action */}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  style={{ display: 'none' }} 
                  id="photo-upload-input" 
                  onChange={handlePhotoUpload} 
                />
                <label 
                  htmlFor="photo-upload-input" 
                  className="btn" 
                  style={{ cursor: 'pointer', width: '100%', justifyContent: 'center', background: 'var(--input-bg)' }}
                >
                  📤 Subir Imagen (PNG, JPG)
                </label>

                {/* Direct URL input fallback */}
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}
                  placeholder="O pega la URL de la imagen aquí..."
                  value={specForm.photoUrl && specForm.photoUrl.startsWith('data:') ? '' : specForm.photoUrl}
                  onChange={(e) => setSpecForm({ ...specForm, photoUrl: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowSpecModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Editor Modal */}
      {showScheduleModal && selectedSpecForSchedule && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header">
              <h3>Horarios Semanales: {selectedSpecForSchedule.name}</h3>
              <button className="btn btn-text" style={{ padding: '0.2rem' }} onClick={() => setShowScheduleModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Define el turno de atención para cada día de la semana o elige un horario personalizado para ese día.
            </p>

            <div className="schedule-grid-editor">
              {[
                { label: 'Lunes', id: '1' },
                { label: 'Martes', id: '2' },
                { label: 'Miércoles', id: '3' },
                { label: 'Jueves', id: '4' },
                { label: 'Viernes', id: '5' },
                { label: 'Sábado', id: '6' },
                { label: 'Domingo', id: '0' }
              ].map(day => {
                const daySched = weeklySchedule[day.id] || 'none';
                const isCustom = typeof daySched === 'object' && daySched.type === 'custom';
                const dropdownValue = isCustom ? 'custom' : daySched;

                return (
                  <div key={day.id} className="schedule-day-card">
                    <h5 style={{ marginBottom: '0.4rem' }}>{day.label}</h5>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '0.8rem', padding: '0.4rem', marginBottom: isCustom ? '0.5rem' : '0' }}
                      value={dropdownValue}
                      onChange={(e) => handleWeeklyScheduleChange(day.id, e.target.value)}
                    >
                      <option value="none">Sin atención</option>
                      <option value="morning">Mañana</option>
                      <option value="afternoon">Tarde</option>
                      <option value="both">Ambos</option>
                      <option value="custom">Personalizado</option>
                    </select>

                    {isCustom && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Desde:</span>
                          <input 
                            type="time" 
                            className="form-control" 
                            style={{ fontSize: '0.75rem', padding: '0.15rem 0.3rem', width: '68px', height: 'auto' }}
                            value={daySched.start || '08:00'}
                            onChange={(e) => handleWeeklyScheduleTimeChange(day.id, 'start', e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hasta:</span>
                          <input 
                            type="time" 
                            className="form-control" 
                            style={{ fontSize: '0.75rem', padding: '0.15rem 0.3rem', width: '68px', height: 'auto' }}
                            value={daySched.end || '13:00'}
                            onChange={(e) => handleWeeklyScheduleTimeChange(day.id, 'end', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowScheduleModal(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSchedule}>Guardar Horarios</button>
            </div>
          </div>
        </div>
      )}

      {/* Vacation Manager Modal */}
      {showVacationModal && selectedSpecForVacation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Vacaciones: {selectedSpecForVacation.name}</h3>
              <button className="btn btn-text" style={{ padding: '0.2rem' }} onClick={() => setShowVacationModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Add Vacation Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Desde</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={vacationStart}
                  onChange={(e) => setVacationStart(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Hasta</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={vacationEnd}
                  onChange={(e) => setVacationEnd(e.target.value)}
                />
              </div>
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '1.5rem' }} onClick={handleAddVacation}>
              Agregar Período de Vacaciones
            </button>

            {/* Current Vacations List */}
            <h4 style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
              Períodos Registrados
            </h4>
            <div className="vacations-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {(selectedSpecForVacation.vacations || []).length > 0 ? (
                (selectedSpecForVacation.vacations).map((vac, i) => (
                  <div key={i} className="vacation-item">
                    <span style={{ fontSize: '0.85rem' }}>
                      {new Date(vac.start + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(vac.end + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button className="btn btn-text" style={{ padding: '0.2rem', color: 'var(--vacation-color)' }} onClick={() => handleDeleteVacation(i)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No hay vacaciones programadas.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowVacationModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && reschedulingBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reprogramar Turno</h3>
              <button className="btn btn-text" style={{ padding: '0.2rem' }} onClick={() => setShowRescheduleModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
              <p><strong>Paciente:</strong> {reschedulingBooking.clientName}</p>
              <p><strong>Fecha anterior:</strong> {reschedulingBooking.date} a las {reschedulingBooking.time} hs</p>
            </div>

            <div className="form-group">
              <label>Nueva Fecha</label>
              <input 
                type="date" 
                className="form-control" 
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Nueva Hora</label>
              <input 
                type="time" 
                className="form-control" 
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowRescheduleModal(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveReschedule}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
