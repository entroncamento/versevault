import React from "react";

// =========================================================
// SUB-COMPONENTE: BOTÃO DE CONTROLO INDIVIDUAL
// =========================================================
const WindowButton = ({ type, onClick, disabled }) => {
  // Estilos Base: Forma quadrada arredondada, sombra branca interna (highlight) e borda
  const baseStyle =
    "w-[21px] h-[21px] ml-[2px] border border-white/60 rounded-[3px] shadow-sm flex items-center justify-center relative overflow-hidden transition-all focus:outline-none";

  // Variações de Cor (Tema Luna):
  // - Close: Gradiente Vermelho/Laranja
  // - Min/Max: Gradiente Azul Claro/Escuro
  const bgClass =
    type === "close"
      ? "bg-gradient-to-b from-[#E07B63] via-[#D04728] to-[#C22E0D] hover:brightness-110 active:from-[#C22E0D] active:to-[#E07B63]"
      : "bg-gradient-to-b from-[#6291F5] via-[#3266D5] to-[#1A49B4] hover:brightness-110 opacity-90 active:opacity-100 active:brightness-90";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${bgClass} ${
        disabled ? "opacity-50 cursor-default" : "cursor-default"
      }`}
      // Acessibilidade: Leitores de ecrã precisam de saber o que o botão faz
      aria-label={`${type} window`}
      title={type.charAt(0).toUpperCase() + type.slice(1)} // Tooltip nativo
    >
      {/* ÍCONES CSS/SVG
         Usamos formas CSS puras para o Min/Max para garantir nitidez em resoluções baixas,
         replicando o aspeto "pixelado" mas vetorial do XP.
      */}

      {/* Minimize: Um traço simples na parte inferior */}
      {type === "minimize" && (
        <div className="w-2 h-[2px] bg-white shadow-sm mt-2 opacity-90" />
      )}

      {/* Maximize: Um quadrado com a borda superior mais grossa */}
      {type === "maximize" && (
        <div className="w-[10px] h-[9px] border-[2px] border-white shadow-sm border-t-[3px] opacity-90" />
      )}

      {/* Close: Um 'X' vetorial perfeito */}
      {type === "close" && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm opacity-95"
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

// =========================================================
// COMPONENTE PRINCIPAL: GRUPO DE CONTROLOS
// =========================================================
const WindowControls = ({ onMinimize, onMaximize, onClose }) => {
  return (
    // Flex Container para alinhar os botões horizontalmente
    // O padding ajusta o espaçamento em relação à borda da janela
    <div className="flex items-center p-[2px] select-none">
      <WindowButton type="minimize" onClick={onMinimize} />
      <WindowButton type="maximize" onClick={onMaximize} />
      <WindowButton type="close" onClick={onClose} />
    </div>
  );
};

export default WindowControls;
