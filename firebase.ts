import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.log('Persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.log('Persistence failed: Not supported');
  }
});