import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJ59xEbgeaYMi1c-amt0-oHuMYzLiOSRE",
  authDomain: "estate-app-58b03.firebaseapp.com",
  projectId: "estate-app-58b03",
  storageBucket: "estate-app-58b03.firebasestorage.app",
  messagingSenderId: "345798491298",
  appId: "1:345798491298:web:717170fb7777b26ab56bfb",
  measurementId: "G-3PYE3BW4MW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);