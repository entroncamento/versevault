import React, { useState } from "react";
import QuizLobby from "./quiz/QuizLobby";
import QuizSetup from "./quiz/QuizSetup";
import QuizGame from "./quiz/QuizGame";
import QuizResults from "./quiz/QuizResults";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const APP_STATE = {
  LOBBY: "LOBBY",
  SETUP: "SETUP",
  LOADING: "LOADING",
  PLAYING: "PLAYING",
  RESULTS: "RESULTS",
  ERROR: "ERROR",
};

const QuizApp = () => {
  const { currentUser } = useAuth();
  const [gameState, setGameState] = useState(APP_STATE.LOBBY);
  const [gameMode, setGameMode] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [finalScore, setFinalScore] = useState(0);

  // 1. Selecionar Modo (Vem do Lobby)
  const handleSelectMode = (mode) => {
    setGameMode(mode);

    if (mode === "RANDOM") {
      // Random não precisa de configuração, arranca logo
      handleStartSearch("random");
    } else {
      // Artista, Género ou Letras vão para o ecrã de Setup
      setGameState(APP_STATE.SETUP);
    }
  };

  // 2. Iniciar Pesquisa (Vem do Setup ou Random)
  const handleStartSearch = async (query) => {
    setGameState(APP_STATE.LOADING);

    try {
      // Chama o novo endpoint inteligente do backend
      const res = await fetch(
        `${PROXY_BASE}/api/game/generate?mode=${gameMode}&query=${encodeURIComponent(
          query
        )}`
      );

      if (!res.ok) throw new Error("Failed to fetch game data");

      const fetchedTracks = await res.json();

      if (fetchedTracks.length < 4) {
        alert(
          "Não foram encontradas músicas suficientes! Tenta outro termo de pesquisa."
        );
        setGameState(APP_STATE.SETUP);
        return;
      }

      setTracks(fetchedTracks);
      setGameState(APP_STATE.PLAYING);
    } catch (error) {
      console.error("Failed to start game:", error);
      setGameState(APP_STATE.ERROR);
    }
  };

  const handleFinishGame = async (score) => {
    setFinalScore(score);
    setGameState(APP_STATE.RESULTS);

    if (currentUser && score > 0) {
      await leaderboardApi.addScore(currentUser, score);
    }
  };

  const handleRetry = () => {
    setFinalScore(0);
    setGameState(APP_STATE.LOBBY);
  };

  const handleExit = () => {
    setFinalScore(0);
    setGameState(APP_STATE.LOBBY);
  };

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
              A preparar o Quiz...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              A consultar os arquivos musicais...
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
              src="/icons/doctor_watson.png"
              alt="Error"
              className="w-12 h-12 mb-2 opacity-70"
              onError={(e) => (e.target.style.display = "none")}
            />
            <h3 className="text-red-600 font-bold mb-1 text-sm">
              Erro de Sistema
            </h3>
            <p className="text-xs text-gray-600 mb-4 max-w-[200px]">
              Ocorreu um erro ao comunicar com o servidor VerseVault.
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
