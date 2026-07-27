import React, { useState, useEffect } from 'react';
import { 
  getSpecialists, 
  getBookings, 
  getSettings, 
  addBooking 
} from '../services/dataService';
import { 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  Phone, 
  FileText, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Stethoscope
} from 'lucide-react';

export default function BookingPortal({ onShowToast }) {
  const [step, setStep] = useState(1);
  const [specialists, setSpecialists] = useState([]);
  const [settings, setSettings] = useState(null);
  const [bookings, setBookings] = useState([]);
  
  // Selections
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  
  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Loading and completed booking
  const [loading, setLoading] = useState(true);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const specs = await getSpecialists();
        const sets = await getSettings();
        const books = await getBookings();
        setSpecialists(specs);
        setSettings(sets);
        setBookings(books);
      } catch (err) {
        console.error("Error loading booking portal data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper: check if date is in vacation range
  const isDateOnVacation = (dateStr, specialist) => {
    if (!specialist || !specialist.vacations) return false;
    const targetDate = new Date(dateStr + 'T00:00:00');
    return specialist.vacations.some(v => {
      const start = new Date(v.start + 'T00:00:00');
      const end = new Date(v.end + 'T00:00:00');
      return targetDate >= start && targetDate <= end;
    });
  };

  // Helper: get specialist shift type for day of week
  const getDayShift = (dateStr, specialist) => {
    if (!specialist) return 'none';
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday...
    return specialist.weeklySchedule?.[dayOfWeek] || 'none';
  };

  // Helper: check if date is past
  const isPastDate = (dateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(dateStr + 'T00:00:00');
    return targetDate < today;
  };

  // Generate slots for selected date & specialist
  const generateSlots = () => {
    if (!selectedSpecialist || !selectedDate || !settings) return [];
    
    const shift = getDayShift(selectedDate, selectedSpecialist);
    if (shift === 'none' || isDateOnVacation(selectedDate, selectedSpecialist)) {
      return [];
    }

    const duration = parseInt(settings.slotDuration) || 30;
    const timeToMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const minutesToTime = (m) => {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    };

    const slots = [];
    const addSlotsRange = (startStr, endStr) => {
      let current = timeToMinutes(startStr);
      const end = timeToMinutes(endStr);
      while (current + duration <= end) {
        slots.push(minutesToTime(current));
        current += duration;
      }
    };

    if (shift === 'morning' || shift === 'both') {
      addSlotsRange(settings.morningStart, settings.morningEnd);
    }
    if (shift === 'afternoon' || shift === 'both') {
      addSlotsRange(settings.afternoonStart, settings.afternoonEnd);
    }

    // Filter out already booked slots
    const bookedTimes = bookings
      .filter(b => b.specialistId === selectedSpecialist.id && b.date === selectedDate)
      .map(b => b.time);

    return slots.map(time => ({
      time,
      isAvailable: !bookedTimes.includes(time)
    }));
  };

  const handleSelectSpecialist = (spec) => {
    setSelectedSpecialist(spec);
    setSelectedDate('');
    setSelectedTime('');
    setStep(2);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime('');
  };

  const handleConfirmDateTime = () => {
    if (!selectedDate || !selectedTime) {
      onShowToast("Por favor selecciona fecha y hora", "error");
      return;
    }
    setStep(3);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      onShowToast("Completa los campos obligatorios", "error");
      return;
    }

    const newBooking = {
      specialistId: selectedSpecialist.id,
      clientName,
      clientPhone,
      notes: clientNotes,
      date: selectedDate,
      time: selectedTime,
      createdAt: new Date().toISOString()
    };

    try {
      setLoading(true);
      const saved = await addBooking(newBooking);
      setConfirmedBooking(saved);
      // Refresh local bookings list
      const books = await getBookings();
      setBookings(books);
      setStep(4);
      onShowToast("¡Turno reservado exitosamente!", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Error al reservar el turno", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetPortal = () => {
    setSelectedSpecialist(null);
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientNotes('');
    setConfirmedBooking(null);
    setStep(1);
  };

  // Render Calendar Helper
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Previous month offset blank boxes
    const days = [];
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day-empty"></div>);
    }

    // Actual calendar days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isPast = isPastDate(dateStr);
      const isVacation = isDateOnVacation(dateStr, selectedSpecialist);
      const shift = getDayShift(dateStr, selectedSpecialist);
      
      const isAvailable = !isPast && !isVacation && shift !== 'none';
      const isSelected = selectedDate === dateStr;
      
      const today = new Date();
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

      let btnClass = "calendar-day-btn";
      if (isSelected) btnClass += " selected";
      if (isToday) btnClass += " today";
      if (isVacation) btnClass += " vacation";

      days.push(
        <button
          key={`day-${d}`}
          className={btnClass}
          disabled={!isAvailable}
          onClick={() => handleDateSelect(dateStr)}
          title={isVacation ? "Vacaciones" : shift === 'none' ? "Sin atención" : "Disponible"}
        >
          <span>{d}</span>
        </button>
      );
    }

    return (
      <div className="calendar-widget">
        <div className="calendar-header">
          <button className="btn btn-text" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>
            <ChevronLeft size={20} />
          </button>
          <span className="calendar-month">
            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-text" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="calendar-grid-header">
          <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
        </div>
        <div className="calendar-days">
          {days}
        </div>
      </div>
    );
  };

  if (loading && step === 1) {
    return <div style={{textAlign: 'center', padding: '3rem'}}>Cargando portal de turnos...</div>;
  }

  const generatedSlots = generateSlots();

  return (
    <div className="booking-container">
      {/* Steps Headers */}
      {step < 4 && (
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
          <div className={`step-line ${step > 1 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
          <div className={`step-line ${step > 2 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
        </div>
      )}

      {/* STEP 1: Select Specialist */}
      {step === 1 && (
        <div className="glass-panel">
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Selecciona un Especialista</h2>
          <div className="specialists-grid">
            {specialists.map(spec => (
              <div 
                key={spec.id} 
                className="glass-panel specialist-card"
                onClick={() => handleSelectSpecialist(spec)}
              >
                <div className="specialist-img-container">
                  {spec.photoUrl ? (
                    <img src={spec.photoUrl} alt={spec.name} className="specialist-img" />
                  ) : (
                    <Stethoscope size={48} />
                  )}
                </div>
                <h3 className="specialist-name">{spec.name}</h3>
                <p className="specialist-specialty">{spec.specialty}</p>
                <p className="specialist-desc">{spec.description || 'Especialista listo para atenderte.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Select Date & Time */}
      {step === 2 && (
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Selecciona Fecha y Hora</h2>
            <button className="btn" onClick={() => setStep(1)}>Atrás</button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <div className="specialist-img-container" style={{ width: '50px', height: '50px', margin: 0 }}>
              {selectedSpecialist.photoUrl ? (
                <img src={selectedSpecialist.photoUrl} alt={selectedSpecialist.name} className="specialist-img" />
              ) : (
                <User size={24} />
              )}
            </div>
            <div>
              <h4 style={{ margin: 0 }}>{selectedSpecialist.name}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary-color)' }}>{selectedSpecialist.specialty}</p>
            </div>
          </div>

          <div className="datetime-layout">
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Paso 1: Elige un Día</h3>
              {renderCalendar()}
            </div>
            
            <div className="slots-container">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Paso 2: Elige una Hora</h3>
              {selectedDate ? (
                <>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Turnos disponibles para el <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>:
                  </p>
                  
                  {generatedSlots.length > 0 ? (
                    <div className="slots-grid">
                      {generatedSlots.map(slot => (
                        <button
                          key={slot.time}
                          className={`slot-btn ${selectedTime === slot.time ? 'selected' : ''}`}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                      <AlertCircle size={24} color="var(--vacation-color)" style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.9rem' }}>No hay horarios disponibles para esta fecha.</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                  <CalendarIcon size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem' }}>Por favor selecciona un día del calendario para ver horarios.</p>
                </div>
              )}
              
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={!selectedDate || !selectedTime}
                  onClick={handleConfirmDateTime}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Client Information Form */}
      {step === 3 && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Datos de Reserva</h2>
            <button className="btn" onClick={() => setStep(2)}>Atrás</button>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <p style={{ marginBottom: '0.4rem' }}><strong>Especialista:</strong> {selectedSpecialist.name} ({selectedSpecialist.specialty})</p>
            <p style={{ marginBottom: '0.4rem' }}><strong>Fecha:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><strong>Hora:</strong> {selectedTime} hs</p>
          </div>

          <form onSubmit={handleSubmitBooking}>
            <div className="form-group">
              <label htmlFor="client-name">Nombre y Apellido *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  id="client-name" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder="Ej. Juan Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="client-phone">Teléfono de Contacto *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="tel" 
                  id="client-phone" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder="Ej. 11 5555-5555"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="client-notes">Notas u Observaciones (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                <textarea 
                  id="client-notes" 
                  className="form-control" 
                  rows="3"
                  style={{ paddingLeft: '2.5rem', width: '100%', resize: 'none' }}
                  placeholder="Indica brevemente el motivo de tu consulta..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? "Confirmando..." : "Confirmar Turno"}
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: Success confirmation screen */}
      {step === 4 && confirmedBooking && (
        <div className="glass-panel success-screen">
          <div className="success-icon-container">
            <CheckCircle size={48} />
          </div>
          <h2>¡Turno Reservado!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Tu turno ha sido agendado exitosamente. Te esperamos en el horario indicado.</p>
          
          <div className="success-details">
            <div className="success-details-row">
              <span style={{ color: 'var(--text-muted)' }}>Código de Reserva:</span>
              <strong>{confirmedBooking.id}</strong>
            </div>
            <div className="success-details-row">
              <span style={{ color: 'var(--text-muted)' }}>Especialista:</span>
              <strong>{selectedSpecialist.name}</strong>
            </div>
            <div className="success-details-row">
              <span style={{ color: 'var(--text-muted)' }}>Especialidad:</span>
              <strong>{selectedSpecialist.specialty}</strong>
            </div>
            <div className="success-details-row">
              <span style={{ color: 'var(--text-muted)' }}>Fecha:</span>
              <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </div>
            <div className="success-details-row">
              <span style={{ color: 'var(--text-muted)' }}>Horario:</span>
              <strong>{selectedTime} hs</strong>
            </div>
            <div className="success-details-row">
              <span style={{ color: 'var(--text-muted)' }}>Paciente:</span>
              <strong>{clientName}</strong>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={resetPortal}
          >
            Reservar Otro Turno
          </button>
        </div>
      )}
    </div>
  );
}
