import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Plus, Save, Activity, FileText, 
  ChevronRight, ChevronDown, Clock, Search, History,
  Thermometer, Heart, Brain, Wind, Droplet, UserPlus,
  ArrowLeft, CheckCircle, Trash2, Edit2, X, CalendarDays,
  Camera, Image as ImageIcon, Upload, MessageSquare, Download, Share2,
  Euro, CreditCard, Wallet, Banknote, Home, Menu, AlertTriangle, LogOut, Lock
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp, where, writeBatch 
} from "firebase/firestore";
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, 
  signInWithEmailAndPassword, signOut 
} from "firebase/auth";

// --- Configuration Firebase ---
const firebaseConfig = {

  apiKey: "AIzaSyDfhtUjmef1jaw6QJKaXGUX-cmOdJ6OJhA",

  authDomain: "acuflow-f1312.firebaseapp.com",

  projectId: "acuflow-f1312",

  storageBucket: "acuflow-f1312.firebasestorage.app",

  messagingSenderId: "483424158354",

  appId: "1:483424158354:web:e179a0b9522d9d90509c4b"

};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Données Statiques ---
// ... (Zang Fu et Langue inchangés pour économiser l'espace, ils sont identiques à la version précédente)
const ZANG_FU_DATA = [
  { organ: "Cœur", symptoms: ["Palpitations", "Syndrome psy", "Dépression", "Anxiété", "Insomnie", "Ulcère de langue", "Rire inapproprié"] },
  { organ: "Rate", symptoms: ["Fatigue", "Manque d'appétit", "Faiblesse", "Œdèmes", "Selles molles", "Ballonnements", "Troubles digestifs", "Ictère"] },
  { organ: "Poumon", symptoms: ["Toux", "Dyspnée", "Pâleur", "Tristesse", "Problèmes de peau", "Essoufflement", "Transpirations spontanées"] },
  { organ: "Rein", symptoms: ["Douleurs lombaires", "Faiblesse des genoux", "Dépression", "Troubles sexuels", "Épuisement", "Troubles chroniques"] },
  { organ: "Foie", symptoms: ["Douleurs hypochondre", "Fluctuations émotionnelles", "Troubles sexuels", "Ongles mous/striés", "Spasmes", "Dos tendino-musculaire", "Crampes"] },
  { organ: "Intestin grêle", symptoms: ["Borborygmes", "Problèmes intestinaux", "Troubles clarté esprit", "Ulcérations langue/bouche"] },
  { organ: "Estomac", symptoms: ["Troubles digestifs", "Nausées", "Éructations", "Vomissements", "Faiblesse des membres", "Manque d'appétit"] },
  { organ: "Gros intestin", symptoms: ["Constipation", "Diarrhée", "Douleurs abdominales", "Prolapsus anal", "Hémorroïdes"] },
  { organ: "Vessie", symptoms: ["Troubles urinaires", "Pensée sombre", "Jalousie", "Suspicion"] },
  { organ: "Vésicule biliaire", symptoms: ["Douleurs digestives", "Amertume bouche", "Obésité", "Indécision", "Vertiges", "Acouphènes", "Timidité"] },
];

const TONGUE_DATA = {
  couleur: ["Pâle", "Rose (Normal)", "Rouge", "Rouge Écarlate", "Violet/Bleu"],
  forme: ["Normale", "Gonflée", "Fine", "Fissurée", "Dentelée", "Rigide", "Tremblante"],
  enduit_couleur: ["Blanc", "Jaune", "Gris", "Noir"],
  enduit_aspect: ["Fin (Normal)", "Épais", "Gras/Collant", "Sec", "Sans enduit (Pelé)"],
  humidite: ["Normale", "Sèche", "Trop humide"]
};

// --- Helpers ---
const generateICSFile = (appt, patientName) => {
  const startDate = new Date(`${appt.date}T${appt.time}`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
  const formatDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, "");
  const icsContent = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
    `DTSTART:${formatDate(startDate)}`, `DTEND:${formatDate(endDate)}`,
    `SUMMARY:Consultation Acupuncture - ${patientName}`,
    `DESCRIPTION:Note: ${appt.note || 'Aucune note'}`,
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `RDV_${patientName.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click(); document.body.removeChild(link);
};

const sendSMS = (patient, appt) => {
  if (!patient || !patient.telephone) { alert("Numéro de téléphone manquant."); return; }
  const dateFormatted = new Date(appt.date).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
  const message = `Bonjour ${patient.nom}, rappel RDV acupuncture le ${dateFormatted} à ${appt.time}. Dr Abdelmoumene.`;
  const separator = navigator.userAgent.match(/iPhone|iPad|iPod/i) ? '&' : '?';
  window.open(`sms:${patient.telephone}${separator}body=${encodeURIComponent(message)}`);
};

// --- Composants UI ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', icon: Icon, className = "", type = "button", disabled = false, title = "" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus:ring-red-400",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    icon: "p-2 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 border border-slate-200"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />} {children}
    </button>
  );
};

const InputGroup = ({ label, name, value, onChange, placeholder, type = "text", rows = 1, required = false }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-semibold text-slate-600">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {rows > 1 ? (
      <textarea 
        name={name}
        className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 bg-slate-50 min-h-[80px]"
        value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      />
    ) : (
      <input 
        type={type} name={name} required={required}
        className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 bg-slate-50"
        value={value} onChange={onChange} placeholder={placeholder}
      />
    )}
  </div>
);

const SectionTitle = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
    {Icon && <Icon className="text-teal-600" size={20} />}
    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
  </div>
);

// --- VUE LOGIN ---
const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">AcuFlow</h1>
          <p className="text-slate-500">Connexion au cabinet</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
           {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
           <InputGroup label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
           <InputGroup label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
           <Button type="submit" className="w-full mt-4" disabled={loading}>
             {loading ? 'Connexion...' : 'Se connecter'}
           </Button>
        </form>
        <p className="text-xs text-center text-slate-400 mt-6">Accès réservé au personnel autorisé.</p>
      </Card>
    </div>
  );
};


// --- Composant Principal ---

export default function AcuFlowApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Auth Handling
  useEffect(() => {
    const initAuth = async () => {
      // Pour le mode "Preview" dans le chat, on utilise le token custom si dispo.
      // Sinon, on attend que l'utilisateur se loggue manuellement.
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } 
      // Suppression du signInAnonymously automatique pour forcer le login en prod
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    
    const qPatients = query(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), orderBy('updatedAt', 'desc'));
    const unsubPatients = onSnapshot(qPatients, (snap) => setPatients(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const qAppointments = query(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), orderBy('date', 'asc'));
    const unsubAppointments = onSnapshot(qAppointments, (snap) => setAppointments(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const qConsults = query(collection(db, 'artifacts', appId, 'public', 'data', 'consultations'), orderBy('date', 'desc'));
    const unsubConsults = onSnapshot(qConsults, (snap) => setAllConsultations(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubPatients(); unsubAppointments(); unsubConsults(); };
  }, [user]);

  // Actions (Condensed)
  const handleSavePatient = async (patientData, isEdit = false) => {
    if (!user) return;
    if (!isEdit) {
        const duplicate = patients.find(p => p.nom.trim().toLowerCase() === patientData.nom.trim().toLowerCase());
        if (duplicate && !window.confirm(`Patient "${duplicate.nom}" existe déjà. Créer quand même ?`)) return;
    }
    try {
      if (isEdit && selectedPatient) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', selectedPatient.id), { ...patientData, updatedAt: serverTimestamp() });
        setSelectedPatient({ ...selectedPatient, ...patientData }); 
        setView('patientDetail');
      } else {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), { ...patientData, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), consultationCount: 0 });
        setSelectedPatient({ id: docRef.id, ...patientData }); setView('patientList'); 
      }
    } catch (e) { console.error(e); }
  };

  const handleDeletePatient = async (patientId) => {
    const hasFutureAppt = appointments.some(a => a.patientId === patientId && new Date(`${a.date}T${a.time}`) > new Date());
    const hasUnpaidBills = allConsultations.some(c => c.patientId === patientId && c.billing?.status === 'pending');
    if (hasFutureAppt || hasUnpaidBills) { alert("Impossible : RDV futur ou Impayé détecté."); return; }
    if (!window.confirm("Supprimer définitivement ?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', patientId)); setSelectedPatient(null); setView('patientList'); } catch (e) { console.error(e); }
  };

  const handleSaveConsultation = async (consultationData, isEdit = false) => {
    if (!user || !selectedPatient) return;
    try {
      // Use provided date or default to now
      const consultDate = consultationData.date || new Date().toISOString();
      const payload = { ...consultationData, date: consultDate, patientId: selectedPatient.id, patientName: selectedPatient.nom };
      
      if (isEdit && selectedConsultation) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'consultations', selectedConsultation.id), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'consultations'), payload);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', selectedPatient.id), {
          lastConsultation: consultDate, updatedAt: serverTimestamp(), consultationCount: (selectedPatient.consultationCount || 0) + 1
        });
      }
      setSelectedConsultation(null); setView('patientDetail');
    } catch (e) { console.error(e); }
  };

  const handleDeleteConsultation = async (consultId) => {
    if(!window.confirm("Supprimer ?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'consultations', consultId)); setView('patientDetail'); } catch (e) { console.error(e); }
  };

  const handleSaveAppointment = async (apptData) => {
    if (!user || !selectedPatient) return;
    if (new Date(`${apptData.date}T${apptData.time}`) < new Date() && !window.confirm("Date dans le passé. Continuer ?")) return;
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), { ...apptData, patientId: selectedPatient.id, patientName: selectedPatient.nom, createdAt: serverTimestamp() }); setView('patientDetail'); } catch (e) { console.error(e); }
  };
  
  const handleDeleteAppointment = async (apptId) => {
    if(!window.confirm("Annuler ?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', apptId)); } catch(e) { console.error(e); }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="h-screen flex items-center justify-center text-teal-600 font-bold text-xl animate-pulse">Chargement...</div>;

  // --- PROTECTION: Si pas de user, on affiche LoginView ---
  if (!user) return <LoginView />;

  const filteredPatients = patients.filter(p => p.nom.toLowerCase().includes(searchTerm.toLowerCase()) || (p.profession && p.profession.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Desktop */}
      <nav className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shadow-xl z-20 shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-teal-400" /> AcuFlow
          </h1>
          <p className="text-xs text-slate-500 mt-1">Cabinet Dr Abdelmoumene</p>
        </div>
        <div className="flex-1 py-6 space-y-2 px-3">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Home} label="Tableau de bord" />
          <NavButton active={view === 'patientList' || view.includes('patientDetail') || view === 'editPatient'} onClick={() => setView('patientList')} icon={Users} label="Patients" />
          <NavButton active={view === 'newPatient'} onClick={() => { setSelectedPatient(null); setView('newPatient'); }} icon={UserPlus} label="Nouveau Patient" />
        </div>
        <div className="p-4 border-t border-slate-700">
           <Button onClick={handleLogout} variant="ghost" icon={LogOut} className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-800">Déconnexion</Button>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
         <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="text-teal-400" size={20}/> AcuFlow</h1>
         <button onClick={handleLogout} className="text-slate-400 hover:text-white"><LogOut size={20} /></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        {view === 'dashboard' && <Dashboard patients={patients} appointments={appointments} consultations={allConsultations} setView={setView} setSelectedPatient={setSelectedPatient} />}
        {view === 'patientList' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">Dossiers</h2>
              <div className="hidden md:block"><Button onClick={() => { setSelectedPatient(null); setView('newPatient'); }} variant="primary" icon={UserPlus}>Nouveau</Button></div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Rechercher..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map(p => <PatientCard key={p.id} patient={p} onClick={() => { setSelectedPatient(p); setView('patientDetail'); }} />)}
            </div>
          </div>
        )}
        {(view === 'newPatient' || view === 'editPatient') && (
          <div className="max-w-2xl mx-auto">
            <Button onClick={() => setView(view === 'editPatient' ? 'patientDetail' : 'patientList')} variant="ghost" icon={ArrowLeft} className="mb-4 pl-0">Retour</Button>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6">{view === 'editPatient' ? 'Modifier Dossier' : 'Nouveau Patient'}</h2>
            <PatientForm initialData={view === 'editPatient' ? selectedPatient : null} onSave={(data) => handleSavePatient(data, view === 'editPatient')} onCancel={() => setView(view === 'editPatient' ? 'patientDetail' : 'patientList')} />
          </div>
        )}
        {view === 'patientDetail' && selectedPatient && (
          <PatientDetail patient={selectedPatient} appointments={appointments.filter(a => a.patientId === selectedPatient.id && new Date(a.date) >= new Date())} onBack={() => setView('patientList')} onNewConsultation={() => { setSelectedConsultation(null); setView('consultationForm'); }} onEditConsultation={(consult) => { setSelectedConsultation(consult); setView('consultationForm'); }} onDeleteConsultation={handleDeleteConsultation} onEditPatient={() => setView('editPatient')} onDeletePatient={() => handleDeletePatient(selectedPatient.id)} onSchedule={() => setView('scheduleAppointment')} onDeleteAppointment={handleDeleteAppointment} db={db} appId={appId} />
        )}
        {view === 'consultationForm' && selectedPatient && (
          <div className="max-w-4xl mx-auto">
             <Button onClick={() => setView('patientDetail')} variant="ghost" icon={ArrowLeft} className="mb-4 pl-0">Retour</Button>
             <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">{selectedConsultation ? 'Modifier' : 'Nouvelle Consultation'}</h2>
             <ConsultationForm patient={selectedPatient} initialData={selectedConsultation} onSave={(data) => handleSaveConsultation(data, !!selectedConsultation)} onCancel={() => setView('patientDetail')} />
          </div>
        )}
        {view === 'scheduleAppointment' && selectedPatient && (
           <div className="max-w-xl mx-auto">
              <Button onClick={() => setView('patientDetail')} variant="ghost" icon={ArrowLeft} className="mb-4 pl-0">Retour</Button>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6">Planifier RDV</h2>
              <AppointmentForm patient={selectedPatient} onSave={handleSaveAppointment} onCancel={() => setView('patientDetail')} />
           </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around items-center p-3 z-40 pb-safe">
          <MobileNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Home} label="Accueil" />
          <MobileNavButton active={view === 'patientList' || view === 'patientDetail'} onClick={() => setView('patientList')} icon={Users} label="Patients" />
          <div className="relative -top-5 bg-teal-500 rounded-full p-1 border-4 border-slate-50">
             <button onClick={() => { setSelectedPatient(null); setView('newPatient'); }} className="bg-teal-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"><Plus size={24} /></button>
          </div>
          <MobileNavButton active={view === 'scheduleAppointment'} onClick={() => setView('dashboard')} icon={CalendarDays} label="Agenda" />
          <MobileNavButton active={false} onClick={() => window.location.reload()} icon={Activity} label="Sync" />
      </div>
    </div>
  );
}

// --- Sub-Components (Dashboard, PatientCard, PatientDetail, Forms) ---
const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <Icon size={20} /> {label}
  </button>
);
const MobileNavButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-teal-400' : 'text-slate-400'}`}>
    <Icon size={24} /> <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// (Dashboard, PatientCard, PatientDetail, PatientForm, AppointmentForm restent essentiellement identiques, sauf ajustements mineurs)
const Dashboard = ({ patients, appointments, consultations, setView, setSelectedPatient }) => {
  const recentPatients = [...patients].sort((a,b) => b.updatedAt?.seconds - a.updatedAt?.seconds).slice(0, 3);
  const upcomingAppointments = appointments.filter(a => new Date(a.date) >= new Date()).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  const totalRevenue = consultations.reduce((acc, curr) => acc + (parseFloat(curr.billing?.price) || 0), 0);
  const pendingRevenue = consultations.filter(c => c.billing?.status === 'pending').reduce((acc, curr) => acc + (parseFloat(curr.billing?.price) || 0), 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 md:p-8 text-white shadow-xl flex justify-between items-center">
        <div><h2 className="text-2xl md:text-3xl font-bold mb-2">Bonjour, Docteur.</h2><p className="opacity-90 text-sm md:text-base">{patients.length} dossiers actifs • {upcomingAppointments.length} RDV à venir</p></div>
        <div className="hidden md:block"><Button onClick={() => { setSelectedPatient(null); setView('newPatient'); }} variant="secondary" icon={UserPlus}>Nouveau Patient</Button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-3 md:p-4 flex flex-col md:flex-row items-center gap-2 md:gap-4 bg-emerald-50 border-emerald-100 text-center md:text-left">
           <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Euro size={20}/></div>
           <div><p className="text-[10px] md:text-xs text-emerald-600 font-bold uppercase">CA Total</p><p className="text-lg md:text-2xl font-bold text-slate-800">{totalRevenue} €</p></div>
        </Card>
        <Card className="p-3 md:p-4 flex flex-col md:flex-row items-center gap-2 md:gap-4 bg-amber-50 border-amber-100 text-center md:text-left">
           <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Clock size={20}/></div>
           <div><p className="text-[10px] md:text-xs text-amber-600 font-bold uppercase">En attente</p><p className="text-lg md:text-2xl font-bold text-slate-800">{pendingRevenue} €</p></div>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays size={20} className="text-teal-600"/> Prochains RDV</h3>
          <div className="space-y-3">
             {upcomingAppointments.map(appt => {
               const patient = patients.find(p => p.id === appt.patientId);
               return (
                 <div key={appt.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                       <div className="font-bold text-slate-800">{new Date(appt.date).toLocaleDateString('fr-FR', {weekday:'short', day:'numeric', month:'short'})}</div>
                       <div className="text-teal-600 font-medium flex items-center gap-1 text-sm"><Clock size={14}/> {appt.time}</div>
                       <div className="font-bold text-slate-700 cursor-pointer hover:text-teal-600 mt-1" onClick={() => { if(patient) { setSelectedPatient(patient); setView('patientDetail'); } }}>{appt.patientName}</div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                       <Button variant="icon" title="SMS" onClick={() => patient && sendSMS(patient, appt)} icon={MessageSquare} className="w-10 h-10 p-0 rounded-full" />
                       <Button variant="icon" title="Calendrier" onClick={() => generateICSFile(appt, appt.patientName)} icon={Share2} className="w-10 h-10 p-0 rounded-full" />
                    </div>
                 </div>
               );
             })}
             {upcomingAppointments.length === 0 && <div className="p-6 bg-white rounded-xl border border-slate-100 text-slate-400 text-center italic">Aucun rendez-vous.</div>}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={20} className="text-teal-600"/> Récents</h3>
          <div className="flex flex-col gap-3">
            {recentPatients.map(p => (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setView('patientDetail'); }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 cursor-pointer flex items-center gap-4 transition-all">
                <div className="bg-teal-50 text-teal-700 font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0">{p.nom.charAt(0).toUpperCase()}</div>
                <div className="overflow-hidden"><h4 className="font-bold text-slate-800 truncate">{p.nom}</h4><p className="text-xs text-slate-500 truncate">{p.lastConsultation ? `${new Date(p.lastConsultation).toLocaleDateString()}` : 'Nouveau'}</p></div>
                <ChevronRight className="ml-auto text-slate-300" size={18} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
const PatientCard = ({ patient, onClick }) => (
  <div onClick={onClick} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 cursor-pointer transition-all group">
    <div className="flex justify-between items-start mb-3">
      <div className="bg-teal-50 text-teal-700 font-bold w-10 h-10 rounded-full flex items-center justify-center text-lg">{patient.nom.charAt(0).toUpperCase()}</div>
      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{patient.age ? `${patient.age} ans` : 'N/A'}</span>
    </div>
    <h3 className="font-bold text-slate-800 text-lg group-hover:text-teal-700 truncate">{patient.nom}</h3>
    <p className="text-sm text-slate-500 mb-4 truncate">{patient.profession || "Profession non renseignée"}</p>
    <div className="flex items-center text-xs text-slate-400 gap-2 border-t border-slate-100 pt-3"><Calendar size={14} /> {patient.lastConsultation ? new Date(patient.lastConsultation).toLocaleDateString() : 'Aucune consultation'}</div>
  </div>
);
const AppointmentForm = ({ patient, onSave, onCancel }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if(!date || !time) return; onSave({ date, time, note }); };
  return (
    <Card className="p-6">
       <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-slate-600 mb-4">Patient: <span className="font-bold text-slate-900">{patient.nom}</span></p>
          <div className="grid grid-cols-2 gap-4"><InputGroup label="Date *" type="date" value={date} onChange={e => setDate(e.target.value)} required /><InputGroup label="Heure *" type="time" value={time} onChange={e => setTime(e.target.value)} required /></div>
          <InputGroup label="Note (Optionnel)" placeholder="Ex: Suivi douleur épaule" value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex justify-end gap-3 mt-6"><Button onClick={onCancel} variant="secondary">Annuler</Button><Button type="submit" icon={CalendarDays}>Confirmer RDV</Button></div>
       </form>
    </Card>
  )
}
const PatientForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ nom: '', profession: '', bazi: '', situationFamiliale: '', antecedents: '', dateNaissance: '', nombreEnfants: '', telephone: '' });
  useEffect(() => { if (initialData) setFormData({ nom: initialData.nom || '', profession: initialData.profession || '', bazi: initialData.bazi || '', situationFamiliale: initialData.situationFamiliale || '', antecedents: initialData.antecedents || '', dateNaissance: initialData.dateNaissance || '', nombreEnfants: initialData.nombreEnfants || '', telephone: initialData.telephone || '' }); }, [initialData]);
  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.nom) return; let age = ''; if (formData.dateNaissance) { const birth = new Date(formData.dateNaissance); const diff = Date.now() - birth.getTime(); age = Math.abs(new Date(diff).getUTCFullYear() - 1970); } onSave({ ...formData, age }); };
  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5"><InputGroup label="Nom Complet *" name="nom" value={formData.nom} onChange={handleChange} required /><InputGroup label="Date de naissance" type="date" name="dateNaissance" value={formData.dateNaissance} onChange={handleChange} /><InputGroup label="Profession" name="profession" value={formData.profession} onChange={handleChange} /><InputGroup label="BAZI" name="bazi" value={formData.bazi} onChange={handleChange} placeholder="Éléments astrologiques..." /><InputGroup label="Situation Familiale" name="situationFamiliale" value={formData.situationFamiliale} onChange={handleChange} /><InputGroup label="Nombre d'enfants" type="number" name="nombreEnfants" value={formData.nombreEnfants} onChange={handleChange} /><InputGroup label="Téléphone" type="tel" name="telephone" value={formData.telephone} onChange={handleChange} /></div>
        <InputGroup label="Antécédents Médicaux" rows={3} name="antecedents" value={formData.antecedents} onChange={handleChange} />
        <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end"><Button onClick={onCancel} variant="secondary">Annuler</Button><Button type="submit" variant="primary" icon={Save}>{initialData ? 'Mettre à jour' : 'Créer le dossier'}</Button></div>
      </form>
    </Card>
  );
};
const PatientDetail = ({ patient, appointments, onBack, onNewConsultation, onEditConsultation, onDeleteConsultation, onEditPatient, onDeletePatient, onSchedule, onDeleteAppointment, db, appId }) => {
  const [history, setHistory] = useState([]);
  useEffect(() => { const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'consultations'), orderBy('date', 'desc')); const unsubscribe = onSnapshot(q, (snap) => { const allConsults = snap.docs.map(d => ({id: d.id, ...d.data()})); setHistory(allConsults.filter(c => c.patientId === patient.id)); }); return () => unsubscribe(); }, [patient.id]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><Button onClick={onBack} variant="ghost" icon={ArrowLeft}>Retour</Button><div className="flex gap-2"><Button onClick={onDeletePatient} variant="danger" icon={Trash2} className="px-2 md:px-4"><span className="hidden md:inline">Supprimer</span></Button><Button onClick={onEditPatient} variant="secondary" icon={Edit2} className="px-2 md:px-4"><span className="hidden md:inline">Modifier</span></Button></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card className="p-6 border-l-4 border-l-teal-500 h-full">
              <div className="flex flex-col md:flex-row justify-between items-start">
                <div><h1 className="text-2xl md:text-3xl font-bold text-slate-800">{patient.nom}</h1><div className="flex gap-2 md:gap-4 mt-2 text-slate-500 text-sm flex-wrap"><span className="bg-slate-100 px-2 py-0.5 rounded">{patient.age ? `${patient.age} ans` : 'Age N/A'}</span><span>{patient.profession}</span><span className="hidden md:inline">BAZI: {patient.bazi || '-'}</span></div><div className="md:hidden mt-2 text-sm text-slate-500">BAZI: {patient.bazi || '-'}</div></div>
                <div className="text-left md:text-right text-sm text-slate-500 mt-2 md:mt-0 w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-start border-t md:border-t-0 pt-2 md:pt-0"><p className="font-mono text-slate-700">{patient.telephone}</p><p>Enfants: {patient.nombreEnfants}</p></div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100"><h4 className="font-bold text-slate-700 text-sm mb-1">Antécédents :</h4><p className="text-slate-600 text-sm">{patient.antecedents || "Aucun antécédent noté."}</p></div>
            </Card>
        </div>
        <Card className="p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 flex items-center gap-2"><CalendarDays size={18}/> Rendez-vous</h3><Button onClick={onSchedule} variant="primary" className="text-xs px-3 py-1">Planifier</Button></div>
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[150px]">
               {appointments.length === 0 && <p className="text-sm text-slate-400 italic">Aucun RDV futur.</p>}
               {appointments.map(appt => (
                 <div key={appt.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 flex justify-between items-center group gap-2">
                    <div className="flex-1"><div className="font-bold text-teal-700">{new Date(appt.date).toLocaleDateString()} à {appt.time}</div><div className="text-slate-500 text-xs">{appt.note}</div></div>
                    <div className="flex gap-1"><button onClick={() => sendSMS(patient, appt)} title="Rappel SMS" className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-full transition-colors"><MessageSquare size={14} /></button><button onClick={() => generateICSFile(appt, patient.nom)} title="Ajouter au calendrier" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"><Share2 size={14} /></button><button onClick={() => onDeleteAppointment(appt.id)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={14} /></button></div>
                 </div>
               ))}
            </div>
        </Card>
      </div>
      <div>
        <div className="flex justify-between items-end mb-4"><h3 className="text-xl font-bold text-slate-800">Historique des Consultations</h3><Button onClick={onNewConsultation} variant="primary" icon={Plus} className="md:px-4"><span className="hidden md:inline">Nouvelle Consultation</span><span className="md:hidden">Nouvelle</span></Button></div>
        <div className="space-y-4">
          {history.map((consult, idx) => (
            <div key={consult.id} className="flex gap-4">
              <div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm z-10 border-2 border-white shadow-sm shrink-0">{history.length - idx}</div>{idx !== history.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1"></div>}</div>
              <ConsultationSummaryCard consult={consult} onEdit={() => onEditConsultation(consult)} onDelete={() => onDeleteConsultation(consult.id)} />
            </div>
          ))}
          {history.length === 0 && <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">Aucune consultation enregistrée.</div>}
        </div>
      </div>
    </div>
  );
};
const ConsultationSummaryCard = ({ consult, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const obs = consult.observation || {};
  const billing = consult.billing || {};
  const hasTongueImage = obs.tongueImage && obs.tongueImage.startsWith('data:image');
  return (
    <Card className="flex-1 mb-2 hover:border-teal-300 transition-colors">
      <div className="p-4 cursor-pointer flex justify-between items-center group" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <div className="flex items-center gap-2"><span className="font-bold text-slate-800">{new Date(consult.date).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span><span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{new Date(consult.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div className="flex gap-2">{hasTongueImage && <span className="flex items-center gap-1 text-xs text-teal-600 border border-teal-200 px-2 py-0.5 rounded-full bg-teal-50"><ImageIcon size={10}/> Photo</span>}{billing.price && <span className={`flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full ${billing.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}><Euro size={10}/> {billing.status === 'paid' ? 'Payé' : 'En attente'}</span>}</div>
          </div>
          <p className="text-teal-700 font-medium mt-1 text-sm md:text-base">{consult.motif || "Motif non spécifié"}</p>
        </div>
        <div className="flex items-center gap-3"><div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity mr-2" onClick={(e) => e.stopPropagation()}><button onClick={onEdit} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-full" title="Modifier"><Edit2 size={16} /></button><button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Supprimer"><Trash2 size={16} /></button></div><ChevronDown className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} /></div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-50 text-sm grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {(hasTongueImage || obs.tongueTags) && (
             <div className="col-span-1 md:col-span-2 bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col sm:flex-row gap-4">
                {hasTongueImage && <div className="shrink-0 self-center sm:self-start"><img src={obs.tongueImage} alt="Langue" className="w-24 h-24 object-cover rounded-md border border-slate-300 shadow-sm" /></div>}
                <div className="flex-1"><h4 className="font-bold text-teal-700 mb-1 flex items-center gap-2"><ImageIcon size={14}/> Diagnostic Langue</h4><div className="flex flex-wrap gap-1 mb-2">{obs.tongueTags && Object.entries(obs.tongueTags).map(([key, value]) => (value && <span key={key} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded shadow-sm">{value}</span>))}</div><p className="text-slate-600 italic">{obs.langueDetail}</p></div>
             </div>
          )}
          <div><h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1"><Brain size={14}/> Diagnostic Zang Fu</h4><ul className="list-disc pl-4 text-slate-600 space-y-1">{consult.symptoms && Object.keys(consult.symptoms).map(k => (consult.symptoms[k]?.length > 0 && <li key={k}><span className="font-semibold">{k}:</span> {consult.symptoms[k].join(", ")}</li>))}{(!consult.symptoms || Object.keys(consult.symptoms).length === 0) && <li className="text-slate-400 italic">Rien à signaler</li>}</ul></div>
          <div><h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1"><Activity size={14}/> Traitement</h4><p className="text-slate-600 mb-2"><span className="font-semibold">Principe:</span> {consult.principeTraitement || '-'}</p><div className="bg-teal-50 p-2 rounded text-teal-800 font-mono text-xs break-words">{consult.pointsAcupuncture || "Aucun point noté"}</div></div>
          <div className="col-span-1 md:col-span-2 bg-yellow-50 p-3 rounded border border-yellow-100 text-yellow-800"><span className="font-bold">Notes:</span> {consult.notes}</div>
          {billing.price && (
             <div className="col-span-1 md:col-span-2 flex items-center justify-between border-t border-slate-100 pt-3 mt-1"><div className="flex items-center gap-2 text-slate-600"><Wallet size={16} /> <span>{billing.price} € - {billing.method === 'especes' ? 'Espèces' : billing.method === 'cb' ? 'Carte Bancaire' : billing.method === 'cheque' ? 'Chèque' : 'Autre'}</span></div><div className={`font-bold uppercase text-xs px-2 py-1 rounded ${billing.status === 'paid' ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'}`}>{billing.status === 'paid' ? 'Réglé' : 'À régler'}</div></div>
          )}
        </div>
      )}
    </Card>
  );
};

const ConsultationForm = ({ patient, initialData, onSave, onCancel }) => {
  const [general, setGeneral] = useState({ motif: '', pratiqueSportive: '' });
  const [interrogation, setInterrogation] = useState({ froidChaleur: '', transpiration: '', sellesUrines: '', douleurs: '', alimentationSoif: '', sommeil: '', cyclesGrossesse: '' });
  const [observation, setObservation] = useState({ langueDetail: '', pouls: '', poulsDetail: '', tongueImage: null, tongueTags: {} });
  const [diagnosisSymptoms, setDiagnosisSymptoms] = useState({}); 
  const [dysmenorrhee, setDysmenorrhee] = useState([]);
  const [traitement, setTraitement] = useState({ principe: '', points: '', notes: '' });
  const [billing, setBilling] = useState({ price: '', status: 'paid', method: 'especes' });
  // NOUVEAU: Champ date manuel
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (initialData) {
        setGeneral({ motif: initialData.motif || '', pratiqueSportive: initialData.pratiqueSportive || '' });
        setInterrogation(initialData.interrogation || { froidChaleur: '', transpiration: '', sellesUrines: '', douleurs: '', alimentationSoif: '', sommeil: '', cyclesGrossesse: '' });
        setObservation(initialData.observation || { langueDetail: '', pouls: '', poulsDetail: '', tongueImage: null, tongueTags: {} });
        setDiagnosisSymptoms(initialData.symptoms || {});
        setDysmenorrhee(initialData.dysmenorrhee || []);
        setTraitement({ principe: initialData.principeTraitement || '', points: initialData.pointsAcupuncture || '', notes: initialData.notes || '' });
        if(initialData.billing) setBilling(initialData.billing);
        if(initialData.date) setCustomDate(initialData.date.split('T')[0]);
    }
  }, [initialData]);

  const toggleSymptom = (organ, symptom) => { setDiagnosisSymptoms(prev => { const currentList = prev[organ] || []; return currentList.includes(symptom) ? { ...prev, [organ]: currentList.filter(s => s !== symptom) } : { ...prev, [organ]: [...currentList, symptom] }; }); };
  const handleImageUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); let width = img.width; let height = img.height; const MAX_WIDTH = 800; const MAX_HEIGHT = 800; if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); const dataUrl = canvas.toDataURL('image/jpeg', 0.7); setObservation(prev => ({ ...prev, tongueImage: dataUrl })); }; img.src = event.target.result; }; reader.readAsDataURL(file); };
  
  const handleSave = () => {
    const data = {
      motif: general.motif, pratiqueSportive: general.pratiqueSportive, interrogation, observation, symptoms: diagnosisSymptoms, dysmenorrhee, principeTraitement: traitement.principe, pointsAcupuncture: traitement.points, notes: traitement.notes, billing,
      date: new Date(customDate).toISOString() // Use custom date
    };
    onSave(data);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionTitle title="Motif & Général" icon={FileText} />
        {/* NOUVEAU: Champ de date */}
        <div className="mb-4 bg-teal-50 p-3 rounded-lg border border-teal-100">
           <InputGroup label="Date de la consultation" type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} required />
        </div>
        <div className="grid md:grid-cols-2 gap-4"><InputGroup label="Motif de Consultation" value={general.motif} onChange={e => setGeneral({...general, motif: e.target.value})} /><InputGroup label="Pratique Sportive" value={general.pratiqueSportive} onChange={e => setGeneral({...general, pratiqueSportive: e.target.value})} /></div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Interrogatoire" icon={Activity} />
        <div className="grid md:grid-cols-2 gap-4"><InputGroup label="Froid / Chaleur" value={interrogation.froidChaleur} onChange={e => setInterrogation({...interrogation, froidChaleur: e.target.value})} /><InputGroup label="Transpiration" value={interrogation.transpiration} onChange={e => setInterrogation({...interrogation, transpiration: e.target.value})} /><InputGroup label="Selles / Urines" value={interrogation.sellesUrines} onChange={e => setInterrogation({...interrogation, sellesUrines: e.target.value})} /><InputGroup label="Douleurs" value={interrogation.douleurs} onChange={e => setInterrogation({...interrogation, douleurs: e.target.value})} /><InputGroup label="Alimentation / Soif" value={interrogation.alimentationSoif} onChange={e => setInterrogation({...interrogation, alimentationSoif: e.target.value})} /><InputGroup label="Sommeil" value={interrogation.sommeil} onChange={e => setInterrogation({...interrogation, sommeil: e.target.value})} /><InputGroup label="Cycles / Grossesse" value={interrogation.cyclesGrossesse} onChange={e => setInterrogation({...interrogation, cyclesGrossesse: e.target.value})} /></div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Observation & Diagnostic Langue" icon={ImageIcon} />
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <h4 className="font-bold text-teal-800 mb-3 flex items-center gap-2"><Camera size={18}/> Examen de la Langue</h4>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors relative">
                    {observation.tongueImage ? (<><img src={observation.tongueImage} alt="Aperçu" className="max-h-40 rounded shadow-sm mb-2" /><button onClick={() => setObservation({...observation, tongueImage: null})} className="text-xs text-red-500 hover:underline">Supprimer photo</button></>) : (<><Upload className="text-slate-400 mb-2" size={32}/><span className="text-sm text-slate-500 font-medium text-center">Ajouter une photo</span><span className="text-xs text-slate-400 text-center">(Format léger auto)</span></>)}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Couleur Corps</label><select className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm" value={observation.tongueTags?.couleur || ''} onChange={(e) => setObservation({...observation, tongueTags: {...observation.tongueTags, couleur: e.target.value}})}><option value="">-- Sélectionner --</option>{TONGUE_DATA.couleur.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Forme</label><select className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm" value={observation.tongueTags?.forme || ''} onChange={(e) => setObservation({...observation, tongueTags: {...observation.tongueTags, forme: e.target.value}})}><option value="">-- Sélectionner --</option>{TONGUE_DATA.forme.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Enduit (Couleur)</label><select className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm" value={observation.tongueTags?.enduit_couleur || ''} onChange={(e) => setObservation({...observation, tongueTags: {...observation.tongueTags, enduit_couleur: e.target.value}})}><option value="">-- Sélectionner --</option>{TONGUE_DATA.enduit_couleur.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Enduit (Aspect)</label><select className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm" value={observation.tongueTags?.enduit_aspect || ''} onChange={(e) => setObservation({...observation, tongueTags: {...observation.tongueTags, enduit_aspect: e.target.value}})}><option value="">-- Sélectionner --</option>{TONGUE_DATA.enduit_aspect.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <InputGroup label="Détails supplémentaires" placeholder="Ex: Veinules sublinguales, fissures centrales..." value={observation.langueDetail} onChange={e => setObservation({...observation, langueDetail: e.target.value})} />
                </div>
            </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100"><div className="space-y-3"><h4 className="font-semibold text-slate-700 border-b pb-1"><Activity size={16} className="inline mr-2"/>Pouls</h4><InputGroup label="Global" value={observation.pouls} onChange={e => setObservation({...observation, pouls: e.target.value})} placeholder="Rapide, flottant..." /><InputGroup label="Détails (Loc, Puissance, Rythme)" rows={2} value={observation.poulsDetail} onChange={e => setObservation({...observation, poulsDetail: e.target.value})} /></div></div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Diagnostic par Organe (Zang Fu)" icon={Heart} />
        <div className="grid md:grid-cols-2 gap-6">{ZANG_FU_DATA.map((organData) => (<div key={organData.organ} className="bg-slate-50 p-3 rounded-lg border border-slate-100"><h4 className="font-bold text-teal-700 mb-2">{organData.organ}</h4><div className="flex flex-wrap gap-2">{organData.symptoms.map(sym => { const isChecked = diagnosisSymptoms[organData.organ]?.includes(sym); return (<button key={sym} type="button" onClick={() => toggleSymptom(organData.organ, sym)} className={`text-xs px-2 py-1 rounded-full border transition-all ${isChecked ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}>{sym}</button>); })}</div></div>))}</div>
        <div className="mt-6 pt-4 border-t border-slate-100"><h4 className="font-bold text-slate-700 mb-2">Dysmenorrhée</h4><div className="flex flex-col gap-2">{["Vide de Qi, Xue, Yin (Rate, Foie)", "Stagnation de Qi/Xue", "Froid Utérus", "Chaleur/Humidité (Foie/VB)"].map(opt => (<label key={opt} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" className="accent-teal-600 w-4 h-4" checked={dysmenorrhee.includes(opt)} onChange={(e) => { if(e.target.checked) setDysmenorrhee([...dysmenorrhee, opt]); else setDysmenorrhee(dysmenorrhee.filter(x => x !== opt)); }} />{opt}</label>))}</div></div>
      </Card>
      <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-5 border-teal-200 shadow-md">
            <SectionTitle title="Traitement & Points" icon={CheckCircle} />
            <div className="space-y-4"><InputGroup label="Principe de Traitement" value={traitement.principe} onChange={e => setTraitement({...traitement, principe: e.target.value})} /><div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-slate-600">Points & Merveilleux Vaisseaux</label><textarea className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm bg-yellow-50 min-h-[100px]" placeholder="Ex: 4GI (D), 36E (G)..." value={traitement.points} onChange={e => setTraitement({...traitement, points: e.target.value})} /></div><InputGroup label="Notes Importantes" rows={3} value={traitement.notes} onChange={e => setTraitement({...traitement, notes: e.target.value})} /></div>
          </Card>
          <Card className="md:col-span-1 p-5 border-amber-200 bg-amber-50/50">
             <SectionTitle title="Facturation" icon={Wallet} />
             <div className="space-y-4"><InputGroup label="Prix (€)" type="number" value={billing.price} onChange={e => setBilling({...billing, price: e.target.value})} placeholder="Ex: 50" /><div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-slate-600">Statut</label><select className="px-3 py-2 rounded-lg border border-slate-300 bg-white" value={billing.status} onChange={e => setBilling({...billing, status: e.target.value})}><option value="paid">Payé</option><option value="pending">En attente (Impayé)</option></select></div><div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-slate-600">Moyen de paiement</label><select className="px-3 py-2 rounded-lg border border-slate-300 bg-white" value={billing.method} onChange={e => setBilling({...billing, method: e.target.value})}><option value="especes">Espèces</option><option value="cb">Carte Bancaire</option><option value="cheque">Chèque</option><option value="virement">Virement</option></select></div></div>
          </Card>
      </div>
      <div className="sticky bottom-20 md:bottom-4 z-30 flex justify-end gap-3 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]"><Button onClick={onCancel} variant="secondary">Annuler</Button><Button onClick={handleSave} variant="primary" icon={Save}>{initialData ? 'Mettre à jour' : 'Enregistrer'}</Button></div>
    </div>
  );
};
