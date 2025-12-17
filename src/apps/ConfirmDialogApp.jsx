import React from "react";
import { FaQuestionCircle, FaTimesCircle } from "react-icons/fa";
import { useWindowManager } from "../contexts/WindowManagerContext";

// =========================================================
// CONSTANTES DE ESTILO (DRY Pattern)
// =========================================================
// Extraímos as classes do botão para uma constante.
// Isto evita repetição de código e torna a manutenção mais fácil.
// O estilo simula o efeito 3D (Bevel) clássico do Windows 95/98:
// - Bordas Claras (Top/Left): Simulam luz.
// - Bordas Escuras (Bottom/Right): Simulam sombra.
const XP_BUTTON_CLASS =
  "w-20 h-7 bg-[#D4D0C8] border-t-white border-l-white border-2 border-r-gray-600 border-b-gray-600 text-xs font-sans shadow-md active:border-r-white active:border-b-white active:border-l-gray-600 active:border-t-gray-600 focus:outline-dotted focus:outline-1 focus:outline-black";

/**
 * Componente de Diálogo de Sistema (Modal).
 * Representa janelas de confirmação críticas (ex: Apagar Ficheiro).
 * * * Props:
 * - windowId: Necessário para a janela se "auto-fechar".
 * - onConfirm: Função Callback. Executa a ação real se o user disser "Yes".
 * - icon: "warning" ou "question" para contexto visual.
 */
const ConfirmDialogApp = ({ windowId, title, message, onConfirm, icon }) => {
  // Hook para controlar o sistema de janelas (fechar este diálogo)
  const { closeWindow } = useWindowManager();

  // =========================================================
  // HANDLERS (Lógica de Decisão)
  // =========================================================

  const handleYes = () => {
    // Defensive Programming: Verifica se a prop onConfirm existe antes de chamar.
    // Isto previne "crash" se o programador se esquecer de passar a função.
    if (onConfirm) {
      onConfirm(); // Executa a ação destrutiva/importante (ex: deleteFile)
    }
    closeWindow(windowId); // UX: O diálogo deve desaparecer imediatamente após a ação.
  };

  const handleNo = () => {
    // Ação de Cancelamento padrão: Apenas fecha a janela sem efeitos colaterais.
    closeWindow(windowId);
  };

  // =========================================================
  // RENDERIZAÇÃO CONDICIONAL (Visual Feedback)
  // =========================================================
  const renderIcon = () => {
    // Escolhe o ícone baseado na severidade da ação
    if (icon === "warning")
      return (
        <FaTimesCircle className="text-red-600 text-3xl filter drop-shadow-sm" />
      );

    // Default para perguntas gerais
    return (
      <FaQuestionCircle className="text-blue-600 text-3xl filter drop-shadow-sm" />
    );
  };

  return (
    // Container Principal: Usa a cor clássica de sistema (#D4D0C8)
    <div className="w-full h-full bg-[#D4D0C8] text-black p-4 flex flex-col justify-between select-none">
      {/* Área de Conteúdo (Ícone + Texto) */}
      <div className="flex items-center gap-4 mb-4">
        {renderIcon()}

        {/* Mensagem Dinâmica */}
        <p className="text-sm font-sans leading-tight">
          {message || "Are you sure you want to proceed?"}
        </p>
      </div>

      {/* Área de Botões (Action Bar) */}
      <div className="flex justify-center gap-4 mt-auto">
        <button
          onClick={handleYes}
          className={XP_BUTTON_CLASS}
          autoFocus // UX: Foca no "Yes" por padrão para rapidez (cuidado em ações destrutivas)
        >
          Yes
        </button>

        <button onClick={handleNo} className={XP_BUTTON_CLASS}>
          No
        </button>
      </div>
    </div>
  );
};

export default ConfirmDialogApp;
