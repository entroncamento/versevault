import React from "react";

// =========================================================
// 1. SUB-COMPONENTE: MODE BUTTON
// =========================================================
/**
 * Componente UI Reutilizável.
 * Em vez de repetir código HTML para cada botão, criamos uma abstração.
 * * Design Pattern: "Presentational Component"
 * - Recebe dados via props.
 * - Não tem estado interno (stateless).
 * - Foca-se apenas em como as coisas "parecem".
 */
const ModeButton = ({ title, desc, color, onClick }) => (
  <button
    onClick={onClick}
    // Styling Complexo para emular Windows XP:
    // - bg-gradient-to-b: Dá o efeito "glossy" ou convexo dos botões antigos.
    // - active:translate-y: Feedback tátil (botão afunda quando clicado).
    // - group: Permite controlar estilos dos filhos (h3) quando o pai (button) leva hover.
    className="group relative w-full text-left p-3 mb-3 border-2 border-white rounded bg-gradient-to-b from-white to-[#ECE9D8] hover:to-[#FFFFCC] shadow-sm active:translate-y-[1px] transition-all"
  >
    {/* Barra lateral colorida para identificação visual rápida (UX) */}
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />

    <div className="ml-3">
      <h3 className="font-bold text-[#003399] text-sm group-hover:underline">
        {title}
      </h3>
      <p className="text-xs text-gray-600">{desc}</p>
    </div>
  </button>
);

// =========================================================
// 2. COMPONENTE PRINCIPAL: LOBBY
// =========================================================
/**
 * O "Menu Principal" da aplicação de Quiz.
 * Responsável apenas pela navegação/seleção, não pela lógica do jogo.
 * * Props:
 * - onStartGame: Callback function passada pelo componente Pai (QuizApp).
 * Isto é um exemplo de "Lifting State Up" (Elevação de Estado),
 * onde o filho notifica o pai para mudar o ecrã.
 */
const QuizLobby = ({ onStartGame }) => {
  return (
    // Layout Flex: Garante que o footer/conteúdo preenche a altura da janela
    <div className="h-full flex flex-col bg-[#ECE9D8] font-sans">
      {/* HEADER: Estilo "Title Bar" do Windows XP */}
      <div className="bg-gradient-to-r from-[#003399] to-[#5882D9] p-4 text-white border-b-4 border-[#FF9900]">
        <h1 className="text-xl font-bold italic tracking-wider shadow-sm">
          VerseVault Quiz
        </h1>
        <p className="text-xs opacity-80">Select a game mode to begin</p>
      </div>

      {/* CONTENT AREA: Scrollável se o conteúdo exceder a altura */}
      <div className="flex-grow p-6 overflow-y-auto">
        {/* Painel Branco (Container) típico de apps Desktop antigas */}
        <div className="bg-white border border-[#7F9DB9] p-4 rounded-sm min-h-full shadow-inner">
          <h2 className="text-sm font-bold text-gray-700 mb-4 border-b border-gray-300 pb-1">
            Select Mode
          </h2>

          {/* Renderização dos Botões de Modo */}

          <ModeButton
            title="Artist Master (Audio)"
            desc="Test your ear on specific discographies."
            color="bg-purple-600"
            // Passamos uma string identificadora ("ARTIST") que o backend vai reconhecer
            onClick={() => onStartGame("ARTIST")}
          />

          <ModeButton
            title="Genre Explorer (Audio)"
            desc="Cloud Rap, Grunge, House... Pick your vibe."
            color="bg-green-600"
            onClick={() => onStartGame("GENRE")}
          />

          {/* DECISÃO TÉCNICA:
            Modo Lyrics removido temporariamente.
            Manter código comentado ou placeholders é útil para documentar 
            features planeadas vs. features ativas.
          */}

          <ModeButton
            title="I'm Feeling Lucky"
            desc="Total chaos. Max XP multiplier. Good luck."
            color="bg-orange-500"
            onClick={() => onStartGame("RANDOM")}
          />
        </div>
      </div>
    </div>
  );
};

export default QuizLobby;
