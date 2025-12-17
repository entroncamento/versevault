import React, { useEffect, useState } from "react";
import { FaSpotify } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

/**
 * Componente "My Computer" (Perfil do Jogador).
 * Atua como um Dashboard de Estatísticas, agregando dados de múltiplas fontes:
 * 1. Desempenho no Quiz (Respostas certas).
 * 2. Integração Spotify (Músicas curtidas).
 * 3. Rankings Globais (Leaderboard).
 */
const MyComputer = ({ windowId }) => {
  const { currentUser } = useAuth();

  // --- STATE MANAGEMENT ---
  const [userData, setUserData] = useState(null);
  const [globalRank, setGlobalRank] = useState("..."); // Placeholder inicial

  // Estados derivados (Computed States)
  const [artistRank, setArtistRank] = useState(null);
  const [genreRank, setGenreRank] = useState(null);
  const [isSpotifyTop, setIsSpotifyTop] = useState(false); // Flag para UI condicional

  const [loading, setLoading] = useState(true);

  // =========================================================
  // 1. DATA NORMALIZATION & SANITIZATION
  // =========================================================
  // Defensive Programming: Garante que o objeto tem sempre a estrutura esperada,
  // prevenindo erros de "undefined" ao aceder a propriedades aninhadas (ex: data.stats.artists).
  const normalizeData = (data) => {
    if (!data) return null;
    return {
      ...data,
      stats: {
        artists: data.stats?.artists || {},
        genres: data.stats?.genres || {},
      },
      likedTracks: data.likedTracks || [],
    };
  };

  // =========================================================
  // 2. ALGORITMO HEURÍSTICO (Hybrid Scoring)
  // =========================================================
  // Funde estatísticas implícitas (Quiz) com explícitas (Likes).
  // Dá um peso maior (5x) aos Likes para que o "Gosto Real" prevaleça sobre
  // o "Conhecimento de Trivia".
  const mergeSpotifyStats = (data) => {
    if (!data) return null;

    // Deep Copy para imutabilidade (evita efeitos colaterais no objeto original)
    const mergedStats = JSON.parse(JSON.stringify(data.stats));

    if (data.likedTracks && Array.isArray(data.likedTracks)) {
      data.likedTracks.forEach((track) => {
        if (track.artist) {
          // Peso Heurístico: 1 Like = 5 Respostas Certas no Quiz
          const currentCount = mergedStats.artists[track.artist] || 0;
          mergedStats.artists[track.artist] = currentCount + 5;
        }
      });
    }

    return { ...data, stats: mergedStats };
  };

  // Helper de Ordenação (Sort Descending)
  const getTopItemData = (obj) => {
    if (!obj || Object.keys(obj).length === 0) return null;
    // Converte Objeto -> Array -> Sort -> Pega o primeiro
    const sorted = Object.entries(obj).sort(
      ([, countA], [, countB]) => countB - countA
    );
    return { name: sorted[0][0], count: sorted[0][1] };
  };

  // =========================================================
  // 3. DATA FETCHING CHAIN
  // =========================================================
  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.uid) {
        // Passo 1: Buscar dados brutos do Firebase/DB
        const rawData = await leaderboardApi.getUserStats(currentUser.uid);

        if (rawData) {
          const cleanData = normalizeData(rawData);

          // Passo 2: Enriquecer dados (Algoritmo de Fusão)
          const enrichedData = mergeSpotifyStats(cleanData);
          setUserData(enrichedData);

          // Passo 3: Calcular Rank Global (Async)
          if (cleanData?.totalScore) {
            const r = await leaderboardApi.getUserRank(cleanData.totalScore);
            setGlobalRank(r);
          } else {
            setGlobalRank("Unranked");
          }

          // Passo 4: Calcular Estatísticas Específicas (Top Artist)
          const topArtist = getTopItemData(enrichedData.stats.artists);

          if (topArtist) {
            // Lógica de Detecção de Origem:
            // Se o count "Enriquecido" for muito maior que o "Bruto",
            // sabemos que este artista subiu devido aos Likes do Spotify.
            const rawCount = cleanData.stats.artists[topArtist.name] || 0;

            // Threshold de 2 pontos de diferença para considerar "Spotify Boosted"
            if (topArtist.count > rawCount + 2) {
              setIsSpotifyTop(true);
            } else {
              setIsSpotifyTop(false);
            }

            // Busca o rank global para este artista específico
            const r = await leaderboardApi.getStatRank(
              "artists",
              topArtist.name,
              topArtist.count
            );
            setArtistRank(r);
          }

          // Passo 5: Top Genre (Baseado puramente no Quiz por enquanto)
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
          // Fallback para utilizadores novos (Empty State)
          setUserData(null);
          setGlobalRank("Unranked");
        }
      }
      setLoading(false);
    };
    loadData();
  }, [currentUser]);

  // Cálculos para renderização
  const topArtistData = getTopItemData(userData?.stats?.artists);
  const topGenreData = getTopItemData(userData?.stats?.genres);

  // Sub-componente interno para Badges de Rank (DRY)
  const RankBadge = ({ rank, label }) => {
    const isFirst = rank === 1;
    return (
      <div
        className={`
        ml-6 mt-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-[3px] border shadow-sm
        ${
          isFirst
            ? "bg-gradient-to-b from-[#FFF8E1] to-[#FFECB3] border-[#E5C365] text-[#8B6D28]" // Gold Theme
            : "bg-gradient-to-b from-[#F7F7F7] to-[#EBEBEB] border-[#D6D3CE] text-[#666666]" // Default Silver/Grey
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
      {/* HEADER: Perfil do Utilizador */}
      <div className="bg-white border-b border-[#D6D3CE] p-4 flex items-center gap-4">
        {/* Avatar com moldura estilo Windows */}
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

      {/* ÁREA DE CONTEÚDO (Scrollable) */}
      <div className="p-4 flex-grow overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {/* Loading Spinner simples */}
            <img
              src="/icons/search.png"
              className="w-8 h-8 mb-2 animate-pulse opacity-50"
              onError={(e) => (e.target.style.display = "none")}
            />
            <p>Querying database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAINEL 1: Estatísticas Gerais */}
            <div className="bg-white p-3 border border-[#7F9DB9] shadow-[2px_2px_5px_rgba(0,0,0,0.05)] relative">
              {/* Barra de Título Azul (Estilo Accordion do XP) */}
              <div className="absolute top-0 left-0 w-full h-[18px] bg-gradient-to-r from-[#0058EE] to-[#3593FF] border-b border-[#003C74]">
                <span className="text-white font-bold px-2 leading-[18px] drop-shadow-sm">
                  Player Stats
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {/* Linhas de Dados com pontilhado */}
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

            {/* PAINEL 2: Preferências & Badges */}
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
                      src="/icons/cd_audio_cd_a-0.png"
                      className="w-4 h-4"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    <span className="text-sm font-bold text-[#444] truncate flex items-center gap-1">
                      {topArtistData ? topArtistData.name : "None yet"}

                      {/* Feedback Visual: Mostra logo do Spotify se a stat vier dos Likes */}
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
                      src="/icons/world-0.png"
                      className="w-4 h-4"
                      onError={(e) => (e.target.style.display = "none")}
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

      {/* STATUS BAR: Detalhes Técnicos */}
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
