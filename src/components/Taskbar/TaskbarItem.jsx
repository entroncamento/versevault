import React from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";

/**
 * Componente Item da Barra de Tarefas (Aba da Janela).
 * Representa uma janela aberta (minimizada ou não).
 * * Lógica de UI:
 * - O item parece "pressionado" (ativo) se a janela estiver focada (maior Z-Index).
 * - O item parece "levantado" (inativo) se a janela estiver em segundo plano ou minimizada.
 */
const TaskbarItem = ({ window }) => {
  // Consumimos o contexto para saber o estado de todas as janelas
  const { restoreWindow, windows, minimizeWindow } = useWindowManager();

  // =========================================================
  // LÓGICA DE ESTADO ATIVO
  // =========================================================
  // 1. Encontra o maior Z-Index atual entre todas as janelas.
  const highestZIndex = Math.max(...windows.map((w) => w.zIndex), 0);

  // 2. Determina se ESTA janela é a que está no topo e visível.
  const isActive = !window.isMinimized && window.zIndex === highestZIndex;

  // =========================================================
  // HANDLERS
  // =========================================================
  const handleClick = () => {
    if (isActive) {
      // Comportamento Nativo do Windows:
      // Se já está ativa e clicas na barra, ela minimiza.
      if (minimizeWindow) minimizeWindow(window.id);
    } else {
      // Caso contrário, traz para a frente (Restore/Focus).
      restoreWindow(window.id);
    }
  };

  // =========================================================
  // ESTILOS (Tailwind + Variáveis CSS do XP)
  // =========================================================
  const baseStyle =
    "h-full flex-grow max-w-[160px] rounded-sm flex items-center space-x-1.5 px-2 text-white text-xs text-left truncate transition-all duration-75 select-none";

  // Estilo "Pressionado" (Escuro)
  const activeStyle =
    "bg-gradient-to-b from-xp-item-active-start to-xp-item-active-end shadow-xp-item-active font-bold opacity-100";

  // Estilo "Levantado" (Normal)
  const inactiveStyle =
    "bg-gradient-to-b from-xp-item-inactive-start to-xp-item-inactive-end shadow-xp-item-inactive hover:from-xp-blue-light hover:brightness-110 opacity-90";

  return (
    <button
      onClick={handleClick}
      className={`${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}
      title={window.title} // Tooltip nativo com o nome completo
    >
      <img
        src={window.icon || "/icons/notepad.png"} // Fallback Icon
        alt=""
        className="w-4 h-4 pointer-events-none"
        onError={(e) => (e.target.style.display = "none")}
      />
      <span className="truncate w-full relative -top-[1px]">
        {window.title}
      </span>
    </button>
  );
};

export default TaskbarItem;
