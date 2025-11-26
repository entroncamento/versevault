import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const MyComputer = ({ windowId }) => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [globalRank, setGlobalRank] = useState("...");

  // Novos estados para os ranks específicos
  const [artistRank, setArtistRank] = useState(null);
  const [genreRank, setGenreRank] = useState(null);

  const [loading, setLoading] = useState(true);

  const normalizeData = (data) => {
    if (!data) return null;
    if (data.stats && typeof data.stats === "object") return data;
    const newData = { ...data, stats: { artists: {}, genres: {} } };
    Object.keys(data).forEach((key) => {
      if (key.startsWith("stats.artists."))
        newData.stats.artists[key.replace("stats.artists.", "")] = data[key];
      else if (key.startsWith("stats.genres."))
        newData.stats.genres[key.replace("stats.genres.", "")] = data[key];
    });
    return newData;
  };

  const getTopItemData = (obj) => {
    if (!obj || Object.keys(obj).length === 0) return null;
    const sorted = Object.entries(obj).sort(
      ([, countA], [, countB]) => countB - countA
    );
    return { name: sorted[0][0], count: sorted[0][1] };
  };

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.uid) {
        // Debug logs removed since issue is diagnosed as UID mismatch
        const rawData = await leaderboardApi.getUserStats(currentUser.uid);

        if (rawData) {
          const cleanData = normalizeData(rawData);
          setUserData(cleanData);

          if (cleanData?.totalScore) {
            const r = await leaderboardApi.getUserRank(cleanData.totalScore);
            setGlobalRank(r);
          } else {
            setGlobalRank("Unranked");
          }

          const topArtist = getTopItemData(cleanData?.stats?.artists);
          if (topArtist) {
            const r = await leaderboardApi.getStatRank(
              "artists",
              topArtist.name,
              topArtist.count
            );
            setArtistRank(r);
          }

          const topGenre = getTopItemData(cleanData?.stats?.genres);
          if (topGenre) {
            const r = await leaderboardApi.getStatRank(
              "genres",
              topGenre.name,
              topGenre.count
            );
            setGenreRank(r);
          }
        } else {
          setUserData(null);
          setGlobalRank("Unranked");
        }
      }
      setLoading(false);
    };
    loadData();
  }, [currentUser]);

  const topArtistData = getTopItemData(userData?.stats?.artists);
  const topGenreData = getTopItemData(userData?.stats?.genres);

  // --- COMPONENTE AUXILIAR PARA A BADGE (Sem Emojis) ---
  const RankBadge = ({ rank, label }) => {
    const isFirst = rank === 1;
    return (
      <div
        className={`
        ml-6 mt-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-[3px] border shadow-sm
        ${
          isFirst
            ? "bg-gradient-to-b from-[#FFF8E1] to-[#FFECB3] border-[#E5C365] text-[#8B6D28]" // Estilo Gold
            : "bg-gradient-to-b from-[#F7F7F7] to-[#EBEBEB] border-[#D6D3CE] text-[#666666]" // Estilo Padrão
        }
      `}
      >
        {/* Removi o span dos emojis. Agora é apenas texto. */}
        <span className="text-[10px] font-tahoma font-bold">
          {isFirst ? label || "#1 Global Fan" : `Rank #${rank} Global`}
        </span>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#ECE9D8] font-sans flex flex-col text-xs select-none">
      {/* Top Bar */}
      <div className="bg-white border-b border-[#D6D3CE] p-4 flex items-center gap-4">
        <div className="w-16 h-16 bg-white border-2 border-[#D6D3CE] border-r-white border-b-white shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)] p-[2px] flex-shrink-0">
          <img
            src={currentUser?.photoURL || "/icons/user.png"}
            className="w-full h-full object-cover border border-[#808080]"
            alt="Profile"
          />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#444] mb-1">
            {currentUser?.displayName || "Player"}
          </h1>
          <p className="text-[#666]">VerseVault User</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-grow overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <img
              src="/icons/search.png"
              className="w-8 h-8 mb-2 animate-pulse opacity-50"
              onError={(e) => (e.target.style.display = "none")}
            />
            <p>Querying database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card: Resumo */}
            <div className="bg-white p-3 border border-[#7F9DB9] shadow-[2px_2px_5px_rgba(0,0,0,0.05)] relative">
              <div className="absolute top-0 left-0 w-full h-[18px] bg-gradient-to-r from-[#0058EE] to-[#3593FF] border-b border-[#003C74]">
                <span className="text-white font-bold px-2 leading-[18px] drop-shadow-sm">
                  Player Stats
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-dotted border-[#D6D3CE] pb-1">
                  <span className="text-[#444]">Global Rank:</span>
                  <span className="font-bold text-sm text-[#003399]">
                    #{globalRank}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-dotted border-[#D6D3CE] pb-1">
                  <span className="text-[#444]">Games Played:</span>
                  <span className="font-bold text-[#444]">
                    {userData?.gamesPlayed || 0}
                  </span>
                </div>
                {/* Display Daily Drops Completed */}
                <div className="flex justify-between items-center border-b border-dotted border-[#D6D3CE] pb-1">
                  <span className="text-[#444]">Daily Drops Completed:</span>
                  <span className="font-bold text-[#444]">
                    {userData?.dailyDropsCompleted || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#444]">Total Memory (XP):</span>
                  <span className="font-bold text-[#444]">
                    {userData?.totalScore?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Favoritos */}
            <div className="bg-white p-3 border border-[#7F9DB9] shadow-[2px_2px_5px_rgba(0,0,0,0.05)] relative">
              <div className="absolute top-0 left-0 w-full h-[18px] bg-gradient-to-r from-[#388E3C] to-[#66BB6A] border-b border-[#1B5E20]">
                <span className="text-white font-bold px-2 leading-[18px] drop-shadow-sm">
                  User Preferences
                </span>
              </div>

              <div className="mt-6 mb-4">
                <p className="text-[#808080] font-bold mb-1">
                  Most Used Artist
                </p>
                <div className="flex flex-col items-start pl-2">
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/icons/cd_audio_cd_a-0.png" className="w-4 h-4" />
                    <span className="text-sm font-bold text-[#444] truncate">
                      {topArtistData ? topArtistData.name : "None yet"}
                    </span>
                  </div>

                  {/* BADGE ATUALIZADA (Sem Emojis) */}
                  {artistRank && (
                    <RankBadge
                      rank={artistRank}
                      label={artistRank === 1 ? "#1 Global Fan" : null}
                    />
                  )}
                </div>
              </div>

              <div>
                <p className="text-[#808080] font-bold mb-1">Primary Genre</p>
                <div className="flex flex-col items-start pl-2">
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/icons/world-0.png" className="w-4 h-4" />
                    <span className="text-sm font-bold text-[#444] truncate">
                      {topGenreData ? topGenreData.name : "None yet"}
                    </span>
                  </div>

                  {/* BADGE ATUALIZADA (Sem Emojis) */}
                  {genreRank && (
                    <RankBadge
                      rank={genreRank}
                      label={genreRank === 1 ? "Genre King" : null}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-[#ECE9D8] border-t border-white flex gap-2 px-2 py-1 shadow-[inset_0_1px_0_#D6D3CE]">
        <div className="border border-[#808080] border-b-white border-r-white px-2 py-[2px] w-[150px] bg-[#ECE9D8] inset-shadow">
          <span className="truncate">ID: {currentUser?.uid}</span>
        </div>
        <div className="border border-[#808080] border-b-white border-r-white px-2 py-[2px] flex-grow bg-[#ECE9D8]">
          <span>{userData ? "Ready" : "Waiting for input..."}</span>
        </div>
      </div>
    </div>
  );
};

export default MyComputer;
