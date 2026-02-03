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
  WifiOff
} from 'lucide-react';

// Función segura para obtener variables de entorno o globales
const getEnvVar = (name) => {
  try {
    // Intenta obtener de process.env (Vercel/Node)
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch (e) {}
  return "";
};

// --- CONFIGURACIÓN PARA VERCEL/PRODUCCIÓN ---
const firebaseConfig = {
  apiKey: getEnvVar("REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("REACT_APP_FIREBASE_APP_ID")
};

const CUSTOM_APP_ID = getEnvVar("REACT_APP_CUSTOM_APP_ID") || 'mi-app-produccion';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  const firebaseData = useMemo(() => {
    let services = { auth: null, db: null, available: false, appId: 'default-app' };
    try {
      // Verificamos si tenemos configuración de producción o del entorno local (Canvas)
      let config = null;
      if (firebaseConfig.apiKey) {
        config = firebaseConfig;
      } else if (typeof __firebase_config !== 'undefined') {
        config = JSON.parse(__firebase_config);
      }

      const activeAppId = typeof __app_id !== 'undefined' ? __app_id : CUSTOM_APP_ID;

      if (config && config.apiKey) {
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        services.auth = getAuth(app);
        services.db = getFirestore(app);
        services.available = true;
        services.appId = activeAppId;
      }
    } catch (e) {
      console.error("Error inicializando Firebase:", e);
    }
    return services;
  }, []);

  const [userData, setUserData] = useState({
    displayName: 'Usuario',
    bio: '',
    role: 'Miembro'
  });
  
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const resetForm = () => setFormData({ email: '', password: '', name: '' });

  useEffect(() => {
    if (!firebaseData.available) {
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(firebaseData.auth, __initial_auth_token);
        }
      } catch (error) {
        console.error("Auth error:", error);
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

  useEffect(() => {
    if (!user || !firebaseData.db || !firebaseData.available) return;

    const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    }, (err) => console.warn("Firestore listener error:", err));

    return () => unsubscribe();
  }, [user, firebaseData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!firebaseData.available) {
      setTimeout(() => {
        setUser({ uid: 'demo-user', email: formData.email });
        setUserData(prev => ({ ...prev, displayName: formData.name || 'Invitado Demo' }));
        setLoading(false);
        showMessage('success', 'Modo Demo Activo (Local)');
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
          bio: '',
          role: 'Miembro',
          createdAt: new Date().toISOString()
        });
      }
      showMessage('success', 'Sesión iniciada');
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
        showMessage('success', 'Guardado local');
        setShowProfileEditor(false);
      }, 800);
      return;
    }

    try {
      const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
      await setDoc(userDocRef, { ...userData }, { merge: true });
      showMessage('success', 'Perfil guardado en la nube');
      setShowProfileEditor(false);
    } catch (err) {
      showMessage('error', 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Iniciando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!firebaseData.available && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-xs font-bold border border-amber-200 z-50 shadow-sm">
          <WifiOff className="w-4 h-4" />
          MODO OFFLINE / CONFIGURA VERCEL
        </div>
      )}

      {message.text && (
        <div className={`fixed top-20 right-6 px-6 py-3 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      {!user ? (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-10">
              <div className="flex justify-center mb-8">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-xl">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">
                {authMode === 'login' ? 'Bienvenido' : 'Registro'}
              </h1>
              <p className="text-center text-slate-500 mb-8">Accede al panel de control</p>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full mt-8 text-sm text-slate-400 hover:text-blue-600 font-medium transition-colors"
              >
                {authMode === 'login' ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya eres miembro? Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            {!showProfileEditor ? (
              <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl font-bold mb-8 shadow-xl">
                  {userData.displayName?.charAt(0)}
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">¡Hola, {userData.displayName}!</h2>
                <p className="text-lg text-slate-500 mb-10">
                   {userData.role}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setShowProfileEditor(true)}
                    className="px-10 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Settings className="w-5 h-5" /> Ajustes
                  </button>
                  <button
                    onClick={() => signOut(firebaseData.auth)}
                    className="px-10 py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                  >
                    <LogOut className="w-5 h-5" /> Salir
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
                <button onClick={() => setShowProfileEditor(false)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 font-bold">
                  <ChevronLeft className="w-5 h-5" /> Volver al inicio
                </button>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Nombre público</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={userData.displayName}
                      onChange={(e) => setUserData({...userData, displayName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Especialidad / Rol</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={userData.role}
                      onChange={(e) => setUserData({...userData, role: e.target.value})}
                    />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    Actualizar Perfil
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