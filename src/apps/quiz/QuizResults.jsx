import React from "react";

/**
 * Componente de "Game Over" / Ecrã de Resultados.
 * Fecha o ciclo de feedback do utilizador, apresentando a pontuação final,
 * atribuindo um ranking (Gamification) e oferecendo opções de navegação.
 */
const QuizResults = ({ score, tracks, onRetry, onExit }) => {
  // =========================================================
  // 1. SISTEMA DE RANKING (Gamification Logic)
  // =========================================================
  // O cálculo baseia-se no "Score Ceiling" (Teto Máximo).
  // Assumindo 5 rondas x (~400 pontos máx por ronda) = ~2000 pontos totais.
  const getRank = (s) => {
    // Top 20% (Alta Performance): Requer rapidez e precisão.
    if (s >= 1600)
      return { title: "CEO of Aux Cord 👑", color: "text-[#FFD700]" }; // Ouro

    // Top 50% (Performance Média): Acertou a maioria, mas talvez lento.
    if (s >= 1000) return { title: "Vibe Curator ✨", color: "text-[#C0C0C0]" }; // Prata

    // Low Tier: Acertou 1 ou 2 músicas.
    if (s > 400) return { title: "Kinda Mid NGL 😐", color: "text-[#CD7F32]" }; // Bronze

    // Fail State: Pontuação residual.
    return { title: "In Your Flop Era 💀", color: "text-gray-500" };
  };

  // Memoização não é necessária aqui pois o score não muda neste ecrã,
  // mas o cálculo é executado na montagem do componente.
  const rank = getRank(score);

  // =========================================================
  // 2. DEFENSIVE PROGRAMMING (Null Safety)
  // =========================================================
  // Acede à "trivia" (facto) da primeira música se existir.
  // O uso de 'tracks && tracks.length' previne erros de runtime ("Crash")
  // caso o array de músicas chegue vazio ou indefinido por erro de API.
  const wikiFact = tracks && tracks.length > 0 ? tracks[0].fact : null;

  return (
    // Container Principal: Flexbox para centralização perfeita em qualquer viewport
    <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] p-6 text-center font-sans overflow-y-auto scrollbar-thin">
      {/* CARD: Estilo "Skeuomorphic" (sombras e bordas) para destacar do fundo */}
      <div className="bg-white p-6 rounded-lg border-2 border-[#0055E5] shadow-[4px_4px_10px_rgba(0,0,0,0.2)] w-full max-w-sm relative">
        {/* Decoração Visual: Barra de gradiente para identidade da marca (VerseVault Blue) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0055E5] via-[#3593FF] to-[#0055E5]"></div>

        <h2 className="text-2xl font-bold text-[#003399] mb-2 drop-shadow-sm">
          Vibe Check Complete!
        </h2>

        {/* 3. VISUALIZAÇÃO DE DADOS (Score) */}
        <div className="my-6 p-4 bg-[#F0F0F0] rounded border border-[#D3D3D3] shadow-inner">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">
            Clout Score
          </p>
          {/* Tipografia grande (5xl) para hierarquia visual clara */}
          <p className="text-5xl font-black text-[#333] tracking-tighter">
            {score}
          </p>
        </div>

        {/* Rank Badge */}
        <div className="mb-6">
          <p className="text-xs text-gray-600 mb-1">Your Era:</p>
          <div
            className={`text-2xl font-bold ${rank.color} bg-gray-50 inline-block px-4 py-1 rounded-full border border-gray-200 shadow-sm`}
          >
            {rank.title}
          </div>
        </div>

        {/* 4. RENDERIZAÇÃO CONDICIONAL */}
        {/* O bloco "Did You Know?" só é renderizado no DOM se 'wikiFact' for verdadeiro. */}
        {wikiFact && (
          <div className="mb-6 p-3 bg-[#FFFFE1] border border-[#E6DB55] rounded text-left shadow-sm relative">
            <div className="flex items-center mb-2 text-[#996600] border-b border-[#E6DB55] pb-1">
              <span className="text-lg mr-2">🍵</span>
              <span className="text-xs font-bold uppercase">
                Random Lore (No Cap)
              </span>
            </div>
            <p className="text-xs text-gray-800 leading-relaxed italic">
              "{wikiFact}"
            </p>
            <p className="text-[9px] text-gray-400 text-right mt-1">
              - Source: Trust Me Bro (Wiki API)
            </p>
          </div>
        )}

        {/* 5. AÇÕES DO UTILIZADOR (Navegação) */}
        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={onRetry}
            // Botão "Positivo" (Verde): Incentiva o replay
            className="px-4 py-2 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] text-white rounded shadow hover:brightness-110 active:translate-y-[1px] font-bold text-sm border border-[#1B5E20]"
          >
            Run It Back
          </button>

          <button
            onClick={onExit}
            // Botão "Destrutivo/Saída" (Vermelho): Feedback claro de encerramento
            className="px-4 py-2 bg-gradient-to-b from-[#F44336] to-[#C62828] text-white rounded shadow hover:brightness-110 active:translate-y-[1px] font-bold text-sm border border-[#B71C1C]"
          >
            Touch Grass
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
