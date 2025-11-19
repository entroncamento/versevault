import React, { useEffect, useState } from "react";
import { leaderboardApi } from "../services/leaderboardApi";

const LeaderboardApp = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const data = await leaderboardApi.getTopPlayers();
      setPlayers(data);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="h-full flex flex-col bg-white font-sans">
      {/* Barra de Ferramentas Simples */}
      <div className="bg-[#ECE9D8] border-b border-gray-400 p-2 flex items-center gap-2">
        <span className="font-bold text-[#444]">🏆 Hall of Fame</span>
      </div>

      {/* Tabela (Estilo Detalhes do XP) */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#ECE9D8] text-xs text-gray-600 sticky top-0 shadow-sm">
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
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">
                  Loading scores...
                </td>
              </tr>
            ) : players.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">
                  No scores yet. Be the first!
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr
                  key={player.id}
                  className="hover:bg-blue-50 text-sm border-b border-gray-100"
                >
                  <td className="p-2">
                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs
                      ${
                        player.rank === 1
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                          : player.rank === 2
                          ? "bg-gray-100 text-gray-700 border border-gray-300"
                          : player.rank === 3
                          ? "bg-orange-100 text-orange-700 border border-orange-300"
                          : ""
                      }
                    `}
                    >
                      {player.rank}
                    </div>
                  </td>
                  <td className="p-2 flex items-center gap-2">
                    <img
                      src={player.photoURL}
                      alt=""
                      className="w-6 h-6 rounded bg-gray-200 object-cover border border-gray-300"
                    />
                    <span className="font-medium">{player.username}</span>
                  </td>
                  <td className="p-2 font-mono text-blue-600 font-bold">
                    {player.totalScore.toLocaleString()}
                  </td>
                  <td className="p-2">
                    {/* Placeholder para badges futuras */}
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

      {/* Status Bar */}
      <div className="bg-[#ECE9D8] border-t border-gray-400 p-1 text-xs text-gray-600 flex justify-between px-2">
        <span>{players.length} items</span>
        <span>VerseVault Network</span>
      </div>
    </div>
  );
};

export default LeaderboardApp;
