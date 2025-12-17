import React, { useState } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";
import StartButton from "./StartButton.jsx";
import TaskbarItem from "./TaskbarItem.jsx";
import Clock from "./Clock.jsx";
import StartMenu from "../StartMenu/StartMenu.jsx";

// Importamos ícones para a System Tray (Área de Notificação)
import { FaVolumeUp, FaWifi, FaShieldAlt } from "react-icons/fa";

/**
 * Componente Taskbar (Barra de Tarefas).
 * Estrutura:
 * [Botão Iniciar] | [Lista de Janelas (Flex Grow)] | [System Tray (Relógio + Ícones)]
 */
const Taskbar = () => {
  const { windows } = useWindowManager();
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  return (
    <>
      {/* Renderização Condicional do Menu Iniciar.
        Ele flutua acima da taskbar (controlado pelo CSS absolute/bottom).
      */}
      {startMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}

      <div
        // Z-Index 1000 garante que a barra está sempre acima das janelas (que costumam ir até 50-100)
        className="absolute bottom-0 left-0 right-0 h-[30px] bg-gradient-to-b from-xp-taskbar-start to-xp-taskbar-end border-t border-xp-taskbar-border flex items-center px-1 z-[1000] select-none"
      >
        {/* 1. START BUTTON */}
        {/* O onClick inverte o estado. O componente StartButton já tem o ID necessário para o clique fora. */}
        <StartButton onClick={() => setStartMenuOpen((prev) => !prev)} />

        {/* Separador (Handle) */}
        <div className="w-[2px] h-[22px] bg-xp-separator-l border-r border-xp-separator-r ml-2 mr-1 opacity-70" />

        {/* 2. TASKBAND (Lista de Janelas) */}
        {/* flex-grow: Ocupa todo o espaço disponível entre o Iniciar e o Relógio */}
        <div className="flex-grow h-full p-1 flex items-center gap-1 overflow-hidden">
          {windows.map((w) => (
            <TaskbarItem key={w.id} window={w} />
          ))}
        </div>

        {/* 3. SYSTEM TRAY (Área de Notificação) */}
        <div
          className="h-full bg-gradient-to-t from-xp-tray-start to-xp-tray-end 
                     border-l border-xp-tray-border pl-2 pr-1
                     shadow-[inset_1px_1px_1px_rgba(0,0,0,0.2)] flex items-center gap-2"
        >
          {/* Ícones Estáticos para Realismo (System Tray Icons) */}
          <div className="flex items-center gap-2 text-white text-[10px] opacity-90 cursor-default">
            <FaShieldAlt
              title="Your computer might be at risk"
              className="text-red-300 hidden md:block"
            />
            <FaWifi title="Wireless Network Connection (Excellent)" />
            <FaVolumeUp title="Volume: 100%" />
          </div>

          {/* Relógio Digital */}
          <Clock />
        </div>
      </div>
    </>
  );
};

export default Taskbar;
