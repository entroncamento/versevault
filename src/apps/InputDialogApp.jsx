import React, { useState } from "react";
import { useWindowManager } from "../contexts/WindowManagerContext";

// =========================================================
// CONSTANTES DE ESTILO (DRY Pattern)
// =========================================================
// Mantemos a consistência visual com o ConfirmDialogApp.
// Centralizar as classes CSS numa constante facilita a manutenção
// e garante que todos os botões do "sistema" têm o mesmo look & feel.
const XP_BUTTON_CLASS =
  "w-20 h-6 bg-[#D4D0C8] border-t-white border-l-white border-2 border-r-gray-600 border-b-gray-600 text-xs shadow-sm active:border-r-white active:border-b-white active:border-l-gray-600 active:border-t-gray-600 focus:outline-dotted focus:outline-1 focus:outline-black";

/**
 * Componente de Input Genérico (Prompt Dialog).
 * Atua como um substituto visualmente integrado para o `window.prompt()` nativo.
 * * * Design Pattern: "Controlled Component"
 * O React controla o estado do input em tempo real, permitindo validação imediata.
 */
const InputDialogApp = ({
  windowId,
  title, // Passado pelo WindowManager (usado na barra de título), não aqui no corpo
  message,
  onConfirm,
  defaultValue = "", // Fallback para evitar inputs "uncontrolled"
}) => {
  const { closeWindow } = useWindowManager();

  // State local para gestão do valor do input
  const [value, setValue] = useState(defaultValue);

  // =========================================================
  // HANDLERS (Lógica de Negócio)
  // =========================================================

  const handleOk = () => {
    // Validação de Dados:
    // .trim() remove espaços em branco acidentais no início/fim.
    // Impede o envio de strings vazias ou compostas apenas por espaços.
    if (value.trim()) {
      if (onConfirm) onConfirm(value); // Envia dados para o componente pai
      closeWindow(windowId); // Sucesso: Fecha a janela
    } else {
      // Opcional: Aqui podíamos adicionar um estado de erro visual (ex: borda vermelha),
      // mas no estilo Windows XP clássico, geralmente nada acontece ou ouve-se um "beep".
    }
  };

  const handleCancel = () => {
    // Fluxo de Cancelamento: Fecha sem executar a callback de confirmação
    closeWindow(windowId);
  };

  return (
    // Layout Flexbox Vertical: Distribui o espaço entre a pergunta e os botões
    <div className="w-full h-full bg-[#D4D0C8] p-4 flex flex-col justify-between font-sans select-none text-xs text-black">
      {/* Área de Input */}
      <div>
        <p className="mb-3">{message || "Enter value:"}</p>
        <input
          type="text"
          value={value} // Two-way data binding
          onChange={(e) => setValue(e.target.value)}
          className="w-full border-2 border-[#7F9DB9] p-1 outline-none focus:border-[#003399]"
          // UX (User Experience):
          // 1. autoFocus: O utilizador pode começar a escrever mal a janela abre.
          // 2. onKeyDown: Permite submeter com "Enter", comportamento padrão em Desktop.
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleOk()}
        />
      </div>

      {/* Action Bar (Botões) */}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={handleOk} className={XP_BUTTON_CLASS}>
          OK
        </button>
        <button onClick={handleCancel} className={XP_BUTTON_CLASS}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default InputDialogApp;
