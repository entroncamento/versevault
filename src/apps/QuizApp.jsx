import React, { useState } from "react";
import QuizLobby from "./quiz/QuizLobby";
import QuizSetup from "./quiz/QuizSetup";
import QuizGame from "./quiz/QuizGame";
import QuizResults from "./quiz/QuizResults";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

// Configuração de Ambiente
const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// =========================================================
// DESIGN PATTERN: FINITE STATE MACHINE (FSM)
// =========================================================
// Em vez de usarmos múltiplas variáveis booleanas (isLoading, isPlaying, isError...),
// definimos estados mutuamente exclusivos. Isto previne "Impossible States"
// (ex: estar a carregar e a jogar ao mesmo tempo).
const APP_STATE = {
  LOBBY: "LOBBY", // Menu Inicial
  SETUP: "SETUP", // Configuração (Escolher Artista/Género)
  LOADING: "LOADING", // Fetching da API
  PLAYING: "PLAYING", // Jogo Ativo
  RESULTS: "RESULTS", // Ecrã Final
  ERROR: "ERROR", // Falha na API
};

const QuizApp = () => {
  const { currentUser } = useAuth();

  // State Management
  const [gameState, setGameState] = useState(APP_STATE.LOBBY);
  const [gameMode, setGameMode] = useState(null); // 'ARTIST', 'GENRE', 'RANDOM'

  // Data Persistence (para Stats e Replay)
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [finalScore, setFinalScore] = useState(0);

  // =========================================================
  // 1. FLOW CONTROL (Navegação)
  // =========================================================

  const handleSelectMode = (mode) => {
    setGameMode(mode);

    // Lógica Condicional de Navegação:
    // O modo "Random" salta a configuração (UX mais rápida).
    // Outros modos requerem input do utilizador (Setup Screen).
    if (mode === "RANDOM") {
      handleStartSearch("random");
    } else {
      setGameState(APP_STATE.SETUP);
    }
  };

  // =========================================================
  // 2. DATA FETCHING LAYER
  // =========================================================

  const handleStartSearch = async (query) => {
    setSearchQuery(query); // Guardamos o termo para metadata (stats)
    setGameState(APP_STATE.LOADING); // Feedback visual imediato

    try {
      // API Communication:
      // O backend atua como proxy para a API do Deezer/Spotify,
      // protegendo as chaves de API e resolvendo problemas de CORS.
      const res = await fetch(
        `${PROXY_BASE}/api/game/generate?mode=${gameMode}&query=${encodeURIComponent(
          query
        )}`
      );

      if (!res.ok) throw new Error("Failed to fetch game data");

      const fetchedTracks = await res.json();

      // Validação de Dados (Data Integrity):
      // Precisamos de pelo menos 4 músicas para criar distratores suficientes.
      if (fetchedTracks.length < 4) {
        alert(
          "Não foram encontradas músicas suficientes! Tenta outro termo de pesquisa."
        );
        setGameState(APP_STATE.SETUP); // Retorna ao setup para nova tentativa
        return;
      }

      setTracks(fetchedTracks);
      setGameState(APP_STATE.PLAYING); // Transição para o jogo
    } catch (error) {
      console.error("Critical Game Error:", error);
      setGameState(APP_STATE.ERROR);
    }
  };

  // =========================================================
  // 3. ANALYTICS & SCORING
  // =========================================================

  const handleFinishGame = async (score) => {
    setFinalScore(score);
    setGameState(APP_STATE.RESULTS);

    // Só gravamos stats se o utilizador estiver autenticado
    if (currentUser && score > 0) {
      // Data Aggregation:
      // Preparamos metadados ricos para alimentar o componente "My Computer" depois.
      // Isto permite gerar estatísticas como "Top Artist" e "Favorite Genre".
      const artistsPlayed = tracks.map((t) => t.artist);
      const genrePlayed = gameMode === "GENRE" ? searchQuery : null;

      await leaderboardApi.addScore(currentUser, score, {
        artists: artistsPlayed,
        genre: genrePlayed,
      });
    }
  };

  // Reset Handlers
  const handleRetry = () => {
    setFinalScore(0);
    setGameState(APP_STATE.LOBBY);
  };

  const handleExit = () => {
    setFinalScore(0);
    setGameState(APP_STATE.LOBBY);
  };

  // =========================================================
  // 4. VIEW ORCHESTRATION (Render Switch)
  // =========================================================
  // Renderiza o componente apropriado baseado no estado atual da FSM.
  const renderContent = () => {
    switch (gameState) {
      case APP_STATE.LOBBY:
        return <QuizLobby onStartGame={handleSelectMode} />;

      case APP_STATE.SETUP:
        return (
          <QuizSetup
            mode={gameMode}
            onStart={handleStartSearch}
            onBack={() => setGameState(APP_STATE.LOBBY)}
          />
        );

      case APP_STATE.LOADING:
        return (
          <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8]">
            <div className="w-8 h-8 border-4 border-[#003399] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-[#003399] text-sm">
              A preparar o quiz...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              A consultar base de dados...
            </p>
          </div>
        );

      case APP_STATE.PLAYING:
        return (
          <QuizGame
            tracks={tracks}
            mode={gameMode}
            onFinish={handleFinishGame}
          />
        );

      case APP_STATE.RESULTS:
        return (
          <QuizResults
            score={finalScore}
            tracks={tracks}
            onRetry={handleRetry}
            onExit={handleExit}
          />
        );

      case APP_STATE.ERROR:
        return (
          <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] text-center p-4">
            <img
              src="/icons/doctor_watson.png" // Ícone de erro do Windows clássico
              alt="Error"
              className="w-12 h-12 mb-2 opacity-70"
              onError={(e) => (e.target.style.display = "none")}
            />
            <h3 className="text-red-600 font-bold mb-1 text-sm">
              System Error
            </h3>
            <p className="text-xs text-gray-600 mb-4 max-w-[200px]">
              Ocorreu um erro ao gerar o jogo. Verifica a tua conexão.
            </p>
            <button
              onClick={handleExit}
              className="px-4 py-1 bg-[#F0F0F0] border border-gray-500 rounded shadow-[1px_1px_0px_white_inset] text-xs active:translate-y-px"
            >
              Fechar
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="w-full h-full overflow-hidden">{renderContent()}</div>;
};

export default QuizApp;
