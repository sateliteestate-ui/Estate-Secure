
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Estate, ViewType } from '../types';
import { Lock } from 'lucide-react';

interface AdminRegisterProps {
  setView: (view: ViewType) => void;
  setEstateData: (data: Estate) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
  user: User;
}

export const AdminRegister: React.FC<AdminRegisterProps> = ({ 
  setView, 
  setEstateData, 
  showToast, 
  setLoading, 
  loading,
  user
}) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    adminName: '', 
    email: '', 
    phone: '',
    adminPasscode: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  const generateEstateId = () => {
    // Generate a unique 6-character ID
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const newEstateId = generateEstateId();
    
    // Store in root 'estates' collection
    const newEstate = {
      ...formData,
      estateId: newEstateId,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      approved: false // Default to false, pending Super Admin approval
    };

    try {
      await addDoc(collection(db, 'estates'), newEstate);
      
      setEstateData(newEstate as unknown as Estate);
      
      setView('admin-dashboard'); 
      showToast(`Estate Registered! ID: ${newEstateId}. Pending Approval.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast("Registration failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg mt-10 animate-fade-in">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Register Estate</h2>
      <p className="text-gray-500 mb-6 text-sm">Create a secure space for your residents.</p>
      
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estate Name</label>
          <input required type="text" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input required type="text" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
          <input required type="text" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, adminName: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
              <input required type="email" className="w-full p-3 border rounded-lg" 
                onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Phone</label>
              <input required type="tel" className="w-full p-3 border rounded-lg" 
                onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Lock size={14} className="text-indigo-600"/> Create Admin Passcode
            </label>
            <input 
              required 
              type="password" 
              placeholder="Enter a secure login code"
              className="w-full p-3 border rounded-lg bg-indigo-50 border-indigo-100" 
              onChange={e => setFormData({...formData, adminPasscode: e.target.value})} 
            />
        </div>

        <div className="pt-4 border-t border-gray-100">
           <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Bank Account Details</h3>
           <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input type="text" className="w-full p-3 border rounded-lg" 
                placeholder="e.g. Sunrise Estate Association"
                onChange={e => setFormData({...formData, accountName: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input type="text" className="w-full p-3 border rounded-lg" 
                    onChange={e => setFormData({...formData, bankName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input type="text" className="w-full p-3 border rounded-lg" 
                    onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                </div>
           </div>
        </div>
        
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
          {loading ? 'Registering...' : 'Register Estate'}
        </button>
      </form>
      <button onClick={() => setView('admin-login')} className="mt-4 w-full text-center text-sm text-indigo-600 hover:underline">Already have an ID?</button>
    </div>
  );
};
