
import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Resident, ViewType } from '../types';
import { Camera, Upload } from 'lucide-react';

interface UserRegisterProps {
  setView: (view: ViewType) => void;
  setResidentData: (data: Resident) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
  user: User;
}

export const UserRegister: React.FC<UserRegisterProps> = ({ 
  setView, 
  setResidentData, 
  showToast, 
  setLoading, 
  loading,
  user
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    estateId: '',
    address: '',
    annualLevy: ''
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic size check (limit to ~500KB for base64 storage)
      if (file.size > 500000) {
        showToast("Image too large. Please use an image under 500KB.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Verify Estate Exists in root 'estates' collection using modular syntax
      const q = query(collection(db, 'estates'), where('estateId', '==', formData.estateId.trim().toUpperCase()));
      const estateSnap = await getDocs(q);

      if (estateSnap.empty) {
        showToast("Estate ID not found. Ask your admin.", "error");
        setLoading(false);
        return;
      }

      const estateInfo = estateSnap.docs[0].data();

      // Check if Estate is Approved
      if (!estateInfo.approved) {
        showToast("This Estate has not been approved by the Super Admin yet. Registration unavailable.", "error");
        setLoading(false);
        return;
      }

      // 2. Generate User ID
      const userId = 'USR-' + Math.random().toString(36).substring(2, 7).toUpperCase();

      // 3. Save Resident to root 'residents' collection
      const newResident = {
        ...formData,
        estateId: formData.estateId.trim().toUpperCase(),
        estateName: estateInfo.name,
        userId: userId,
        uid: user.uid,
        registeredAt: serverTimestamp(),
        verified: false, // Default to false
        active: true, // Default to true (Active Resident)
        photoUrl: photoPreview || '' // Store Base64 string
      };

      const docRef = await addDoc(collection(db, 'residents'), newResident);
      
      const residentWithId = { id: docRef.id, ...newResident };

      setResidentData(residentWithId as unknown as Resident);
      setView('user-id-card');
      showToast("Registration Successful!", "success");

    } catch (err: any) {
      console.error(err);
      showToast("Registration failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-lg mt-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Resident Registration</h2>
      <p className="text-gray-500 mb-6 text-sm">Join your estate community to get your digital ID.</p>

      <form onSubmit={handleRegister} className="space-y-4">
        
        {/* Photo Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
               {photoPreview ? (
                 <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                 <Camera size={40} className="text-gray-300" />
               )}
            </div>
            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition shadow-sm">
              <Upload size={16} />
              <input 
                id="photo-upload" 
                type="file" 
                accept="image/*" 
                capture="user"
                className="hidden" 
                onChange={handlePhotoChange}
              />
            </label>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mb-4">(Optional) Upload a profile picture</p>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estate ID</label>
              <input required placeholder="From Admin" type="text" className="w-full p-3 border border-indigo-200 bg-indigo-50 rounded-lg uppercase" 
                onChange={e => setFormData({...formData, estateId: e.target.value.toUpperCase()})} />
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Annual Levy (₦)</label>
              <input required placeholder="Amount" type="number" className="w-full p-3 border rounded-lg" 
                onChange={e => setFormData({...formData, annualLevy: e.target.value})} />
           </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input required placeholder="John Doe" type="text" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, fullName: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input required placeholder="+1 234..." type="tel" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">House Address</label>
          <input required placeholder="Block B, Flat 4..." type="text" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition mt-4">
          {loading ? 'Processing...' : 'Generate ID Card'}
        </button>
      </form>
      <button onClick={() => setView('landing')} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600">Cancel</button>
    </div>
  );
};