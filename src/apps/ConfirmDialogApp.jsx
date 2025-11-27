import React from "react";
import { FaQuestionCircle, FaTimesCircle } from "react-icons/fa";
import { useWindowManager } from "../contexts/WindowManagerContext";

// Este componente representa o diálogo de confirmação estilo Windows XP
const ConfirmDialogApp = ({ windowId, title, message, onConfirm, icon }) => {
  const { closeWindow } = useWindowManager();

  // Lógica para o botão "Yes"
  const handleYes = () => {
    if (onConfirm) {
      onConfirm(); // Executa a função de exclusão passada (performDeletion)
    }
    closeWindow(windowId); // Fecha esta janela de diálogo
  };

  // Lógica para o botão "No" / Cancelar
  const handleNo = () => {
    closeWindow(windowId);
  };

  // Determina o ícone visual (para dar o toque de diálogo do sistema)
  const renderIcon = () => {
    if (icon === "warning")
      return <FaTimesCircle className="text-red-600 text-3xl" />;
    return <FaQuestionCircle className="text-blue-600 text-3xl" />;
  };

  return (
    <div className="w-full h-full bg-[#D4D0C8] text-black p-4 flex flex-col justify-between select-none">
      <div className="flex items-center gap-4 mb-4">
        {renderIcon()}
        {/* O conteúdo da mensagem é renderizado aqui */}
        <p className="text-sm font-sans">
          {message || "Are you sure you want to proceed?"}
        </p>
      </div>

      <div className="flex justify-center gap-4 mt-auto">
        <button
          onClick={handleYes}
          className="w-20 h-7 bg-[#D4D0C8] border-t-white border-l-white border-2 border-r-gray-600 border-b-gray-600 text-xs font-sans shadow-md active:border-r-white active:border-b-white active:border-l-gray-600 active:border-t-gray-600"
        >
          Yes
        </button>
        <button
          onClick={handleNo}
          className="w-20 h-7 bg-[#D4D0C8] border-t-white border-l-white border-2 border-r-gray-600 border-b-gray-600 text-xs font-sans shadow-md active:border-r-white active:border-b-white active:border-l-gray-600 active:border-t-gray-600"
        >
          No
        </button>
      </div>
    </div>
  );
};

export default ConfirmDialogApp;
