// Ficheiro: src/App.jsx
import React, { useState, useEffect } from "react";
import { WindowManagerProvider } from "./contexts/WindowManagerContext.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import Taskbar from "./components/Taskbar/Taskbar.jsx";
import Desktop from "./components/Desktop/Desktop.jsx";
import BootScreen from "./components/Login/BootScreen.jsx";
import LoginScreen from "./components/Login/LoginScreen.jsx";
import CreateProfileScreen from "./components/Login/CreateProfileScreen.jsx";

// Apps
import "./apps/QuizApp.jsx";
import "./apps/MyComputer.jsx";

const OSContent = () => {
  const [bootCompleted, setBootCompleted] = useState(false);
  const { currentUser, logout } = useAuth();

  // Inicia o estado baseado se o utilizador já tem os dados necessários.
  // Se não tiver user, é false.
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName && currentUser?.photoURL) {
      setSetupComplete(true);
    } else {
      setSetupComplete(false);
    }
  }, [currentUser]);

  // 1. Boot Screen
  if (!bootCompleted) {
    return <BootScreen onComplete={() => setBootCompleted(true)} />;
  }

  // 2. Login Screen (Se não houver user autenticado)
  if (!currentUser) {
    return <LoginScreen />;
  }

  // 3. Create Profile Screen (Logado, mas sem perfil completo)
  if (!setupComplete) {
    return (
      <CreateProfileScreen
        user={currentUser}
        onComplete={() => {
          // Força a atualização visual caso o Firebase demore a propagar
          setSetupComplete(true);
          // Aqui podes adicionar um reload forçado se necessário: window.location.reload();
        }}
        onCancel={logout}
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
