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
  AlertTriangle,
  User,
  RefreshCw
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [initStatus, setInitStatus] = useState("Iniciando...");

  // Inicialización ultra-defensiva
  const firebaseData = useMemo(() => {
    const services = { auth: null, db: null, available: false, appId: 'demo-app' };
    
    try {
      let config = null;

      // 1. Verificación manual de variables globales para evitar errores de referencia
      const globalProcess = typeof process !== 'undefined' ? process : null;
      const env = globalProcess?.env || {};
      
      const apiKey = env.REACT_APP_FIREBASE_API_KEY || env.FIREBASE_API_KEY;

      if (apiKey) {
        config = {
          apiKey: apiKey,
          authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN,
          projectId: env.REACT_APP_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID,
          storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID,
          appId: env.REACT_APP_FIREBASE_APP_ID || env.FIREBASE_APP_ID
        };
      } else if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        config = JSON.parse(__firebase_config);
      }

      const activeAppId = env.REACT_APP_CUSTOM_APP_ID || 
                         (typeof __app_id !== 'undefined' ? __app_id : 'default-app');

      if (config && config.apiKey) {
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        services.auth = getAuth(app);
        services.db = getFirestore(app);
        services.available = true;
        services.appId = activeAppId;
      }
    } catch (e) {
      console.error("Init failure:", e);
    }
    return services;
  }, []);

  const [userData, setUserData] = useState({ displayName: 'Usuario', role: 'Miembro' });
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Timeout de seguridad para forzar la aparición de la UI
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      setInitStatus("Completado");
    }, 1500);

    if (!firebaseData.available) return () => clearTimeout(safetyTimeout);

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
      clearTimeout(safetyTimeout);
    });
    
    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [firebaseData]);

  useEffect(() => {
    if (!user || !firebaseData.db || !firebaseData.available) return;

    const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    }, (err) => console.log("Waiting for data..."));

    return () => unsubscribe();
  }, [user, firebaseData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!firebaseData.available) {
      setUser({ uid: 'demo-local', email: formData.email });
      setUserData({ displayName: formData.name || 'Invitado', role: 'Modo Local' });
      return;
    }

    setLoading(true);
    try {
      if (!firebaseData.auth.currentUser) await signInAnonymously(firebaseData.auth);
      
      if (authMode === 'register') {
        const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', firebaseData.auth.currentUser.uid, 'profile', 'data');
        await setDoc(userDocRef, {
          displayName: formData.name || 'Usuario',
          role: 'Miembro',
          createdAt: new Date().toISOString()
        });
      }
      setMessage({ type: 'success', text: '¡Sesión Iniciada!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Cargando aplicación</h2>
        <p className="text-slate-400 text-sm">{initStatus}</p>
        <div className="mt-12 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-w-xs text-center text-[10px] text-slate-400">
          Si la pantalla se queda cargando, asegúrate de haber configurado las variables REACT_APP_ en Vercel.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Notificaciones */}
      {message.text && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce ${
          message.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'
        }`}>
          <span className="text-xs font-bold uppercase">{message.text}</span>
        </div>
      )}

      {/* Indicador de Conexión */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className={`w-2 h-2 rounded-full ${firebaseData.available ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {firebaseData.available ? 'Nube Conectada' : 'Modo Offline'}
          </span>
        </div>
      </div>

      {!user ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-blue-200">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl font-black text-center mb-2 tracking-tight">
              {authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
            </h1>
            <p className="text-center text-slate-400 text-sm mb-10">Gestiona tu identidad digital</p>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              )}
              <input
                type="email"
                placeholder="Email corporativo"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-50">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
              >
                {authMode === 'login' ? '¿Eres nuevo aquí? Crea una cuenta' : '¿Ya tienes cuenta? Ingresa'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            <div className="w-28 h-28 bg-slate-900 rounded-[2rem] mx-auto flex items-center justify-center text-white text-5xl font-black mb-8 shadow-2xl">
              {userData.displayName?.charAt(0)}
            </div>
            
            <h2 className="text-4xl font-black text-slate-900 mb-2">
              Hola, {userData.displayName}!
            </h2>
            <p className="text-slate-400 font-bold mb-12 tracking-widest uppercase text-xs">
              {userData.role}
            </p>

            <button
              onClick={() => {
                if (firebaseData.available) signOut(firebaseData.auth);
                setUser(null);
                window.location.reload(); // Recarga para asegurar limpieza de estado
              }}
              className="px-12 py-5 bg-red-50 text-red-600 font-black rounded-2xl flex items-center justify-center gap-3 mx-auto hover:bg-red-100 transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}