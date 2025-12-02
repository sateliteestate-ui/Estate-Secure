
import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Resident, ViewType, Street } from '../types';
import { Camera, Upload, CheckCircle } from 'lucide-react';

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
    annualLevy: ''
  });
  
  // Address Split State
  const [houseNumber, setHouseNumber] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('');

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Verification & Street State
  const [estateVerified, setEstateVerified] = useState(false);
  const [estateName, setEstateName] = useState('');
  const [availableStreets, setAvailableStreets] = useState<Street[]>([]);

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

  const handleVerifyEstate = async () => {
      if (!formData.estateId) return;
      setLoading(true);
      try {
          const q = query(collection(db, 'estates'), where('estateId', '==', formData.estateId.trim().toUpperCase()));
          const estateSnap = await getDocs(q);

          if (estateSnap.empty) {
            showToast("Estate ID not found. Ask your admin.", "error");
            setEstateVerified(false);
            setEstateName('');
            setAvailableStreets([]);
          } else {
            const estateInfo = estateSnap.docs[0].data();
            if (!estateInfo.approved) {
                showToast("This Estate is pending Super Admin approval.", "error");
                setEstateVerified(false);
            } else {
                setEstateName(estateInfo.name);
                setEstateVerified(true);
                showToast("Estate Verified!", "success");
                
                // Fetch Streets
                const qStreets = query(collection(db, 'estate_streets'), where('estateId', '==', formData.estateId.trim().toUpperCase()));
                const streetsSnap = await getDocs(qStreets);
                const streets = streetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Street));
                setAvailableStreets(streets);
            }
          }
      } catch (err) {
          showToast("Error verifying estate", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estateVerified) {
        showToast("Please verify Estate ID first", "error");
        return;
    }
    setLoading(true);

    try {
      // 2. Generate User ID
      const userId = 'USR-' + Math.random().toString(36).substring(2, 7).toUpperCase();

      // Combine Address
      const fullAddress = `${houseNumber}, ${selectedStreet}`;

      // 3. Save Resident to root 'residents' collection
      const newResident = {
        ...formData,
        estateId: formData.estateId.trim().toUpperCase(),
        estateName: estateName,
        userId: userId,
        uid: user.uid,
        registeredAt: serverTimestamp(),
        verified: false, // Default to false
        active: true, // Default to true (Active Resident)
        photoUrl: photoPreview || '', // Store Base64 string
        address: fullAddress
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

        <div className="grid grid-cols-2 gap-4 items-end">
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estate ID</label>
              <input 
                 required 
                 placeholder="From Admin" 
                 type="text" 
                 className="w-full p-3 border border-indigo-200 bg-indigo-50 rounded-lg uppercase" 
                 onChange={e => setFormData({...formData, estateId: e.target.value.toUpperCase()})}
                 onBlur={handleVerifyEstate} 
              />
           </div>
           <button type="button" onClick={handleVerifyEstate} className="bg-indigo-600 text-white p-3 rounded-lg font-bold mb-[1px]">Verify</button>
        </div>

        {estateVerified && (
            <div className="bg-green-50 text-green-700 p-2 rounded flex items-center gap-2 text-sm">
                <CheckCircle size={16}/> Verified: {estateName}
            </div>
        )}

        <div>
           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Annual Levy (₦)</label>
           <input required placeholder="Amount" type="number" className="w-full p-3 border rounded-lg" 
             onChange={e => setFormData({...formData, annualLevy: e.target.value})} />
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

        <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                <input 
                  required 
                  placeholder="e.g. 5A" 
                  type="text" 
                  className="w-full p-3 border rounded-lg" 
                  value={houseNumber}
                  onChange={e => setHouseNumber(e.target.value)} 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                {availableStreets.length > 0 ? (
                    <select 
                        required 
                        className="w-full p-3 border rounded-lg bg-white"
                        value={selectedStreet}
                        onChange={e => setSelectedStreet(e.target.value)}
                    >
                        <option value="">Select Street</option>
                        {availableStreets.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                ) : (
                    <input 
                        required 
                        placeholder="Street Name" 
                        className="w-full p-3 border rounded-lg"
                        value={selectedStreet}
                        onChange={e => setSelectedStreet(e.target.value)}
                    />
                )}
             </div>
        </div>

        <button type="submit" disabled={loading || !estateVerified} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition mt-4 disabled:opacity-50">
          {loading ? 'Processing...' : 'Generate ID Card'}
        </button>
      </form>
      <button onClick={() => setView('landing')} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600">Cancel</button>
    </div>
  );
};
