import React from "react";

const WindowButton = ({ type, onClick, disabled }) => {
  // Estilos base para simular o botão 3D do XP
  const baseStyle =
    "w-[21px] h-[21px] ml-[2px] border border-white/60 rounded-[3px] shadow-sm flex items-center justify-center relative overflow-hidden active:brightness-90 transition-all";

  // O botão de fechar é vermelho/laranja, os outros são azuis
  const bgClass =
    type === "close"
      ? "bg-gradient-to-b from-[#E07B63] via-[#D04728] to-[#C22E0D] hover:brightness-110"
      : "bg-gradient-to-b from-[#6291F5] via-[#3266D5] to-[#1A49B4] hover:brightness-110 opacity-90";

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${bgClass} ${
        disabled ? "opacity-50 cursor-default" : ""
      }`}
    >
      {/* Ícones desenhados com CSS/SVG para precisão */}
      {type === "minimize" && (
        <div className="w-2 h-[2px] bg-white shadow-sm mt-2" />
      )}

      {type === "maximize" && (
        <div className="w-[10px] h-[9px] border-[2px] border-white shadow-sm border-t-[3px]" />
      )}

      {type === "close" && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          <path
            d="M1 1L9 9M9 1L1 9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
};

const WindowControls = ({ onMinimize, onMaximize, onClose }) => {
  return (
    <div className="flex items-center p-[2px]">
      <WindowButton type="minimize" onClick={onMinimize} />
      <WindowButton type="maximize" onClick={onMaximize} />
      <WindowButton type="close" onClick={onClose} />
    </div>
  );
};

export default WindowControls;
