import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7nZFCqn0G026Utoa6TepeRQgyRA-tSo4",
  authDomain: "versevault-5f1d5.firebaseapp.com",
  projectId: "versevault-5f1d5",
  storageBucket: "versevault-5f1d5.firebasestorage.app",
  messagingSenderId: "649916647167",
  appId: "1:649916647167:web:9bff0f20641d1311376eca",
  measurementId: "G-VSMF6HFT6K",
};

// CORREÇÃO AQUI: Adicionei 'export' antes de 'const app'
export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
};
