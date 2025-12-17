// Ficheiro: src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// =========================================================
// CONFIGURAÇÃO DO FIREBASE
// =========================================================
// As chaves são carregadas via variáveis de ambiente (Vite).
// NUNCA comitar chaves reais diretamente no código fonte (hardcoded).
// Certifica-te que tens um ficheiro .env.local na raiz do projeto.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// =========================================================
// INICIALIZAÇÃO (SINGLETON PATTERN)
// =========================================================

// Inicializa a instância da aplicação Firebase
// Se houver erro aqui, verifica se as variáveis do .env estão corretas.
export const app = initializeApp(firebaseConfig);

// Inicializa o serviço de Autenticação
export const auth = getAuth(app);

// Configuração do Provider da Google
export const googleProvider = new GoogleAuthProvider();
// Opcional: Forçar seleção de conta para evitar login automático indesejado
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// =========================================================
// EXPORTS DE UTILIDADE
// =========================================================
// Re-exportamos estas funções para que o resto da app não precise
// de importar diretamente de 'firebase/auth', mantendo o código limpo.
export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
};
