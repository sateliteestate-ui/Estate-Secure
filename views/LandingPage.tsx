import React from 'react';
import { Building2, ShieldCheck, User, LogIn, ScanLine, Ticket } from 'lucide-react';
import { ViewType } from '../types';

interface LandingPageProps {
  setView: (view: ViewType) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setView }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="bg-indigo-100 p-4 rounded-full inline-block">
          <Building2 size={64} className="text-indigo-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800">EstateSecure</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Secure management, seamless registration, and digital identification for modern living communities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
        {/* Admin Card */}
        <button 
          onClick={() => setView('admin-login')}
          className="group relative p-8 bg-white border-2 border-gray-100 hover:border-indigo-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 text-left h-full"
        >
          <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Estate Admin</h3>
          <p className="text-gray-500 text-sm">Register your estate, scan IDs, and manage residents.</p>
        </button>

        {/* Resident Card */}
        <div className="relative p-8 bg-white border-2 border-gray-100 hover:border-emerald-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 text-left flex flex-col justify-between h-full">
           <div>
              <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                <User size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Resident</h3>
              <p className="text-gray-500 text-sm mb-6">Access your digital ID, view levy status, and manage payments.</p>
           </div>
           
           <div className="flex gap-3 mt-auto">
             <button 
               onClick={() => setView('user-register')}
               className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
             >
               Register
             </button>
             <button 
               onClick={() => setView('user-login')}
               className="flex-1 border border-emerald-600 text-emerald-600 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition flex items-center justify-center gap-1"
             >
               <LogIn size={14} /> Login
             </button>
           </div>
        </div>

        {/* Gate Pass Card */}
        <button 
          onClick={() => setView('gate-pass')}
          className="group relative p-8 bg-white border-2 border-gray-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 text-left h-full"
        >
          <div className="absolute top-4 right-4 bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Ticket size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Gate Pass</h3>
          <p className="text-gray-500 text-sm">Scan Approved Resident Payment IDs or Visitor Codes.</p>
        </button>
      </div>

      <div className="w-full max-w-2xl px-4">
        <button 
          onClick={() => setView('security-check')}
          className="w-full p-4 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-900 transition flex items-center justify-center gap-3 shadow-md"
        >
           <ScanLine size={20} />
           <span className="font-semibold">Security Gate Access Control</span>
        </button>
      </div>
    </div>
  );
};