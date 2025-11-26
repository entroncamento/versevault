import React, { useEffect, useState } from "react";
import { FaSpotify } from "react-icons/fa"; // Importar ícone
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const MyComputer = ({ windowId }) => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [globalRank, setGlobalRank] = useState("...");

  const [artistRank, setArtistRank] = useState(null);
  const [genreRank, setGenreRank] = useState(null);
  const [isSpotifyTop, setIsSpotifyTop] = useState(false); // Novo estado

  const [loading, setLoading] = useState(true);

  const normalizeData = (data) => {
    if (!data) return null;
    // Garante que a estrutura base existe
    const newData = {
      ...data,
      stats: {
        artists: data.stats?.artists || {},
        genres: data.stats?.genres || {},
      },
      likedTracks: data.likedTracks || [],
    };
    return newData;
  };

  // --- MAGIA AQUI: Fundir Likes com Stats do Quiz ---
  const mergeSpotifyStats = (data) => {
    if (!data) return null;

    // Cria uma cópia profunda para não mutar o original
    const mergedStats = JSON.parse(JSON.stringify(data.stats));

    // Se houver músicas curtidas, damos um "boost" nesses artistas
    if (data.likedTracks && Array.isArray(data.likedTracks)) {
      data.likedTracks.forEach((track) => {
        if (track.artist) {
          // Cada Like vale 5 pontos de "frequência"
          // Isto garante que o Spotify domina as stats se tiveres muitos likes
          const currentCount = mergedStats.artists[track.artist] || 0;
          mergedStats.artists[track.artist] = currentCount + 5;
        }
      });
    }

    return { ...data, stats: mergedStats };
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
        const rawData = await leaderboardApi.getUserStats(currentUser.uid);

        if (rawData) {
          const cleanData = normalizeData(rawData);

          // 1. Fundir dados do Spotify (Likes) com dados do Quiz
          const enrichedData = mergeSpotifyStats(cleanData);
          setUserData(enrichedData);

          // 2. Calcular Rank Global (baseado no Score total do jogo)
          if (cleanData?.totalScore) {
            const r = await leaderboardApi.getUserRank(cleanData.totalScore);
            setGlobalRank(r);
          } else {
            setGlobalRank("Unranked");
          }

          // 3. Calcular Top Artista (Usando os dados fundidos)
          const topArtist = getTopItemData(enrichedData.stats.artists);

          if (topArtist) {
            // Verifica se este artista veio maioritariamente dos likes
            // (Se a contagem no rawData for muito menor que no enrichedData)
            const rawCount = cleanData.stats.artists[topArtist.name] || 0;
            if (topArtist.count > rawCount + 2) {
              setIsSpotifyTop(true);
            } else {
              setIsSpotifyTop(false);
            }

            const r = await leaderboardApi.getStatRank(
              "artists",
              topArtist.name,
              topArtist.count
            );
            setArtistRank(r);
          }

          // 4. Calcular Top Género (Mantém-se apenas Quiz por enquanto)
          const topGenre = getTopItemData(enrichedData.stats.genres);
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

  const RankBadge = ({ rank, label }) => {
    const isFirst = rank === 1;
    return (
      <div
        className={`
        ml-6 mt-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-[3px] border shadow-sm
        ${
          isFirst
            ? "bg-gradient-to-b from-[#FFF8E1] to-[#FFECB3] border-[#E5C365] text-[#8B6D28]"
            : "bg-gradient-to-b from-[#F7F7F7] to-[#EBEBEB] border-[#D6D3CE] text-[#666666]"
        }
      `}
      >
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
                <div className="flex justify-between items-center border-b border-dotted border-[#D6D3CE] pb-1">
                  <span className="text-[#444]">Liked Songs:</span>
                  <span className="font-bold text-[#444]">
                    {userData?.likedTracks?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-dotted border-[#D6D3CE] pb-1">
                  <span className="text-[#444]">Daily Drops:</span>
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
                    <img
                      src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-0.png"
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-bold text-[#444] truncate flex items-center gap-1">
                      {topArtistData ? topArtistData.name : "None yet"}
                      {/* Ícone do Spotify se vier dos likes */}
                      {isSpotifyTop && (
                        <FaSpotify
                          className="text-[#1DB954]"
                          title="Based on your Liked Songs"
                        />
                      )}
                    </span>
                  </div>

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
                    <img
                      src="https://win98icons.alexmeub.com/icons/png/entire_network_globe-0.png"
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-bold text-[#444] truncate">
                      {topGenreData ? topGenreData.name : "None yet"}
                    </span>
                  </div>

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
          <span>{userData ? "Syncing complete." : "Waiting for input..."}</span>
        </div>
      </div>
    </div>
  );
};

export default MyComputer;
