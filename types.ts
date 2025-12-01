
import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
}

export interface Estate {
  id?: string;
  estateId: string;
  name: string;
  address: string;
  adminName: string;
  phone: string;
  email: string;
  createdBy: string;
  createdAt: Timestamp;
  approved: boolean;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface Resident {
  id?: string;
  fullName: string;
  phone: string;
  estateId: string;
  estateName: string;
  userId: string;
  uid: string;
  address: string;
  annualLevy: string;
  registeredAt: Timestamp;
  verified: boolean;
  gatePassCode?: string;
  photoUrl?: string;
  active?: boolean;
}

export interface Payment {
  id?: string;
  residentId: string;
  residentName: string;
  estateId: string;
  amount: number;
  date: Timestamp;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  payerPhone?: string;
  streetName?: string;
  houseNumber?: string;
  description?: string;
  houseId?: string;
  receiptUrl?: string;
}

export interface Complaint {
  id?: string;
  residentId: string;
  residentName: string;
  estateId: string;
  subject: string;
  message: string;
  date: Timestamp;
  status: 'open' | 'resolved';
}

export interface VisitorPass {
  id?: string;
  residentId: string;
  residentName: string;
  estateId: string;
  visitorName: string;
  visitorPhone: string;
  visitDate: string;
  accessCode: string;
  createdAt: Timestamp;
}

export interface VisitRequest {
  id?: string;
  visitorName: string;
  visitorPhone: string;
  purpose: 'official' | 'resident';
  visitReason?: string; // e.g. "Delivery", "Plumbing"
  targetId: string; // estateId (official) or residentId (resident)
  targetName?: string; // Estate Name or Resident Name
  estateId: string;
  status: 'pending' | 'approved' | 'rejected';
  accessCode?: string;
  requestCode?: string; // Code generated for the visitor to track
  approvalNote?: string; // Note from Resident/Admin
  createdAt: Timestamp;
}

export interface ChangeRequest {
  id?: string;
  estateId: string;
  adminName: string;
  subject: string;
  details: string;
  status: 'pending' | 'resolved';
  date: Timestamp;
}

export interface AccessPin {
  id?: string;
  pin: string;
  estateId: string;
  createdAt: any; // Using any for Timestamp compatibility during generation
  expiresAt: any;
  status: 'active' | 'used';
  serialNumber: string;
}

export type ViewType = 
  | 'landing' 
  | 'admin-login' 
  | 'admin-register' 
  | 'admin-dashboard' 
  | 'user-register' 
  | 'user-id-card'
  | 'user-login'
  | 'user-dashboard'
  | 'security-check'
  | 'gate-pass'
  | 'super-admin-login'
  | 'super-admin-dashboard';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | '';
}