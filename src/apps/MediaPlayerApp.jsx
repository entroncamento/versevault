import React, { useState, useEffect, useRef } from "react";
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
  FaMusic,
} from "react-icons/fa";
import { useWindowManager } from "../contexts/WindowManagerContext";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

// Usa o proxy ou localhost direto
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// --- VISUALIZADOR CANVAS (MANTIDO IGUAL) ---
const CanvasVisualizer = ({ audioRef, isPlaying, cover }) => {
  const canvasRef = useRef(null);
  const [visMode, setVisMode] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const MODES = ["SPECTRUM", "OSCILLOSCOPE", "VORTEX"];

  useEffect(() => {
    if (!audioRef.current) return;
    const initAudio = () => {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
      }
      if (!sourceRef.current) {
        try {
          const source = ctx.createMediaElementSource(audioRef.current);
          source.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          sourceRef.current = source;
        } catch (e) {}
      }
    };
    initAudio();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioRef]);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !canvasRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      if (!isPlaying) return;
      animationRef.current = requestAnimationFrame(renderFrame);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (visMode !== 1) analyser.getByteFrequencyData(dataArray);
      else analyser.getByteTimeDomainData(dataArray);

      if (visMode === 0) {
        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          const gradient = ctx.createLinearGradient(
            0,
            height - barHeight,
            0,
            height
          );
          gradient.addColorStop(0, "#aaffaa");
          gradient.addColorStop(1, "#005500");
          ctx.fillStyle = gradient;
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
        const radius = Math.min(width, height) / 3;
        ctx.beginPath();
        ctx.strokeStyle = "#42B638";
        ctx.lineWidth = 2;
        for (let i = 0; i < bufferLength; i++) {
          const rad = Math.PI * 2 * (i / bufferLength);
          const barHeight = (dataArray[i] / 255) * 50;
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
    if (audioContextRef.current?.state === "suspended")
      audioContextRef.current.resume();
    renderFrame();
  }, [isPlaying, visMode]);

  const nextMode = () => setVisMode((prev) => (prev + 1) % MODES.length);
  const prevMode = () =>
    setVisMode((prev) => (prev - 1 + MODES.length) % MODES.length);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden border-2 border-[#596878] shadow-inner relative group">
      {cover && (
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none transition-opacity duration-500">
          <img
            src={cover}
            className="h-full object-cover w-full blur-lg"
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
          className="text-white/50 hover:text-white p-1 bg-black/20 rounded backdrop-blur-sm"
        >
          <FaChevronLeft size={10} />
        </button>
        <span className="text-[9px] text-white/80 font-mono uppercase tracking-widest bg-black/40 px-2 rounded backdrop-blur-sm border border-white/10">
          {MODES[visMode]}
        </span>
        <button
          onClick={nextMode}
          className="text-white/50 hover:text-white p-1 bg-black/20 rounded backdrop-blur-sm"
        >
          <FaChevronRight size={10} />
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (ATUALIZADO) ---
const MediaPlayerApp = ({ windowId, trackToPlay }) => {
  const { currentUser } = useAuth();
  const audioRef = useRef(null);

  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);

  const [activeView, setActiveView] = useState("PLAYLIST");
  const [vibeInput, setVibeInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [userTasteContext, setUserTasteContext] = useState("");
  const [likedTracks, setLikedTracks] = useState([]);

  const currentTrack = playlist[currentTrackIndex] || {
    title: "No Media",
    artist: "Waiting for input...",
  };

  const isCurrentTrackLiked = likedTracks.some(
    (t) => t.title === currentTrack.title && t.artist === currentTrack.artist
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (trackToPlay) {
      setPlaylist([trackToPlay]);
      setCurrentTrackIndex(0);
      setActiveView("PLAYLIST");
      setTimeout(() => setIsPlaying(true), 100);
    }
  }, [trackToPlay]);

  // LOAD USER TASTE (Contexto para a AI)
  useEffect(() => {
    const loadUserTaste = async () => {
      if (currentUser?.uid) {
        try {
          const stats = await leaderboardApi.getUserStats(currentUser.uid);
          let contextString = "";
          if (stats?.likedTracks) {
            setLikedTracks(stats.likedTracks);
            const likedNames = stats.likedTracks
              .slice(0, 5)
              .map((t) => `${t.title} by ${t.artist}`)
              .join(", ");
            if (likedNames) contextString += `User likes: ${likedNames}. `;
          }
          if (contextString) setUserTasteContext(contextString);
        } catch (e) {}
      }
    };
    loadUserTaste();
  }, [currentUser]);

  // HANDLE AI DJ SUBMIT (Sem Tokens!)
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
        alert("No tracks found with preview audio.");
      } else {
        setPlaylist((prev) => [...prev, ...newTracks]);
        // Se a playlist estava vazia, começa a tocar logo
        if (playlist.length === 0) {
          setCurrentTrackIndex(0);
          setTimeout(() => setIsPlaying(true), 500);
        } else {
          // Se já tinha músicas, adiciona ao fim e toca a primeira nova
          setCurrentTrackIndex(playlist.length);
        }
        setActiveView("PLAYLIST");
        setVibeInput("");
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI DJ is offline. Check if server.js is running.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentTrack.url || !currentUser) return;
    const newStatus = !isCurrentTrackLiked;
    const trackData = { ...currentTrack };

    if (newStatus) setLikedTracks((prev) => [...prev, trackData]);
    else
      setLikedTracks((prev) => prev.filter((t) => t.title !== trackData.title));

    await leaderboardApi.toggleLike(currentUser, trackData, newStatus);
  };

  // AUDIO CONTROLS
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying)
        audioRef.current
          .play()
          .catch((e) => console.log("Autoplay blocked", e));
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
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
        crossOrigin="anonymous"
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (currentTrackIndex < playlist.length - 1)
            setCurrentTrackIndex((prev) => prev + 1);
          else setIsPlaying(false);
        }}
      />

      {/* TOPO */}
      <div className="bg-gradient-to-r from-[#182C68] to-[#304896] h-8 flex items-center px-2 text-[11px] gap-3 border-b border-[#586987] shadow-sm z-10 flex-shrink-0">
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
        <div className="flex-1 flex flex-col p-2 bg-gradient-to-b from-[#627390] to-[#2C3E50]">
          <div className="flex-grow relative shadow-xl border border-[#333] bg-black group">
            <CanvasVisualizer
              audioRef={audioRef}
              isPlaying={isPlaying}
              cover={currentTrack?.cover}
            />
            {currentTrack.url && (
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
            )}
          </div>
          <div className="mt-2 text-center h-10 flex-shrink-0 relative">
            <p className="text-sm font-bold text-white drop-shadow-md truncate px-2">
              {currentTrack.title}
            </p>
            <p className="text-[10px] text-gray-300">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="w-56 bg-white text-black border-l-2 border-[#182C68] flex flex-col relative flex-shrink-0">
          {activeView === "PLAYLIST" && (
            <div className="overflow-y-auto flex-grow bg-white">
              {playlist.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 mt-10">
                  Playlist empty.
                  <br />
                  Use Smart DJ to add songs.
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
                    <span className="text-[10px] opacity-70 w-4 text-right">
                      {idx + 1}.
                    </span>
                    <div className="flex flex-col overflow-hidden w-full">
                      <span className="truncate font-bold">{track.title}</span>
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
          )}

          {activeView === "SEARCH" && (
            <div className="flex flex-col h-full bg-[#F0F0F0] relative">
              <div className="bg-[#2C3E50] p-2 text-white text-xs font-bold flex items-center gap-2 shadow-md">
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

                <div className="text-[10px] text-gray-500 bg-yellow-50 p-2 border border-yellow-200 rounded">
                  <strong>Tip:</strong> Be specific! <br />
                  "Songs like Yoshi City" <br />
                  "80s Japanese City Pop"
                </div>

                <button
                  onClick={handleVibeSubmit}
                  disabled={isLoadingAi || !vibeInput.trim()}
                  className="bg-[#3C7FB1] text-white px-3 py-2 rounded-sm text-xs font-bold shadow-md active:translate-y-[1px] disabled:opacity-50 hover:bg-[#2C5F85] transition-colors flex items-center justify-center gap-2 mt-2"
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
        <div className="flex items-center justify-center gap-5 pb-1 relative">
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
          <div className="flex items-center gap-2 absolute right-0 bottom-1">
            {volume === 0 ? (
              <FaVolumeMute className="text-gray-400 text-xs" />
            ) : (
              <FaVolumeUp className="text-gray-400 text-xs" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-black rounded-full appearance-none cursor-pointer accent-[#42B638] border border-[#555]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayerApp;
