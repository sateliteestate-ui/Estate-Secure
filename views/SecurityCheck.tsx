import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Resident, ViewType } from '../types';
import { QrCode, ShieldCheck, XCircle, CheckCircle, ScanLine } from 'lucide-react';

interface SecurityCheckProps {
  setView: (view: ViewType) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const SecurityCheck: React.FC<SecurityCheckProps> = ({ 
  setView, 
  showToast, 
  setLoading, 
  loading 
}) => {
  const [residentIdInput, setResidentIdInput] = useState('');
  const [scannedResult, setScannedResult] = useState<Resident | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'not-found'>('idle');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentIdInput) return;
    
    setLoading(true);
    setScannedResult(null);
    setScanStatus('idle');

    try {
      // Query root 'residents' collection using modular syntax
      const q = query(collection(db, 'residents'), where('userId', '==', residentIdInput.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setScannedResult({ id: snapshot.docs[0].id, ...docData } as Resident);
        setScanStatus('success');
        showToast("Resident Found", "success");
      } else {
        setScanStatus('not-found');
        showToast("Resident Not Found", "error");
      }
    } catch (err: any) {
      showToast("Verification Error", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <div className="bg-slate-800 p-6 rounded-2xl text-white shadow-xl">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <ShieldCheck className="text-emerald-400" /> Security Check
        </h2>
        <p className="text-slate-400 text-sm">Gate Access Control System</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
                <input 
                    autoFocus
                    type="text" 
                    value={residentIdInput}
                    onChange={(e) => setResidentIdInput(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 outline-none font-mono uppercase text-lg"
                    placeholder="Scan Resident ID"
                />
                <QrCode className="absolute left-3 top-5 text-gray-400" size={20} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Verifying...' : <><ScanLine /> Verify Status</>}
            </button>
        </form>
      </div>

      {scanStatus !== 'idle' && (
        <div className={`p-6 rounded-2xl shadow-lg border-2 animate-slide-up ${
            scanStatus === 'success' ? (scannedResult?.verified ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500') : 'bg-red-50 border-red-500'
        }`}>
            {scanStatus === 'not-found' ? (
                <div className="flex flex-col items-center text-center text-red-700">
                    <XCircle size={64} className="mb-2" />
                    <h3 className="text-2xl font-bold">ACCESS DENIED</h3>
                    <p className="font-mono mt-2 text-lg">{residentIdInput}</p>
                    <p className="text-sm mt-1">ID not found in system.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center text-center">
                    {scannedResult?.verified ? (
                        <>
                            <CheckCircle size={64} className="mb-2 text-green-600" />
                            <h3 className="text-2xl font-bold text-green-800">ACCESS GRANTED</h3>
                            <div className="bg-green-200 text-green-900 px-4 py-1 rounded-full text-sm font-bold uppercase mt-2 mb-4">Verified Resident</div>
                        </>
                    ) : (
                         <>
                            <div className="mb-2 text-yellow-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-yellow-800">NOT VERIFIED</h3>
                            <div className="bg-yellow-200 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold uppercase mt-2 mb-4">Pending Verification</div>
                        </>
                    )}
                    
                    <div className="w-full text-left bg-white/60 p-4 rounded-xl space-y-2">
                        <div>
                            <span className="text-xs uppercase text-gray-500 font-bold">Resident Name</span>
                            <p className="font-bold text-xl">{scannedResult?.fullName}</p>
                        </div>
                        <div>
                            <span className="text-xs uppercase text-gray-500 font-bold">Estate</span>
                            <p className="font-semibold">{scannedResult?.estateName}</p>
                        </div>
                         <div>
                            <span className="text-xs uppercase text-gray-500 font-bold">Address</span>
                            <p className="font-semibold">{scannedResult?.address}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
      
      <button onClick={() => setView('landing')} className="w-full text-gray-400 text-sm hover:text-gray-600">Back to Home</button>
    </div>
  );
};