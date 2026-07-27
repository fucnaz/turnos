import { isFirebaseConfigured, db, auth } from '../firebase';
export { isFirebaseConfigured };
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// --- DEFAULT SEED DATA FOR LOCALSTORAGE FALLBACK ---
const DEFAULT_SPECIALISTS = [
  {
    id: "spec_1",
    name: "Dra. Sofia Rodriguez",
    specialty: "Dermatología",
    description: "Especialista en dermatología clínica y estética con más de 10 años de experiencia.",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300",
    email: "sofia@turnogo.com",
    password: "123",
    weeklySchedule: {
      "1": "morning",   // Lunes: Mañana
      "2": "afternoon", // Martes: Tarde
      "3": "both",      // Miércoles: Ambos
      "4": "morning",   // Jueves: Mañana
      "5": "afternoon", // Viernes: Tarde
      "6": "none",
      "0": "none"
    },
    vacations: [
      { start: "2026-08-01", end: "2026-08-10" }
    ]
  },
  {
    id: "spec_2",
    name: "Dr. Carlos Mendez",
    specialty: "Pediatría",
    description: "Pediatra dedicado a la atención integral de niños y adolescentes con calidez humana.",
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=300",
    email: "carlos@turnogo.com",
    password: "123",
    weeklySchedule: {
      "1": "afternoon", // Lunes: Tarde
      "2": "morning",   // Martes: Mañana
      "3": "afternoon", // Miércoles: Tarde
      "4": "both",      // Jueves: Ambos
      "5": "morning",   // Viernes: Mañana
      "6": "none",
      "0": "none"
    },
    vacations: []
  },
  {
    id: "spec_3",
    name: "Dra. Laura Martinez",
    specialty: "Ginecología",
    description: "Especialista en salud femenina, obstetricia y control prenatal de alta complejidad.",
    photoUrl: "https://images.unsplash.com/photo-1594824813573-246434de83fb?q=80&w=300",
    email: "laura@turnogo.com",
    password: "123",
    weeklySchedule: {
      "1": "morning",
      "2": "morning",
      "3": "morning",
      "4": "afternoon",
      "5": "afternoon",
      "6": "none",
      "0": "none"
    },
    vacations: [
      { start: "2026-07-28", end: "2026-07-31" }
    ]
  }
];

const DEFAULT_SETTINGS = {
  morningStart: "08:00",
  morningEnd: "13:00",
  afternoonStart: "14:00",
  afternoonEnd: "19:00",
  slotDuration: 30
};

const DEFAULT_BOOKINGS = [
  {
    id: "book_1",
    specialistId: "spec_1",
    clientName: "Valeria Gomez",
    clientPhone: "1155554444",
    notes: "Consulta de control rutinario",
    date: "2026-07-29",
    time: "09:30"
  },
  {
    id: "book_2",
    specialistId: "spec_2",
    clientName: "Martin Lopez",
    clientPhone: "1166667777",
    notes: "Vacuna de los 6 meses",
    date: "2026-07-30",
    time: "15:00"
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (!localStorage.getItem('turnogo_specialists')) {
    localStorage.setItem('turnogo_specialists', JSON.stringify(DEFAULT_SPECIALISTS));
  }
  if (!localStorage.getItem('turnogo_settings')) {
    localStorage.setItem('turnogo_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem('turnogo_bookings')) {
    localStorage.setItem('turnogo_bookings', JSON.stringify(DEFAULT_BOOKINGS));
  }
};
initLocalStorage();

// --- DATA SERVICE INTERFACE ---

export const getSettings = async () => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // Seed default settings in Firestore
        await setDoc(docRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } catch (e) {
      console.error("Firestore settings error, using fallback", e);
    }
  }
  return JSON.parse(localStorage.getItem('turnogo_settings')) || DEFAULT_SETTINGS;
};

export const updateSettings = async (settings) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'settings', 'global');
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (e) {
      console.error("Firestore update settings error", e);
    }
  }
  localStorage.setItem('turnogo_settings', JSON.stringify(settings));
  return true;
};

export const getSpecialists = async () => {
  if (isFirebaseConfigured) {
    try {
      const colRef = collection(db, 'specialists');
      const querySnapshot = await getDocs(colRef);
      const specialists = [];
      querySnapshot.forEach((doc) => {
        specialists.push({ id: doc.id, ...doc.data() });
      });
      if (specialists.length > 0) return specialists;
      
      // If DB is empty, seed it with defaults
      for (const spec of DEFAULT_SPECIALISTS) {
        const { id, ...data } = spec;
        await setDoc(doc(db, 'specialists', id), data);
        specialists.push(spec);
      }
      return specialists;
    } catch (e) {
      console.error("Firestore specialists fetch error, using fallback", e);
    }
  }
  return JSON.parse(localStorage.getItem('turnogo_specialists'));
};

export const addSpecialist = async (specialist) => {
  const newSpec = {
    ...specialist,
    weeklySchedule: specialist.weeklySchedule || {
      "1": "morning", "2": "morning", "3": "morning", "4": "morning", "5": "morning", "6": "none", "0": "none"
    },
    vacations: specialist.vacations || []
  };

  if (isFirebaseConfigured) {
    try {
      const colRef = collection(db, 'specialists');
      const docRef = await addDoc(colRef, newSpec);
      return { id: docRef.id, ...newSpec };
    } catch (e) {
      console.error("Firestore add specialist error", e);
    }
  }

  const list = JSON.parse(localStorage.getItem('turnogo_specialists')) || [];
  newSpec.id = 'spec_' + Date.now();
  list.push(newSpec);
  localStorage.setItem('turnogo_specialists', JSON.stringify(list));
  return newSpec;
};

export const updateSpecialist = async (id, data) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'specialists', id);
      await updateDoc(docRef, data);
      return true;
    } catch (e) {
      console.error("Firestore update specialist error", e);
    }
  }

  const list = JSON.parse(localStorage.getItem('turnogo_specialists')) || [];
  const index = list.findIndex(s => s.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...data };
    localStorage.setItem('turnogo_specialists', JSON.stringify(list));
    return true;
  }
  return false;
};

export const deleteSpecialist = async (id) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'specialists', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Firestore delete specialist error", e);
    }
  }

  let list = JSON.parse(localStorage.getItem('turnogo_specialists')) || [];
  list = list.filter(s => s.id !== id);
  localStorage.setItem('turnogo_specialists', JSON.stringify(list));
  return true;
};

export const getBookings = async () => {
  if (isFirebaseConfigured) {
    try {
      const colRef = collection(db, 'bookings');
      const querySnapshot = await getDocs(colRef);
      const bookings = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() });
      });
      return bookings;
    } catch (e) {
      console.error("Firestore bookings fetch error, using fallback", e);
    }
  }
  return JSON.parse(localStorage.getItem('turnogo_bookings')) || [];
};

export const addBooking = async (booking) => {
  if (isFirebaseConfigured) {
    try {
      const colRef = collection(db, 'bookings');
      const docRef = await addDoc(colRef, booking);
      return { id: docRef.id, ...booking };
    } catch (e) {
      console.error("Firestore add booking error", e);
    }
  }

  const list = JSON.parse(localStorage.getItem('turnogo_bookings')) || [];
  const newBooking = { id: 'book_' + Date.now(), ...booking };
  list.push(newBooking);
  localStorage.setItem('turnogo_bookings', JSON.stringify(list));
  return newBooking;
};

export const updateBooking = async (id, data) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'bookings', id);
      await updateDoc(docRef, data);
      return true;
    } catch (e) {
      console.error("Firestore update booking error", e);
    }
  }

  const list = JSON.parse(localStorage.getItem('turnogo_bookings')) || [];
  const index = list.findIndex(b => b.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...data };
    localStorage.setItem('turnogo_bookings', JSON.stringify(list));
    return true;
  }
  return false;
};

export const deleteBooking = async (id) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'bookings', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Firestore delete booking error", e);
    }
  }

  let list = JSON.parse(localStorage.getItem('turnogo_bookings')) || [];
  list = list.filter(b => b.id !== id);
  localStorage.setItem('turnogo_bookings', JSON.stringify(list));
  return true;
};

// --- AUTH SERVICE ---

export const loginUser = async (email, password) => {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@turnogo.com';
  
  // 1. Check Admin Login
  if (email.toLowerCase() === adminEmail.toLowerCase()) {
    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = { email: userCredential.user.email, uid: userCredential.user.uid, role: 'admin' };
        localStorage.setItem('turnogo_session', JSON.stringify(user));
        return user;
      } catch (e) {
        console.error("Firebase sign-in error", e);
        throw e;
      }
    }

    // Offline Admin login
    if (password === 'admin123') {
      const mockUser = { email: adminEmail, uid: 'mock_admin_123', role: 'admin' };
      localStorage.setItem('turnogo_session', JSON.stringify(mockUser));
      return mockUser;
    } else {
      throw new Error("Contraseña incorrecta (para modo offline use 'admin123').");
    }
  }

  // 2. Check Specialist Login
  const specs = await getSpecialists();
  const spec = specs.find(s => s.email?.toLowerCase() === email.toLowerCase());

  if (spec) {
    if (spec.password === password) {
      const mockUser = { 
        email: spec.email, 
        uid: spec.id, 
        role: 'specialist', 
        specialistId: spec.id, 
        name: spec.name 
      };
      localStorage.setItem('turnogo_session', JSON.stringify(mockUser));
      return mockUser;
    } else {
      throw new Error("Contraseña incorrecta para el especialista.");
    }
  }

  throw new Error("El correo ingresado no corresponde a ningún administrador o especialista.");
};

// Maintain loginAdmin for backward compatibility/aliases
export const loginAdmin = loginUser;

export const logoutAdmin = async () => {
  if (isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase logout error", e);
    }
  }
  localStorage.removeItem('turnogo_session');
  return true;
};

export const getCurrentUser = () => {
  const session = JSON.parse(localStorage.getItem('turnogo_session'));
  if (session) return session;
  
  if (isFirebaseConfigured && auth?.currentUser) {
    return { email: auth.currentUser.email, uid: auth.currentUser.uid, role: 'admin' };
  }
  return null;
};
