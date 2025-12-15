import React, { useState, useEffect, useRef } from "react";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaSearch,
  FaMusic,
  FaHeart,
  FaRegHeart,
  FaChevronLeft,
  FaChevronRight,
  FaList,
  FaSpotify,
  FaLink,
} from "react-icons/fa";
import { useWindowManager } from "../contexts/WindowManagerContext";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// --- VISUALIZADOR CANVAS ---
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
        let barHeight;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height;
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
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#00FF00";
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
        ctx.shadowBlur = 0;
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
            src="/icons/wmp_logo.png"
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

const MediaPlayerApp = ({ windowId }) => {
  const { closeWindow } = useWindowManager();
  const { currentUser } = useAuth();
  const audioRef = useRef(null);

  // Playlist e Áudio
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Navegação e AI
  const [activeView, setActiveView] = useState("PLAYLIST");
  const [vibeInput, setVibeInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [userTasteContext, setUserTasteContext] = useState("");
  const [likedTracks, setLikedTracks] = useState([]);
  const [spotifyToken, setSpotifyToken] = useState(null);

  const currentTrack = playlist[currentTrackIndex] || {
    title: "No Media",
    artist: "Waiting for input...",
  };

  const isCurrentTrackLiked = likedTracks.some(
    (t) => t.title === currentTrack.title && t.artist === currentTrack.artist
  );

  // --- FUNÇÃO DE LOGIN SPOTIFY ---
  const connectSpotify = (onSuccess) => {
    const popup = window.open(
      `${PROXY_BASE}/api/spotify/login`,
      "Spotify Login",
      "width=500,height=600"
    );

    const receiveMessage = async (event) => {
      if (event.data.type === "SPOTIFY_TOKEN") {
        const token = event.data.token;
        setSpotifyToken(token);
        if (onSuccess) onSuccess(token);
        window.removeEventListener("message", receiveMessage);
      }
    };
    window.addEventListener("message", receiveMessage, false);
  };

  // --- FETCH TOP ARTISTS ---
  const fetchUserTopArtists = async (token) => {
    try {
      const res = await fetch(`${PROXY_BASE}/api/spotify/top`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.artists && data.artists.length > 0) {
        const spotifyTaste = `Your real Spotify top artists are: ${data.artists.join(
          ", "
        )}. `;
        setUserTasteContext((prev) => spotifyTaste + prev);
        alert(
          `Sync successful! AI now knows you love: ${data.artists
            .slice(0, 3)
            .join(", ")}...`
        );
      }
    } catch (e) {
      console.error("Failed to fetch top artists", e);
    }
  };

  // --- SALVAR MÚSICA ATUAL NO SPOTIFY ---
  const handleSaveCurrentToSpotify = () => {
    if (
      !currentTrack ||
      !currentTrack.title ||
      currentTrack.title === "No Media"
    ) {
      alert("Play a song first!");
      return;
    }

    const performSave = async (token) => {
      setIsExporting(true);
      try {
        const res = await fetch(`${PROXY_BASE}/api/spotify/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            track: currentTrack, // Envia apenas a música atual
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert(
            `"${currentTrack.title}" saved to your Spotify Liked Songs! 💚`
          );
        } else {
          alert("Could not save song.");
        }
      } catch (e) {
        console.error(e);
        alert("Error saving song.");
      } finally {
        setIsExporting(false);
      }
    };

    if (spotifyToken) performSave(spotifyToken);
    else connectSpotify((token) => performSave(token));
  };

  // Carregar dados do utilizador
  useEffect(() => {
    const loadUserTaste = async () => {
      if (currentUser?.uid) {
        try {
          const stats = await leaderboardApi.getUserStats(currentUser.uid);
          let contextString = "";
          if (stats?.stats?.artists) {
            const topArtists = Object.entries(stats.stats.artists)
              .sort(([, countA], [, countB]) => countB - countA)
              .slice(0, 3)
              .map(([artist]) => artist)
              .join(", ");
            if (topArtists)
              contextString += `User loves artists: ${topArtists}. `;
          }
          if (stats?.likedTracks && Array.isArray(stats.likedTracks)) {
            setLikedTracks(stats.likedTracks);
            const likedNames = stats.likedTracks
              .slice(0, 5)
              .map((t) => `"${t.title}" by ${t.artist}`)
              .join(", ");
            if (likedNames)
              contextString += `User liked songs: ${likedNames}. `;
          }
          if (contextString) setUserTasteContext(contextString);
        } catch (e) {}
      }
    };
    loadUserTaste();
  }, [currentUser]);

  const handleToggleLike = async () => {
    if (!currentTrack.url || !currentUser) return;
    const newStatus = !isCurrentTrackLiked;
    const trackData = {
      title: currentTrack.title,
      artist: currentTrack.artist,
      url: currentTrack.url,
      cover: currentTrack.cover,
      id: currentTrack.id,
      uri: currentTrack.uri,
    };
    if (newStatus) setLikedTracks((prev) => [...prev, trackData]);
    else
      setLikedTracks((prev) =>
        prev.filter((t) => t.title !== currentTrack.title)
      );
    await leaderboardApi.toggleLike(currentUser, trackData, newStatus);
  };

  const playLikedTrack = (track) => {
    if (!track.url) return;
    setPlaylist(likedTracks);
    const index = likedTracks.findIndex((t) => t.title === track.title);
    setCurrentTrackIndex(index !== -1 ? index : 0);
    setIsPlaying(true);
    setActiveView("PLAYLIST");
  };

  useEffect(() => {
    if (playlist.length > 0 && audioRef.current && !isPlaying)
      setTimeout(() => setIsPlaying(true), 500);
  }, [playlist]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined)
          playPromise.catch((error) =>
            console.log("Autoplay prevented:", error)
          );
      } else audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleVibeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!vibeInput.trim()) return;

    setIsLoadingAi(true);

    try {
      const res = await fetch(`${PROXY_BASE}/api/ai/recommend`, {
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
      if (newTracks.length === 0 || !newTracks[0].url)
        alert("Música encontrada, mas sem preview.");
      else {
        setPlaylist((prev) => [...prev, ...newTracks]);
        setCurrentTrackIndex(playlist.length);
        setActiveView("PLAYLIST");
        setVibeInput("");
      }
    } catch (error) {
      alert("A AI não conseguiu encontrar músicas.");
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
          onClick={() => setActiveView("LIKED")}
          className={`flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 ${
            activeView === "LIKED" ? "text-white font-bold" : "text-gray-300"
          }`}
        >
          <FaHeart
            className={
              activeView === "LIKED" ? "text-red-500" : "text-gray-400"
            }
          />{" "}
          Liked
        </button>
        <button
          onClick={() => setActiveView("SEARCH")}
          className={`flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 ${
            activeView === "SEARCH" ? "text-white font-bold" : "text-[#42B638]"
          }`}
        >
          <FaSearch className="text-[10px]" /> Smart DJ
        </button>
      </div>

      {/* PRINCIPAL */}
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
                  title={isCurrentTrackLiked ? "Unlike" : "Like"}
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
            <>
              <div className="bg-[#E1EAF8] p-1 border-b border-[#9EB6CE] flex justify-between items-center px-2 flex-shrink-0">
                <span className="text-xs font-bold text-[#182C68]">
                  Playlist
                </span>
                {/* BOTÃO AGORA SALVA APENAS A MÚSICA ATUAL */}
                <button
                  onClick={handleSaveCurrentToSpotify}
                  disabled={isExporting || !currentTrack.title}
                  className="flex items-center gap-1 text-[9px] bg-[#1DB954] text-white px-2 py-0.5 rounded hover:bg-[#179443] transition-colors"
                >
                  <FaSpotify /> {isExporting ? "Saving..." : "Save Song"}
                </button>
              </div>
              <div className="overflow-y-auto flex-grow bg-white">
                {playlist.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 mt-10 flex flex-col items-center">
                    <span>Playlist empty.</span>
                    <button
                      onClick={() => setActiveView("SEARCH")}
                      className="mt-2 text-[#3C7FB1] hover:underline cursor-pointer font-bold"
                    >
                      Ask the AI
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
                      className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer border-b border-gray-100 transition-colors ${
                        idx === currentTrackIndex
                          ? "bg-[#316AC5] text-white"
                          : "hover:bg-[#F3F3F3]"
                      }`}
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

          {activeView === "LIKED" && (
            <>
              <div className="bg-[#E1EAF8] p-1 border-b border-[#9EB6CE] flex justify-between items-center px-2 flex-shrink-0">
                <span className="text-xs font-bold text-[#182C68] flex items-center gap-1">
                  <FaHeart className="text-red-500 text-[10px]" /> Favorites
                </span>
              </div>
              <div className="overflow-y-auto flex-grow bg-white">
                {likedTracks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 mt-10">
                    No liked songs yet.
                  </div>
                ) : (
                  likedTracks.map((track, idx) => (
                    <div
                      key={idx}
                      onClick={() => playLikedTrack(track)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer border-b border-gray-100 hover:bg-[#F3F3F3] transition-colors group"
                    >
                      <FaHeart className="text-red-500 text-[10px] flex-shrink-0 opacity-80" />
                      <div className="flex flex-col overflow-hidden w-full">
                        <span className="truncate font-bold text-gray-800">
                          {track.title}
                        </span>
                        <span className="text-[9px] truncate text-gray-500">
                          {track.artist}
                        </span>
                      </div>
                      <FaPlay className="text-[#3C7FB1] text-[8px] opacity-0 group-hover:opacity-100 ml-1" />
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeView === "SEARCH" && (
            <div className="flex flex-col h-full bg-[#F0F0F0] relative">
              <div className="bg-[#2C3E50] p-2 text-white text-xs font-bold flex items-center gap-2 shadow-md">
                <FaSearch className="text-[#42B638]" />
                <span>Smart DJ</span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <label className="text-xs text-gray-600 font-bold">
                  Type a song or vibe:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={vibeInput}
                    onChange={(e) => setVibeInput(e.target.value)}
                    placeholder="Ex: Late night jazz, Mac Miller - Self Care..."
                    className="w-full p-2 text-xs border-2 border-[#7F9DB9] rounded-sm focus:border-[#3C7FB1] outline-none shadow-inner font-sans"
                  />
                  {/* AUTOCOMPLETE REMOVIDO */}
                </div>

                {/* BOTÕES E CONTEXTO */}
                {!spotifyToken ? (
                  <button
                    onClick={() => connectSpotify(fetchUserTopArtists)}
                    className="text-xs flex items-center justify-center gap-2 bg-[#191414] text-white py-1.5 px-2 rounded hover:bg-[#1DB954] transition-colors shadow-sm"
                  >
                    <FaSpotify size={14} /> Connect Spotify for personalized AI
                  </button>
                ) : (
                  <div className="text-[9px] text-green-700 bg-green-100 p-1 border border-green-300 rounded flex items-center gap-1 justify-center">
                    <FaSpotify /> <span>Spotify Linked & Syncing</span>
                  </div>
                )}

                <button
                  onClick={(e) => handleVibeSubmit(e)}
                  disabled={isLoadingAi || !vibeInput.trim()}
                  className="bg-[#3C7FB1] text-white px-3 py-2 rounded-sm text-xs font-bold shadow-md active:translate-y-[1px] disabled:opacity-50 hover:bg-[#2C5F85] transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {isLoadingAi ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaMusic /> Generate Playlist
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RODAPÉ */}
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
