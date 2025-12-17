import React, { useState } from "react";

/**
 * Componente de Configuração da Sessão (Setup Wizard).
 * Atua como uma "Formulário Intermédio" que recolhe parâmetros (query)
 * antes de iniciar a lógica pesada do jogo.
 * * Design Pattern: "Controlled Component" (O React controla o input, não o DOM).
 */
const QuizSetup = ({ mode, onStart, onBack }) => {
  // State único para capturar o input do utilizador em tempo real
  const [query, setQuery] = useState("");

  // =========================================================
  // 1. EVENT HANDLING (Form Submission)
  // =========================================================
  const handleSubmit = (e) => {
    // Previne o "Page Reload" padrão do HTML ao submeter forms
    e.preventDefault();

    // Validação básica: Impede envio de strings vazias ou só espaços
    if (query.trim()) {
      onStart(query); // Passa os dados para o componente Pai (Lifting State Up)
    }
  };

  // =========================================================
  // 2. HELPER FUNCTIONS (Dynamic UI)
  // =========================================================
  // Estas funções encapsulam a lógica condicional, mantendo o JSX limpo (Clean Code).
  // Alteram o texto e ícones com base na prop 'mode' recebida.

  const getLabel = () => {
    if (mode === "ARTIST") return "Type the Artist's Name:";
    if (mode === "LYRICS") return "Artist to guess lyrics from:";
    if (mode === "GENRE") return "Type a Genre (e.g. Rock, Pop):";
    return "Search:";
  };

  const getIcon = () => {
    if (mode === "ARTIST") return "/icons/cd_audio_cd_a-0.png";
    if (mode === "LYRICS") return "/icons/notepad.png";
    if (mode === "GENRE") return "/icons/world-0.png";
    return "/icons/Minesweeper.ico"; // Fallback icon
  };

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] p-4 font-sans">
      {/* Header Visual da Janela */}
      <div className="mb-6 flex items-center gap-4">
        <img
          src={getIcon()}
          alt="Mode Icon"
          className="w-12 h-12 drop-shadow-md object-contain"
          // Defensive Coding: Se a imagem falhar (404), esconde-a para não quebrar o layout
          onError={(e) => (e.target.style.display = "none")}
        />
        <div>
          <h2 className="text-xl font-bold text-[#003399] italic">
            {/* Renderização Condicional Ternária para o Título */}
            {mode === "LYRICS"
              ? "Lyrics Challenge"
              : mode === "ARTIST"
              ? "Artist Master"
              : "Genre Explorer"}
          </h2>
          <p className="text-xs text-gray-600">
            Configure your game session settings.
          </p>
        </div>
      </div>

      {/* FORMULÁRIO SEMÂNTICO 
         Usar <form> permite que a tecla "Enter" submeta o formulário nativamente.
      */}
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        {/* <fieldset> e <legend>: A forma acessível e correta de agrupar campos relacionados */}
        <fieldset className="border border-[#D0D0BF] p-4 rounded-sm mb-4 bg-white shadow-inner">
          <legend className="text-xs text-[#003399] px-1 ml-2 font-bold">
            Search Parameters
          </legend>

          <label className="block text-xs mb-2 text-gray-700 font-bold">
            {getLabel()}
          </label>

          <input
            type="text"
            value={query} // Two-way binding
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-2 border-[#7F9DB9] p-1 text-sm outline-none focus:border-[#003399]"
            autoFocus // UX: Foca automaticamente para o utilizador poder escrever logo
            placeholder={mode === "GENRE" ? "e.g. 80s Pop" : "e.g. The Weeknd"}
          />
        </fieldset>

        {/* Spacer para empurrar os botões para o fundo (Flexbox trick) */}
        <div className="flex-grow" />

        {/* Footer de Ações */}
        <div className="flex justify-end gap-2 border-t border-white pt-4">
          <button
            type="button" // Importante: type="button" não submete o form
            onClick={onBack}
            className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm hover:bg-[#E1EAF8] shadow-sm"
          >
            Cancel
          </button>

          <button
            type="submit" // Este botão dispara o onSubmit do form
            disabled={!query.trim()} // UX: Desativa se não houver input
            className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm font-bold disabled:opacity-50 hover:bg-[#E1EAF8] border-b-2 border-r-2 border-b-[#003C74] border-r-[#003C74]"
          >
            Start Game
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizSetup;
