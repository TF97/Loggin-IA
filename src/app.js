import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
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
  ShieldCheck, 
  Loader2, 
  ArrowRight,
  LogOut,
  WifiOff,
  User
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [userData, setUserData] = useState({ displayName: 'Usuario', role: 'Miembro' });

  // Lógica de inicialización compatible con Vercel y Navegadores
  const firebaseData = useMemo(() => {
    const services = { auth: null, db: null, available: false, appId: 'default-app' };
    
    try {
      // Obtenemos variables de forma ultra segura
      const getV = (k) => {
        if (typeof process !== 'undefined' && process.env) {
          return process.env[k] || process.env[`REACT_APP_${k}`] || "";
        }
        return "";
      };

      let config = {
        apiKey: getV("FIREBASE_API_KEY"),
        authDomain: getV("FIREBASE_AUTH_DOMAIN"),
        projectId: getV("FIREBASE_PROJECT_ID"),
        storageBucket: getV("FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: getV("FIREBASE_MESSAGING_SENDER_ID"),
        appId: getV("FIREBASE_APP_ID")
      };

      // Fallback para el simulador de este chat
      if (!config.apiKey && typeof __firebase_config !== 'undefined') {
        config = JSON.parse(__firebase_config);
      }

      const activeAppId = getV("CUSTOM_APP_ID") || 
                         (typeof __app_id !== 'undefined' ? __app_id : 'prod-app');

      if (config && config.apiKey) {
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        services.auth = getAuth(app);
        services.db = getFirestore(app);
        services.available = true;
        services.appId = activeAppId;
      }
    } catch (e) {
      console.error("Fallo crítico en inicio:", e);
    }
    return services;
  }, []);

  useEffect(() => {
    // Si no hay Firebase, mostramos la UI de inmediato (Modo Demo)
    if (!firebaseData.available) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseData.auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [firebaseData]);

  // Sincronización con la base de datos
  useEffect(() => {
    if (!user || !firebaseData.db || !firebaseData.available) return;

    const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    }, (err) => console.log("DB desconectada"));

    return () => unsubscribe();
  }, [user, firebaseData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!firebaseData.available) {
      setUser({ uid: 'local-user', email: formData.email });
      setUserData({ displayName: formData.name || 'Usuario Demo', role: 'Modo Offline' });
      return;
    }

    setLoading(true);
    try {
      if (!firebaseData.auth.currentUser) await signInAnonymously(firebaseData.auth);
      
      if (authMode === 'register') {
        const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', firebaseData.auth.currentUser.uid, 'profile', 'data');
        await setDoc(userDocRef, {
          displayName: formData.name || 'Usuario',
          role: 'Miembro'
        });
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center font-sans">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-700">Cargando aplicación...</h2>
        <p className="text-slate-400 text-xs mt-2">Si esto tarda mucho, revisa tus credenciales de Firebase.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Indicador de Red para diagnóstico */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 text-[10px] font-bold">
          <div className={`w-2 h-2 rounded-full ${firebaseData.available ? 'bg-green-500' : 'bg-amber-500'}`} />
          {firebaseData.available ? 'CONECTADO A FIREBASE' : 'MODO SIN CONEXIÓN'}
        </div>
      </div>

      {!user ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 border border-slate-100">
            <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-center mb-8 uppercase tracking-tight">Acceso al Sistema</h1>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Tu nombre"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95">
                {authMode === 'login' ? 'Ingresar' : 'Registrarse'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
            
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-xs font-bold text-slate-400 hover:text-blue-600 uppercase">
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Login'}
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl font-black mb-6">
              {userData.displayName?.charAt(0)}
            </div>
            <h2 className="text-3xl font-black mb-2 uppercase">Bienvenido</h2>
            <p className="text-slate-500 font-bold mb-10 tracking-widest">{userData.displayName} — {userData.role}</p>
            <button
              onClick={() => {
                if (firebaseData.available) signOut(firebaseData.auth);
                setUser(null);
              }}
              className="px-10 py-4 bg-red-50 text-red-600 font-black rounded-2xl flex items-center justify-center gap-2 mx-auto hover:bg-red-100"
            >
              <LogOut className="w-5 h-5" /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}