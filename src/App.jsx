// Ficheiro: src/App.jsx
import React, { useState, useEffect } from "react";

// Context Providers
import { WindowManagerProvider } from "./contexts/WindowManagerContext.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";

// Core UI Components
import Taskbar from "./components/Taskbar/Taskbar.jsx";
import Desktop from "./components/Desktop/Desktop.jsx";

// Startup Sequence Components
import BootScreen from "./components/Login/BootScreen.jsx";
import LoginScreen from "./components/Login/LoginScreen.jsx";
import CreateProfileScreen from "./components/Login/CreateProfileScreen.jsx";

/**
 * Componente que gere a Máquina de Estados do Sistema Operativo.
 * Sequência de Boot:
 * 1. BootScreen (Simulação BIOS/Loading)
 * 2. LoginScreen (Autenticação)
 * 3. CreateProfileScreen (Apenas se for novo utilizador sem nome/foto)
 * 4. Desktop (Ambiente de Trabalho)
 */
const OSContent = () => {
  const { currentUser, logout } = useAuth();

  // State Machine
  const [bootCompleted, setBootCompleted] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Monitoriza o perfil do utilizador para decidir se mostra o Wizard de Setup
  useEffect(() => {
    // Se o utilizador tem Nome E Foto, consideramos o setup completo.
    // Nota: O Login Google geralmente preenche isto automaticamente.
    if (currentUser?.displayName && currentUser?.photoURL) {
      setSetupComplete(true);
    } else {
      setSetupComplete(false);
    }
  }, [currentUser]);

  // --- ESTADO 1: BOOT SEQUENCER ---
  if (!bootCompleted) {
    return <BootScreen onComplete={() => setBootCompleted(true)} />;
  }

  // --- ESTADO 2: AUTENTICAÇÃO ---
  if (!currentUser) {
    return <LoginScreen />;
  }

  // --- ESTADO 3: FIRST RUN WIZARD (Setup de Perfil) ---
  if (!setupComplete) {
    return (
      <CreateProfileScreen
        user={currentUser}
        onComplete={() => {
          // Otimisticamente define como completo para transição imediata
          setSetupComplete(true);
        }}
        onCancel={logout} // Se cancelar, volta para o Login
      />
    );
  }

  // --- ESTADO 4: AMBIENTE DE TRABALHO (DESKTOP) ---
  // Envolvemos o Desktop no WindowManagerProvider apenas aqui,
  // para garantir que as janelas só existem quando há um utilizador logado.
  return (
    <WindowManagerProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col relative font-sans select-none cursor-default">
        {/* Camada de Fundo e Ícones */}
        <div className="flex-grow relative z-0">
          <Desktop />
        </div>

        {/* Barra de Tarefas (Z-Index alto gerido internamente) */}
        <Taskbar />
      </div>
    </WindowManagerProvider>
  );
};

// Componente Raiz
const App = () => {
  return (
    // O AuthProvider envolve tudo para manter a persistência da sessão
    <AuthProvider>
      <OSContent />
    </AuthProvider>
  );
};

export default App;
