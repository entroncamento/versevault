import React, { useEffect, useState } from "react";
import { leaderboardApi } from "../services/leaderboardApi";

/**
 * Aplicação de Leaderboard (Hall of Fame).
 * Responsável por visualizar dados agregados de performance dos jogadores.
 * * Design Pattern: "Data-Fetching Container"
 * O componente gere o seu próprio estado de carregamento e dados.
 */
const LeaderboardApp = () => {
  // --- STATE MANAGEMENT ---
  // Inicializamos 'loading' como true para evitar flash de conteúdo vazio ("Layout Shift")
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // 1. DATA FETCHING (Side Effects)
  // =========================================================
  // O array de dependências vazio [] garante que isto corre apenas uma vez (ComponentDidMount).
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Abstração da API: O componente não sabe se os dados vêm do Firebase ou SQL,
        // apenas consome o serviço 'leaderboardApi'.
        const data = await leaderboardApi.getTopPlayers();
        setPlayers(data);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
        // Em produção, devíamos definir um estado de erro aqui para mostrar ao utilizador.
      } finally {
        // O loading é desligado sempre, mesmo se houver erro, para não prender a UI.
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="h-full flex flex-col bg-white font-sans">
      {/* TOOLBAR: Estilo Windows Explorer */}
      <div className="bg-[#ECE9D8] border-b border-gray-400 p-2 flex items-center gap-2 select-none">
        <span className="font-bold text-[#444]">🏆 Hall of Fame</span>
      </div>

      {/* DATA TABLE AREA */}
      {/* 'flex-grow' + 'overflow-auto' permite que a tabela tenha scroll independente do resto da janela */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left border-collapse">
          {/* STICKY HEADER: Mantém os títulos visíveis enquanto se faz scroll na lista */}
          <thead className="bg-[#ECE9D8] text-xs text-gray-600 sticky top-0 shadow-sm z-10">
            <tr>
              <th className="p-2 border-r border-white border-b border-[#D4D0C8]">
                Rank
              </th>
              <th className="p-2 border-r border-white border-b border-[#D4D0C8]">
                User
              </th>
              <th className="p-2 border-r border-white border-b border-[#D4D0C8]">
                Total Score
              </th>
              <th className="p-2 border-b border-[#D4D0C8]">Badges</th>
            </tr>
          </thead>

          {/* TABLE BODY: Renderização Condicional (Loading -> Empty -> List) */}
          <tbody>
            {loading ? (
              // Estado 1: Loading Skeleton ou Spinner simples
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">
                  Loading scores...
                </td>
              </tr>
            ) : players.length === 0 ? (
              // Estado 2: Empty State (Zero Data)
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">
                  No scores yet. Be the first!
                </td>
              </tr>
            ) : (
              // Estado 3: Lista Povoada
              players.map((player) => (
                <tr
                  key={player.id} // Chave única crítica para a performance de reconciliação do React
                  className="hover:bg-blue-50 text-sm border-b border-gray-100 transition-colors"
                >
                  {/* Coluna de Rank com Badges Visuais */}
                  <td className="p-2">
                    <div
                      // Lógica CSS Dinâmica: Atribui cores metálicas ao Top 3
                      className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs
                      ${
                        player.rank === 1
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-300" // Ouro
                          : player.rank === 2
                          ? "bg-gray-100 text-gray-700 border border-gray-300" // Prata
                          : player.rank === 3
                          ? "bg-orange-100 text-orange-700 border border-orange-300" // Bronze
                          : "text-gray-500"
                      }
                    `}
                    >
                      {player.rank}
                    </div>
                  </td>

                  {/* Perfil do Utilizador */}
                  <td className="p-2 flex items-center gap-2">
                    <img
                      src={player.photoURL}
                      alt=""
                      className="w-6 h-6 rounded bg-gray-200 object-cover border border-gray-300"
                      // Fallback visual caso a imagem quebre
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    <span className="font-medium text-gray-800">
                      {player.username}
                    </span>
                  </td>

                  {/* Score Formatado (ex: 10,000) */}
                  <td className="p-2 font-mono text-blue-600 font-bold">
                    {player.totalScore.toLocaleString()}
                  </td>

                  {/* Gamification Badges (Lógica de Limiares) */}
                  <td className="p-2 cursor-help" title="Achievements">
                    {player.totalScore > 5000 && "🔥"}
                    {player.totalScore > 10000 && "👑"}
                    {player.totalScore > 20000 && "👽"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* STATUS BAR: Elemento clássico de UI Desktop para metadados */}
      <div className="bg-[#ECE9D8] border-t border-gray-400 p-1 text-xs text-gray-600 flex justify-between px-2 select-none">
        <span>{players.length} items</span>
        <span>VerseVault Network</span>
      </div>
    </div>
  );
};

export default LeaderboardApp;
