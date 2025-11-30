
import React, { useState, useEffect } from 'react';
import { LogOut, CreditCard, History, CheckCircle, Clock, Phone, AlertTriangle, UserPlus, MessageSquare, Upload, QrCode, X, Bell, ThumbsUp, ThumbsDown, MessageSquareMore } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Resident, ViewType, Payment, VisitRequest } from '../types';
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
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [estatePhone, setEstatePhone] = useState<string>('');
  
  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'visitor' | 'complaint' | 'payment'>('none');
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
  
  // Approval Note State
  const [approvalNotes, setApprovalNotes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchPayments();
    fetchEstateDetails();
    fetchVisitRequests();
  }, [residentData]);

  const fetchEstateDetails = async () => {
    try {
        const q = query(collection(db, 'estates'), where('estateId', '==', residentData.estateId));
        const snapshot = await getDocs(q);
        if(!snapshot.empty) {
            setEstatePhone(snapshot.docs[0].data().phone);
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
            {estatePhone && (
                <a href={`tel:${estatePhone}`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
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
         <button className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center gap-2 cursor-not-allowed opacity-60">
             <div className="p-3 bg-gray-200 rounded-full text-gray-500"><History /></div>
             <span className="font-semibold text-gray-500">Notices</span>
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

                {/* PAYMENT MODAL */}
                {activeModal === 'payment' && (
                    <>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="text-emerald-600"/> Pay Annual Levy</h3>
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
            </div>
        </div>
      )}
    </div>
  );
};
