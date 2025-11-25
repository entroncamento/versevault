import React, { useState, useEffect, useRef } from "react";
import { useWindowManager } from "../contexts/WindowManagerContext";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const DailyDropApp = ({ windowId }) => {
  const { closeWindow } = useWindowManager();

  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [gameStatus, setGameStatus] = useState("PLAYING");
  const [nextHintIndex, setNextHintIndex] = useState(0);

  // Carregar os dados do artista do dia do servidor
  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch(`${PROXY_BASE}/api/game/daily`);

        if (!res.ok) {
          console.error(`API Error: Received status ${res.status}`);
          setDailyData({
            dayId: "Error",
            name: "Server Offline",
            image: "/icons/doctor_watson.png",
            hints: [
              "Erro de conexão: O servidor Express (backend) está desligado ou o endpoint não existe.",
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

        // Verificar LocalStorage para este dia específico
        const savedState = JSON.parse(localStorage.getItem("daily_drop_state"));

        if (savedState && savedState.dayId === data.dayId) {
          setAttempts(savedState.attempts);
          setGameStatus(savedState.gameStatus);
          setNextHintIndex(savedState.attempts.length);
        } else {
          localStorage.removeItem("daily_drop_state"); // Limpa dias velhos
        }
      } catch (e) {
        console.error("Daily Drop Fetch Failed:", e);
        setDailyData({
          dayId: "Error",
          name: "Connection Failed",
          image: "/icons/doctor_watson.png",
          hints: [
            "Não foi possível contactar o servidor Express. Certifique-se de que o servidor Node (porta 3001) está a correr.",
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

  // Guardar progresso no LocalStorage
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

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || gameStatus !== "PLAYING" || dailyData.error) return;

    const newAttempts = [...attempts, guess];
    setAttempts(newAttempts);

    const cleanGuess = guess.toLowerCase().trim();
    const cleanName = dailyData.name.toLowerCase().trim();

    if (cleanGuess === cleanName) {
      setGameStatus("WON");
    } else {
      if (newAttempts.length >= 4) {
        // 4 Dicas = 5 tentativas total (0 a 4)
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
            A obter o Artista do Dia...
          </span>
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] font-sans select-none">
      {/* Topo */}
      <div className="bg-white border-b border-[#D6D3CE] p-3 flex items-center gap-3">
        <img
          src={dailyData?.image || "/icons/search.png"}
          className="w-8 h-8 object-cover"
          alt="Search"
        />
        <div>
          <h1 className="text-sm font-bold text-[#444]">Desafio Diário</h1>
          <p className="text-[10px] text-gray-500">
            Um artista novo a cada 24 horas.
          </p>
        </div>
        <div className="flex-grow text-right text-xs font-bold text-[#003399]">
          #{dailyData?.dayId}
        </div>
      </div>

      {/* Área de Jogo */}
      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4">
        {/* Cartão de Dicas */}
        <div className="bg-white border border-[#7F9DB9] p-1 shadow-sm relative">
          <div className="bg-[#EBF4FC] p-2 mb-1 border-b border-[#D6D3CE]">
            <span className="font-bold text-xs text-[#003399]">
              Dicas Reveladas:
            </span>
          </div>

          <div className="flex flex-col gap-2 p-2">
            {/* CORREÇÃO: Usa optional chaining para prevenir o erro de 'map' */}
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
                      Bloqueado...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resultado Final ou Mensagem de Erro */}
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
                ? "🛑 ERRO CRÍTICO"
                : gameStatus === "WON"
                ? "🎉 Parabéns!"
                : "💀 Fim do Jogo"}
            </h2>

            {dailyData?.image && !dailyData.error && (
              <div className="my-2 flex justify-center">
                <img
                  src={dailyData.image}
                  className="w-24 h-24 object-cover border-2 border-white shadow-md rounded-sm"
                  alt="Artista Revelado"
                />
              </div>
            )}

            <p className="text-xs text-gray-700 mb-2 relative z-10">
              {dailyData?.error
                ? "Verifique a consola ou inicie o servidor Express."
                : `O artista era: ${dailyData.name}`}
            </p>
            <p className="text-[10px] text-gray-500 mb-2">
              {dailyData?.error
                ? "Tente reiniciar o servidor Node ou o Vite."
                : "Volta amanhã para um novo desafio!"}
            </p>
            <button
              onClick={() => closeWindow(windowId)}
              className="mt-2 px-3 py-1 bg-white border border-gray-400 rounded text-xs hover:bg-gray-50 relative z-10"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Input e Histórico de Tentativas */}
        {gameStatus === "PLAYING" && !dailyData.error && (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-500 font-bold">
              Tentativas ({attempts.length}/4):
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
              placeholder="Escreve o nome do artista..."
              autoFocus
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="px-4 py-1 bg-white border border-[#003C74] rounded-[3px] text-xs font-bold shadow-sm active:translate-y-px"
            >
              Adivinhar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DailyDropApp;
