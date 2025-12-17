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

// Criação do Contexto (Memória Global de Autenticação)
const AuthContext = createContext();

// Hook personalizado para acesso fácil em qualquer componente
// Ex: const { currentUser } = useAuth();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState(null);

  // O 'loading' é crucial aqui. Começa como true porque
  // quando a app arranca, ainda não sabemos se o user está logado ou não
  // (o Firebase demora uns milissegundos a verificar o token local).
  const [loading, setLoading] = useState(true);

  // --- WRAPPERS (Abstração do Firebase) ---
  // Estas funções apenas passam o pedido para o SDK do Firebase.
  // Os erros (try/catch) devem ser tratados nos componentes visuais (LoginScreen).

  const loginGoogle = () => {
    // Popup é preferível a redirect para não perder o estado da app
    return signInWithPopup(auth, googleProvider);
  };

  const loginEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // --- O "OBSERVADOR" (Listener) ---
  useEffect(() => {
    // Este listener dispara automaticamente sempre que o estado de auth muda
    // (Login, Logout, Token Refresh, etc.)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      // Assim que temos uma resposta (seja user ou null),
      // podemos parar o loading e mostrar a app.
      setLoading(false);
    });

    // Cleanup: Remove o listener quando o componente é desmontado para evitar memory leaks
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
      {/* BLOCKING LOADING PATTERN:
        Só renderizamos os filhos (a App) quando o loading termina.
        Isto previne "flashes" de conteúdo não autorizado e redirecionamentos errados.
      */}
      {!loading ? (
        children
      ) : (
        // Ecrã de Loading de Sistema (Fallback Minimalista)
        // Aparece apenas por uma fração de segundo antes do BootScreen real.
        <div className="w-full h-screen bg-black text-white flex items-center justify-center font-mono text-sm">
          Initializing VerseVault System...
        </div>
      )}
    </AuthContext.Provider>
  );
};
