import React, { useState, useEffect, useRef } from "react";
import { musicApi } from "../../services/musicApi";

const QuizGame = ({ tracks, mode, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState([]);

  const audioRef = useRef(null);
  const currentTrack = tracks[currentIndex];
  const isLyricsMode = mode === "LYRICS" || currentTrack?.gameMode === "LYRICS";

  useEffect(() => {
    if (!currentTrack) return;

    if (isLyricsMode) {
      setOptions(musicApi.generateWordOptions(currentTrack.missingWord));
    } else {
      setOptions(musicApi.generateOptions(currentTrack, tracks));
    }

    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOption(null);

    // Toca sempre se tiver preview
    if (currentTrack.previewUrl) {
      setIsPlaying(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.volume = 0.5;
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }, 100);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, currentTrack, tracks, isLyricsMode]);

  useEffect(() => {
    if (isAnswered || timeLeft <= 0) return;
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
  }, [timeLeft, isAnswered]);

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

  if (!currentTrack) return <div>A carregar...</div>;

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
        {currentTrack.previewUrl && (
          <audio ref={audioRef} src={currentTrack.previewUrl} />
        )}

        {isLyricsMode ? (
          <div className="bg-[#FFFBE6] text-gray-800 p-6 rounded shadow-lg max-w-md w-full text-center border border-[#D4C495] relative">
            {isPlaying && (
              <div className="absolute top-2 right-2 text-xs text-[#003399] animate-pulse font-bold">
                ♫ Playing
              </div>
            )}
            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border border-red-700 transform -translate-x-1/2"></div>
            <h3 className="text-[#003399] font-bold text-xs uppercase tracking-widest mb-4 border-b border-gray-300 pb-2">
              Complete a Letra
            </h3>
            <p className="text-sm md:text-lg font-serif italic leading-relaxed font-medium whitespace-pre-line">
              "{currentTrack.lyricsSnippet}"
            </p>
            <p className="mt-4 text-xs text-gray-500 font-sans">
              Música de: {currentTrack.artist}
            </p>
          </div>
        ) : (
          <div
            className={`w-40 h-40 rounded-full border-8 border-[#111] flex items-center justify-center bg-[#222] shadow-2xl ${
              isPlaying && !isAnswered ? "animate-spin" : ""
            }`}
            style={{ animationDuration: "4s" }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
          </div>
        )}

        {isAnswered && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-fadeIn z-30">
            <img
              src={currentTrack.cover}
              alt="Capa"
              className="w-40 h-40 object-cover border-4 border-white shadow-lg mb-4"
            />
            <div className="text-white text-center px-4">
              <h3 className="text-lg font-bold">{currentTrack.title}</h3>
              <p className="text-sm text-gray-300">{currentTrack.artist}</p>
              {isLyricsMode && (
                <p className="text-green-400 font-bold mt-2 text-sm">
                  Palavra: {currentTrack.missingWord}
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
              ? String(currentTrack.missingWord).toLowerCase()
              : currentTrack.id;
            const curr = isLyricsMode ? String(val).toLowerCase() : val;

            if (curr === corr)
              btnClass = "bg-[#4CAF50] text-white border-[#2E7D32]";
            else if (val === selectedOption)
              btnClass = "bg-[#F44336] text-white border-[#C62828]";
            else btnClass = "opacity-40 grayscale";
          } else {
            btnClass += " hover:bg-[#FFFFCC] active:translate-y-[1px]";
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(val)}
              className={`rounded-[3px] p-2 text-xs font-bold shadow-sm transition-all ${btnClass}`}
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
