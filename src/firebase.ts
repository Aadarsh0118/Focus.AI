import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from "firebase/firestore";

// Firebase Applet Config
const firebaseConfig = {
  apiKey: "AIzaSyAZd0JTJxf54VEdn9BqBNOPmCUWWDh3biU",
  authDomain: "subtle-melody-srr5c.firebaseapp.com",
  projectId: "subtle-melody-srr5c",
  storageBucket: "subtle-melody-srr5c.firebasestorage.app",
  messagingSenderId: "979797270632",
  appId: "1:979797270632:web:0d3ea83b5090a3850bdbdd"
};

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Database ID if provided
export const db = getFirestore(app, "ai-studio-aiproductivityco-a76a919b-9cdd-4e1d-8f59-b0954eda5f0b");

// Initialize Auth
export const auth = getAuth(app);

// Providers
export const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  occupation: string;
  gender: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

// Helpers
export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};
export type { FirebaseUser };
