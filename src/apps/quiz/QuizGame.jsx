import React, { useState, useEffect, useRef } from "react";
import { musicApi } from "../../services/musicApi";

const QuizGame = ({ tracks, mode, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // --- LÓGICA DE DICAS PROGRESSIVAS ---
  const [hintText, setHintText] = useState(null);
  const [hintLevel, setHintLevel] = useState(0); // 0 = sem dicas, 1 = ano, 2 = album

  const audioRef = useRef(null);
  const currentTrack = tracks[currentIndex];
  const [options, setOptions] = useState([]);

  // Inicialização quando a música muda
  useEffect(() => {
    if (!currentTrack) return;

    setOptions(musicApi.generateOptions(currentTrack, tracks));

    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOption(null);
    setIsPlaying(true);

    // Reset das dicas para a nova música
    setHintText(null);
    setHintLevel(0);

    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => setIsPlaying(false));
      }
    }
  }, [currentIndex, currentTrack, tracks]);

  // Timer
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
    setTimeout(nextQuestion, 2000);
  };

  const handleAnswer = (trackId) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(trackId);

    if (trackId === currentTrack.id) {
      const points = 100 + timeLeft * 10;
      setScore((prev) => prev + points);
    }
    setTimeout(nextQuestion, 2000);
  };

  // --- FUNÇÃO PROGRESSIVA DE DICAS (COM PROTEÇÃO DE SALDO) ---
  const handleGetHint = () => {
    if (isAnswered) return;

    const yearData = currentTrack.year || "????";
    const albumData = currentTrack.album || "Unknown Album";

    if (hintLevel === 0) {
      // Verifica saldo para Dica Nível 1 (Custo 300)
      if (score < 300) {
        alert("Insufficient funds! You need 300 points to buy a hint.");
        return;
      }

      setScore((prev) => prev - 300);
      setHintText(`📅 Year: ${yearData}`);
      setHintLevel(1);
    } else if (hintLevel === 1) {
      // Verifica saldo para Dica Nível 2 (Custo 600)
      if (score < 600) {
        alert("Insufficient funds! You need 600 points to buy a super hint.");
        return;
      }

      setScore((prev) => prev - 600);
      setHintText(`📅 Year: ${yearData} \n💿 Album: "${albumData}"`);
      setHintLevel(2);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < tracks.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinish(score);
    }
  };

  if (!currentTrack) return <div>Loading...</div>;

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] p-2 select-none">
      {/* Info Bar */}
      <div className="flex justify-between items-center bg-black text-green-500 font-mono p-2 mb-2 rounded-sm border border-gray-500 shadow-inner">
        <span className="text-xs md:text-sm">
          TRACK {currentIndex + 1}/{tracks.length}
        </span>
        <span
          className={`text-xl font-bold ${
            timeLeft < 10 ? "text-red-500 animate-pulse" : ""
          }`}
        >
          00:{timeLeft.toString().padStart(2, "0")}
        </span>
        <span className="text-xs md:text-sm">
          SCORE: {score.toString().padStart(6, "0")}
        </span>
      </div>

      {/* Área Visual */}
      <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 border-2 border-gray-600 relative overflow-hidden mb-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
        {currentTrack.previewUrl && (
          <audio ref={audioRef} src={currentTrack.previewUrl} />
        )}

        {/* BOTÃO DE DICA DINÂMICO */}
        {!isAnswered && hintLevel < 2 && (
          <button
            onClick={handleGetHint}
            className={`absolute top-2 right-2 z-20 text-black text-xs px-2 py-1 border hover:bg-white shadow-sm active:translate-y-[1px] ${
              hintLevel === 0
                ? "bg-[#FFFFE1] border-[#7F9DB9]" // Estilo Dica Normal
                : "bg-[#FFCC00] border-[#CC9900] font-bold" // Estilo Dica Super
            } ${
              // Adiciona estilo visual de desativado se não tiver pontos (opcional, mas ajuda UX)
              (hintLevel === 0 && score < 300) ||
              (hintLevel === 1 && score < 600)
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            title={hintLevel === 0 ? "Cost: 300 pts" : "Cost: 600 pts"}
          >
            {hintLevel === 0 ? "💡 Hint (-300pts)" : "🔥 Super Hint (-600pts)"}
          </button>
        )}

        {/* A Dica Ativa (Mostra o texto) */}
        {hintText && !isAnswered && (
          <div className="absolute top-8 z-20 bg-yellow-100 text-yellow-900 text-xs px-3 py-2 rounded border-2 border-yellow-400 shadow-lg animate-bounce whitespace-pre-line text-center">
            {hintText}
          </div>
        )}

        {/* Vinil */}
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

        {!currentTrack.previewUrl && (
          <div className="absolute bottom-2 text-xs text-red-400 bg-black/50 px-2 rounded">
            No Preview Available
          </div>
        )}

        {/* Revelação */}
        {isAnswered && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-fadeIn z-30">
            <img
              src={currentTrack.cover}
              alt="Cover"
              className="w-40 h-40 object-cover border-4 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] mb-4"
            />
            <div className="text-white text-center px-4">
              <h3 className="text-lg font-bold text-shadow-md">
                {currentTrack.title}
              </h3>
              <p className="text-sm text-gray-300">{currentTrack.artist}</p>
              <p className="text-xs text-gray-500 mt-1 italic">
                {currentTrack.album} ({currentTrack.year})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Opções */}
      <div className="grid grid-cols-2 gap-2 h-32">
        {options.map((opt) => {
          let btnClass =
            "bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] text-[#003C74]";
          if (isAnswered) {
            if (opt.id === currentTrack.id)
              btnClass = "bg-[#4CAF50] text-white font-bold border-[#2E7D32]";
            else if (opt.id === selectedOption)
              btnClass = "bg-[#F44336] text-white border-[#C62828]";
            else btnClass = "opacity-40 grayscale";
          } else {
            btnClass +=
              " hover:bg-[#FFFFCC] active:translate-y-[1px] hover:border-[#E6DB55]";
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              className={`rounded-[3px] p-2 text-xs font-bold shadow-sm transition-all duration-75 relative overflow-hidden ${btnClass}`}
              disabled={isAnswered}
            >
              <span className="relative z-10 pointer-events-none">
                {opt.artist} - {opt.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizGame;
