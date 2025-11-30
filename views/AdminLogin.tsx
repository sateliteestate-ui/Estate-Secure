import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Estate, ViewType } from '../types';
import { Lock } from 'lucide-react';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estateIdInput) return showToast("Please enter Estate ID", "error");
    
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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Access</h2>
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
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
          {loading ? 'Verifying...' : 'Access Dashboard'}
        </button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">New Estate?</p>
        <button onClick={() => setView('admin-register')} className="text-indigo-600 font-medium hover:underline">Register New Estate</button>
      </div>
      <button onClick={() => setView('landing')} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600">Back to Home</button>
      
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