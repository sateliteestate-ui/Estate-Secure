import React, { useState } from 'react';
import { ViewType } from '../types';
import { ShieldAlert } from 'lucide-react';

interface SuperAdminLoginProps {
  setView: (view: ViewType) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ 
  setView, 
  showToast, 
  setLoading, 
  loading 
}) => {
  const [email, setEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Hardcoded check as requested
    if (email.trim().toLowerCase() === 'codegeniushub@gmail.com') {
        setTimeout(() => {
            setView('super-admin-dashboard');
            showToast("Welcome Super Admin", "success");
            setLoading(false);
        }, 1000);
    } else {
        setTimeout(() => {
            showToast("Access Denied: Invalid Email", "error");
            setLoading(false);
        }, 500);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl shadow-2xl mt-10 animate-fade-in text-white">
      <div className="flex justify-center mb-6">
          <div className="bg-slate-800 p-4 rounded-full border border-slate-700">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-center">Super Admin Portal</h2>
      <p className="text-slate-400 text-center mb-8 text-sm">Restricted Access. Authorization Required.</p>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Authorized Email</label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-white placeholder-slate-500"
            placeholder="admin@system.com"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 shadow-lg shadow-red-900/50">
          {loading ? 'Authenticating...' : 'Access System'}
        </button>
      </form>
      
      <button onClick={() => setView('admin-login')} className="mt-6 w-full text-slate-500 text-sm hover:text-slate-300 transition">Return to Standard Admin</button>
    </div>
  );
};