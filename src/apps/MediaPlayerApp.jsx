import React, { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaSearch,
  FaHeart,
  FaRegHeart,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// --- HELPER PARA CORRIGIR TEXTOS ---
const decodeHtml = (html) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// --- VISUALIZADOR ---
const CanvasVisualizer = ({ audioRef, isPlaying, cover, isYouTube }) => {
  const canvasRef = useRef(null);
  const [visMode, setVisMode] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const MODES = ["SPECTRUM", "OSCILLOSCOPE", "VORTEX"];

  useEffect(() => {
    if (isYouTube) return;
    const initAudio = () => {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
    };
    initAudio();
  }, [isYouTube]);

  useEffect(() => {
    if (!isPlaying || !canvasRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let simulatedData = new Uint8Array(64);

    const renderFrame = () => {
      if (!isPlaying) return;
      animationRef.current = requestAnimationFrame(renderFrame);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let dataArray;
      let bufferLength;

      if (isYouTube || !analyser) {
        bufferLength = 64;
        dataArray = simulatedData.map((_, i) => {
          const time = Date.now() / 1000;
          return 128 + Math.sin(time * 10 + i * 0.5) * 50 + Math.random() * 20;
        });
      } else {
        bufferLength = 64;
        dataArray = simulatedData.map((_, i) => 128);
      }

      if (visMode === 0) {
        const barWidth = (width / bufferLength) * 2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          ctx.fillStyle = `rgb(50, ${150 + dataArray[i] / 2}, 50)`;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      } else if (visMode === 1) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00FF00";
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (visMode === 2) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 4;
        ctx.beginPath();
        ctx.strokeStyle = "#42B638";
        ctx.lineWidth = 2;
        for (let i = 0; i < bufferLength; i++) {
          const rad = (Math.PI * 2 * i) / bufferLength;
          const barHeight = (dataArray[i] / 255) * 40;
          const x1 = centerX + Math.cos(rad) * radius;
          const y1 = centerY + Math.sin(rad) * radius;
          const x2 = centerX + Math.cos(rad) * (radius + barHeight);
          const y2 = centerY + Math.sin(rad) * (radius + barHeight);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
    };
    renderFrame();
  }, [isPlaying, visMode, isYouTube]);

  const nextMode = () => setVisMode((prev) => (prev + 1) % MODES.length);
  const prevMode = () =>
    setVisMode((prev) => (prev - 1 + MODES.length) % MODES.length);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden border-2 border-[#596878] shadow-inner relative group">
      {cover && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
          <img
            src={cover}
            className="h-full w-full object-cover blur-md scale-110"
            alt="Cover"
          />
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full absolute inset-0 z-10" />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <img
            src="/icons/wmpIcon.png"
            className="w-16 h-16 opacity-30"
            onError={(e) => (e.target.style.display = "none")}
            alt="WMP"
          />
        </div>
      )}
      <div className="absolute top-2 left-0 right-0 px-2 flex justify-between items-start z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={prevMode}
          className="text-white/50 hover:text-white p-1 bg-black/40 rounded"
        >
          <FaChevronLeft size={10} />
        </button>
        <span className="text-[9px] text-white/80 font-mono uppercase tracking-widest bg-black/40 px-2 rounded border border-white/10">
          {MODES[visMode]} {isYouTube ? "(SIM)" : ""}
        </span>
        <button
          onClick={nextMode}
          className="text-white/50 hover:text-white p-1 bg-black/40 rounded"
        >
          <FaChevronRight size={10} />
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const MediaPlayerApp = ({ windowId, trackToPlay }) => {
  const { currentUser } = useAuth();
  const playerRef = useRef(null);

  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [hasError, setHasError] = useState(false);

  const [activeView, setActiveView] = useState("PLAYLIST");
  const [vibeInput, setVibeInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [likedTracks, setLikedTracks] = useState([]);
  const [userTasteContext, setUserTasteContext] = useState("");

  const currentTrack = playlist[currentTrackIndex] || {
    title: "No Media",
    artist: "Waiting for input...",
    source: "local",
  };

  const isCurrentTrackLiked = likedTracks.some(
    (t) => t.title === currentTrack.title && t.artist === currentTrack.artist
  );

  const getTrackUrl = (track) => {
    if (!track) return null;
    if (track.source === "youtube" && track.videoId) {
      return `https://www.youtube.com/watch?v=${track.videoId}`;
    }
    return track.url;
  };

  useEffect(() => {
    if (trackToPlay) {
      setPlaylist([trackToPlay]);
      setCurrentTrackIndex(0);
      setActiveView("PLAYLIST");
      setIsPlaying(true);
      setHasError(false);
    }
  }, [trackToPlay]);

  useEffect(() => {
    setHasError(false);
    setDuration(0);
  }, [currentTrackIndex, currentTrack]);

  useEffect(() => {
    const loadUserTaste = async () => {
      if (currentUser?.uid) {
        try {
          const stats = await leaderboardApi.getUserStats(currentUser.uid);
          if (stats?.likedTracks) {
            setLikedTracks(stats.likedTracks);
            const likedNames = stats.likedTracks
              .slice(0, 5)
              .map((t) => `${t.title} by ${t.artist}`)
              .join(", ");
            if (likedNames) setUserTasteContext(`User likes: ${likedNames}. `);
          }
        } catch (e) {}
      }
    };
    loadUserTaste();
  }, [currentUser]);

  const handleVibeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!vibeInput.trim()) return;

    setIsLoadingAi(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibe: vibeInput,
          userContext: userTasteContext,
        }),
      });

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      const newTracks = Array.isArray(data) ? data : [data];

      if (newTracks.length === 0) {
        alert("No tracks found.");
      } else {
        const startIdx = playlist.length;
        setPlaylist((prev) => [...prev, ...newTracks]);
        setCurrentTrackIndex(startIdx === 0 ? 0 : startIdx);
        setIsPlaying(true);
        setActiveView("PLAYLIST");
        setVibeInput("");
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI DJ is offline.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) return;
    const newStatus = !isCurrentTrackLiked;
    const trackData = { ...currentTrack };

    if (newStatus) setLikedTracks((prev) => [...prev, trackData]);
    else
      setLikedTracks((prev) => prev.filter((t) => t.title !== trackData.title));

    await leaderboardApi.toggleLike(currentUser, trackData, newStatus);
  };

  return (
    <div className="flex flex-col h-full bg-[#2C3E50] text-white font-sans select-none overflow-hidden relative">
      {/* PLAYER (Escondido mas presente na DOM com 1px) */}
      <div className="absolute top-0 left-0 w-[1px] h-[1px] opacity-[0.01] overflow-hidden z-[50] pointer-events-none">
        <ReactPlayer
          ref={playerRef}
          url={getTrackUrl(currentTrack)}
          playing={isPlaying}
          volume={volume}
          muted={false}
          width="100%"
          height="100%"
          onProgress={(state) => setCurrentTime(state.playedSeconds)}
          onDuration={(dur) => setDuration(dur)}
          // Sincronizar estado real do player
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            if (currentTrackIndex < playlist.length - 1)
              setCurrentTrackIndex((prev) => prev + 1);
            else setIsPlaying(false);
          }}
          onError={(e) => {
            console.error("Player Error:", e);
            // Não mostrar erro fatal imediatamente se for só um abort de navegação
            if (e && e.name !== "AbortError") {
              setHasError(true);
            }
          }}
          config={{
            youtube: {
              playerVars: {
                showinfo: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                playsinline: 1,
                origin: window.location.origin,
              },
            },
            file: { forceAudio: true },
          }}
        />
      </div>

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#182C68] to-[#304896] h-8 flex items-center px-2 text-[11px] gap-3 border-b border-[#586987] shadow-sm flex-shrink-0 z-10">
        <span className="font-bold italic text-gray-300 pr-2 border-r border-gray-500">
          WMP
        </span>
        <button
          onClick={() => setActiveView("PLAYLIST")}
          className={`px-2 py-0.5 rounded hover:bg-white/10 ${
            activeView === "PLAYLIST" ? "text-white font-bold" : "text-gray-300"
          }`}
        >
          Now Playing
        </button>
        <button
          onClick={() => setActiveView("SEARCH")}
          className={`flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 ${
            activeView === "SEARCH"
              ? "text-[#42B638] font-bold"
              : "text-gray-300"
          }`}
        >
          <FaSearch className="text-[10px]" /> Smart DJ
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-grow flex overflow-hidden bg-[#2C3E50]">
        {/* Lado Esquerdo */}
        <div className="flex-1 flex flex-col p-2 bg-gradient-to-b from-[#627390] to-[#2C3E50] min-w-0 relative z-0">
          <div className="flex-grow relative shadow-xl border border-[#333] bg-black group min-h-[100px]">
            {/* Visualizador */}
            <div className="absolute inset-0 z-10 w-full h-full">
              {hasError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 bg-black">
                  <FaExclamationTriangle size={30} />
                  <span className="text-xs">Erro ao carregar mídia</span>
                </div>
              ) : (
                <CanvasVisualizer
                  audioRef={playerRef}
                  isPlaying={isPlaying}
                  cover={currentTrack?.cover}
                  isYouTube={currentTrack?.source === "youtube"}
                />
              )}
            </div>

            <div className="absolute top-2 right-2 z-30">
              <button
                onClick={handleToggleLike}
                className={`p-2 rounded-full bg-black/40 hover:bg-black/60 transition-all ${
                  isCurrentTrackLiked
                    ? "text-red-500"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {isCurrentTrackLiked ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
          </div>

          <div className="mt-2 text-center h-12 flex flex-col justify-center flex-shrink-0 px-2 w-full">
            <p
              className="text-sm font-bold text-white drop-shadow-md w-full truncate block"
              title={decodeHtml(currentTrack.title)}
            >
              {decodeHtml(currentTrack.title)}
            </p>
            <div className="flex items-center justify-center gap-2 w-full">
              <p
                className="text-[10px] text-gray-300 truncate max-w-[80%] block"
                title={decodeHtml(currentTrack.artist)}
              >
                {decodeHtml(currentTrack.artist)}
              </p>
              {currentTrack.source === "youtube" && (
                <span className="text-[8px] bg-red-600 px-1 rounded text-white flex-shrink-0">
                  YT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito */}
        <div className="w-56 bg-white text-black border-l-2 border-[#182C68] flex flex-col relative flex-shrink-0 z-0">
          {activeView === "PLAYLIST" && (
            <div className="overflow-y-auto flex-grow bg-white">
              {playlist.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">
                  Playlist empty.
                  <br />
                  Use Smart DJ.
                </div>
              ) : (
                playlist.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setIsPlaying(true);
                    }}
                    className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer border-b border-gray-100 ${
                      idx === currentTrackIndex
                        ? "bg-[#316AC5] text-white"
                        : "hover:bg-[#F3F3F3]"
                    }`}
                  >
                    <span className="text-[10px] opacity-70 w-4 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex flex-col overflow-hidden min-w-0 w-full">
                      <span className="truncate font-bold w-full block">
                        {decodeHtml(track.title)}
                      </span>
                      <span
                        className={`text-[9px] truncate w-full block ${
                          idx === currentTrackIndex
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {decodeHtml(track.artist)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeView === "SEARCH" && (
            <div className="flex flex-col h-full bg-[#F0F0F0] relative">
              <div className="bg-[#2C3E50] p-2 text-white text-xs font-bold flex items-center gap-2 shadow-md flex-shrink-0">
                <FaSearch className="text-[#42B638]" />
                <span>Smart DJ (AI)</span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <label className="text-xs text-gray-600 font-bold">
                  I want to listen to...
                </label>
                <input
                  type="text"
                  value={vibeInput}
                  onChange={(e) => setVibeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVibeSubmit(e);
                  }}
                  placeholder="e.g., Yoshi City Yung Lean"
                  className="w-full p-2 text-xs border-2 border-[#7F9DB9] rounded-sm focus:border-[#3C7FB1] outline-none shadow-inner"
                />
                <button
                  onClick={handleVibeSubmit}
                  disabled={isLoadingAi || !vibeInput.trim()}
                  className="bg-[#3C7FB1] text-white px-3 py-2 rounded-sm text-xs font-bold shadow-md hover:bg-[#2C5F85] flex items-center justify-center gap-2 mt-2"
                >
                  {isLoadingAi ? "Thinking..." : "Generate Playlist"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="h-16 bg-gradient-to-b from-[#6B7D94] via-[#405168] to-[#2C3E50] border-t border-[#8FA0B5] flex flex-col px-3 pb-1 relative shadow-[0_-2px_5px_rgba(0,0,0,0.3)] z-20 flex-shrink-0">
        <div className="w-full flex items-center gap-2 mb-1 mt-1">
          <span className="text-[9px] w-8 text-right font-mono text-[#42B638]">
            {Math.floor(currentTime / 60)}:
            {Math.floor(currentTime % 60)
              .toString()
              .padStart(2, "0")}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const newTime = parseFloat(e.target.value);
              setCurrentTime(newTime);
              // Proteção segura contra erros de referência
              if (
                playerRef.current &&
                typeof playerRef.current.seekTo === "function"
              ) {
                playerRef.current.seekTo(newTime);
              }
            }}
            className="flex-grow h-1.5 bg-black rounded-full appearance-none cursor-pointer accent-[#42B638] border border-[#555]"
          />
          <span className="text-[9px] w-8 font-mono">
            {Math.floor(duration / 60)}:
            {Math.floor(duration % 60)
              .toString()
              .padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center justify-center gap-5 pb-1 relative">
          <button
            onClick={() => {
              setIsPlaying(false);
              if (
                playerRef.current &&
                typeof playerRef.current.seekTo === "function"
              ) {
                playerRef.current.seekTo(0);
              }
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-b from-[#E0E0E0] to-[#999] shadow border border-[#555] flex items-center justify-center hover:brightness-110"
          >
            <FaStop className="text-[#182C68] text-xs" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 -mt-1 rounded-full bg-gradient-to-b from-[#FFF] to-[#C0C0C0] shadow border-2 border-[#666] flex items-center justify-center hover:brightness-110"
          >
            {isPlaying ? (
              <FaPause className="text-[#182C68] text-lg" />
            ) : (
              <FaPlay className="text-[#182C68] text-lg ml-1" />
            )}
          </button>
          <div className="flex items-center gap-2 absolute right-0 bottom-1">
            <button
              onClick={() => {
                setVolume((prev) => (prev === 0 ? 0.5 : 0));
              }}
              className="p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              {volume === 0 ? (
                <FaVolumeMute className="text-gray-400 text-xs" />
              ) : (
                <FaVolumeUp className="text-gray-400 text-xs" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
              }}
              className="w-16 h-1.5 bg-black rounded-full appearance-none cursor-pointer accent-[#42B638] border border-[#555]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayerApp;
