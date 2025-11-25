// Ficheiro: src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginGoogle = () => signInWithPopup(auth, googleProvider);

  const loginEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loginGoogle,
    loginEmail,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Renderiza children apenas quando o loading terminar */}
      {!loading ? (
        children
      ) : (
        <div className="w-full h-screen bg-black text-white flex items-center justify-center">
          Carregando Sistema...
        </div>
      )}
    </AuthContext.Provider>
  );
};
