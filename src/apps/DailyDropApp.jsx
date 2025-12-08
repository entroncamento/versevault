import React, { useState, useEffect } from "react";
import { useWindowManager } from "../contexts/WindowManagerContext";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const DailyDropApp = ({ windowId }) => {
  const { closeWindow } = useWindowManager();
  const { currentUser } = useAuth();

  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [gameStatus, setGameStatus] = useState("PLAYING");
  const [nextHintIndex, setNextHintIndex] = useState(0);
  const [videoId, setVideoId] = useState(null);

  // 1. Carregar Dados
  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch(`${PROXY_BASE}/api/game/daily`);
        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        setDailyData(data);

        const savedState = JSON.parse(localStorage.getItem("daily_drop_state"));
        if (savedState && savedState.dayId === data.dayId) {
          setAttempts(savedState.attempts);
          setGameStatus(savedState.gameStatus);
          setNextHintIndex(savedState.attempts.length);
        } else {
          localStorage.removeItem("daily_drop_state");
        }
      } catch (e) {
        setDailyData({ error: true });
        setGameStatus("LOST");
      } finally {
        setLoading(false);
      }
    };
    fetchDaily();
  }, []);

  // 2. Guardar Estado
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

  // 3. Buscar Vídeo (Apenas no fim)
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
        .catch((err) => console.error("Video fetch error:", err));
    }
  }, [gameStatus, dailyData]);

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || gameStatus !== "PLAYING" || dailyData.error) return;

    const newAttempts = [...attempts, guess];
    setAttempts(newAttempts);

    const cleanGuess = guess.toLowerCase().trim();
    const cleanName = dailyData.name.toLowerCase().trim();

    if (cleanGuess === cleanName) {
      setGameStatus("WON");
      if (currentUser) leaderboardApi.recordDailyDropWin(currentUser);
    } else {
      if (newAttempts.length >= 4) {
        setGameStatus("LOST");
      } else {
        setNextHintIndex((prev) => prev + 1);
      }
    }
    setGuess("");
  };

  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-[#ECE9D8]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#003399] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-600">
            Loading Daily Challenge...
          </span>
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] font-sans select-none text-sm">
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-[#D6D3CE] p-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 border border-[#D6D3CE] p-[2px] shadow-sm bg-white">
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

      {/* --- MAIN CONTENT --- */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {/* Section Title */}
          <div className="text-[#003399] font-bold text-xs border-b border-[#A0A0A0] mb-1 pb-1">
            Clues
          </div>

          {/* Clues List */}
          <div className="flex flex-col gap-2">
            {dailyData?.hints?.map((hint, idx) => {
              const isVisible =
                idx <= nextHintIndex || gameStatus !== "PLAYING";
              return (
                <div key={idx} className="flex gap-2">
                  <div
                    className={`w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs rounded-sm shadow-sm border ${
                      isVisible
                        ? "bg-[#003399] text-white border-[#002050]"
                        : "bg-gray-300 text-gray-500 border-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
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

          {/* --- RESULTADO FINAL --- */}
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

              {/* Video Container */}
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

          {/* --- ATTEMPTS HISTORY --- */}
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

      {/* --- INPUT FOOTER --- */}
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
