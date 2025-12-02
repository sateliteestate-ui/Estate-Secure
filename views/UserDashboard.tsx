
import React, { useState, useEffect } from 'react';
import { LogOut, CreditCard, History, CheckCircle, Clock, Phone, AlertTriangle, UserPlus, MessageSquare, Upload, QrCode, X, Bell, ThumbsUp, ThumbsDown, MessageSquareMore, Banknote, Ticket, Calendar, ShieldCheck, Megaphone, Mail, Reply } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Resident, ViewType, Payment, VisitRequest, Estate, ResidentToken, Announcement, PrivateMessage } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface UserDashboardProps {
  residentData: Resident;
  setResidentData: (data: Resident | null) => void;
  setView: (view: ViewType) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ 
  residentData, 
  setResidentData, 
  setView, 
  showToast 
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [estateInfo, setEstateInfo] = useState<Estate | null>(null);
  
  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'visitor' | 'complaint' | 'payment' | 'token_activation' | 'reply'>('none');
  const [processing, setProcessing] = useState(false);
  
  // Generated Codes
  const [generatedVisitorCode, setGeneratedVisitorCode] = useState<string | null>(null);
  const [generatedPaymentCode, setGeneratedPaymentCode] = useState<string | null>(null);

  // Forms
  const [visitorForm, setVisitorForm] = useState({ name: '', phone: '', date: '' });
  const [complaintForm, setComplaintForm] = useState({ subject: '', message: '' });
  const [paymentForm, setPaymentForm] = useState({ 
     amount: residentData.annualLevy, 
     phone: residentData.phone, 
     street: '', 
     houseNo: '', 
     desc: '', 
     houseId: '',
     receipt: ''
  });
  const [tokenInput, setTokenInput] = useState('');
  
  // Private Message Reply
  const [replyMessage, setReplyMessage] = useState('');
  
  // Approval Note State
  const [approvalNotes, setApprovalNotes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchPayments();
    fetchEstateDetails();
    fetchVisitRequests();
    fetchAnnouncements();
    fetchMessages();
  }, [residentData]);

  const fetchEstateDetails = async () => {
    try {
        const q = query(collection(db, 'estates'), where('estateId', '==', residentData.estateId));
        const snapshot = await getDocs(q);
        if(!snapshot.empty) {
            setEstateInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Estate);
        }
    } catch(err) {
        console.error("Error fetching estate phone", err);
    }
  }

  const fetchPayments = async () => {
    try {
      const q = query(collection(db, 'payments'), where('residentId', '==', residentData.id));
      const snapshot = await getDocs(q);
      const fetchedPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      
      fetchedPayments.sort((a, b) => {
         const timeA = a.date?.seconds || 0;
         const timeB = b.date?.seconds || 0;
         return timeB - timeA;
      });

      setPayments(fetchedPayments);
    } catch (err) {
      console.error("Error fetching payments", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchVisitRequests = async () => {
    try {
       const q = query(collection(db, 'visit_requests'), where('targetId', '==', residentData.id), where('status', '==', 'pending'));
       const snapshot = await getDocs(q);
       const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitRequest));
       setVisitRequests(reqs);
    } catch (err) {
       console.error("Error fetching requests", err);
    }
  };

  const fetchAnnouncements = async () => {
      try {
          const q = query(collection(db, 'announcements'), where('estateId', '==', residentData.estateId));
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
          list.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
          setAnnouncements(list);
      } catch (err) {
          console.error(err);
      }
  };

  const fetchMessages = async () => {
      try {
          const q = query(collection(db, 'private_messages'), where('residentId', '==', residentData.id));
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrivateMessage));
          list.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
          setMessages(list);
      } catch (err) {
          console.error(err);
      }
  };

  const handleApproveRequest = async (req: VisitRequest) => {
    if (!req.id) return;
    const code = 'VIS-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const note = approvalNotes[req.id] || '';
    
    try {
      // 1. Update Request
      await updateDoc(doc(db, 'visit_requests', req.id), { 
          status: 'approved', 
          accessCode: code,
          approvalNote: note 
      });
      // 2. Create actual Visitor Pass record
      await addDoc(collection(db, 'visitor_passes'), {
          residentId: residentData.id,
          residentName: residentData.fullName,
          estateId: residentData.estateId,
          visitorName: req.visitorName,
          visitorPhone: req.visitorPhone,
          visitDate: new Date().toISOString().split('T')[0],
          accessCode: code,
          createdAt: serverTimestamp()
      });
      showToast("Visit Approved!", "success");
      fetchVisitRequests();
    } catch (err) {
      showToast("Approval Failed", "error");
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    const note = approvalNotes[reqId] || '';
    try {
      await updateDoc(doc(db, 'visit_requests', reqId), { 
          status: 'rejected',
          approvalNote: note 
      });
      showToast("Visit Rejected", "success");
      fetchVisitRequests();
    } catch (err) {
      showToast("Rejection Failed", "error");
    }
  };

  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const code = 'VIS-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    try {
        await addDoc(collection(db, 'visitor_passes'), {
            residentId: residentData.id,
            residentName: residentData.fullName,
            estateId: residentData.estateId,
            visitorName: visitorForm.name,
            visitorPhone: visitorForm.phone,
            visitDate: visitorForm.date,
            accessCode: code,
            createdAt: serverTimestamp()
        });
        setGeneratedVisitorCode(code);
        showToast("Visitor Pass Created!", "success");
    } catch(err) {
        showToast("Failed to create pass", "error");
    } finally {
        setProcessing(false);
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
        await addDoc(collection(db, 'complaints'), {
            residentId: residentData.id,
            residentName: residentData.fullName,
            estateId: residentData.estateId,
            subject: complaintForm.subject,
            message: complaintForm.message,
            status: 'open',
            date: serverTimestamp()
        });
        showToast("Complaint Submitted", "success");
        setActiveModal('none');
        setComplaintForm({ subject: '', message: '' });
    } catch(err) {
        showToast("Failed to submit", "error");
    } finally {
        setProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const ref = 'PAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    try {
       await addDoc(collection(db, 'payments'), {
           residentId: residentData.id!,
           residentName: residentData.fullName,
           estateId: residentData.estateId,
           amount: Number(paymentForm.amount),
           status: 'completed',
           reference: ref,
           date: serverTimestamp(),
           payerPhone: paymentForm.phone,
           streetName: paymentForm.street,
           houseNumber: paymentForm.houseNo,
           description: paymentForm.desc,
           houseId: paymentForm.houseId,
           receiptUrl: paymentForm.receipt || 'https://via.placeholder.com/150'
       });
       setGeneratedPaymentCode(ref);
       showToast("Payment Submitted!", "success");
       fetchPayments(); 
    } catch (err: any) {
       showToast("Payment Failed: " + err.message, "error");
    } finally {
       setProcessing(false);
    }
  };

  const handleTokenActivation = async (e: React.FormEvent) => {
      e.preventDefault();
      setProcessing(true);
      const cleanedToken = tokenInput.trim().toUpperCase();

      try {
          const q = query(collection(db, 'resident_tokens'), where('token', '==', cleanedToken));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
              showToast("Invalid Token Code", "error");
              setProcessing(false);
              return;
          }

          const tokenDoc = snapshot.docs[0];
          const tokenData = tokenDoc.data() as ResidentToken;

          if (tokenData.estateId !== residentData.estateId) {
              showToast("This token belongs to a different estate", "error");
              setProcessing(false);
              return;
          }

          if (tokenData.status === 'active') {
              showToast("This token has already been activated by a resident.", "error");
              setProcessing(false);
              return;
          }
          
          // Link to token document
          await updateDoc(doc(db, 'resident_tokens', tokenDoc.id), {
              status: 'active',
              residentId: residentData.id,
              residentName: residentData.fullName
          });

          // Link to resident profile with activation details
          if (residentData.id) {
            await updateDoc(doc(db, 'residents', residentData.id), {
              annualToken: cleanedToken,
              annualTokenSerial: tokenData.serialNumber,
              annualTokenActivatedAt: serverTimestamp()
            });
            // Update local state
            setResidentData({ 
                ...residentData, 
                annualToken: cleanedToken,
                annualTokenSerial: tokenData.serialNumber,
                annualTokenActivatedAt: new Date() // approximate for immediate UI update
            });
          }

          showToast("Token Activated Successfully!", "success");
          setActiveModal('none');
          setTokenInput('');

      } catch (err) {
          console.error(err);
          showToast("Failed to activate token", "error");
      } finally {
          setProcessing(false);
      }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyMessage.trim()) return;
      setProcessing(true);

      try {
          await addDoc(collection(db, 'private_messages'), {
              estateId: residentData.estateId,
              residentId: residentData.id,
              message: replyMessage.trim(),
              date: serverTimestamp(),
              read: false,
              sender: 'resident'
          });
          showToast("Reply Sent to Admin", "success");
          setReplyMessage('');
          setActiveModal('none');
          fetchMessages();
      } catch (err) {
          showToast("Failed to send reply", "error");
      } finally {
          setProcessing(false);
      }
  };

  const closeModal = () => {
      setActiveModal('none');
      setGeneratedVisitorCode(null);
      setGeneratedPaymentCode(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {residentData.photoUrl && (
             <img src={residentData.photoUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-sm" />
          )}
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold">{residentData.fullName}</h1>
               {residentData.verified ? (
                   <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1">
                       <CheckCircle size={12} /> Verified
                   </span>
               ) : (
                   <span className="bg-yellow-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1 text-yellow-100">
                       <AlertTriangle size={12} /> Pending
                   </span>
               )}
            </div>
            <p className="opacity-90">{residentData.estateName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
            {estateInfo?.phone && (
                <a href={`tel:${estateInfo.phone}`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <Phone size={16} /> Call Admin
                </a>
            )}
            <button onClick={() => setView('user-id-card')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition">
                View ID Card
            </button>
            <button onClick={() => { setResidentData(null); setView('landing'); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition">
                <LogOut size={20} />
            </button>
        </div>
      </div>
      
      {/* Annual Pass Card (If Activated) */}
      {residentData.annualToken && (
         <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-md border-l-4 border-indigo-400 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-3">
                 <div className="bg-indigo-800 p-3 rounded-full">
                     <Ticket className="text-indigo-200" size={24} />
                 </div>
                 <div>
                     <h3 className="font-bold text-lg leading-tight">Annual Access Pass Active</h3>
                     <p className="text-indigo-300 text-xs font-mono">Serial: {residentData.annualTokenSerial || 'N/A'}</p>
                     <p className="text-indigo-300 text-xs flex items-center gap-1 mt-1">
                         <Calendar size={10} /> Valid thru Dec 31
                     </p>
                 </div>
             </div>
             <div className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-center min-w-[120px]">
                 <p className="text-xs font-bold uppercase text-indigo-500">Token Code</p>
                 <p className="text-xl font-mono font-bold tracking-widest">{residentData.annualToken}</p>
             </div>
         </div>
      )}
      
      {/* Messages & Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Megaphone size={18} className="text-indigo-600"/> Announcements
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                  {announcements.length === 0 ? <p className="text-gray-400 text-sm">No announcements.</p> : announcements.map(ann => (
                      <div key={ann.id} className="bg-indigo-50 p-3 rounded-lg text-sm">
                          <p className="font-bold text-gray-800">{ann.title}</p>
                          <p className="text-gray-600 mt-1">{ann.message}</p>
                          <p className="text-xs text-indigo-400 mt-2 text-right">{ann.date ? new Date(ann.date.seconds * 1000).toLocaleDateString() : ''}</p>
                      </div>
                  ))}
              </div>
          </div>
          
          {/* Private Messages */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Mail size={18} className="text-blue-600"/> Private Messages
                  </h3>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                  {messages.length === 0 ? <p className="text-gray-400 text-sm">No private messages.</p> : messages.map(msg => (
                      <div key={msg.id} className={`p-3 rounded-lg text-sm border-l-4 flex flex-col ${msg.sender === 'admin' ? 'bg-blue-50 border-blue-400 ml-0 mr-4' : 'bg-gray-50 border-gray-400 ml-4 mr-0'}`}>
                          <div className="flex justify-between items-start mb-1">
                              <span className={`text-xs font-bold uppercase ${msg.sender === 'admin' ? 'text-blue-600' : 'text-gray-600'}`}>
                                  {msg.sender === 'admin' ? 'Admin' : 'Me'}
                              </span>
                              <span className="text-xs text-gray-400">{msg.date ? new Date(msg.date.seconds * 1000).toLocaleDateString() : ''}</span>
                          </div>
                          <p className="text-gray-700">{msg.message}</p>
                          
                          {/* Reply Button for Admin messages */}
                          {msg.sender === 'admin' && (
                              <button 
                                onClick={() => setActiveModal('reply')}
                                className="self-end mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                              >
                                  <Reply size={12} /> Reply
                              </button>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* NOTIFICATIONS SECTION */}
      {visitRequests.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm animate-bounce-in">
           <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
              <Bell className="animate-pulse" size={20} /> Pending Entry Requests
           </h3>
           <div className="space-y-3">
              {visitRequests.map(req => (
                 <div key={req.id} className="bg-white p-4 rounded-xl border border-orange-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                       <div className="bg-orange-100 p-2 rounded-full text-orange-600"><UserPlus size={20} /></div>
                       <div className="flex-1">
                          <p className="font-bold text-gray-800">{req.visitorName}</p>
                          <p className="text-sm text-gray-500">{req.visitorPhone} • Waiting at Gate</p>
                          {req.visitReason && <p className="text-xs font-semibold text-indigo-600 mt-1">Purpose: {req.visitReason}</p>}
                          {req.requestCode && <p className="text-xs font-mono text-gray-400 mt-1">Ref: {req.requestCode}</p>}
                       </div>
                    </div>
                    
                    {/* Note Input */}
                    <div className="flex items-center gap-2">
                        <MessageSquareMore size={16} className="text-gray-400" />
                        <input 
                            placeholder="Add note for visitor (e.g. Park at Slot 5)" 
                            className="flex-1 text-sm p-2 border rounded bg-gray-50"
                            value={approvalNotes[req.id!] || ''}
                            onChange={(e) => setApprovalNotes({...approvalNotes, [req.id!]: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                       <button onClick={() => handleApproveRequest(req)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1">
                          <ThumbsUp size={16} /> Allow
                       </button>
                       <button onClick={() => handleRejectRequest(req.id!)} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 flex items-center gap-1">
                          <ThumbsDown size={16} /> Deny
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Main Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <button onClick={() => setActiveModal('payment')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition flex flex-col items-center gap-2">
             <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CreditCard /></div>
             <span className="font-semibold text-gray-700">Pay Levy</span>
         </button>
         <button onClick={() => setActiveModal('visitor')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2">
             <div className="p-3 bg-blue-50 rounded-full text-blue-600"><UserPlus /></div>
             <span className="font-semibold text-gray-700">Visitor Pass</span>
         </button>
         <button onClick={() => setActiveModal('complaint')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition flex flex-col items-center gap-2">
             <div className="p-3 bg-orange-50 rounded-full text-orange-600"><MessageSquare /></div>
             <span className="font-semibold text-gray-700">Complaint</span>
         </button>
         <button onClick={() => setActiveModal('token_activation')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-500 hover:shadow-md transition flex flex-col items-center gap-2">
             <div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><Ticket /></div>
             <span className="font-semibold text-gray-700">Activate Token</span>
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Payment History */}
         <div className="md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[300px]">
            <h3 className="font-bold text-gray-800 flex items-center mb-6">
              <History className="mr-2 text-indigo-600" /> Recent Activity
            </h3>
            
            {loadingPayments ? <LoadingSpinner /> : (
               <div className="space-y-4">
                  {payments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No payment records found.</div>
                  ) : (
                    payments.map((payment) => (
                       <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition">
                          <div className="flex items-center gap-4">
                             <div className={`p-2 rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                {payment.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                             </div>
                             <div>
                                <p className="font-bold text-gray-800">Levy Payment</p>
                                <p className="text-xs text-gray-500 font-mono">{payment.reference}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="font-bold text-gray-800">₦{payment.amount}</p>
                             <p className="text-xs text-gray-500">
                                {payment.date ? new Date(payment.date.seconds * 1000).toLocaleDateString() : 'Just now'}
                             </p>
                          </div>
                       </div>
                    ))
                  )}
               </div>
            )}
         </div>
      </div>

      {/* MODALS */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-bounce-in">
                <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
                
                {/* VISITOR PASS MODAL */}
                {activeModal === 'visitor' && (
                    <>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><UserPlus className="text-blue-600"/> Visitor Pass</h3>
                        {generatedVisitorCode ? (
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="bg-white p-2 border rounded-lg">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${generatedVisitorCode}`} alt="Visitor QR" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Access Code</p>
                                    <p className="text-3xl font-mono font-bold tracking-widest">{generatedVisitorCode}</p>
                                </div>
                                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">Share this code or QR with your visitor.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleVisitorSubmit} className="space-y-3">
                                <input required placeholder="Visitor Name" className="w-full p-3 border rounded-lg" value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} />
                                <input required placeholder="Visitor Phone" type="tel" className="w-full p-3 border rounded-lg" value={visitorForm.phone} onChange={e => setVisitorForm({...visitorForm, phone: e.target.value})} />
                                <input required type="date" className="w-full p-3 border rounded-lg" value={visitorForm.date} onChange={e => setVisitorForm({...visitorForm, date: e.target.value})} />
                                <button disabled={processing} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">{processing ? 'Generating...' : 'Generate Pass'}</button>
                            </form>
                        )}
                    </>
                )}

                {/* COMPLAINT MODAL */}
                {activeModal === 'complaint' && (
                    <>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><MessageSquare className="text-orange-600"/> File Complaint</h3>
                        <form onSubmit={handleComplaintSubmit} className="space-y-3">
                            <input required placeholder="Subject (e.g. Broken Streetlight)" className="w-full p-3 border rounded-lg" value={complaintForm.subject} onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})} />
                            <textarea required placeholder="Describe the issue..." rows={4} className="w-full p-3 border rounded-lg" value={complaintForm.message} onChange={e => setComplaintForm({...complaintForm, message: e.target.value})} />
                            <button disabled={processing} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700">{processing ? 'Submitting...' : 'Submit Complaint'}</button>
                        </form>
                    </>
                )}

                {/* REPLY MODAL */}
                {activeModal === 'reply' && (
                    <>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Reply className="text-blue-600"/> Reply to Admin</h3>
                        <form onSubmit={handleReplySubmit} className="space-y-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                                <p>Sending reply to Estate Admin.</p>
                            </div>
                            <textarea 
                                required 
                                placeholder="Type your reply here..." 
                                rows={4} 
                                className="w-full p-3 border rounded-lg" 
                                value={replyMessage} 
                                onChange={e => setReplyMessage(e.target.value)} 
                            />
                            <button disabled={processing} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                                {processing ? 'Sending...' : <><Mail size={16}/> Send Reply</>}
                            </button>
                        </form>
                    </>
                )}

                {/* PAYMENT MODAL */}
                {activeModal === 'payment' && (
                    <>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="text-emerald-600"/> Pay Annual Levy</h3>
                        
                        {estateInfo?.bankName && (
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-sm">
                                  <div className="flex items-center gap-2 mb-2 text-gray-500 font-bold uppercase text-xs">
                                      <Banknote size={14} /> Estate Account Details
                                  </div>
                                  <div className="flex justify-between border-b border-gray-200 pb-1 mb-1">
                                      <span className="text-gray-600">Bank:</span>
                                      <span className="font-bold text-gray-800">{estateInfo.bankName}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-gray-200 pb-1 mb-1">
                                      <span className="text-gray-600">Acc Name:</span>
                                      <span className="font-bold text-gray-800">{estateInfo.accountName || estateInfo.name}</span> 
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="text-gray-600">Account:</span>
                                      <span className="font-bold font-mono text-gray-800 tracking-wider select-all">{estateInfo.accountNumber}</span>
                                  </div>
                             </div>
                        )}

                        {generatedPaymentCode ? (
                            <div className="flex flex-col items-center text-center space-y-4">
                                <CheckCircle size={48} className="text-green-500" />
                                <p className="text-lg font-bold">Payment Submitted!</p>
                                <div className="bg-white p-2 border rounded-lg">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${generatedPaymentCode}`} alt="Payment QR" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Reference</p>
                                    <p className="text-xl font-mono font-bold">{generatedPaymentCode}</p>
                                </div>
                                <p className="text-xs text-gray-400">Your payment is being processed by admin.</p>
                            </div>
                        ) : (
                            <form onSubmit={handlePaymentSubmit} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input required type="number" placeholder="Amount" className="w-full p-3 border rounded-lg" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                                    <input required placeholder="Phone" className="w-full p-3 border rounded-lg" value={paymentForm.phone} onChange={e => setPaymentForm({...paymentForm, phone: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input required placeholder="Street Name" className="w-full p-3 border rounded-lg" value={paymentForm.street} onChange={e => setPaymentForm({...paymentForm, street: e.target.value})} />
                                    <input required placeholder="House No." className="w-full p-3 border rounded-lg" value={paymentForm.houseNo} onChange={e => setPaymentForm({...paymentForm, houseNo: e.target.value})} />
                                </div>
                                <input required placeholder="House ID / Block ID" className="w-full p-3 border rounded-lg" value={paymentForm.houseId} onChange={e => setPaymentForm({...paymentForm, houseId: e.target.value})} />
                                <input placeholder="Payment Description (Optional)" className="w-full p-3 border rounded-lg" value={paymentForm.desc} onChange={e => setPaymentForm({...paymentForm, desc: e.target.value})} />
                                
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
                                    <input type="file" id="receipt" className="hidden" onChange={(e) => setPaymentForm({...paymentForm, receipt: 'https://fake-url.com/receipt.jpg'})} />
                                    <label htmlFor="receipt" className="cursor-pointer flex flex-col items-center">
                                        <Upload className="text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500">{paymentForm.receipt ? 'Receipt Attached' : 'Upload Payment Receipt'}</span>
                                    </label>
                                </div>

                                <button disabled={processing} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">{processing ? 'Processing...' : 'Submit Payment'}</button>
                            </form>
                        )}
                    </>
                )}

                {/* TOKEN ACTIVATION MODAL */}
                {activeModal === 'token_activation' && (
                    <>
                         <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Ticket className="text-indigo-600"/> Activate Annual Token</h3>
                         <form onSubmit={handleTokenActivation} className="space-y-4">
                             <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                                 <p className="text-sm text-indigo-800 mb-1 font-bold">Enter the code from your annual token</p>
                                 <p className="text-xs text-indigo-600">This links the token to your digital profile for gate access. One-time use only.</p>
                             </div>
                             <input 
                                required 
                                className="w-full p-4 border-2 border-indigo-200 rounded-xl text-center font-mono text-xl tracking-widest uppercase focus:border-indigo-500 outline-none" 
                                placeholder="RES-XXXXX"
                                value={tokenInput} 
                                onChange={e => setTokenInput(e.target.value.toUpperCase())} 
                             />
                             <button disabled={processing} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                                 {processing ? 'Activating...' : 'Activate Token'}
                             </button>
                         </form>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};