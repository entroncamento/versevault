import React, { useState, useEffect, useRef } from "react";
import { useWindowManager } from "../contexts/WindowManagerContext";
import { useAuth } from "../contexts/AuthContext"; // Import added for user context
import { leaderboardApi } from "../services/leaderboardApi"; // Import added for saving stats

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const DailyDropApp = ({ windowId }) => {
  const { closeWindow } = useWindowManager();
  const { currentUser } = useAuth(); // Get authenticated user info

  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [gameStatus, setGameStatus] = useState("PLAYING");
  const [nextHintIndex, setNextHintIndex] = useState(0);

  // Load the daily artist data from the server
  useEffect(() => {
    const fetchDaily = async () => {
      try {
        // Fetch attempt
        const res = await fetch(`${PROXY_BASE}/api/game/daily`);

        if (!res.ok) {
          console.error(`API Error: Received status ${res.status}`);
          setDailyData({
            dayId: "Error",
            name: "Server Offline",
            image: "/icons/doctor_watson.png",
            hints: [
              "Connection error: The Express server (backend) is offline or the endpoint does not exist.",
            ],
            error: true,
          });
          setGameStatus("LOST");
          return;
        }

        const data = await res.json();

        if (!data || !data.dayId) {
          console.error("API Error: Data structure is invalid or empty.", data);
          throw new Error("Invalid response data.");
        }

        setDailyData(data);

        // Check LocalStorage for this specific day
        const savedState = JSON.parse(localStorage.getItem("daily_drop_state"));

        if (savedState && savedState.dayId === data.dayId) {
          setAttempts(savedState.attempts);
          setGameStatus(savedState.gameStatus);
          setNextHintIndex(savedState.attempts.length);
        } else {
          localStorage.removeItem("daily_drop_state"); // Clear old days
        }
      } catch (e) {
        console.error("Daily Drop Fetch Failed:", e);
        setDailyData({
          dayId: "Error",
          name: "Connection Failed",
          image: "/icons/doctor_watson.png",
          hints: [
            "Could not reach the Express server. Ensure the Node server (port 3001) is running.",
          ],
          error: true,
        });
        setGameStatus("LOST");
      } finally {
        setLoading(false);
      }
    };
    fetchDaily();
  }, []);

  // Save progress to LocalStorage
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

  // NEW: Function to record the win in Firestore
  const recordWin = async () => {
    if (currentUser) {
      // The API handles the increment of 'dailyDropsCompleted'
      await leaderboardApi.recordDailyDropWin(currentUser);
      console.log("Daily Drop win recorded successfully.");
    }
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || gameStatus !== "PLAYING" || dailyData.error) return;

    const newAttempts = [...attempts, guess];
    setAttempts(newAttempts);

    const cleanGuess = guess.toLowerCase().trim();
    const cleanName = dailyData.name.toLowerCase().trim();

    if (cleanGuess === cleanName) {
      setGameStatus("WON");
      recordWin(); // <-- Call the function to record the win
    } else {
      if (newAttempts.length >= 4) {
        // 4 hints = 5 total attempts (0 to 4)
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
            Fetching the Daily Artist...
          </span>
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] font-sans select-none">
      {/* Header */}
      <div className="bg-white border-b border-[#D6D3CE] p-3 flex items-center gap-3">
        <img
          src={dailyData?.image || "/icons/search.png"}
          className="w-8 h-8 object-cover"
          alt="Search"
        />
        <div>
          <h1 className="text-sm font-bold text-[#444]">Daily Challenge</h1>
          <p className="text-[10px] text-gray-500">
            A new artist every 24 hours.
          </p>
        </div>
        <div className="flex-grow text-right text-xs font-bold text-[#003399]">
          #{dailyData?.dayId}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4">
        {/* Hint Card */}
        <div className="bg-white border border-[#7F9DB9] p-1 shadow-sm relative">
          <div className="bg-[#EBF4FC] p-2 mb-1 border-b border-[#D6D3CE]">
            <span className="font-bold text-xs text-[#003399]">
              Revealed Hints:
            </span>
          </div>

          <div className="flex flex-col gap-2 p-2">
            {dailyData?.hints?.map((hint, idx) => {
              const isVisible =
                idx <= nextHintIndex || gameStatus !== "PLAYING";

              return (
                <div key={idx} className="flex items-start gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border min-w-[20px] text-center mt-0.5 ${
                      isVisible
                        ? "bg-[#003399] text-white border-[#002050]"
                        : "bg-gray-200 text-gray-400 border-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  {isVisible ? (
                    <span className="text-xs text-[#333] leading-tight py-0.5">
                      {hint}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic py-0.5">
                      Locked...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Final Result or Error Message */}
        {gameStatus !== "PLAYING" && (
          <div
            className={`border-2 p-3 text-center shadow-sm relative overflow-hidden ${
              dailyData?.error
                ? "bg-[#FFE1E1] border-[#F44336]"
                : gameStatus === "WON"
                ? "bg-[#E1FFE1] border-[#4CAF50]"
                : "bg-[#FFE1E1] border-[#F44336]"
            }`}
          >
            <h2 className="font-bold text-lg mb-1 relative z-10">
              {dailyData?.error
                ? "🛑 CRITICAL ERROR"
                : gameStatus === "WON"
                ? "🎉 Congratulations!"
                : "💀 Game Over"}
            </h2>

            {dailyData?.image && !dailyData.error && (
              <div className="my-2 flex justify-center">
                <img
                  src={dailyData.image}
                  className="w-24 h-24 object-cover border-2 border-white shadow-md rounded-sm"
                  alt="Revealed Artist"
                />
              </div>
            )}

            <p className="text-xs text-gray-700 mb-2 relative z-10">
              {dailyData?.error
                ? "Check the console or start the Express server."
                : `The artist was: ${dailyData.name}`}
            </p>
            <p className="text-[10px] text-gray-500 mb-2">
              {dailyData?.error
                ? "Try restarting the Node server or Vite."
                : "Come back tomorrow for a new challenge!"}
            </p>
            <button
              onClick={() => closeWindow(windowId)}
              className="mt-2 px-3 py-1 bg-white border border-gray-400 rounded text-xs hover:bg-gray-50 relative z-10"
            >
              Close
            </button>
          </div>
        )}

        {/* Input and Attempt History */}
        {gameStatus === "PLAYING" && !dailyData.error && (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-500 font-bold">
              Attempts ({attempts.length}/4):
            </div>
            {attempts.map((att, i) => (
              <div
                key={i}
                className="bg-[#F0F0F0] border border-[#D6D3CE] px-2 py-1 text-xs text-gray-500 flex gap-2 items-center"
              >
                <span className="text-red-500 font-bold">✗</span>
                <span className="line-through opacity-70">{att}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Footer */}
      {gameStatus === "PLAYING" && !dailyData.error && (
        <div className="bg-[#ECE9D8] border-t border-[#D6D3CE] p-3">
          <form onSubmit={handleGuess} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="flex-grow border-2 border-[#7F9DB9] p-1 text-sm outline-none focus:border-[#003399]"
              placeholder="Type the artist's name..."
              autoFocus
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="px-4 py-1 bg-white border border-[#003C74] rounded-[3px] text-xs font-bold shadow-sm active:translate-y-px"
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
