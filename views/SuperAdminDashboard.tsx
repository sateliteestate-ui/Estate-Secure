
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Estate, Resident, VisitorPass, ChangeRequest, ViewType, SuperAdmin } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LogOut, Database, Users, Building, Ticket, AlertCircle, Printer, Check, X, Edit, Save, Trash2, AlertTriangle, Lock, UserPlus, Shield } from 'lucide-react';

interface SuperAdminDashboardProps {
  setView: (view: ViewType) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ setView, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'estates' | 'residents' | 'visitors' | 'requests'>('estates');
  
  const [estates, setEstates] = useState<Estate[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [visitors, setVisitors] = useState<VisitorPass[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  
  // Super Admin Management State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Editing State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editCollection, setEditCollection] = useState<string>('');

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [estateToDelete, setEstateToDelete] = useState<Estate | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
        const estSnap = await getDocs(collection(db, 'estates'));
        setEstates(estSnap.docs.map(d => ({ id: d.id, ...d.data() } as Estate)));

        const resSnap = await getDocs(collection(db, 'residents'));
        setResidents(resSnap.docs.map(d => ({ id: d.id, ...d.data() } as Resident)));

        const visSnap = await getDocs(collection(db, 'visitor_passes'));
        setVisitors(visSnap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorPass)));

        const reqSnap = await getDocs(collection(db, 'change_requests'));
        setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeRequest)));

    } catch (err) {
        console.error(err);
        showToast("Error fetching system data", "error");
    } finally {
        setLoading(false);
    }
  };

  const fetchSuperAdmins = async () => {
      setAdminLoading(true);
      try {
          const q = collection(db, 'super_admins');
          const snap = await getDocs(q);
          setSuperAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() } as SuperAdmin)));
      } catch (err) {
          console.error(err);
          showToast("Failed to fetch admins", "error");
      } finally {
          setAdminLoading(false);
      }
  };

  const handleOpenAdminModal = () => {
      setShowAdminModal(true);
      fetchSuperAdmins();
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdminEmail) return;
      setAdminLoading(true);

      const emailLower = newAdminEmail.trim().toLowerCase();

      // Check duplications locally and in DB
      if (emailLower === 'codegeniushub@gmail.com') {
          showToast("This email is already the Master Admin.", "error");
          setAdminLoading(false);
          return;
      }

      try {
          const q = query(collection(db, 'super_admins'), where('email', '==', emailLower));
          const snap = await getDocs(q);
          if (!snap.empty) {
              showToast("Admin already exists", "error");
              setAdminLoading(false);
              return;
          }

          const newAdmin = {
              email: emailLower,
              addedBy: 'Super Admin',
              createdAt: serverTimestamp()
          };

          await addDoc(collection(db, 'super_admins'), newAdmin);
          setNewAdminEmail('');
          showToast("New Super Admin Added", "success");
          fetchSuperAdmins();
      } catch (err) {
          showToast("Failed to add admin", "error");
      } finally {
          setAdminLoading(false);
      }
  };

  const handleDeleteSuperAdmin = async (id: string) => {
      if(!window.confirm("Remove this Super Admin?")) return;
      try {
          await deleteDoc(doc(db, 'super_admins', id));
          setSuperAdmins(prev => prev.filter(a => a.id !== id));
          showToast("Admin Removed", "success");
      } catch (err) {
          showToast("Failed to remove", "error");
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const openEditModal = (item: any, collectionName: string) => {
      setEditingItem({ ...item }); // Clone to avoid direct mutation
      setEditCollection(collectionName);
  };

  const handleInputChange = (field: string, value: any) => {
      setEditingItem((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
      if (!editingItem || !editingItem.id || !editCollection) return;
      
      setLoading(true);
      try {
          const docRef = doc(db, editCollection, editingItem.id);
          // Remove id field before saving to firestore
          const { id, ...dataToSave } = editingItem;
          
          await updateDoc(docRef, dataToSave);

          // Update local state
          if (editCollection === 'estates') {
              setEstates(prev => prev.map(item => item.id === id ? editingItem : item));
          } else if (editCollection === 'residents') {
              setResidents(prev => prev.map(item => item.id === id ? editingItem : item));
          } else if (editCollection === 'visitor_passes') {
              setVisitors(prev => prev.map(item => item.id === id ? editingItem : item));
          } else if (editCollection === 'change_requests') {
              setRequests(prev => prev.map(item => item.id === id ? editingItem : item));
          }

          showToast("Record updated successfully", "success");
          setEditingItem(null);
      } catch (err) {
          console.error(err);
          showToast("Failed to update record", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleResolveRequest = async (id: string) => {
      try {
          await updateDoc(doc(db, 'change_requests', id), { status: 'resolved' });
          setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
          showToast("Request marked as resolved", "success");
      } catch (err) {
          showToast("Update failed", "error");
      }
  };

  const initiateDeleteEstate = (estate: Estate) => {
    setEstateToDelete(estate);
    setDeleteConfirmationName('');
    setDeleteModalOpen(true);
  };

  const handleDeleteEstate = async () => {
    if (!estateToDelete || !estateToDelete.id) return;
    
    if (deleteConfirmationName !== estateToDelete.name) {
      showToast("Estate name does not match.", "error");
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'estates', estateToDelete.id));
      setEstates(prev => prev.filter(e => e.id !== estateToDelete.id));
      showToast("Estate deleted successfully", "success");
      setDeleteModalOpen(false);
      setEstateToDelete(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete estate", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in relative">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center print:hidden">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Database className="text-red-500" /> Super Admin Portal
                </h1>
                <p className="text-slate-400 text-sm">System Overview & Management</p>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={handleOpenAdminModal} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition border border-slate-600">
                    <Shield size={16} /> Manage Admins
                </button>
                <button onClick={() => setView('landing')} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition">
                    <LogOut size={20} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
            <button onClick={() => setActiveTab('estates')} className={`p-4 rounded-xl border transition flex flex-col items-center gap-2 ${activeTab === 'estates' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <Building /> <span className="font-bold">Estates ({estates.length})</span>
            </button>
            <button onClick={() => setActiveTab('residents')} className={`p-4 rounded-xl border transition flex flex-col items-center gap-2 ${activeTab === 'residents' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <Users /> <span className="font-bold">Residents ({residents.length})</span>
            </button>
            <button onClick={() => setActiveTab('visitors')} className={`p-4 rounded-xl border transition flex flex-col items-center gap-2 ${activeTab === 'visitors' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <Ticket /> <span className="font-bold">Visitors ({visitors.length})</span>
            </button>
            <button onClick={() => setActiveTab('requests')} className={`p-4 rounded-xl border transition flex flex-col items-center gap-2 ${activeTab === 'requests' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <AlertCircle /> <span className="font-bold">Requests ({requests.filter(r => r.status === 'pending').length})</span>
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:bg-white print:border-b-2 print:mb-4">
                <h2 className="font-bold text-lg text-gray-800 uppercase tracking-wide">{activeTab} Database</h2>
                <button onClick={handlePrint} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black print:hidden">
                    <Printer size={16} /> Print Report
                </button>
            </div>
            
            {loading && !editingItem && !deleteModalOpen ? <LoadingSpinner /> : (
                <div className="overflow-x-auto">
                    {activeTab === 'estates' && (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Estate Name</th>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">Admin</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Approved</th>
                                    <th className="px-6 py-3 print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {estates.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold">{e.name}</td>
                                        <td className="px-6 py-4 font-mono">{e.estateId}</td>
                                        <td className="px-6 py-4">{e.adminName}</td>
                                        <td className="px-6 py-4">{e.email}</td>
                                        <td className="px-6 py-4">
                                            {e.approved ? <Check size={16} className="text-green-500"/> : <X size={16} className="text-red-500"/>}
                                        </td>
                                        <td className="px-6 py-4 print:hidden flex gap-2">
                                            <button onClick={() => openEditModal(e, 'estates')} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => initiateDeleteEstate(e)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'residents' && (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Resident ID</th>
                                    <th className="px-6 py-3">Estate</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Gate Pass</th>
                                    <th className="px-6 py-3 print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {residents.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold">{r.fullName}</td>
                                        <td className="px-6 py-4 font-mono">{r.userId}</td>
                                        <td className="px-6 py-4">{r.estateName}</td>
                                        <td className="px-6 py-4">
                                            {r.verified ? <span className="text-green-600 font-bold">Verified</span> : <span className="text-yellow-600">Pending</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono">{r.gatePassCode || '-'}</td>
                                        <td className="px-6 py-4 print:hidden">
                                            <button onClick={() => openEditModal(r, 'residents')} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    
                    {activeTab === 'visitors' && (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Visitor</th>
                                    <th className="px-6 py-3">Host Resident</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Code</th>
                                    <th className="px-6 py-3 print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visitors.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold">{v.visitorName}</td>
                                        <td className="px-6 py-4">{v.residentName}</td>
                                        <td className="px-6 py-4">{v.visitDate}</td>
                                        <td className="px-6 py-4 font-mono">{v.accessCode}</td>
                                        <td className="px-6 py-4 print:hidden">
                                            <button onClick={() => openEditModal(v, 'visitor_passes')} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'requests' && (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Subject</th>
                                    <th className="px-6 py-3">From Admin</th>
                                    <th className="px-6 py-3">Details</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Action</th>
                                    <th className="px-6 py-3 print:hidden">Edit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold">{req.subject}</td>
                                        <td className="px-6 py-4">{req.adminName}</td>
                                        <td className="px-6 py-4 max-w-xs">{req.details}</td>
                                        <td className="px-6 py-4">
                                            {req.status === 'resolved' ? 
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Resolved</span> : 
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.status === 'pending' && (
                                                <button onClick={() => handleResolveRequest(req.id!)} className="text-blue-600 hover:underline font-bold text-xs">Mark Resolved</button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 print:hidden">
                                            <button onClick={() => openEditModal(req, 'change_requests')} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && estateToDelete && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-bounce-in p-6">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="bg-red-100 p-3 rounded-full mb-4">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Delete Estate?</h3>
                        <p className="text-gray-500 text-sm mt-2">
                            This action cannot be undone. This will permanently delete 
                            <span className="font-bold text-gray-800"> {estateToDelete.name}</span> and all associated data.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type estate name to confirm</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border-2 border-red-200 rounded-lg focus:border-red-500 outline-none"
                                placeholder={estateToDelete.name}
                                value={deleteConfirmationName}
                                onChange={(e) => setDeleteConfirmationName(e.target.value)}
                                onPaste={(e) => setDeleteConfirmationName(e.clipboardData.getData('Text'))}
                            />
                        </div>

                        <button 
                            onClick={handleDeleteEstate}
                            disabled={deleteConfirmationName !== estateToDelete.name || loading}
                            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? 'Deleting...' : <><Trash2 size={18} /> Confirm Deletion</>}
                        </button>
                        
                        <button 
                            onClick={() => setDeleteModalOpen(false)}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Super Admin Management Modal */}
        {showAdminModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-bounce-in overflow-hidden">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Shield size={18} /> Manage Super Admins</h3>
                        <button onClick={() => setShowAdminModal(false)} className="hover:text-slate-300"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleAddSuperAdmin} className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Assign New Super Admin</label>
                            <div className="flex gap-2">
                                <input 
                                    type="email" 
                                    required
                                    placeholder="Enter email address"
                                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newAdminEmail}
                                    onChange={e => setNewAdminEmail(e.target.value)}
                                />
                                <button disabled={adminLoading} type="submit" className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    <UserPlus size={20} />
                                </button>
                            </div>
                        </form>

                        <div className="border-t pt-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Current Admins</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-l-4 border-l-indigo-500">
                                    <span className="font-semibold text-sm">codegeniushub@gmail.com</span>
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Master</span>
                                </div>
                                {superAdmins.map(admin => (
                                    <div key={admin.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                                        <span className="text-sm text-gray-700">{admin.email}</span>
                                        <button onClick={() => handleDeleteSuperAdmin(admin.id!)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {superAdmins.length === 0 && <p className="text-xs text-gray-400 text-center">No additional admins assigned.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Generic Edit Modal */}
        {editingItem && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-bounce-in overflow-hidden max-h-[90vh] overflow-y-auto">
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Edit size={18}/> Edit Record</h3>
                        <button onClick={() => setEditingItem(null)} className="hover:text-red-400"><X /></button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {editCollection === 'estates' && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Estate Name</label>
                                    <input className="w-full p-2 border rounded" value={editingItem.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Estate ID</label>
                                        <input className="w-full p-2 border rounded font-mono" value={editingItem.estateId || ''} onChange={(e) => handleInputChange('estateId', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Admin Name</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.adminName || ''} onChange={(e) => handleInputChange('adminName', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                                    <input className="w-full p-2 border rounded" value={editingItem.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Lock size={12}/> Admin Passcode</label>
                                    <input className="w-full p-2 border rounded bg-slate-50 border-slate-200" value={editingItem.adminPasscode || ''} onChange={(e) => handleInputChange('adminPasscode', e.target.value)} placeholder="Security Code"/>
                                </div>

                                {/* Bank Details */}
                                <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Account Name</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.accountName || ''} onChange={(e) => handleInputChange('accountName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Bank Name</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.bankName || ''} onChange={(e) => handleInputChange('bankName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Account Number</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.accountNumber || ''} onChange={(e) => handleInputChange('accountNumber', e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input type="checkbox" id="approved" checked={editingItem.approved || false} onChange={(e) => handleInputChange('approved', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                                    <label htmlFor="approved" className="font-bold text-gray-700">Approved</label>
                                </div>
                            </>
                        )}

                        {editCollection === 'residents' && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                    <input className="w-full p-2 border rounded" value={editingItem.fullName || ''} onChange={(e) => handleInputChange('fullName', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">User ID</label>
                                        <input className="w-full p-2 border rounded font-mono" value={editingItem.userId || ''} onChange={(e) => handleInputChange('userId', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                                        <input className="w-full p-2 border rounded" value={editingItem.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                                    <input className="w-full p-2 border rounded" value={editingItem.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Annual Levy</label>
                                        <input className="w-full p-2 border rounded" type="number" value={editingItem.annualLevy || ''} onChange={(e) => handleInputChange('annualLevy', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Gate Pass Code</label>
                                        <input className="w-full p-2 border rounded font-mono" value={editingItem.gatePassCode || ''} onChange={(e) => handleInputChange('gatePassCode', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Estate Name (Display Only)</label>
                                    <input className="w-full p-2 border rounded bg-gray-100" value={editingItem.estateName || ''} disabled />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input type="checkbox" id="verified" checked={editingItem.verified || false} onChange={(e) => handleInputChange('verified', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                                    <label htmlFor="verified" className="font-bold text-gray-700">Verified</label>
                                </div>
                            </>
                        )}

                        {editCollection === 'visitor_passes' && (
                             <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Visitor Name</label>
                                    <input className="w-full p-2 border rounded" value={editingItem.visitorName || ''} onChange={(e) => handleInputChange('visitorName', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Visit Date</label>
                                        <input className="w-full p-2 border rounded" type="date" value={editingItem.visitDate || ''} onChange={(e) => handleInputChange('visitDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Access Code</label>
                                        <input className="w-full p-2 border rounded font-mono" value={editingItem.accessCode || ''} onChange={(e) => handleInputChange('accessCode', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Host Resident</label>
                                    <input className="w-full p-2 border rounded bg-gray-100" value={editingItem.residentName || ''} disabled />
                                </div>
                            </>
                        )}

                        {editCollection === 'change_requests' && (
                             <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                                    <input className="w-full p-2 border rounded" value={editingItem.subject || ''} onChange={(e) => handleInputChange('subject', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Details</label>
                                    <textarea className="w-full p-2 border rounded" rows={3} value={editingItem.details || ''} onChange={(e) => handleInputChange('details', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                                    <select className="w-full p-2 border rounded" value={editingItem.status || 'pending'} onChange={(e) => handleInputChange('status', e.target.value)}>
                                        <option value="pending">Pending</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>
                            </>
                        )}
                        
                        <div className="pt-4 flex gap-3">
                            <button onClick={handleSaveEdit} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                                <Save size={18} /> Save Changes
                            </button>
                            <button onClick={() => setEditingItem(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};