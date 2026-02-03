import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  User, 
  Lock, 
  Mail, 
  LogOut, 
  Save, 
  ShieldCheck, 
  Loader2, 
  ArrowRight,
  Settings,
  ChevronLeft,
  AlertCircle,
  WifiOff
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  // Memoizamos la configuración para evitar re-inicializaciones
  const firebaseData = useMemo(() => {
    let services = { auth: null, db: null, available: false, appId: 'auth-demo' };
    try {
      const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
      const id = typeof __app_id !== 'undefined' ? __app_id : 'auth-demo-app';
      
      if (configStr) {
        const firebaseConfig = JSON.parse(configStr);
        // Evitar inicializar múltiples veces
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        services.auth = getAuth(app);
        services.db = getFirestore(app);
        services.available = true;
        services.appId = id;
      }
    } catch (e) {
      console.error("Error inicializando Firebase:", e);
    }
    return services;
  }, []);

  const [userData, setUserData] = useState({
    displayName: 'Usuario Demo',
    bio: 'Modo local activo.',
    role: 'Administrador'
  });
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const resetForm = () => {
    setFormData({ email: '', password: '', name: '' });
  };

  // --- Lógica de Autenticación ---
  useEffect(() => {
    if (!firebaseData.available) {
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(firebaseData.auth, __initial_auth_token);
        } else {
          // Si no hay token inicial, no forzamos anónimo aquí para dejar que el usuario elija
        }
      } catch (error) {
        console.error("Error en Auth inicial:", error);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(firebaseData.auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) resetForm();
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [firebaseData]);

  // --- Sincronización de Datos ---
  useEffect(() => {
    if (!user || !firebaseData.db || !firebaseData.available) return;

    const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    }, (err) => console.warn("Firestore inactivo o sin permisos:", err));

    return () => unsubscribe();
  }, [user, firebaseData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!firebaseData.available) {
      setTimeout(() => {
        setUser({ uid: 'demo-user', email: formData.email });
        setUserData(prev => ({ ...prev, displayName: formData.name || 'Usuario Demo' }));
        setLoading(false);
        showMessage('success', 'Sesión iniciada (Modo Local)');
      }, 800);
      return;
    }

    try {
      if (!firebaseData.auth.currentUser) {
        await signInAnonymously(firebaseData.auth);
      }
      
      if (authMode === 'register' && firebaseData.auth.currentUser) {
        const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', firebaseData.auth.currentUser.uid, 'profile', 'data');
        await setDoc(userDocRef, {
          displayName: formData.name || 'Nuevo Usuario',
          bio: 'Bienvenido al sistema.',
          role: 'Miembro',
          createdAt: new Date().toISOString()
        });
      }
      showMessage('success', 'Acceso concedido');
    } catch (err) {
      showMessage('error', 'Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    if (!firebaseData.available) {
      setTimeout(() => {
        setIsSaving(false);
        showMessage('success', 'Guardado localmente');
        setShowProfileEditor(false);
      }, 800);
      return;
    }

    try {
      const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
      await setDoc(userDocRef, { ...userData }, { merge: true });
      showMessage('success', 'Perfil actualizado');
      setShowProfileEditor(false);
    } catch (err) {
      showMessage('error', 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (!firebaseData.available) {
      setUser(null);
      resetForm();
      setShowProfileEditor(false);
    } else {
      signOut(firebaseData.auth).then(() => {
        setShowProfileEditor(false);
      });
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Cargando sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!firebaseData.available && (
        <div className="fixed bottom-4 left-4 flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          SIN CONEXIÓN A FIREBASE
        </div>
      )}

      {message.text && (
        <div className={`fixed top-6 right-6 px-6 py-3 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">{message.text}</span>
          </div>
        </div>
      )}

      {!user ? (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-10">
              <div className="flex justify-center mb-6">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-center mb-2">
                {authMode === 'login' ? 'Bienvenido' : 'Nueva Cuenta'}
              </h1>

              <form onSubmit={handleAuth} className="space-y-4 mt-8">
                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="Nombre"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {authMode === 'login' ? 'Entrar' : 'Registrarse'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full mt-6 text-sm text-slate-500 hover:text-blue-600 font-medium"
              >
                {authMode === 'login' ? '¿No tienes cuenta? Crea una' : '¿Ya tienes cuenta? Ingresa'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-xl">
            {!showProfileEditor ? (
              <div className="bg-white rounded-[2.5rem] p-12 shadow-xl text-center border border-slate-100">
                <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-inner">
                  {userData.displayName?.charAt(0)}
                </div>
                <h2 className="text-3xl font-bold mb-2">Hola, {userData.displayName}!</h2>
                <p className="text-slate-500 mb-8">{userData.role}</p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowProfileEditor(true)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <Settings className="w-5 h-5" /> Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" /> Salir
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                <button onClick={() => setShowProfileEditor(false)} className="flex items-center gap-2 text-slate-400 mb-6">
                  <ChevronLeft className="w-5 h-5" /> Volver
                </button>
                <div className="space-y-4">
                  <label className="block font-bold">Nombre de usuario</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl"
                    value={userData.displayName}
                    onChange={(e) => setUserData({...userData, displayName: e.target.value})}
                  />
                  <label className="block font-bold">Rol / Puesto</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl"
                    value={userData.role}
                    onChange={(e) => setUserData({...userData, role: e.target.value})}
                  />
                  <button
                    onClick={saveProfile}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg mt-4"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}