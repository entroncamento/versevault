import React, { useState, useEffect } from "react";
import { WindowManagerProvider } from "./contexts/WindowManagerContext.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import Taskbar from "./components/Taskbar/Taskbar.jsx";
import Desktop from "./components/Desktop/Desktop.jsx";
import BootScreen from "./components/Login/BootScreen.jsx";
import LoginScreen from "./components/Login/LoginScreen.jsx";
import CreateProfileScreen from "./components/Login/CreateProfileScreen.jsx"; // <--- Novo Componente

// Placeholders
import "./apps/QuizApp.jsx";
import "./apps/MyComputer.jsx";

const OSContent = () => {
  const [bootCompleted, setBootCompleted] = useState(false);
  const { currentUser, logout } = useAuth();

  // Estado para controlar se o perfil já foi confirmado/criado
  const [setupComplete, setSetupComplete] = useState(() => {
    // Inicializa com base no currentUser (se disponível) para evitar mostrar
    // o ecrã de criação de perfil quando o utilizador já tiver nome/foto.
    // Se currentUser ainda não estiver carregado, assumimos false e atualizamos
    // no effect abaixo.
    return Boolean(
      typeof window !== "undefined" &&
        // currentUser poderá ser undefined no momento da inicialização,
        // por isso acedemos dinamicamente ao objeto através de useAuth.
        false
    );
  });

  // Atualiza setupComplete quando o estado do utilizador muda.
  useEffect(() => {
    if (!currentUser) {
      setSetupComplete(false);
      return;
    }

    // Consideramos o setup completo apenas se o utilizador tiver tanto
    // displayName quanto photoURL preenchidos. Caso contrário mostramos
    // o CreateProfileScreen para que possa definir estes valores.
    if (currentUser.displayName && currentUser.photoURL) {
      setSetupComplete(true);
    } else {
      setSetupComplete(false);
    }
  }, [currentUser]);

  // 1. Boot Screen
  if (!bootCompleted) {
    return <BootScreen onComplete={() => setBootCompleted(true)} />;
  }

  // 2. Login Screen (Se não houver user)
  if (!currentUser) {
    return <LoginScreen />;
  }

  // 3. Create Profile Screen (Se houver user, mas ainda não confirmou o perfil)
  if (!setupComplete) {
    return (
      <CreateProfileScreen
        user={currentUser}
        onComplete={() => setSetupComplete(true)} // Avança para o Desktop
        onCancel={logout} // Volta ao Login se cancelar
      />
    );
  }

  // 4. Desktop (OS Completo)
  return (
    <WindowManagerProvider>
      <Desktop />
      <Taskbar />
    </WindowManagerProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <OSContent />
    </AuthProvider>
  );
};

export default App;
