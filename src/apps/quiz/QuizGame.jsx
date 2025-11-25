import React, { useState, useEffect, useRef } from "react";
import { musicApi } from "../../services/musicApi";
// Removemos useLyricsSync externo para usar lógica interna unificada
import { motion, AnimatePresence } from "framer-motion";

const QuizGame = ({ tracks, mode, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Estado para controlar a linha ativa (Karaoke)
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  const audioRef = useRef(null);
  const currentTrack = tracks[currentIndex];
  const isLyricsMode = mode === "LYRICS" || currentTrack?.gameMode === "LYRICS";

  // --- LÓGICA DE SINCRONIZAÇÃO UNIFICADA ---
  useEffect(() => {
    if (!gameStarted || isAnswered || !isLyricsMode) return;

    const audio = audioRef.current;
    let lines = currentTrack.lyricsLines;

    // SE NÃO HOUVER LINHAS VINDAS DO SERVIDOR (Fallback Genius)
    // Criamos linhas artificiais aqui mesmo no frontend
    if (!lines || lines.length === 0) {
      if (currentTrack.lyricsSnippet) {
        const rawLines = currentTrack.lyricsSnippet
          .split("\n")
          .filter((l) => l.trim().length > 0);
        // 30 segundos de música / número de linhas = tempo por linha
        const durationPerLine = 28 / Math.max(1, rawLines.length);

        lines = rawLines.map((text, i) => ({
          text,
          time: i * durationPerLine,
          isTarget: text.includes("_______"),
        }));
      } else {
        return; // Sem letra nenhuma
      }
    }

    const handleTimeUpdate = () => {
      const currentTime = audio ? audio.currentTime : 0;

      // Encontra a linha atual
      let newIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (currentTime >= lines[i].time) {
          newIndex = i;
        } else {
          break;
        }
      }
      setActiveLineIndex(newIndex);
    };

    if (audio) {
      audio.addEventListener("timeupdate", handleTimeUpdate);
    } else {
      // Fallback se o áudio falhar: simula com timer
      const interval = setInterval(() => {
        setActiveLineIndex((prev) =>
          prev < lines.length - 1 ? prev + 1 : prev
        );
      }, 30000 / lines.length);
      return () => clearInterval(interval);
    }

    return () => {
      if (audio) audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [gameStarted, isAnswered, isLyricsMode, currentTrack]);

  // Configuração Inicial da Ronda
  useEffect(() => {
    if (!currentTrack) return;

    if (isLyricsMode) {
      setOptions(
        musicApi.generateWordOptions(
          currentTrack.missingWord,
          currentTrack.wordOptions
        )
      );
    } else {
      setOptions(musicApi.generateOptions(currentTrack, tracks));
    }

    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOption(null);
    setActiveLineIndex(0);

    if (gameStarted && currentTrack.previewUrl) {
      if (audioRef.current) {
        audioRef.current.src = currentTrack.previewUrl;
        audioRef.current.load();
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch((e) => console.log("Autoplay:", e));
      }
    }
  }, [currentIndex, currentTrack, gameStarted]);

  // Timer Geral
  useEffect(() => {
    if (!gameStarted || isAnswered || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isAnswered, gameStarted]);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleTimeOut = () => {
    setIsAnswered(true);
    setTimeout(nextQuestion, 2500);
  };

  const handleAnswer = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(answer);

    let isCorrect = false;
    if (isLyricsMode) {
      const ans = String(answer).trim().toLowerCase();
      const corr = String(currentTrack.missingWord).trim().toLowerCase();
      isCorrect = ans === corr;
    } else {
      isCorrect = answer === currentTrack.id;
    }

    if (isCorrect) {
      setScore((prev) => prev + (100 + timeLeft * 10));
    }
    setTimeout(nextQuestion, 2000);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < tracks.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinish(score);
    }
  };

  // --- RENDERIZADORES ---

  // Determina quais linhas mostrar (Server lines ou Local fallback)
  const getDisplayLines = () => {
    if (currentTrack?.lyricsLines && currentTrack.lyricsLines.length > 0) {
      return currentTrack.lyricsLines;
    }
    if (currentTrack?.lyricsSnippet) {
      // Converte snippet bruto em linhas para visualização uniforme
      return currentTrack.lyricsSnippet
        .split("\n")
        .map((text) => ({ text, time: 0 }));
    }
    return [];
  };

  const displayLines = getDisplayLines();

  if (!currentTrack) return <div>A carregar...</div>;

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] text-[#003399]">
        <div className="bg-white p-8 border-2 border-[#003C74] shadow-lg text-center rounded">
          <h2 className="text-xl font-bold mb-4">Quiz Pronto!</h2>
          <p className="mb-6 text-gray-600">
            Encontrámos {tracks.length} músicas.
          </p>
          <button
            onClick={handleStartGame}
            className="bg-[#0054E3] text-white px-6 py-2 rounded font-bold shadow-md active:translate-y-1"
          >
            COMEÇAR ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] p-2 select-none">
      <div className="flex justify-between items-center bg-black text-green-500 font-mono p-2 mb-2 rounded-sm shadow-inner">
        <span className="text-xs md:text-sm">
          FAIXA {currentIndex + 1}/{tracks.length}
        </span>
        <span
          className={`text-xl font-bold ${
            timeLeft < 10 ? "text-red-500 animate-pulse" : ""
          }`}
        >
          00:{timeLeft.toString().padStart(2, "0")}
        </span>
        <span className="text-xs md:text-sm">PONTOS: {score}</span>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 border-2 border-gray-600 relative overflow-hidden mb-2 p-4 shadow-inner">
        <audio ref={audioRef} key={currentTrack.id} />

        {isLyricsMode ? (
          <div className="bg-[#1A1A1A] text-white p-6 rounded shadow-lg max-w-md w-full text-center border border-gray-700 relative overflow-hidden h-[280px] flex flex-col justify-center">
            {/* VISUALIZADOR DE KARAOKE */}
            <div className="flex flex-col gap-4 h-full justify-center items-center">
              <AnimatePresence mode="popLayout">
                {displayLines.map((line, idx) => {
                  // Lógica de foco: Mostra linha atual e as vizinhas
                  const isActive = idx === activeLineIndex;
                  const dist = Math.abs(idx - activeLineIndex);

                  if (dist > 2) return null; // Otimização: esconde linhas distantes

                  return (
                    <motion.p
                      key={`${currentTrack.id}-${idx}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: isActive ? 1 : 0.4,
                        scale: isActive ? 1.1 : 0.95,
                        color: isActive ? "#FFFFFF" : "#888888",
                        fontWeight: isActive ? 700 : 400,
                        filter: isActive ? "blur(0px)" : "blur(1px)",
                      }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="text-lg font-sans leading-relaxed max-w-[90%]"
                    >
                      {line.text}
                    </motion.p>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div
            className="w-40 h-40 rounded-full border-8 border-[#111] flex items-center justify-center bg-[#222] shadow-2xl animate-spin"
            style={{ animationDuration: "4s" }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-gray-600 relative">
              <div className="absolute top-3 left-4 w-3 h-3 bg-white/20 rounded-full"></div>
            </div>
          </div>
        )}

        {isAnswered && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-fadeIn z-30 backdrop-blur-sm">
            <img
              src={currentTrack.cover}
              alt="Capa"
              className="w-40 h-40 object-cover border-4 border-white shadow-lg mb-4"
            />
            <div className="text-white text-center px-4">
              <h3 className="text-lg font-bold">{currentTrack.title}</h3>
              <p className="text-sm text-gray-300">{currentTrack.artist}</p>
              {isLyricsMode && (
                <p className="text-green-400 font-bold mt-2 bg-black/50 px-2 rounded">
                  {currentTrack.missingWord.toUpperCase()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 h-32">
        {options.map((opt, idx) => {
          const val = isLyricsMode ? opt : opt.id;
          const label = isLyricsMode ? opt : opt.title;
          let btnClass =
            "bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] text-[#003C74]";

          if (isAnswered) {
            const corr = isLyricsMode
              ? currentTrack.missingWord.toLowerCase()
              : currentTrack.id;
            const curr = isLyricsMode ? String(val).toLowerCase() : val;
            if (curr === corr)
              btnClass = "bg-[#4CAF50] text-white border-[#2E7D32] font-bold";
            else if (val === selectedOption)
              btnClass = "bg-[#F44336] text-white border-[#C62828] opacity-80";
            else btnClass = "opacity-30 grayscale";
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(val)}
              className={`rounded-[3px] p-2 text-xs font-bold shadow-sm transition-all active:scale-[0.95] ${btnClass}`}
              disabled={isAnswered}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizGame;
