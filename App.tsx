import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Toast } from './components/Toast';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LandingPage } from './views/LandingPage';
import { AdminLogin } from './views/AdminLogin';
import { AdminRegister } from './views/AdminRegister';
import { AdminDashboard } from './views/AdminDashboard';
import { UserRegister } from './views/UserRegister';
import { IDCardView } from './views/IDCardView';
import { UserLogin } from './views/UserLogin';
import { UserDashboard } from './views/UserDashboard';
import { SecurityCheck } from './views/SecurityCheck'; 
import { GatePass } from './views/GatePass';
import { SuperAdminLogin } from './views/SuperAdminLogin';
import { SuperAdminDashboard } from './views/SuperAdminDashboard';
import { ViewType, User, Estate, Resident, ToastState } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<ViewType>('landing'); 
  const [toast, setToast] = useState<ToastState>({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Data States
  const [estateData, setEstateData] = useState<Estate | null>(null); 
  const [residentData, setResidentData] = useState<Resident | null>(null); 

  useEffect(() => {
    // 1. Set up the listener for auth state changes using modular syntax
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("Authenticated as:", firebaseUser.uid);
        setUser({ uid: firebaseUser.uid });
        setAuthLoading(false);
      }
    });

    // 2. logic to trigger sign-in if not already authenticated
    const initAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous Auth Failed:", error);
          setUser({ uid: 'guest-' + Math.random().toString(36).substring(7) });
          setAuthLoading(false);
        }
      }
    };

    initAuth();
    
    // 3. Check for URL Parameters for Auto-Login (QR Scan)
    const checkDeepLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const residentIdParam = params.get('residentId');

      if (residentIdParam) {
        setLoading(true);
        try {
          // Attempt to find the user in the root 'residents' DB using modular syntax
          const q = query(collection(db, 'residents'), where('userId', '==', residentIdParam.trim().toUpperCase()));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            const resident = { id: snapshot.docs[0].id, ...docData } as Resident;
            setResidentData(resident);
            setView('user-dashboard');
            // Clean the URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast("Auto-login successful!", "success");
          } else {
             showToast("Invalid QR Code Link", "error");
          }
        } catch (err) {
          console.error("Auto-login error", err);
        } finally {
          setLoading(false);
        }
      }
    };

    checkDeepLink();

    // 4. Offline/Online Status Listeners
    const handleOnline = () => showToast("You are back online. Syncing data...", "success");
    const handleOffline = () => showToast("You are offline. App working in offline mode.", "error");

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-indigo-100">
      
      {/* Global Toast */}
      {toast.message && (
        <Toast 
          message={toast.message} 
          type={toast.type as 'success' | 'error'} 
          onClose={() => setToast({message:'', type:''})} 
        />
      )}

      {/* Navbar */}
      <nav className="bg-white shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => setView('landing')}>
            <Building2 className="text-indigo-600" />
            <span className="font-bold text-lg text-gray-800">EstateSecure</span>
          </div>
          {user && view !== 'landing' && (
             <div className="text-xs text-gray-400">
               {user.uid.startsWith('guest') ? 'Guest Mode' : 'Secure Session'}
             </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && view !== 'user-dashboard' && ( 
           <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
             <LoadingSpinner />
           </div>
        )}

        {view === 'landing' && (
          <LandingPage setView={setView} />
        )}

        {view === 'security-check' && (
          <SecurityCheck 
            setView={setView}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        )}
        
        {view === 'gate-pass' && (
          <GatePass 
            setView={setView}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {view === 'admin-login' && (
          <AdminLogin 
            setView={setView} 
            setEstateData={setEstateData} 
            showToast={showToast} 
            loading={loading}
            setLoading={setLoading}
          />
        )}
        
        {view === 'admin-register' && user && (
          <AdminRegister 
            setView={setView} 
            setEstateData={setEstateData} 
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
            user={user}
          />
        )}
        
        {view === 'admin-dashboard' && estateData && (
          <AdminDashboard 
            estateData={estateData}
            setEstateData={setEstateData}
            setView={setView}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        )}
        
        {view === 'user-register' && user && (
          <UserRegister 
            setView={setView}
            setResidentData={setResidentData}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
            user={user}
          />
        )}
        
        {view === 'user-id-card' && (
          <IDCardView 
            residentData={residentData}
            setView={setView}
          />
        )}

        {view === 'user-login' && (
          <UserLogin
            setView={setView}
            setResidentData={setResidentData}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {view === 'user-dashboard' && residentData && (
          <UserDashboard
            residentData={residentData}
            setResidentData={setResidentData}
            setView={setView}
            showToast={showToast}
          />
        )}

        {view === 'super-admin-login' && (
          <SuperAdminLogin 
            setView={setView}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {view === 'super-admin-dashboard' && (
          <SuperAdminDashboard 
            setView={setView}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}