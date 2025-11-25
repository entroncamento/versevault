import React from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";

const TaskbarItem = ({ window }) => {
  const { restoreWindow, windows } = useWindowManager();

  const highestZIndex = Math.max(...windows.map((w) => w.zIndex), 0);
  const isActive = !window.isMinimized && window.zIndex === highestZIndex;

  const handleClick = () => {
    restoreWindow(window.id);
  };

  const baseStyle =
    "h-full flex-grow max-w-[160px] rounded-sm flex items-center space-x-1.5 px-2 text-white text-xs text-left truncate";

  const activeStyle =
    "bg-gradient-to-b from-xp-item-active-start to-xp-item-active-end shadow-xp-item-active";
  const inactiveStyle =
    "bg-gradient-to-b from-xp-item-inactive-start to-xp-item-inactive-end shadow-xp-item-inactive hover:from-xp-blue-light";

  return (
    <button
      onClick={handleClick}
      className={`${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}
    >
      <img
        src={window.icon || "/icons/notepad.png"} // Usa o ícone da janela
        alt=""
        className="w-4 h-4"
      />
      <span>{window.title}</span>
    </button>
  );
};

export default TaskbarItem;
