
import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ViewType, Resident, VisitorPass, VisitRequest } from '../types';
import { QrCode, ScanLine, UserCheck, Users, CheckCircle, XCircle, Camera, X, MessageSquarePlus, RefreshCw } from 'lucide-react';

interface GatePassProps {
  setView: (view: ViewType) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const GatePass: React.FC<GatePassProps> = ({ 
  setView, 
  showToast, 
  setLoading, 
  loading 
}) => {
  const [activeMode, setActiveMode] = useState<'resident' | 'visitor' | 'request'>('resident');
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'error';
    title: string;
    details: any;
    type: 'resident' | 'visitor';
  } | null>(null);

  // Request Mode State
  const [requestForm, setRequestForm] = useState({ 
      name: '', 
      phone: '', 
      purpose: 'resident' as 'official'|'resident', 
      targetCode: '',
      visitReason: '' // New Field
  });
  const [requestStatus, setRequestStatus] = useState<VisitRequest | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Camera Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const verifyCode = async (code: string) => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) return;

    setLoading(true);
    setScanResult(null);

    try {
      if (activeMode === 'resident') {
        const q = query(collection(db, 'residents'), where('gatePassCode', '==', trimmedCode));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const resData = snapshot.docs[0].data({ serverTimestamps: 'estimate' }) as Resident;
          
          if (resData.active === false) {
             setScanResult({
               status: 'error',
               title: 'Access Denied',
               type: 'resident',
               details: { message: "Resident has moved out. Access Revoked." }
             });
             showToast("Resident Inactive", "error");
             setLoading(false);
             return;
          }

          if (resData.verified) {
             setScanResult({
               status: 'success',
               title: 'Access Granted',
               type: 'resident',
               details: resData
             });
             showToast("Resident Gate Pass Verified", "success");
          } else {
             setScanResult({
               status: 'error',
               title: 'Access Denied',
               type: 'resident',
               details: { message: "Resident exists but not verified." }
             });
             showToast("Resident Not Verified", "error");
          }
        } else {
          setScanResult({
             status: 'error',
             title: 'Invalid Pass',
             type: 'resident',
             details: { message: "Payment ID not found in system." }
          });
          showToast("ID Not Found", "error");
        }
      } else {
        const q = query(collection(db, 'visitor_passes'), where('accessCode', '==', trimmedCode));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const visData = snapshot.docs[0].data({ serverTimestamps: 'estimate' }) as VisitorPass;
          setScanResult({
            status: 'success',
            title: 'Visitor Access Granted',
            type: 'visitor',
            details: visData
          });
          showToast("Visitor Code Verified", "success");
        } else {
          setScanResult({
             status: 'error',
             title: 'Invalid Code',
             type: 'visitor',
             details: { message: "Visitor code not found." }
          });
          showToast("Code Not Found", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Scan Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(scanInput);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let targetId = '';
      let targetName = '';
      let estateId = '';

      if (requestForm.purpose === 'resident') {
        // Find Resident by ID (using targetCode as House Code/Resident ID)
        const q = query(collection(db, 'residents'), where('userId', '==', requestForm.targetCode.trim().toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) {
          showToast("Resident ID not found", "error");
          setLoading(false);
          return;
        }
        const resData = snap.docs[0].data();
        if (resData.active === false) {
             showToast("This resident has moved out.", "error");
             setLoading(false);
             return;
        }
        targetId = snap.docs[0].id;
        targetName = resData.fullName;
        estateId = resData.estateId;
      } else {
        // Find Estate by ID
        const q = query(collection(db, 'estates'), where('estateId', '==', requestForm.targetCode.trim().toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) {
          showToast("Estate ID not found", "error");
          setLoading(false);
          return;
        }
        const estData = snap.docs[0].data();
        targetId = estData.estateId;
        targetName = estData.name;
        estateId = estData.estateId;
      }

      // Generate Request Code
      const generatedRequestCode = 'REQ-' + Math.random().toString(36).substring(2, 7).toUpperCase();

      const docRef = await addDoc(collection(db, 'visit_requests'), {
        visitorName: requestForm.name,
        visitorPhone: requestForm.phone,
        purpose: requestForm.purpose,
        visitReason: requestForm.visitReason, // Save Purpose of Visit
        targetId,
        targetName,
        estateId,
        status: 'pending',
        requestCode: generatedRequestCode, // Save Request Code
        createdAt: serverTimestamp()
      });

      setTrackingId(docRef.id);
      showToast("Request Sent! Note your Request Code.", "success");

    } catch (err) {
      console.error(err);
      showToast("Request Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const checkRequestStatus = async () => {
    if (!trackingId) return;
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'visit_requests', trackingId));
      if (docSnap.exists()) {
        const data = docSnap.data() as VisitRequest;
        setRequestStatus(data);
        if (data.status === 'approved') {
          showToast("Request Approved!", "success");
        } else if (data.status === 'rejected') {
          showToast("Request Rejected", "error");
        } else {
          showToast("Still Pending...", "success");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Camera Logic ---
  const startScanning = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to load then play
        videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play().catch(e => console.error("Play error:", e));
             requestRef.current = requestAnimationFrame(tick);
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         showToast("Camera access denied. Please enable permissions in browser settings.", "error");
      } else {
         showToast("Unable to access camera.", "error");
      }
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // @ts-ignore
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
            if (code) {
                setScanInput(code.data);
                verifyCode(code.data);
                stopScanning();
                return;
            }
        }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Gate Pass Scanner</h2>
        <p className="text-gray-500">Verify entry for residents or visitors</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border p-1 overflow-x-auto">
        <button 
          onClick={() => { setActiveMode('resident'); setScanResult(null); setScanInput(''); stopScanning(); }}
          className={`flex-1 py-3 px-2 rounded-lg font-bold flex items-center justify-center gap-2 transition whitespace-nowrap ${activeMode === 'resident' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <UserCheck size={18} /> Resident Pass
        </button>
        <button 
          onClick={() => { setActiveMode('visitor'); setScanResult(null); setScanInput(''); stopScanning(); }}
          className={`flex-1 py-3 px-2 rounded-lg font-bold flex items-center justify-center gap-2 transition whitespace-nowrap ${activeMode === 'visitor' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users size={18} /> Visitor Code
        </button>
        <button 
          onClick={() => { setActiveMode('request'); setScanResult(null); stopScanning(); }}
          className={`flex-1 py-3 px-2 rounded-lg font-bold flex items-center justify-center gap-2 transition whitespace-nowrap ${activeMode === 'request' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <MessageSquarePlus size={18} /> Request Visit
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        
        {activeMode === 'request' ? (
          trackingId ? (
            <div className="text-center space-y-4">
               <h3 className="text-xl font-bold">Request Sent</h3>
               
               <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-orange-800 font-bold mb-1">Your Request Code</p>
                  {requestStatus?.requestCode && (
                      <p className="text-2xl font-mono font-bold tracking-widest text-orange-900">{requestStatus.requestCode}</p>
                  )}
                  <p className="text-xs text-orange-700 mt-2">Save this code to check your status later.</p>
               </div>

               <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                  <p className="text-sm text-gray-500 uppercase">Status</p>
                  <p className={`text-2xl font-bold ${requestStatus?.status === 'approved' ? 'text-green-600' : requestStatus?.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {requestStatus?.status?.toUpperCase() || 'PENDING APPROVAL'}
                  </p>
                  {requestStatus?.approvalNote && (
                      <div className="mt-2 bg-white p-2 rounded text-sm text-gray-700 border">
                          <span className="font-bold">Note:</span> {requestStatus.approvalNote}
                      </div>
                  )}
               </div>

               {requestStatus?.status === 'approved' && requestStatus.accessCode && (
                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800 font-bold mb-2">Access Code Generated</p>
                    <div className="bg-white p-2 inline-block rounded">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${requestStatus.accessCode}`} alt="Access QR" />
                    </div>
                    <p className="text-3xl font-mono font-bold mt-2 tracking-widest">{requestStatus.accessCode}</p>
                 </div>
               )}

               {requestStatus?.status !== 'approved' && requestStatus?.status !== 'rejected' && (
                 <button onClick={checkRequestStatus} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 mx-auto hover:bg-indigo-700">
                    <RefreshCw size={18} /> Check Status
                 </button>
               )}
               
               <button onClick={() => { setTrackingId(null); setRequestStatus(null); }} className="text-gray-400 text-sm hover:text-gray-600 underline">New Request</button>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="space-y-4">
               <h3 className="font-bold text-gray-700 border-b pb-2">Uninvited Visitor Request</h3>
               <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="purpose" checked={requestForm.purpose === 'resident'} onChange={() => setRequestForm({...requestForm, purpose: 'resident'})} />
                    <span className="text-sm font-medium">Visit Resident</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="purpose" checked={requestForm.purpose === 'official'} onChange={() => setRequestForm({...requestForm, purpose: 'official'})} />
                    <span className="text-sm font-medium">Official/Estate</span>
                  </label>
               </div>
               <input required placeholder="Visitor Name" className="w-full p-3 border rounded-lg" value={requestForm.name} onChange={e => setRequestForm({...requestForm, name: e.target.value})} />
               <input required placeholder="Visitor Phone" type="tel" className="w-full p-3 border rounded-lg" value={requestForm.phone} onChange={e => setRequestForm({...requestForm, phone: e.target.value})} />
               
               <input 
                  required 
                  placeholder="Purpose of Visit (e.g. Delivery, Plumbing)" 
                  className="w-full p-3 border rounded-lg" 
                  value={requestForm.visitReason} 
                  onChange={e => setRequestForm({...requestForm, visitReason: e.target.value})} 
               />

               <input 
                 required 
                 placeholder={requestForm.purpose === 'resident' ? "Enter Resident ID / House Code" : "Enter Estate ID"} 
                 className="w-full p-3 border rounded-lg font-mono uppercase" 
                 value={requestForm.targetCode} 
                 onChange={e => setRequestForm({...requestForm, targetCode: e.target.value.toUpperCase()})} 
               />
               <button type="submit" disabled={loading} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition">
                 {loading ? 'Sending Request...' : 'Submit Request'}
               </button>
            </form>
          )
        ) : (
          /* Scan Modes (Resident/Visitor) */
          isScanning ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    playsInline 
                    muted 
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-white/50 m-8 rounded-lg pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/80 font-bold text-sm bg-black/50 px-3 py-1 rounded">Scanning...</div>
                  </div>
                  <button onClick={stopScanning} className="absolute top-2 right-2 bg-white/20 text-white p-2 rounded-full hover:bg-white/40"><X size={20} /></button>
              </div>
          ) : (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="relative">
                      <input 
                          autoFocus
                          type="text" 
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                          className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 outline-none font-mono uppercase text-lg text-center tracking-widest"
                          placeholder={activeMode === 'resident' ? "Scan Payment ID" : "Scan Visitor Code"}
                      />
                      <QrCode className="absolute left-3 top-5 text-gray-400" size={20} />
                  </div>
                  <div className="flex gap-3">
                      <button type="button" onClick={startScanning} className="flex-1 bg-gray-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition flex items-center justify-center gap-2"><Camera /> Scan Camera</button>
                      <button type="submit" disabled={loading} className={`flex-1 text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${activeMode === 'resident' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {loading ? 'Verifying...' : <><ScanLine /> Verify Code</>}
                      </button>
                  </div>
              </form>
          )
        )}
      </div>

      {scanResult && (
        <div className={`p-6 rounded-2xl shadow-lg border-2 animate-slide-up text-center ${scanResult.status === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            {scanResult.status === 'success' ? <CheckCircle size={64} className="text-green-600 mx-auto mb-4" /> : <XCircle size={64} className="text-red-600 mx-auto mb-4" />}
            <h3 className={`text-2xl font-bold mb-1 ${scanResult.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>{scanResult.title}</h3>

            {scanResult.status === 'success' && (
                <div className="mt-4 bg-white/60 p-4 rounded-xl text-left space-y-2">
                    {scanResult.type === 'resident' ? (
                        <>
                           <div><span className="text-xs uppercase text-gray-500 font-bold">Resident Name</span><p className="font-bold text-lg text-gray-900">{scanResult.details.fullName}</p></div>
                           <div><span className="text-xs uppercase text-gray-500 font-bold">Address</span><p className="font-semibold text-gray-800">{scanResult.details.address}</p></div>
                           <div><span className="text-xs uppercase text-gray-500 font-bold">Payment ID</span><p className="font-mono font-bold text-indigo-700">{scanResult.details.gatePassCode}</p></div>
                        </>
                    ) : (
                        <>
                           <div><span className="text-xs uppercase text-gray-500 font-bold">Visitor Name</span><p className="font-bold text-lg text-gray-900">{scanResult.details.visitorName}</p></div>
                           <div><span className="text-xs uppercase text-gray-500 font-bold">Host</span><p className="font-semibold text-gray-800">{scanResult.details.residentName || 'Estate Office'}</p></div>
                           <div><span className="text-xs uppercase text-gray-500 font-bold">Date</span><p className="font-semibold text-gray-800">{scanResult.details.visitDate || 'Today'}</p></div>
                        </>
                    )}
                </div>
            )}
            {scanResult.status === 'error' && <p className="text-red-700 font-medium mt-2">{scanResult.details.message}</p>}
        </div>
      )}
      
      <button onClick={() => setView('landing')} className="w-full text-center text-gray-400 text-sm hover:text-gray-600">Back to Home</button>
    </div>
  );
};
