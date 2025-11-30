
import React, { useState } from 'react';
import { Download, LogOut, User, LayoutDashboard, CheckCircle, AlertTriangle } from 'lucide-react';
import { Resident, ViewType } from '../types';

interface IDCardViewProps {
  residentData: Resident | null;
  setView: (view: ViewType) => void;
}

export const IDCardView: React.FC<IDCardViewProps> = ({ residentData, setView }) => {
  const [downloading, setDownloading] = useState(false);

  if (!residentData) return <div className="p-8 text-center text-gray-500">No resident data available. Please register first.</div>;
  
  // Create a deep link URL: Current App URL + ?residentId=THE_ID
  const baseUrl = window.location.href.split('?')[0];
  const qrData = `${baseUrl}?residentId=${residentData.userId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  const handleDownload = async () => {
      setDownloading(true);
      const element = document.getElementById('id-card-element');
      if (element) {
          try {
              // @ts-ignore: html2canvas loaded via CDN
              const canvas = await html2canvas(element, { scale: 2, useCORS: true });
              const data = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = data;
              link.download = `${residentData.fullName.replace(/\s+/g, '_')}_ID.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } catch (error) {
              console.error("Download failed", error);
              alert("Failed to generate image. Please try again.");
          }
      }
      setDownloading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-slide-up">
      
      {/* Actions Bar */}
      <div className="mb-6 flex flex-wrap justify-center gap-4 print:hidden">
        {residentData.verified && (
            <button 
              onClick={handleDownload} 
              disabled={downloading}
              className="flex items-center gap-2 bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-black transition shadow-lg disabled:opacity-50"
            >
                <Download size={18} /> {downloading ? 'Saving...' : 'Download ID'}
            </button>
        )}
        <button onClick={() => setView('user-dashboard')} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-full hover:bg-emerald-700 transition shadow-lg">
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <button onClick={() => setView('landing')} className="flex items-center gap-2 bg-white text-gray-600 px-6 py-2 rounded-full border hover:bg-gray-50 transition shadow-sm">
          <LogOut size={18} /> Exit
        </button>
      </div>

      {!residentData.verified && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg mb-4 flex items-center gap-2 text-sm font-bold print:hidden">
              <AlertTriangle size={18} />
              Card Verification Pending. Approval Required.
          </div>
      )}

      {/* The ID Card Container */}
      <div id="id-card-element" className={`relative w-[400px] h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl border print:shadow-none print:border-2 ${residentData.verified ? 'border-gray-200' : 'border-yellow-300'}`}>
        
        {/* Header */}
        <div className={`h-32 flex flex-col items-center justify-center text-white relative ${residentData.verified ? 'bg-emerald-600' : 'bg-gray-600'}`}>
          <div className="absolute top-0 w-full h-full pattern-dots opacity-20"></div>
          <h1 className="text-2xl font-bold tracking-wider z-10 uppercase text-shadow-sm">{residentData.estateName}</h1>
          <span className="text-emerald-100 text-xs tracking-[0.2em] z-10 mt-1 uppercase">Resident Identity</span>
        </div>

        {/* Photo Circle */}
        <div className="relative -mt-16 flex justify-center">
          <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
             {residentData.photoUrl ? (
                 <img src={residentData.photoUrl} alt="Resident" className="w-full h-full object-cover" />
             ) : (
                 <User size={64} className="text-gray-300" />
             )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mt-3">
             {residentData.verified ? (
                 <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                     <CheckCircle size={12} /> Verified
                 </span>
             ) : (
                 <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                     <AlertTriangle size={12} /> Unverified
                 </span>
             )}
        </div>

        {/* Content */}
        <div className="text-center mt-2 px-8">
          <h2 className="text-2xl font-bold text-gray-800">{residentData.fullName}</h2>
          <p className="text-emerald-600 font-medium text-sm mt-1">{residentData.userId}</p>

          <div className="mt-8 space-y-4 text-left bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
             <div className="flex justify-between border-b border-gray-200 pb-2">
               <span className="text-gray-500">Address</span>
               <span className="font-semibold text-gray-700 text-right">{residentData.address}</span>
             </div>
             <div className="flex justify-between border-b border-gray-200 pb-2">
               <span className="text-gray-500">Phone</span>
               <span className="font-semibold text-gray-700">{residentData.phone}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-gray-500">Levy Status</span>
               <span className="font-bold text-emerald-600">₦{residentData.annualLevy}/yr</span>
             </div>
          </div>
        </div>

        {/* Footer / QR */}
        <div className="absolute bottom-0 w-full bg-gray-900 text-white p-6 flex items-center justify-between">
          <div className="text-xs text-gray-400 max-w-[150px]">
            <p>This card allows entry to {residentData.estateName}. Report lost cards immediately.</p>
          </div>
          <div className="bg-white p-1 rounded-lg">
              <img src={qrUrl} alt="QR Code" className="w-16 h-16" />
          </div>
        </div>
      </div>

      <p className="mt-8 text-gray-400 text-sm print:hidden">Scan this QR code to verify or access your dashboard.</p>
    </div>
  );
};
