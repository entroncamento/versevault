import React, { useState } from "react";
import QuizLobby from "./quiz/QuizLobby";
import QuizGame from "./quiz/QuizGame";
import QuizResults from "./quiz/QuizResults";
import { musicApi } from "../services/musicApi";
// 1. Importar o Auth e a API de Leaderboard
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const APP_STATE = {
  LOBBY: "LOBBY",
  LOADING: "LOADING",
  PLAYING: "PLAYING",
  RESULTS: "RESULTS",
  ERROR: "ERROR",
};

const QuizApp = () => {
  const { currentUser } = useAuth(); // Pegar o utilizador atual
  const [gameState, setGameState] = useState(APP_STATE.LOBBY);
  const [gameMode, setGameMode] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [finalScore, setFinalScore] = useState(0);

  const handleStartGame = async (mode) => {
    setGameMode(mode);
    setGameState(APP_STATE.LOADING);

    let query = "";

    if (mode === "ARTIST") {
      query = prompt("Which artist do you want to master?", "The Weeknd");
      if (!query) {
        setGameState(APP_STATE.LOBBY);
        return;
      }
    } else if (mode === "GENRE") {
      query = prompt("Pick a genre (Rock, Pop, Jazz...)", "Rock");
      if (!query) {
        setGameState(APP_STATE.LOBBY);
        return;
      }
    }

    try {
      const fetchedTracks = await musicApi.getGameData(mode, query);

      if (fetchedTracks.length < 4) {
        alert("Not enough tracks found! Try a different artist.");
        setGameState(APP_STATE.LOBBY);
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

    // 2. Salvar os pontos no Firebase se o user estiver logado
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
        return <QuizLobby onStartGame={handleStartGame} />;

      case APP_STATE.LOADING:
        return (
          <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8]">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-[#003399]">
              Consulting the Archives...
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Syncing Last.fm & iTunes Data...
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
            <h3 className="text-red-600 font-bold mb-2">Connection Error</h3>
            <p className="text-sm text-gray-600 mb-4">
              Check your API Keys or Internet.
            </p>
            <button
              onClick={handleExit}
              className="px-4 py-1 bg-gray-200 border border-gray-400 rounded shadow text-xs"
            >
              Back
            </button>
          </div>
        );
      default:
        return <div>Error</div>;
    }
  };

  return <div className="w-full h-full overflow-hidden">{renderContent()}</div>;
};

export default QuizApp;
