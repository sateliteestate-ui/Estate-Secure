
import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Estate, ViewType } from '../types';
import { Lock, ShieldCheck } from 'lucide-react';

interface AdminLoginProps {
  setView: (view: ViewType) => void;
  setEstateData: (data: Estate) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ 
  setView, 
  setEstateData, 
  showToast, 
  setLoading, 
  loading 
}) => {
  const [estateIdInput, setEstateIdInput] = useState('');
  const [adminPasscodeInput, setAdminPasscodeInput] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estateIdInput) return showToast("Please enter Estate ID", "error");
    if (!adminPasscodeInput) return showToast("Please enter Admin Passcode", "error");
    
    setLoading(true);

    try {
      // Query root 'estates' collection using modular syntax
      const q = query(collection(db, 'estates'), where('estateId', '==', estateIdInput.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        showToast("Invalid Estate ID", "error");
      } else {
        const docData = snapshot.docs[0].data();
        const estate = { id: snapshot.docs[0].id, ...docData } as Estate;
        
        // Check Passcode
        if (estate.adminPasscode && estate.adminPasscode !== adminPasscodeInput) {
            showToast("Invalid Admin Passcode", "error");
            setLoading(false);
            return;
        }

        if (!estate.approved) {
           showToast("Estate awaiting approval.", "error");
        } else {
          setEstateData(estate);
          setView('admin-dashboard');
          showToast("Welcome back, Admin!", "success");
        }
      }
    } catch (err: any) {
      showToast("Login failed: " + err.message, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg mt-10 animate-fade-in relative">
      <div className="flex justify-center mb-4">
        <div className="bg-indigo-100 p-3 rounded-full">
            <ShieldCheck size={32} className="text-indigo-600"/>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Admin Access</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estate ID</label>
          <input 
            type="text" 
            value={estateIdInput}
            onChange={(e) => setEstateIdInput(e.target.value.toUpperCase())}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-widest font-mono"
            placeholder="Ex: AB12CD"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Passcode</label>
          <input 
            type="password" 
            value={adminPasscodeInput}
            onChange={(e) => setAdminPasscodeInput(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Enter security code"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
          {loading ? 'Verifying...' : 'Access Dashboard'}
        </button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">New Estate?</p>
        <button onClick={() => setView('admin-register')} className="text-indigo-600 font-medium hover:underline">Register New Estate</button>
      </div>
      <button onClick={() => setView('landing')} className="mt-4 w-full text-center text-gray-400 text-sm hover:text-gray-600 block">Back to Home</button>
      
      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
         <button 
           onClick={() => setView('super-admin-login')} 
           className="text-xs text-gray-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition"
         >
           <Lock size={12} /> Super Admin Access
         </button>
      </div>
    </div>
  );
};
