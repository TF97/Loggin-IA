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
  Lock, 
  LogOut, 
  Save, 
  ShieldCheck, 
  Loader2, 
  ArrowRight,
  Settings,
  ChevronLeft,
  WifiOff,
  AlertTriangle
} from 'lucide-react';

// Función para obtener variables de entorno con fallback seguro
const getSafeEnv = (key) => {
  try {
    // En Vercel/CRA deben empezar con REACT_APP_
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`REACT_APP_${key}`] || "";
    }
  } catch (e) {}
  return "";
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [configError, setConfigError] = useState(null);
  
  const firebaseData = useMemo(() => {
    let services = { auth: null, db: null, available: false, appId: 'default-app' };
    
    try {
      // 1. Intentar obtener configuración de producción (Vercel)
      let config = {
        apiKey: getSafeEnv("FIREBASE_API_KEY"),
        authDomain: getSafeEnv("FIREBASE_AUTH_DOMAIN"),
        projectId: getSafeEnv("FIREBASE_PROJECT_ID"),
        storageBucket: getSafeEnv("FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: getSafeEnv("FIREBASE_MESSAGING_SENDER_ID"),
        appId: getSafeEnv("FIREBASE_APP_ID")
      };

      // 2. Si no hay producción, intentar configuración local de este chat
      if (!config.apiKey && typeof __firebase_config !== 'undefined') {
        config = JSON.parse(__firebase_config);
      }

      // 3. Obtener App ID
      const activeAppId = getSafeEnv("CUSTOM_APP_ID") || 
                         (typeof __app_id !== 'undefined' ? __app_id : 'mi-app-produccion');

      if (config && config.apiKey) {
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        services.auth = getAuth(app);
        services.db = getFirestore(app);
        services.available = true;
        services.appId = activeAppId;
      } else {
        // Solo lanzamos error si no estamos en el simulador local
        if (typeof __firebase_config === 'undefined') {
          console.warn("Firebase no configurado. Verifica tus variables de entorno en Vercel.");
        }
      }
    } catch (e) {
      console.error("Firebase Init Error:", e);
      setConfigError(e.message);
    }
    return services;
  }, []);

  const [userData, setUserData] = useState({
    displayName: 'Usuario',
    role: 'Miembro'
  });
  
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!firebaseData.available) {
      setLoading(false);
      return;
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
      // Modo DEMO si no hay Firebase (Útil para ver que el código funciona en Vercel antes de conectar DB)
      setTimeout(() => {
        setUser({ uid: 'demo-user', email: formData.email });
        setUserData({ displayName: formData.name || 'Usuario Demo', role: 'Modo Vista Previa' });
        setLoading(false);
        showMessage('success', 'Sesión iniciada (Modo Demo sin Firebase)');
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
          role: 'Miembro',
          createdAt: new Date().toISOString()
        });
      }
      showMessage('success', '¡Conectado exitosamente!');
    } catch (err) {
      showMessage('error', 'Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Cargando sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Indicador de Estado de Conexión */}
      <div className="fixed bottom-4 right-4 z-50">
        {!firebaseData.available ? (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-2xl text-xs font-bold border border-amber-200 flex items-center gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4" /> MODO DEMO (SIN FIREBASE)
          </div>
        ) : (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-2xl text-xs font-bold border border-green-200 flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> CLOUD SYNC ACTIVO
          </div>
        )}
      </div>

      {message.text && (
        <div className={`fixed top-6 right-6 px-6 py-3 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 ${
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
                {authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
              </h1>
              <p className="text-center text-slate-500 mb-8">Acceso seguro al sistema</p>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
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
                  {authMode === 'login' ? 'Entrar ahora' : 'Registrarme'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full mt-8 text-sm text-slate-400 hover:text-blue-600 font-medium transition-colors"
              >
                {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl font-bold mb-8 shadow-xl">
              {userData.displayName?.charAt(0)}
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">¡Bienvenido!</h2>
            <p className="text-lg text-slate-500 mb-10">
              Sesión iniciada como <span className="font-bold text-slate-800">{userData.displayName}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => signOut(firebaseData.auth || {}).catch(() => setUser(null))}
                className="px-12 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
              >
                <LogOut className="w-5 h-5" /> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}