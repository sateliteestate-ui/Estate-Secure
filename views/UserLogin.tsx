
import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Resident, ViewType } from '../types';
import { QrCode, Camera, X } from 'lucide-react';

interface UserLoginProps {
  setView: (view: ViewType) => void;
  setResidentData: (data: Resident) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const UserLogin: React.FC<UserLoginProps> = ({ 
  setView, 
  setResidentData, 
  showToast, 
  setLoading, 
  loading 
}) => {
  const [residentIdInput, setResidentIdInput] = useState('');
  
  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!residentIdInput) return showToast("Please enter Resident ID", "error");
    
    setLoading(true);

    try {
      // Look for the residentId in the embedded URL param if scanned full URL, or just ID
      let idToSearch = residentIdInput.trim();
      
      // Handle case where QR contains full URL (e.g. app.com?residentId=USR-123)
      if (idToSearch.includes('residentId=')) {
          const urlParams = new URLSearchParams(idToSearch.split('?')[1]);
          const extractedId = urlParams.get('residentId');
          if (extractedId) idToSearch = extractedId;
      }

      const q = query(collection(db, 'residents'), where('userId', '==', idToSearch.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        showToast("Invalid Resident ID. Check your ID Card.", "error");
      } else {
        const docData = snapshot.docs[0].data();
        const resident = { id: snapshot.docs[0].id, ...docData } as Resident;
        setResidentData(resident);
        setView('user-dashboard');
        showToast("Welcome back!", "success");
      }
    } catch (err: any) {
      showToast("Login failed: " + err.message, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Camera Logic ---
  const startScanning = async () => {
    setIsScanning(true);
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
         showToast("Camera permission denied. Please allow camera access in browser settings.", "error");
      } else {
         showToast("Unable to access camera. Ensure you are on HTTPS.", "error");
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
            if (code && code.data) {
                // Extract ID if it's a URL
                let scannedData = code.data;
                if (scannedData.includes('residentId=')) {
                    const urlParams = new URLSearchParams(scannedData.split('?')[1]);
                    const extractedId = urlParams.get('residentId');
                    if (extractedId) scannedData = extractedId;
                }
                
                setResidentIdInput(scannedData);
                stopScanning();
                showToast("ID Scanned!", "success");
                // Optional: Auto submit after scan
                // handleLogin(); 
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
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg mt-10 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Resident Login</h2>
      
      {!isScanning ? (
        <>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg mb-6 flex gap-3 items-center text-sm text-emerald-800 cursor-pointer hover:bg-emerald-100 transition" onClick={startScanning}>
                <QrCode size={24} className="flex-shrink-0" />
                <div>
                    <p className="font-bold">Tap to Scan ID Card</p>
                    <p className="text-xs opacity-80">Use your camera to scan the QR code on your card</p>
                </div>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resident ID</label>
                <input 
                    type="text" 
                    value={residentIdInput}
                    onChange={(e) => setResidentIdInput(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none uppercase tracking-widest font-mono"
                    placeholder="Ex: USR-X9Y2Z"
                />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                {loading ? 'Verifying...' : 'Access Dashboard'}
                </button>
            </form>
        </>
      ) : (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center mb-6">
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
      )}
      
      <button onClick={() => setView('landing')} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600">Back to Home</button>
    </div>
  );
};
