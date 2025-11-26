import React, { useState, useEffect, useRef } from "react";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaStepBackward,
  FaStepForward,
  FaVolumeUp,
  FaSearch,
  FaMusic,
} from "react-icons/fa";
import { useWindowManager } from "../contexts/WindowManagerContext";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Componente Visualizador (Mantém-se igual, mas com capa)
const Visualizer = ({ isPlaying, cover }) => {
  const [bars, setBars] = useState(Array(20).fill(10));

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBars(
        Array(20)
          .fill(0)
          .map(() => Math.floor(Math.random() * 80) + 10)
      );
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="w-full h-full bg-black flex items-end justify-center gap-[2px] px-4 pb-2 overflow-hidden border-2 border-[#596878] shadow-inner relative">
      {/* Se houver capa, mostra-a com opacidade baixa no fundo */}
      {cover && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <img src={cover} className="h-full object-cover w-full blur-sm" />
        </div>
      )}

      {/* Barras do Visualizador */}
      <div className="flex gap-[2px] w-full h-full items-end justify-center z-10">
        {bars.map((height, i) => (
          <div
            key={i}
            style={{ height: `${height}%` }}
            className="w-3 bg-gradient-to-t from-green-600 via-green-400 to-green-200 opacity-80"
          />
        ))}
      </div>

      {!isPlaying && !cover && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <img
            src="/icons/wmp_logo.png"
            className="w-16 h-16 opacity-30"
            onError={(e) => (e.target.style.display = "none")}
          />
        </div>
      )}
    </div>
  );
};

const MediaPlayerApp = ({ windowId }) => {
  const { closeWindow } = useWindowManager();
  const audioRef = useRef(null);

  // Estado da Playlist e Áudio
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Estado da AI / Pesquisa
  const [showSearch, setShowSearch] = useState(false);
  const [vibeInput, setVibeInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const currentTrack = playlist[currentTrackIndex] || {
    title: "No Media",
    artist: "Waiting for input...",
  };

  // Autoplay quando a playlist muda (se foi adicionada pela AI)
  useEffect(() => {
    if (playlist.length > 0 && audioRef.current && !isPlaying) {
      // Pequeno delay para garantir que o src carregou
      setTimeout(() => setIsPlaying(true), 500);
    }
  }, [playlist]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) =>
            console.log("Autoplay prevented:", error)
          );
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleVibeSubmit = async (e) => {
    e.preventDefault();
    if (!vibeInput.trim()) return;

    setIsLoadingAi(true);
    try {
      const res = await fetch(`${PROXY_BASE}/api/ai/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe: vibeInput }),
      });

      if (!res.ok) throw new Error("Server error");
      const track = await res.json();

      if (!track.url) {
        alert(
          "Música encontrada, mas sem preview de áudio disponível. Tenta outra vibe."
        );
      } else {
        // Adiciona a música à playlist e toca
        setPlaylist((prev) => [...prev, track]);
        setCurrentTrackIndex(playlist.length); // Vai para a nova música
        setShowSearch(false); // Volta para a lista
        setVibeInput("");
      }
    } catch (error) {
      console.error(error);
      alert("A AI não conseguiu encontrar uma música. Tenta outra vez.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#2C3E50] text-white font-sans select-none">
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* --- TOPO (Menu Bar) --- */}
      <div className="bg-gradient-to-r from-[#182C68] to-[#304896] h-8 flex items-center px-2 text-[11px] gap-3 border-b border-[#586987] shadow-sm z-10">
        <span className="font-bold italic text-gray-300 pr-2 border-r border-gray-500">
          WMP
        </span>
        <button
          onClick={() => setShowSearch(false)}
          className={`px-2 py-0.5 rounded hover:bg-white/10 ${
            !showSearch ? "text-white font-bold" : "text-gray-300"
          }`}
        >
          Now Playing
        </button>
        <button
          onClick={() => setShowSearch(true)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 ${
            showSearch ? "text-white font-bold" : "text-[#42B638]"
          }`}
        >
          <FaSearch className="text-[10px]" />
          Smart DJ
        </button>
      </div>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="flex-grow flex overflow-hidden bg-[#2C3E50]">
        {/* Lado Esquerdo: Visualizador */}
        <div className="flex-1 flex flex-col p-2 bg-gradient-to-b from-[#627390] to-[#2C3E50]">
          <div className="flex-grow relative shadow-xl border border-[#333] bg-black">
            <Visualizer isPlaying={isPlaying} cover={currentTrack?.cover} />
          </div>
          <div className="mt-2 text-center h-10">
            <p className="text-sm font-bold text-white drop-shadow-md truncate px-2">
              {currentTrack.title}
            </p>
            <p className="text-[10px] text-gray-300">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Lado Direito: Playlist ou Pesquisa */}
        <div className="w-56 bg-white text-black border-l-2 border-[#182C68] flex flex-col relative">
          {showSearch ? (
            // --- MODO PESQUISA (AI) ---
            <div className="flex flex-col h-full bg-[#F0F0F0]">
              <div className="bg-[#2C3E50] p-2 text-white text-xs font-bold flex items-center gap-2 shadow-md">
                <FaSearch className="text-[#42B638]" />
                <span>Find Vibe</span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <label className="text-xs text-gray-600 font-bold">
                  What's the vibe?
                </label>
                <textarea
                  value={vibeInput}
                  onChange={(e) => setVibeInput(e.target.value)}
                  placeholder="e.g., 'Coding at 3AM', 'Road trip classic', 'Sad breakup song'..."
                  className="w-full h-24 p-2 text-xs border-2 border-[#7F9DB9] rounded-sm resize-none focus:border-[#3C7FB1] outline-none shadow-inner font-sans"
                />

                <button
                  onClick={handleVibeSubmit}
                  disabled={isLoadingAi || !vibeInput.trim()}
                  className="bg-[#3C7FB1] text-white px-3 py-2 rounded-sm text-xs font-bold shadow-md active:translate-y-[1px] disabled:opacity-50 hover:bg-[#2C5F85] transition-colors flex items-center justify-center gap-2"
                >
                  {isLoadingAi ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <FaMusic /> Get Suggestion
                    </>
                  )}
                </button>

                <div className="text-[9px] text-gray-500 mt-2 border-t border-gray-300 pt-2 text-center">
                  Powered by VerseVault AI.
                  <br />
                  Suggests music based on your mood.
                </div>
              </div>
            </div>
          ) : (
            // --- MODO PLAYLIST ---
            <>
              <div className="bg-[#E1EAF8] p-1 border-b border-[#9EB6CE] flex justify-between items-center px-2">
                <span className="text-xs font-bold text-[#182C68]">
                  Playlist
                </span>
                <span className="text-[9px] text-gray-500">
                  {playlist.length} items
                </span>
              </div>

              <div className="overflow-y-auto flex-grow bg-white">
                {playlist.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 mt-10 flex flex-col items-center">
                    <span>Playlist empty.</span>
                    <br />
                    <button
                      onClick={() => setShowSearch(true)}
                      className="mt-2 text-[#3C7FB1] hover:underline cursor-pointer font-bold"
                    >
                      Click here to ask the AI
                    </button>
                  </div>
                ) : (
                  playlist.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => {
                        setCurrentTrackIndex(idx);
                        setIsPlaying(true);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer border-b border-gray-100 transition-colors
                        ${
                          idx === currentTrackIndex
                            ? "bg-[#316AC5] text-white"
                            : "hover:bg-[#F3F3F3]"
                        }
                      `}
                    >
                      <span className="text-[10px] opacity-70 w-4 text-right">
                        {idx + 1}.
                      </span>
                      <div className="flex flex-col overflow-hidden w-full">
                        <span className="truncate font-bold">
                          {track.title}
                        </span>
                        <span
                          className={`text-[9px] truncate ${
                            idx === currentTrackIndex
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {track.artist}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- CONTROLOS (Rodapé) --- */}
      <div className="h-16 bg-gradient-to-b from-[#6B7D94] via-[#405168] to-[#2C3E50] border-t border-[#8FA0B5] flex flex-col px-3 pb-1 relative shadow-[0_-2px_5px_rgba(0,0,0,0.3)] z-20">
        {/* Barra de Progresso */}
        <div className="w-full flex items-center gap-2 mb-1 mt-1">
          <span className="text-[9px] w-8 text-right font-mono text-[#42B638]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              if (audioRef.current)
                audioRef.current.currentTime = e.target.value;
            }}
            className="flex-grow h-1.5 bg-black rounded-full appearance-none cursor-pointer accent-[#42B638] border border-[#555]"
          />
          <span className="text-[9px] w-8 font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Botões Centrais */}
        <div className="flex items-center justify-center gap-5 pb-1">
          <button
            onClick={() => {
              setIsPlaying(false);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-b from-[#E0E0E0] to-[#999] shadow-[1px_1px_3px_black] border border-[#555] flex items-center justify-center hover:brightness-110 active:scale-95"
          >
            <FaStop className="text-[#182C68] text-xs" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 -mt-1 rounded-full bg-gradient-to-b from-[#FFF] to-[#C0C0C0] shadow-[1px_2px_5px_black] border-2 border-[#666] flex items-center justify-center hover:brightness-110 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <FaPause className="text-[#182C68] text-lg ml-[1px]" />
            ) : (
              <FaPlay className="text-[#182C68] text-lg ml-1" />
            )}
          </button>

          <div className="flex items-center gap-1 ml-4">
            <FaVolumeUp className="text-gray-400 text-xs" />
            <div className="w-12 h-1.5 bg-black rounded-full overflow-hidden border border-gray-600">
              <div className="w-3/4 h-full bg-[#42B638]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayerApp;
