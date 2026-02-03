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
  WifiOff
} from 'lucide-react';

// Componente Principal
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [userData, setUserData] = useState({ displayName: 'Usuario', role: 'Miembro' });

  const firebaseData = useMemo(() => {
    const services = { auth: null, db: null, available: false, appId: 'default-app' };
    
    try {
      const getEnv = (key) => {
        if (typeof process !== 'undefined' && process.env) {
          return process.env[`REACT_APP_${key}`] || process.env[key] || "";
        }
        return "";
      };

      const config = {
        apiKey: getEnv("FIREBASE_API_KEY"),
        authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
        projectId: getEnv("FIREBASE_PROJECT_ID"),
        storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
        appId: getEnv("FIREBASE_APP_ID")
      };

      if (config.apiKey) {
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        services.auth = getAuth(app);
        services.db = getFirestore(app);
        services.available = true;
        services.appId = getEnv("CUSTOM_APP_ID") || "prod-app";
      }
    } catch (e) {
      console.error("Firebase init error:", e);
    }
    return services;
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    if (!user || !firebaseData.db || !firebaseData.available) return;
    const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    }, () => {});
    return () => unsubscribe();
  }, [user, firebaseData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!firebaseData.available) {
      setUser({ uid: 'demo', email: formData.email });
      setUserData({ displayName: formData.name || 'Invitado', role: 'Local' });
      return;
    }
    setLoading(true);
    try {
      if (!firebaseData.auth.currentUser) await signInAnonymously(firebaseData.auth);
      if (authMode === 'register') {
        const userDocRef = doc(firebaseData.db, 'artifacts', firebaseData.appId, 'users', firebaseData.auth.currentUser.uid, 'profile', 'data');
        await setDoc(userDocRef, { displayName: formData.name || 'Usuario', role: 'Miembro' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!user ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center mb-6">Acceso</h1>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Nombre"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                {authMode === 'login' ? 'Entrar' : 'Registrarse'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-sm text-slate-400 font-medium">
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Login'}
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm bg-white rounded-3xl p-10 shadow-xl border border-slate-100">
            <div className="w-20 h-20 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold mb-6">
              {userData.displayName?.charAt(0)}
            </div>
            <h2 className="text-2xl font-bold mb-1">{userData.displayName}</h2>
            <p className="text-slate-500 mb-8">{userData.role}</p>
            <button
              onClick={() => { if (firebaseData.available) signOut(firebaseData.auth); setUser(null); }}
              className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      )}
      {!firebaseData.available && (
        <div className="fixed bottom-4 right-4 bg-amber-50 text-amber-600 px-4 py-2 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-2">
          <WifiOff className="w-3 h-3" /> MODO DEMO (SIN FIREBASE)
        </div>
      )}
    </div>
  );
}