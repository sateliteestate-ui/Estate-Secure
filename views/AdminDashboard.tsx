
import React, { useState, useEffect } from 'react';
import { LogOut, ScanLine, QrCode, Search, CheckCircle, Info, Users, ShieldCheck, XCircle, MessageSquare, AlertCircle, X, ThumbsUp, ThumbsDown, HelpCircle, Send, Bell, MessageSquareMore, Ban, Ticket, Printer, Download, UserCheck, MapPin, Plus, Trash2, Megaphone, Mail, ShieldPlus, Lock } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Estate, ViewType, Resident, Complaint, VisitRequest, AccessPin, ResidentToken, Street, Announcement, PrivateMessage, EstateAdmin } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface AdminDashboardProps {
  estateData: Estate;
  setEstateData: (data: Estate | null) => void;
  setView: (view: ViewType) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  estateData, 
  setEstateData, 
  setView, 
  showToast, 
  setLoading, 
  loading 
}) => {
  const [scanInput, setScanInput] = useState('');
  const [scannedUser, setScannedUser] = useState<Resident | null>(null);
  
  // Lists
  const [residentList, setResidentList] = useState<Resident[]>([]);
  const [complaintList, setComplaintList] = useState<Complaint[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [accessPins, setAccessPins] = useState<AccessPin[]>([]);
  const [residentTokens, setResidentTokens] = useState<ResidentToken[]>([]);
  const [streetList, setStreetList] = useState<Street[]>([]);
  const [announcementList, setAnnouncementList] = useState<Announcement[]>([]);

  const [loadingList, setLoadingList] = useState(true);
  const [activeTab, setActiveTab] = useState<'residents' | 'complaints' | 'visits' | 'pins' | 'resident_tokens' | 'streets' | 'announcements'>('residents');
  
  // Modal State
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ subject: '', details: '' });
  
  // Manage Admins Modal
  const [showManageAdminsModal, setShowManageAdminsModal] = useState(false);
  const [estateAdmins, setEstateAdmins] = useState<EstateAdmin[]>([]);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', phone: '', passcode: '' });
  
  // Pins State
  const [numPinsToGenerate, setNumPinsToGenerate] = useState<number>(20);
  const [numTokensToGenerate, setNumTokensToGenerate] = useState<number>(20);
  const [generatingPins, setGeneratingPins] = useState(false);

  // Approval Notes
  const [adminNotes, setAdminNotes] = useState<{[key: string]: string}>({});

  // Street & Announcement Forms
  const [newStreetName, setNewStreetName] = useState('');
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  
  // Private Message
  const [privateMessage, setPrivateMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState<PrivateMessage[]>([]);

  const estateQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${estateData.estateId}`;

  useEffect(() => {
    fetchData();
  }, [estateData.estateId]);

  useEffect(() => {
      if(selectedResident) {
          fetchMessageHistory(selectedResident.id!);
      } else {
          setMessageHistory([]);
          setPrivateMessage('');
      }
  }, [selectedResident]);

  const fetchData = async () => {
    setLoadingList(true);
    try {
        // Fetch Residents
        const qRes = query(collection(db, 'residents'), where('estateId', '==', estateData.estateId));
        const snapshotRes = await getDocs(qRes);
        const residents = snapshotRes.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resident));
        setResidentList(residents);

        // Fetch Complaints
        const qComp = query(collection(db, 'complaints'), where('estateId', '==', estateData.estateId));
        const snapshotComp = await getDocs(qComp);
        const complaints = snapshotComp.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
        complaints.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        setComplaintList(complaints);

        // Fetch Official Visit Requests
        const qVis = query(collection(db, 'visit_requests'), where('estateId', '==', estateData.estateId), where('purpose', '==', 'official'), where('status', '==', 'pending'));
        const snapshotVis = await getDocs(qVis);
        const visits = snapshotVis.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitRequest));
        setVisitRequests(visits);

        // Fetch Access Pins
        const qPins = query(collection(db, 'access_pins'), where('estateId', '==', estateData.estateId));
        const snapshotPins = await getDocs(qPins);
        const pins = snapshotPins.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccessPin));
        setAccessPins(pins);

        // Fetch Resident Tokens
        const qTokens = query(collection(db, 'resident_tokens'), where('estateId', '==', estateData.estateId));
        const snapshotTokens = await getDocs(qTokens);
        const tokens = snapshotTokens.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResidentToken));
        setResidentTokens(tokens);

        // Fetch Streets
        const qStreets = query(collection(db, 'estate_streets'), where('estateId', '==', estateData.estateId));
        const snapshotStreets = await getDocs(qStreets);
        const streets = snapshotStreets.docs.map(doc => ({ id: doc.id, ...doc.data() } as Street));
        setStreetList(streets);

        // Fetch Announcements
        const qAnnounce = query(collection(db, 'announcements'), where('estateId', '==', estateData.estateId));
        const snapshotAnnounce = await getDocs(qAnnounce);
        const announcements = snapshotAnnounce.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        announcements.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        setAnnouncementList(announcements);

    } catch (err) {
        console.error("Error fetching data", err);
    } finally {
        setLoadingList(false);
    }
  };

  const fetchEstateAdmins = async () => {
      try {
          const q = query(collection(db, 'estate_admins'), where('estateId', '==', estateData.estateId));
          const snap = await getDocs(q);
          const admins = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstateAdmin));
          setEstateAdmins(admins);
      } catch (err) {
          console.error("Failed to fetch admins", err);
      }
  };

  const handleOpenManageAdmins = () => {
      setShowManageAdminsModal(true);
      fetchEstateAdmins();
  };

  const handleAddEstateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          // Check for existing primary admin passcode conflict (not strictly necessary but good for UX)
          if (newAdminForm.passcode === estateData.adminPasscode) {
             // allow it, or warn. Choosing to allow as they are separate accounts.
          }

          const newAdmin: EstateAdmin = {
              estateId: estateData.estateId,
              name: newAdminForm.name,
              email: newAdminForm.email,
              phone: newAdminForm.phone,
              passcode: newAdminForm.passcode,
              role: 'admin',
              createdAt: serverTimestamp() as any,
              createdBy: estateData.adminName
          };

          await addDoc(collection(db, 'estate_admins'), newAdmin);
          showToast("New Admin Added Successfully", "success");
          setNewAdminForm({ name: '', email: '', phone: '', passcode: '' });
          fetchEstateAdmins();
      } catch (err) {
          showToast("Failed to add admin", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteEstateAdmin = async (id: string) => {
      if(!window.confirm("Remove this admin's access?")) return;
      try {
          await deleteDoc(doc(db, 'estate_admins', id));
          setEstateAdmins(prev => prev.filter(a => a.id !== id));
          showToast("Admin Removed", "success");
      } catch (err) {
          showToast("Failed to remove admin", "error");
      }
  };

  const fetchMessageHistory = async (residentId: string) => {
      try {
          const q = query(collection(db, 'private_messages'), where('residentId', '==', residentId));
          const snapshot = await getDocs(q);
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrivateMessage));
          msgs.sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0)); // Oldest first
          setMessageHistory(msgs);
      } catch(err) {
          console.error("Failed to load messages", err);
      }
  };

  const handleAddStreet = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newStreetName.trim()) return;
    setLoading(true);
    try {
        await addDoc(collection(db, 'estate_streets'), {
            estateId: estateData.estateId,
            name: newStreetName.trim()
        });
        setNewStreetName('');
        showToast("Street Added", "success");
        fetchData();
    } catch(err) {
        showToast("Failed to add street", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteStreet = async (id: string) => {
    if(!window.confirm("Delete this street?")) return;
    try {
        await deleteDoc(doc(db, 'estate_streets', id));
        setStreetList(prev => prev.filter(s => s.id !== id));
        showToast("Street Deleted", "success");
    } catch(err) {
        showToast("Failed to delete", "error");
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await addDoc(collection(db, 'announcements'), {
            estateId: estateData.estateId,
            title: announcementForm.title,
            message: announcementForm.message,
            date: serverTimestamp(),
            postedBy: estateData.adminName
        });
        setAnnouncementForm({ title: '', message: '' });
        showToast("Announcement Posted", "success");
        fetchData();
    } catch(err) {
        showToast("Failed to post", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleSendPrivateMessage = async () => {
    if(!selectedResident?.id || !privateMessage.trim()) return;
    setLoading(true);
    try {
        const newMsg = {
            estateId: estateData.estateId,
            residentId: selectedResident.id,
            message: privateMessage.trim(),
            date: serverTimestamp(),
            read: false,
            sender: 'admin'
        };
        await addDoc(collection(db, 'private_messages'), newMsg);
        setPrivateMessage('');
        showToast("Message Sent to Resident", "success");
        // Refresh history
        fetchMessageHistory(selectedResident.id);
    } catch(err) {
        showToast("Failed to send message", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleGeneratePins = async () => {
    if (numPinsToGenerate <= 0) return;
    setGeneratingPins(true);
    
    try {
        const currentYear = new Date().getFullYear();
        const expiryDate = new Date(`${currentYear}-12-31T23:59:59`);
        
        const promises = [];
        
        for (let i = 0; i < numPinsToGenerate; i++) {
             const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
             const serial = `PIN-${Date.now()}-${i}`;
             const newPin = {
                 pin: pinCode,
                 estateId: estateData.estateId,
                 createdAt: serverTimestamp(),
                 expiresAt: expiryDate,
                 status: 'active' as const,
                 serialNumber: serial
             };
             promises.push(addDoc(collection(db, 'access_pins'), newPin));
        }

        await Promise.all(promises);
        showToast(`Generated ${numPinsToGenerate} Access Pins`, "success");
        fetchData(); // Refresh list
    } catch (err) {
        showToast("Failed to generate pins", "error");
    } finally {
        setGeneratingPins(false);
    }
  };

  const handleGenerateResidentTokens = async () => {
    if (numTokensToGenerate <= 0) return;
    setGeneratingPins(true);
    
    try {
        const currentYear = new Date().getFullYear();
        const expiryDate = new Date(`${currentYear}-12-31T23:59:59`);
        
        const promises = [];
        
        for (let i = 0; i < numTokensToGenerate; i++) {
             // Resident tokens format "RES-XXXXXX"
             const tokenCode = 'RES-' + Math.random().toString(36).substring(2, 8).toUpperCase();
             const serial = `RT-${Date.now()}-${i}`;
             const newToken = {
                 token: tokenCode,
                 estateId: estateData.estateId,
                 estateName: estateData.name,
                 createdAt: serverTimestamp(),
                 expiresAt: expiryDate,
                 status: 'unused' as const,
                 serialNumber: serial
             };
             promises.push(addDoc(collection(db, 'resident_tokens'), newToken));
        }

        await Promise.all(promises);
        showToast(`Generated ${numTokensToGenerate} Resident Tokens`, "success");
        fetchData();
    } catch (err) {
        showToast("Failed to generate resident tokens", "error");
    } finally {
        setGeneratingPins(false);
    }
  };

  const handleDownloadPdf = async (elementId: string, filename: string) => {
    const printContainer = document.getElementById(elementId);
    if (!printContainer) return;

    setLoading(true);
    try {
        // Unhide container temporarily for rendering
        printContainer.style.display = 'block';
        
        // Wait a moment for layout to settle and images to be recognized
        await new Promise(resolve => setTimeout(resolve, 500));

        // Use html2canvas
        // @ts-ignore
        const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        // Use jspdf
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${estateData.name}_${filename}.pdf`);
        
        showToast("PDF Downloaded", "success");
    } catch (err) {
        console.error(err);
        showToast("PDF Generation Failed", "error");
    } finally {
        printContainer.style.display = 'none';
        setLoading(false);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;
    
    setLoading(true);
    setScannedUser(null);
    
    try {
      const q = query(
          collection(db, 'residents'), 
          where('userId', '==', scanInput),
          where('estateId', '==', estateData.estateId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setScannedUser({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Resident);
        showToast("User found", "success");
      } else {
        const qGlobal = query(collection(db, 'residents'), where('userId', '==', scanInput));
        const snapGlobal = await getDocs(qGlobal);
          
        if(!snapGlobal.empty) {
           showToast("User belongs to a different Estate!", "error");
        } else {
           showToast("User ID not found", "error");
        }
      }
    } catch (err) {
      showToast("Scan Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async () => {
      if (!scannedUser?.id) return;
      try {
          const userRef = doc(db, 'residents', scannedUser.id);
          const newCode = 'GP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(userRef, { verified: true, gatePassCode: newCode, active: true });
          
          setScannedUser({ ...scannedUser, verified: true, gatePassCode: newCode, active: true });
          setResidentList(prev => prev.map(r => r.id === scannedUser.id ? { ...r, verified: true, gatePassCode: newCode, active: true } : r));
          
          showToast("Resident Verified & Code Generated!", "success");
      } catch (err) {
          console.error(err);
          showToast("Verification Failed", "error");
      }
  };

  const handleApproveResident = async () => {
     if(!selectedResident?.id) return;
     try {
         const newCode = 'GP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
         const userRef = doc(db, 'residents', selectedResident.id);
         await updateDoc(userRef, { verified: true, gatePassCode: newCode, active: true });

         const updated = { ...selectedResident, verified: true, gatePassCode: newCode, active: true };
         setSelectedResident(updated);
         setResidentList(prev => prev.map(r => r.id === updated.id ? updated : r));
         showToast("Approved: Payment ID Generated", "success");
     } catch(err) {
         showToast("Approval Failed", "error");
     }
  };

  const handleRejectResident = async () => {
     if(!selectedResident?.id) return;
     try {
         const userRef = doc(db, 'residents', selectedResident.id);
         await updateDoc(userRef, { verified: false });

         const updated = { ...selectedResident, verified: false };
         setSelectedResident(updated);
         setResidentList(prev => prev.map(r => r.id === updated.id ? updated : r));
         showToast("Resident Status Rejected", "success");
     } catch(err) {
         showToast("Rejection Failed", "error");
     }
  };
  
  const handleDeactivateUser = async () => {
     if(!selectedResident?.id) return;
     if(!window.confirm("Are you sure you want to deactivate this resident? This will revoke all access for users who have moved out.")) return;
     
     try {
         const userRef = doc(db, 'residents', selectedResident.id);
         await updateDoc(userRef, { 
             active: false, 
             verified: false, 
             gatePassCode: null as any // Clearing fields
         });

         const updated = { ...selectedResident, active: false, verified: false, gatePassCode: undefined };
         setSelectedResident(updated);
         setResidentList(prev => prev.map(r => r.id === updated.id ? updated : r));
         showToast("User Deactivated / Moved Out", "success");
     } catch(err) {
         showToast("Deactivation Failed", "error");
     }
  };

  const handleApproveVisit = async (req: VisitRequest) => {
    if (!req.id) return;
    const code = 'OFF-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const note = adminNotes[req.id] || '';
    
    try {
        await updateDoc(doc(db, 'visit_requests', req.id), { 
            status: 'approved', 
            accessCode: code,
            approvalNote: note 
        });
        await addDoc(collection(db, 'visitor_passes'), {
            residentId: 'ESTATE-ADMIN',
            residentName: 'Estate Office',
            estateId: estateData.estateId,
            visitorName: req.visitorName,
            visitorPhone: req.visitorPhone,
            visitDate: new Date().toISOString().split('T')[0],
            accessCode: code,
            createdAt: serverTimestamp()
        });
        showToast("Official Visit Approved", "success");
        setVisitRequests(prev => prev.filter(p => p.id !== req.id));
    } catch (err) {
        showToast("Error approving visit", "error");
    }
  };

  const handleRejectVisit = async (reqId: string) => {
    const note = adminNotes[reqId] || '';
    try {
        await updateDoc(doc(db, 'visit_requests', reqId), { 
            status: 'rejected',
            approvalNote: note 
        });
        showToast("Visit Rejected", "success");
        setVisitRequests(prev => prev.filter(p => p.id !== reqId));
    } catch (err) {
        showToast("Error rejecting visit", "error");
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await addDoc(collection(db, 'change_requests'), {
            estateId: estateData.estateId,
            adminName: estateData.adminName,
            subject: requestForm.subject,
            details: requestForm.details,
            status: 'pending',
            date: serverTimestamp()
        });
        showToast("Request submitted to Super Admin", "success");
        setShowRequestModal(false);
        setRequestForm({ subject: '', details: '' });
    } catch (err) {
        showToast("Failed to submit request", "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{estateData?.name}</h1>
          <p className="opacity-90">Admin Dashboard</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleOpenManageAdmins} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm">
               <ShieldPlus size={18} /> Manage Admins
            </button>
            <button onClick={() => setShowRequestModal(true)} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm">
               <HelpCircle size={18} /> Request Change
            </button>
            <button onClick={() => { setEstateData(null); setView('landing'); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition">
              <LogOut size={20} />
            </button>
        </div>
      </div>
      
      {/* Pending Approval Banner */}
      {!estateData.approved && (
         <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r shadow-md animate-pulse">
            <div className="flex">
               <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
               </div>
               <div className="ml-3">
                  <p className="text-sm text-yellow-700 font-bold">
                     Pending Approval: <span className="font-normal">Your estate registration is pending Super Admin approval. Residents cannot register until approved.</span>
                  </p>
               </div>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Estate Info & QR Card */}
        <div className="md:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
            <h3 className="font-bold text-gray-800 flex items-center mb-4 text-lg">
                <Info className="mr-2 text-indigo-600" size={20} /> Estate Identity
            </h3>
            <div className="bg-indigo-50 p-2 rounded-xl mb-4">
                <img src={estateQrUrl} alt="Estate QR" className="w-32 h-32" />
            </div>
            <p className="text-sm text-gray-500 mb-2">Unique Estate ID</p>
            <div className="text-2xl font-mono font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg tracking-wider border border-indigo-100 select-all cursor-pointer" onClick={() => {navigator.clipboard.writeText(estateData.estateId); showToast("Copied!", "success")}}>
                {estateData.estateId}
            </div>
            <div className="mt-4 text-sm text-gray-500 w-full text-left">
               <p><span className="font-bold">Admin:</span> {estateData.adminName}</p>
               <p><span className="font-bold">Phone:</span> {estateData.phone || 'N/A'}</p>
               
               {/* Display Bank Details if available */}
               {(estateData.bankName || estateData.accountNumber) && (
                   <div className="mt-2 pt-2 border-t border-gray-100">
                       <p><span className="font-bold">Bank:</span> {estateData.bankName || 'N/A'}</p>
                       <p><span className="font-bold">Acc Name:</span> {estateData.accountName || 'N/A'}</p>
                       <p><span className="font-bold">Acc No:</span> <span className="font-mono bg-gray-50 px-1 rounded">{estateData.accountNumber || 'N/A'}</span></p>
                   </div>
               )}
            </div>
        </div>

        {/* Scanner Section */}
        <div className="md:col-span-8 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center mb-4">
                <ScanLine className="mr-2 text-indigo-600" /> Resident Scanner
            </h3>
            <form onSubmit={handleScan} className="flex gap-4">
                <div className="relative flex-1">
                <input 
                    autoFocus
                    type="text" 
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:border-indigo-500 outline-none font-mono uppercase"
                    placeholder="Scan or Type Resident ID"
                />
                <QrCode className="absolute left-3 top-3.5 text-gray-400" size={20} />
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-8 rounded-lg font-medium hover:bg-indigo-700 transition">
                Search
                </button>
            </form>
            </div>

            {/* Results Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex-1 min-h-[250px]">
            <h3 className="font-bold text-gray-800 flex items-center mb-6">
                <Search className="mr-2 text-indigo-600" /> Scan Results
            </h3>
            
            {loading ? <LoadingSpinner /> : scannedUser ? (
                <div className={`animate-fade-in border rounded-xl p-6 ${scannedUser.active === false ? 'bg-gray-100 border-gray-300' : (scannedUser.verified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200')}`}>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div className="h-20 w-20 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 border-2 border-white shadow mx-auto sm:mx-0 overflow-hidden relative">
                        {scannedUser.photoUrl ? (
                            <img src={scannedUser.photoUrl} alt="Resident" className={`w-full h-full object-cover ${scannedUser.active === false ? 'grayscale' : ''}`} />
                        ) : (
                            scannedUser.fullName.charAt(0)
                        )}
                        {scannedUser.active === false && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Ban className="text-white"/></div>}
                    </div>
                    <div className="w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                            <h2 className={`text-2xl font-bold text-center sm:text-left ${scannedUser.active === false ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{scannedUser.fullName}</h2>
                            {scannedUser.active === false ? (
                                <span className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase mt-2 sm:mt-0 text-center w-fit mx-auto sm:mx-0">Inactive / Moved Out</span>
                            ) : (
                                scannedUser.verified ? (
                                    <span className="bg-green-200 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase mt-2 sm:mt-0 text-center w-fit mx-auto sm:mx-0">Verified</span>
                                ) : (
                                    <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full uppercase mt-2 sm:mt-0 text-center w-fit mx-auto sm:mx-0">Unverified</span>
                                )
                            )}
                        </div>
                        <p className={`font-medium flex items-center justify-center sm:justify-start gap-1 mt-1 ${scannedUser.active === false ? 'text-gray-500' : (scannedUser.verified ? 'text-green-700' : 'text-yellow-700')}`}>
                            {scannedUser.active === false ? <Ban size={16} /> : (scannedUser.verified ? <CheckCircle size={16} /> : <XCircle size={16} />)} 
                            {scannedUser.active === false ? 'Access Revoked' : (scannedUser.verified ? 'Resident Verified' : 'Action Required')}
                        </p>
                        
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div className="bg-white/50 p-2 rounded">
                            <span className="text-gray-500 block text-xs uppercase tracking-wide">Address</span>
                            <span className="font-medium text-gray-900">{scannedUser.address}</span>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                            <span className="text-gray-500 block text-xs uppercase tracking-wide">Annual Levy</span>
                            <span className="font-medium text-gray-900">₦{scannedUser.annualLevy}</span>
                        </div>
                        </div>

                        {!scannedUser.verified && scannedUser.active !== false && (
                            <button 
                                onClick={handleVerifyUser}
                                className="mt-4 w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow flex items-center justify-center gap-2"
                            >
                                <ShieldCheck size={18} /> Approve & Verify Resident
                            </button>
                        )}
                    </div>
                    </div>
                </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <ScanLine size={48} className="mb-2" />
                <p>Ready to scan...</p>
                </div>
            )}
            </div>
        </div>
      </div>

      {/* Tabs for List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 flex overflow-x-auto">
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'residents' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('residents')}>
                <Users size={16} /> Residents
            </button>
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'complaints' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('complaints')}>
                <MessageSquare size={16} /> Complaints
            </button>
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'visits' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('visits')}>
                <Bell size={16} /> Visits
                {visitRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{visitRequests.length}</span>}
            </button>
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'pins' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('pins')}>
                <Ticket size={16} /> Pins
            </button>
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'resident_tokens' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('resident_tokens')}>
                <UserCheck size={16} /> Tokens
            </button>
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'streets' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('streets')}>
                <MapPin size={16} /> Streets
            </button>
            <button className={`px-4 py-3 font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'announcements' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('announcements')}>
                <Megaphone size={16} /> Alerts
            </button>
        </div>
        
        {loadingList ? <LoadingSpinner /> : (
            <div className="overflow-x-auto min-h-[300px]">
                {/* RESIDENTS TAB */}
                {activeTab === 'residents' && (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">ID Code</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {residentList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No residents registered yet.</td>
                                </tr>
                            ) : residentList.map((res) => (
                                <tr 
                                  key={res.id} 
                                  className={`hover:bg-indigo-50/30 transition cursor-pointer ${res.active === false ? 'opacity-60 bg-gray-50' : ''}`}
                                  onClick={() => setSelectedResident(res)}
                                >
                                    <td className="px-6 py-4 font-bold text-gray-800">
                                        {res.fullName}
                                        {res.active === false && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1 rounded">Moved Out</span>}
                                    </td>
                                    <td className="px-6 py-4 font-mono">{res.userId}</td>
                                    <td className="px-6 py-4 truncate max-w-[150px]">{res.address}</td>
                                    <td className="px-6 py-4">
                                        {res.active === false ? (
                                            <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">Inactive</span>
                                        ) : res.verified ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Verified</span>
                                        ) : (
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-indigo-600 font-semibold text-xs">View Details</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* STREETS TAB */}
                {activeTab === 'streets' && (
                    <div className="p-6">
                        <div className="mb-6 flex gap-2">
                            <input 
                                className="border p-2 rounded flex-1" 
                                placeholder="Enter new street name" 
                                value={newStreetName} 
                                onChange={e => setNewStreetName(e.target.value)} 
                            />
                            <button onClick={handleAddStreet} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 flex items-center gap-1">
                                <Plus size={16} /> Add Street
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {streetList.length === 0 ? <p className="text-gray-400">No streets added.</p> : streetList.map(street => (
                                <div key={street.id} className="border p-3 rounded-lg flex justify-between items-center bg-gray-50">
                                    <span className="font-semibold text-gray-700">{street.name}</span>
                                    <button onClick={() => handleDeleteStreet(street.id!)} className="text-red-500 hover:text-red-700 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ANNOUNCEMENTS TAB */}
                {activeTab === 'announcements' && (
                    <div className="p-6">
                         <div className="bg-gray-50 p-4 rounded-xl border mb-6">
                             <h4 className="font-bold text-gray-700 mb-2">Post New Announcement</h4>
                             <input 
                                className="w-full mb-2 p-2 border rounded" 
                                placeholder="Title" 
                                value={announcementForm.title} 
                                onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} 
                             />
                             <textarea 
                                className="w-full mb-2 p-2 border rounded" 
                                rows={3} 
                                placeholder="Message to all residents..."
                                value={announcementForm.message}
                                onChange={e => setAnnouncementForm({...announcementForm, message: e.target.value})}
                             />
                             <button onClick={handlePostAnnouncement} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 flex items-center gap-1">
                                 <Send size={16} /> Post Announcement
                             </button>
                         </div>
                         
                         <div className="space-y-4">
                             {announcementList.length === 0 ? <p className="text-gray-400 text-center">No announcements yet.</p> : announcementList.map(ann => (
                                 <div key={ann.id} className="border p-4 rounded-xl shadow-sm hover:shadow-md transition">
                                     <div className="flex justify-between items-start">
                                         <h5 className="font-bold text-lg text-gray-800">{ann.title}</h5>
                                         <span className="text-xs text-gray-500">{ann.date ? new Date(ann.date.seconds * 1000).toLocaleDateString() : '-'}</span>
                                     </div>
                                     <p className="text-gray-600 mt-1">{ann.message}</p>
                                     <p className="text-xs text-indigo-500 mt-2 font-semibold">Posted by {ann.postedBy}</p>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}

                {activeTab === 'complaints' && (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Resident</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {complaintList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No complaints filed.</td>
                                </tr>
                            ) : complaintList.map((comp) => (
                                <tr key={comp.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-800">{comp.subject}</td>
                                    <td className="px-6 py-4">{comp.residentName}</td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={comp.message}>{comp.message}</td>
                                    <td className="px-6 py-4">{comp.date ? new Date(comp.date.seconds * 1000).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'visits' && (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Visitor</th>
                                <th className="px-6 py-4">Purpose</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visitRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">No pending requests.</td>
                                </tr>
                            ) : visitRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-800">{req.visitorName}</p>
                                        <p className="text-xs text-gray-500">{req.visitorPhone}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold uppercase block text-gray-500">Official</span>
                                        {req.visitReason && <span className="text-sm font-semibold">{req.visitReason}</span>}
                                        {req.requestCode && <p className="text-xs font-mono text-gray-400 mt-1">Ref: {req.requestCode}</p>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-1">
                                                <MessageSquareMore size={14} className="text-gray-400" />
                                                <input 
                                                    className="w-full text-xs p-1 border rounded"
                                                    placeholder="Add note..."
                                                    value={adminNotes[req.id!] || ''}
                                                    onChange={(e) => setAdminNotes({...adminNotes, [req.id!]: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveVisit(req)} className="bg-green-600 text-white p-2 rounded hover:bg-green-700" title="Approve"><ThumbsUp size={16}/></button>
                                                <button onClick={() => handleRejectVisit(req.id!)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600" title="Reject"><ThumbsDown size={16}/></button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'pins' && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                             <div className="flex items-center gap-2">
                                 <label className="text-sm font-semibold text-gray-600">Count:</label>
                                 <input 
                                   type="number" 
                                   value={numPinsToGenerate}
                                   onChange={(e) => setNumPinsToGenerate(parseInt(e.target.value) || 0)}
                                   className="w-20 p-2 border rounded text-center"
                                   min="1"
                                 />
                                 <button onClick={handleGeneratePins} disabled={generatingPins} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
                                     {generatingPins ? 'Generating...' : 'Generate Pins'}
                                 </button>
                             </div>
                             
                             {accessPins.length > 0 && (
                                 <button onClick={() => handleDownloadPdf('pins-print-container', 'AccessPins')} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2">
                                     <Printer size={16} /> Download PDF
                                 </button>
                             )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {accessPins.length === 0 ? (
                                <p className="col-span-4 text-center text-gray-400">No Annual Access Pins generated yet.</p>
                            ) : accessPins.map((pin) => (
                                <div key={pin.id} className="border p-3 rounded bg-gray-50 text-center relative overflow-hidden">
                                     <p className="font-bold font-mono text-lg tracking-widest">{pin.pin}</p>
                                     <p className="text-xs text-gray-500 mt-1">Expires: Dec 31</p>
                                     <div className="mt-2 flex justify-center">
                                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${pin.pin}`} alt="QR" className="w-16 h-16 mix-blend-multiply" />
                                     </div>
                                </div>
                            ))}
                        </div>
                         {/* Hidden Container for PDF Printing */}
                        <div id="pins-print-container" style={{display: 'none', width: '210mm', background: 'white', padding: '10mm'}}>
                            <div className="grid grid-cols-4 gap-4">
                                {accessPins.map((pin) => (
                                    <div key={pin.id} className="border-2 border-dashed border-gray-400 p-2 text-center rounded-lg break-inside-avoid">
                                        <h4 className="font-bold text-xs uppercase mb-1">{estateData.name}</h4>
                                        <p className="text-xxs text-gray-500 mb-1">ANNUAL ACCESS PIN</p>
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${pin.pin}`} 
                                            className="w-20 h-20 mx-auto" 
                                            crossOrigin="anonymous"
                                        />
                                        <p className="font-bold font-mono text-xl mt-1 tracking-widest">{pin.pin}</p>
                                        <p className="text-xs mt-1">Valid thru Dec 31</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'resident_tokens' && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                             <div className="flex items-center gap-2">
                                 <label className="text-sm font-semibold text-gray-600">Count:</label>
                                 <input 
                                   type="number" 
                                   value={numTokensToGenerate}
                                   onChange={(e) => setNumTokensToGenerate(parseInt(e.target.value) || 0)}
                                   className="w-20 p-2 border rounded text-center"
                                   min="1"
                                 />
                                 <button onClick={handleGenerateResidentTokens} disabled={generatingPins} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 shadow-md">
                                     {generatingPins ? 'Generating...' : 'Generate Tokens'}
                                 </button>
                             </div>
                             
                             {residentTokens.length > 0 && (
                                 <button onClick={() => handleDownloadPdf('tokens-print-container', 'ResidentTokens')} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2 shadow-md">
                                     <Printer size={16} /> Download PDF
                                 </button>
                             )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {residentTokens.length === 0 ? (
                                <p className="col-span-4 text-center text-gray-400 py-10">No Resident Annual Tokens generated yet. Use the button above to generate a batch.</p>
                            ) : residentTokens.map((token) => (
                                <div key={token.id} className={`border p-3 rounded text-center relative overflow-hidden ${token.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                     <p className="font-bold font-mono text-lg tracking-widest">{token.token}</p>
                                     <p className="text-xs text-gray-500 mt-1">Expires: Dec 31</p>
                                     <p className={`text-xs font-bold uppercase mt-1 ${token.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                                         {token.status === 'active' ? 'Activated' : 'Unused'}
                                     </p>
                                     <div className="mt-2 flex justify-center">
                                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${token.token}`} alt="QR" className="w-16 h-16 mix-blend-multiply" />
                                     </div>
                                </div>
                            ))}
                        </div>
                        
                         {/* Hidden Container for PDF Printing */}
                        <div id="tokens-print-container" style={{display: 'none', width: '210mm', background: 'white', padding: '10mm'}}>
                            <div className="grid grid-cols-4 gap-4">
                                {residentTokens.map((token) => (
                                    <div key={token.id} className="border-2 border-dashed border-indigo-400 p-2 text-center rounded-lg break-inside-avoid">
                                        <h4 className="font-bold text-xs uppercase mb-1">{estateData.name}</h4>
                                        <p className="text-xxs text-indigo-800 font-bold mb-1">RESIDENT ANNUAL TOKEN</p>
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${token.token}`} 
                                            className="w-20 h-20 mx-auto" 
                                            crossOrigin="anonymous"
                                        />
                                        <p className="font-bold font-mono text-xl mt-1 tracking-widest">{token.token}</p>
                                        <p className="text-xs mt-1">Valid thru Dec 31</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Manage Admins Modal */}
      {showManageAdminsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-bounce-in max-h-[90vh] overflow-y-auto">
                  <div className="bg-slate-800 p-4 flex justify-between items-center text-white sticky top-0 z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2"><ShieldPlus size={18} /> Manage Estate Admins</h3>
                      <button onClick={() => setShowManageAdminsModal(false)} className="hover:text-slate-300"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <div className="mb-6">
                          <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Add New Admin</h4>
                          <form onSubmit={handleAddEstateAdmin} className="space-y-3">
                              <input 
                                required 
                                placeholder="Full Name" 
                                className="w-full p-2 border rounded-lg"
                                value={newAdminForm.name}
                                onChange={e => setNewAdminForm({...newAdminForm, name: e.target.value})}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                  <input 
                                    required 
                                    type="email" 
                                    placeholder="Email Address" 
                                    className="w-full p-2 border rounded-lg"
                                    value={newAdminForm.email}
                                    onChange={e => setNewAdminForm({...newAdminForm, email: e.target.value})}
                                  />
                                  <input 
                                    required 
                                    type="tel" 
                                    placeholder="Phone" 
                                    className="w-full p-2 border rounded-lg"
                                    value={newAdminForm.phone}
                                    onChange={e => setNewAdminForm({...newAdminForm, phone: e.target.value})}
                                  />
                              </div>
                              <input 
                                required 
                                type="password" 
                                placeholder="Create Access Passcode" 
                                className="w-full p-2 border rounded-lg border-indigo-200 bg-indigo-50"
                                value={newAdminForm.passcode}
                                onChange={e => setNewAdminForm({...newAdminForm, passcode: e.target.value})}
                              />
                              <button disabled={loading} className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-900 transition flex justify-center gap-2">
                                  {loading ? 'Adding...' : <><Plus size={16}/> Add Admin</>}
                              </button>
                          </form>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Existing Admins</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                               {/* Primary Admin (Read Only) */}
                               <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-sm text-indigo-900">{estateData.adminName} (Primary)</p>
                                        <p className="text-xs text-indigo-600">{estateData.email}</p>
                                    </div>
                                    <ShieldCheck size={16} className="text-indigo-500"/>
                               </div>

                               {estateAdmins.map(admin => (
                                   <div key={admin.id} className="p-3 bg-white rounded-lg border flex justify-between items-center group">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{admin.name}</p>
                                            <p className="text-xs text-gray-500">{admin.email} • {admin.phone}</p>
                                        </div>
                                        <button onClick={() => handleDeleteEstateAdmin(admin.id!)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition">
                                            <Trash2 size={16} />
                                        </button>
                                   </div>
                               ))}
                               {estateAdmins.length === 0 && <p className="text-center text-gray-400 text-xs py-2">No additional admins.</p>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Resident Detail Modal */}
      {selectedResident && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-bounce-in max-h-[90vh] overflow-y-auto">
                  <div className="bg-gray-100 p-4 border-b flex justify-between items-center sticky top-0 z-10">
                      <h3 className="font-bold text-lg text-gray-800">Resident Details</h3>
                      <button onClick={() => setSelectedResident(null)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {selectedResident.active === false && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-red-700 font-bold mb-2">
                              <Ban size={20} /> This resident has moved out.
                          </div>
                      )}
                      
                      <div className="flex items-center gap-4 mb-4">
                           <div className={`h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 overflow-hidden ${selectedResident.active === false ? 'grayscale opacity-50' : ''}`}>
                               {selectedResident.photoUrl ? (
                                   <img src={selectedResident.photoUrl} alt="Resident" className="w-full h-full object-cover" />
                               ) : (
                                   selectedResident.fullName.charAt(0)
                               )}
                           </div>
                           <div>
                               <h2 className={`text-2xl font-bold ${selectedResident.active === false ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{selectedResident.fullName}</h2>
                               <p className="text-gray-500 text-sm font-mono">{selectedResident.userId}</p>
                           </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="block text-gray-400 text-xs uppercase mb-1">Phone</span>
                              <span className="font-medium">{selectedResident.phone}</span>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="block text-gray-400 text-xs uppercase mb-1">Levy</span>
                              <span className="font-medium text-emerald-600 font-bold">₦{selectedResident.annualLevy}</span>
                          </div>
                          <div className="col-span-2 bg-gray-50 p-3 rounded-lg">
                              <span className="block text-gray-400 text-xs uppercase mb-1">Address</span>
                              <span className="font-medium">{selectedResident.address}</span>
                          </div>
                      </div>

                      {/* Payment ID Section */}
                      {selectedResident.gatePassCode && selectedResident.verified && selectedResident.active !== false && (
                          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-4">
                              <div className="bg-white p-1 rounded">
                                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedResident.gatePassCode}`} alt="Gate QR" className="w-16 h-16" />
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-indigo-400 uppercase">Approved Payment ID</p>
                                  <p className="text-xl font-mono font-bold text-indigo-800 tracking-wider">{selectedResident.gatePassCode}</p>
                              </div>
                          </div>
                      )}
                      
                      {/* Annual Token Section */}
                      {selectedResident.annualToken && selectedResident.active !== false && (
                          <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                              <div className="bg-white p-1 rounded">
                                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedResident.annualToken}`} alt="Token QR" className="w-16 h-16" />
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-green-600 uppercase">Annual Resident Token</p>
                                  <p className="text-xl font-mono font-bold text-green-800 tracking-wider">{selectedResident.annualToken}</p>
                              </div>
                          </div>
                      )}
                      
                      {/* Private Message Section */}
                      <div className="border-t pt-4">
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Private Messages</label>
                          
                          {/* Chat History */}
                          <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto mb-3 space-y-2 border">
                              {messageHistory.length === 0 ? (
                                  <p className="text-center text-xs text-gray-400">No messages yet.</p>
                              ) : messageHistory.map(msg => (
                                  <div key={msg.id} className={`p-2 rounded-lg text-xs max-w-[85%] ${msg.sender === 'admin' ? 'bg-blue-100 text-blue-900 ml-auto' : 'bg-white text-gray-800 border'}`}>
                                      <div className="flex justify-between mb-1 opacity-70">
                                          <span className="font-bold">{msg.sender === 'admin' ? 'Me' : 'Resident'}</span>
                                          <span>{msg.date ? new Date(msg.date.seconds * 1000).toLocaleDateString() : ''}</span>
                                      </div>
                                      <p>{msg.message}</p>
                                  </div>
                              ))}
                          </div>

                          <div className="flex gap-2">
                              <textarea 
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                placeholder={`Send message to ${selectedResident.fullName}...`}
                                rows={2}
                                value={privateMessage}
                                onChange={e => setPrivateMessage(e.target.value)}
                              />
                              <button onClick={handleSendPrivateMessage} className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 flex flex-col items-center justify-center text-xs">
                                  <Mail size={16} /> Send
                              </button>
                          </div>
                      </div>

                      <div className="pt-4 border-t space-y-3">
                           <div className="flex gap-4">
                                <button 
                                    onClick={handleApproveResident}
                                    disabled={selectedResident.verified || selectedResident.active === false}
                                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${selectedResident.verified || selectedResident.active === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg'}`}
                                >
                                    <ThumbsUp size={18} /> {selectedResident.verified ? 'Approved' : 'Approve'}
                                </button>
                                <button 
                                    onClick={handleRejectResident}
                                    disabled={selectedResident.active === false}
                                    className={`flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition flex items-center justify-center gap-2 ${selectedResident.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <ThumbsDown size={18} /> Reject
                                </button>
                           </div>
                           
                           {selectedResident.active !== false && (
                               <button 
                                 onClick={handleDeactivateUser}
                                 className="w-full py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-black hover:text-white transition flex items-center justify-center gap-2 text-sm"
                               >
                                  <Ban size={16} /> Deactivate / Move Out
                               </button>
                           )}
                      </div>
                  </div>
             </div>
        </div>
      )}

      {/* Request Change Modal */}
      {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-bounce-in">
                  <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                      <h3 className="font-bold text-lg">Request Data Change</h3>
                      <button onClick={() => setShowRequestModal(false)} className="hover:text-indigo-200"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <p className="text-sm text-gray-500 mb-4">Send a request to the Super Admin to update estate or resident data.</p>
                      <form onSubmit={handleSubmitRequest} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                              <input 
                                required 
                                className="w-full p-2 border rounded-lg" 
                                placeholder="e.g. Update Estate Address"
                                value={requestForm.subject}
                                onChange={e => setRequestForm({...requestForm, subject: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                              <textarea 
                                required 
                                rows={4}
                                className="w-full p-2 border rounded-lg" 
                                placeholder="Describe exactly what needs to be changed..."
                                value={requestForm.details}
                                onChange={e => setRequestForm({...requestForm, details: e.target.value})}
                              />
                          </div>
                          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                              {loading ? 'Sending...' : <><Send size={16} /> Submit Request</>}
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
