import React, { useState, useEffect } from "react";
import { useWindowManager } from "../contexts/WindowManagerContext";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

// Configuração de API: Usa a variável de ambiente do Vite ou fallback para localhost
const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Aplicação "Daily Drop" (Desafio Diário).
 * * Funcionalidades Chave:
 * 1. Persistência Local: O estado do jogo é salvo no localStorage para sobreviver a F5.
 * 2. Validação Insensível: "The Weeknd" == "the weeknd ".
 * 3. Revelação Progressiva: Pistas são desbloqueadas conforme o utilizador erra.
 */
const DailyDropApp = ({ windowId }) => {
  const { closeWindow } = useWindowManager();
  const { currentUser } = useAuth();

  // --- STATE MANAGEMENT ---
  const [dailyData, setDailyData] = useState(null); // Dados do desafio (API)
  const [loading, setLoading] = useState(true);

  // Estado do Jogo (Game Loop)
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState([]); // Histórico de tentativas
  const [gameStatus, setGameStatus] = useState("PLAYING"); // "PLAYING" | "WON" | "LOST"
  const [nextHintIndex, setNextHintIndex] = useState(0); // Controla quantas pistas mostramos

  // Estado Multimédia
  const [videoId, setVideoId] = useState(null);

  // =========================================================
  // 1. DATA FETCHING & STATE RESTORATION
  // =========================================================
  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch(`${PROXY_BASE}/api/game/daily`);
        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        setDailyData(data);

        // Lógica de Restauro: Verifica se o utilizador já jogou hoje
        const savedState = JSON.parse(localStorage.getItem("daily_drop_state"));

        // Se o save local corresponder ao ID do desafio de hoje (server), restaura o progresso.
        if (savedState && savedState.dayId === data.dayId) {
          setAttempts(savedState.attempts);
          setGameStatus(savedState.gameStatus);
          // Calcula quantas pistas devem estar visíveis baseadas nos erros
          setNextHintIndex(savedState.attempts.length);
        } else {
          // Se for um dia novo, limpa o lixo do dia anterior
          localStorage.removeItem("daily_drop_state");
        }
      } catch (e) {
        setDailyData({ error: true });
        setGameStatus("LOST"); // Bloqueia o jogo em caso de erro crítico
      } finally {
        setLoading(false);
      }
    };
    fetchDaily();
  }, []); // Empty dependency array = Component Mount

  // =========================================================
  // 2. PERSISTENCE ENGINE (Auto-Save)
  // =========================================================
  // Salva o estado sempre que o jogador faz um movimento relevante.
  useEffect(() => {
    if (dailyData && !dailyData.error) {
      localStorage.setItem(
        "daily_drop_state",
        JSON.stringify({
          dayId: dailyData.dayId,
          attempts,
          gameStatus,
        })
      );
    }
  }, [attempts, gameStatus, dailyData]);

  // =========================================================
  // 3. REWARD SYSTEM (YouTube Integration)
  // =========================================================
  // Busca o videoclip apenas quando o jogo termina, para não gastar quota da API antes do tempo
  // e para servir como recompensa visual.
  useEffect(() => {
    if ((gameStatus === "WON" || gameStatus === "LOST") && dailyData?.name) {
      fetch(
        `${PROXY_BASE}/api/youtube/video?artist=${encodeURIComponent(
          dailyData.name
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.videoId) setVideoId(data.videoId);
        })
        .catch((err) => console.warn("Video fetch skipped/failed:", err));
    }
  }, [gameStatus, dailyData]);

  // =========================================================
  // 4. GAME LOGIC (Validation)
  // =========================================================
  const handleGuess = (e) => {
    e.preventDefault();
    // Guard Clauses: Previne submissões vazias ou se o jogo já acabou
    if (!guess.trim() || gameStatus !== "PLAYING" || dailyData.error) return;

    const newAttempts = [...attempts, guess];
    setAttempts(newAttempts);

    // Normalização: Remove espaços e converte para minúsculas para comparação justa
    const cleanGuess = guess.toLowerCase().trim();
    const cleanName = dailyData.name.toLowerCase().trim();

    if (cleanGuess === cleanName) {
      // WIN CONDITION
      setGameStatus("WON");
      if (currentUser) leaderboardApi.recordDailyDropWin(currentUser);
    } else {
      // LOSE/CONTINUE CONDITION
      if (newAttempts.length >= 4) {
        setGameStatus("LOST"); // Max tentativas atingido
      } else {
        setNextHintIndex((prev) => prev + 1); // Desbloqueia próxima pista
      }
    }
    setGuess(""); // Limpa input para UX fluida
  };

  // --- RENDER: LOADING STATE ---
  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-[#ECE9D8]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#003399] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-600">
            A carregar Desafio Diário...
          </span>
        </div>
      </div>
    );

  // --- RENDER: MAIN APP ---
  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] font-sans select-none text-sm">
      {/* HEADER: Identidade Visual do Jogo */}
      <div className="bg-white border-b border-[#D6D3CE] p-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 border border-[#D6D3CE] p-[2px] shadow-sm bg-white">
          {/* Avatar do Artista (Fallback seguro) */}
          <img
            src={dailyData?.image || "/icons/search.png"}
            className="w-full h-full object-cover"
            alt="Artist"
            onError={(e) => (e.target.src = "/icons/search.png")}
          />
        </div>
        <div className="flex-grow">
          <h1 className="font-bold text-[#444] text-sm">Daily Challenge</h1>
          <p className="text-[10px] text-gray-500">
            Guess the artist from the clues.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400 block">ID</span>
          <span className="text-xs font-bold text-[#003399]">
            #{dailyData?.dayId}
          </span>
        </div>
      </div>

      {/* SCROLLABLE AREA: Conteúdo do Jogo */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {/* Título de Secção */}
          <div className="text-[#003399] font-bold text-xs border-b border-[#A0A0A0] mb-1 pb-1">
            Clues
          </div>

          {/* LISTA DE PISTAS (Renderização Condicional baseada no progresso) */}
          <div className="flex flex-col gap-2">
            {dailyData?.hints?.map((hint, idx) => {
              // A pista é visível se o índice for menor que as tentativas OU se o jogo acabou
              const isVisible =
                idx <= nextHintIndex || gameStatus !== "PLAYING";

              return (
                <div key={idx} className="flex gap-2">
                  {/* Número da Pista */}
                  <div
                    className={`w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs rounded-sm shadow-sm border ${
                      isVisible
                        ? "bg-[#003399] text-white border-[#002050]"
                        : "bg-gray-300 text-gray-500 border-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {/* Texto da Pista (Blur/Locked se não visível) */}
                  <div
                    className={`flex-grow p-2 text-xs border rounded-sm shadow-sm leading-relaxed ${
                      isVisible
                        ? "bg-white border-[#7F9DB9] text-black"
                        : "bg-[#F0F0F0] border-[#D6D3CE] text-gray-400 italic"
                    }`}
                  >
                    {isVisible ? hint : "Locked hint..."}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ÁREA DE RESULTADO (Vitória/Derrota) */}
          {gameStatus !== "PLAYING" && (
            <div
              className={`mt-4 border-2 rounded p-3 text-center shadow-md animate-in fade-in zoom-in duration-300 ${
                dailyData?.error
                  ? "bg-[#FFE1E1] border-[#F44336]"
                  : gameStatus === "WON"
                  ? "bg-[#E1FFE1] border-[#4CAF50]"
                  : "bg-[#FFE1E1] border-[#F44336]"
              }`}
            >
              <h2 className="font-bold text-lg mb-1 drop-shadow-sm">
                {dailyData?.error
                  ? "Connection Error"
                  : gameStatus === "WON"
                  ? "🎉 Correct Answer!"
                  : "💀 Game Over"}
              </h2>

              {!dailyData?.error && (
                <p className="text-sm text-[#333] font-bold mb-3">
                  The artist was: {dailyData.name}
                </p>
              )}

              {/* VIDEO EMBED: Recompensa visual */}
              <div className="w-full bg-black border-2 border-white shadow-lg mx-auto max-w-[400px]">
                {videoId ? (
                  <div className="relative w-full aspect-video">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                      title="Top Hit"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : !dailyData?.error ? (
                  <div className="w-full aspect-video flex flex-col items-center justify-center text-gray-500 bg-[#111]">
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin mb-2"></div>
                    <span className="text-[10px]">Loading video...</span>
                  </div>
                ) : (
                  <div className="p-4 text-xs text-red-800">
                    Server unavailable.
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => closeWindow(windowId)}
                  className="px-6 py-1 bg-white border border-gray-500 rounded text-xs shadow-sm hover:bg-gray-50 active:translate-y-px"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* HISTÓRICO DE ERROS */}
          {gameStatus === "PLAYING" && !dailyData.error && (
            <div className="mt-2">
              <div className="text-[10px] text-[#003399] font-bold mb-1 uppercase tracking-wider">
                Incorrect Guesses ({attempts.length}/4)
              </div>
              <div className="flex flex-wrap gap-2">
                {attempts.length === 0 && (
                  <span className="text-xs text-gray-400 italic">
                    Good luck!
                  </span>
                )}
                {attempts.map((att, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#FFCCCC] px-2 py-1 text-xs text-red-700 flex gap-1 items-center rounded-sm shadow-sm"
                  >
                    <span className="font-bold">✗</span>
                    <span className="line-through opacity-60">{att}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER: Input Area */}
      {gameStatus === "PLAYING" && !dailyData.error && (
        <div className="bg-[#ECE9D8] border-t border-[#D6D3CE] p-3 flex-shrink-0">
          <form onSubmit={handleGuess} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="flex-grow border-2 border-[#7F9DB9] p-1.5 text-sm outline-none focus:border-[#003399] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] rounded-sm"
              placeholder="Type artist name..."
              autoFocus
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="px-4 py-1 bg-white border-2 border-[#003C74] border-t-[#3C7FB1] border-l-[#3C7FB1] text-[#003399] font-bold rounded-[3px] text-xs shadow-sm hover:bg-[#EBF4FC] active:border-[#003C74] active:bg-[#DCE4ED] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guess
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DailyDropApp;
