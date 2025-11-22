import React, { useState, useEffect, useRef } from "react";
import { musicApi } from "../../services/musicApi";

const QuizGame = ({ tracks, mode, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const audioRef = useRef(null);
  const currentTrack = tracks[currentIndex];
  const [options, setOptions] = useState([]);

  // Deteta se estamos em modo de Letras (verifica a prop global ou a da faixa)
  const isLyricsMode = mode === "LYRICS" || currentTrack?.gameMode === "LYRICS";

  useEffect(() => {
    if (!currentTrack) return;

    // Gera opções de resposta baralhadas
    setOptions(musicApi.generateOptions(currentTrack, tracks));
    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOption(null);

    // Lógica de Áudio: Toca apenas se NÃO for modo Lyrics e se houver previewURL
    if (!isLyricsMode && currentTrack.previewUrl) {
      setIsPlaying(true);
      // Pequeno delay para garantir que o elemento HTML existe
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.volume = 0.5;
          audioRef.current.play().catch((err) => {
            console.warn("Autoplay bloqueado:", err);
            setIsPlaying(false);
          });
        }
      }, 100);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, currentTrack, tracks, isLyricsMode]);

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
    setTimeout(nextQuestion, 2500);
  };

  const handleAnswer = (trackId) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(trackId);

    if (trackId === currentTrack.id) {
      // Cálculo de pontuação: base + bónus de tempo
      const points = 100 + timeLeft * 10;
      setScore((prev) => prev + points);
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
      {/* Barra de Informação Superior */}
      <div className="flex justify-between items-center bg-black text-green-500 font-mono p-2 mb-2 rounded-sm border border-gray-500 shadow-inner">
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

      {/* Área Visual Central (Vinil ou Letra) */}
      <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 border-2 border-gray-600 relative overflow-hidden mb-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] p-4">
        {/* Elemento de Áudio (Invisível mas funcional) */}
        {!isLyricsMode && currentTrack.previewUrl && (
          <audio ref={audioRef} src={currentTrack.previewUrl} />
        )}

        {/* VISUALIZAÇÃO CONDICIONAL */}
        {isLyricsMode ? (
          /* MODO LETRAS: Papel Amarelo */
          <div className="bg-[#FFFBE6] text-gray-800 p-6 rounded shadow-lg max-w-md w-full text-center border border-[#D4C495] relative transform rotate-1 transition-transform hover:rotate-0">
            {/* Pin vermelho no topo */}
            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border border-red-700 transform -translate-x-1/2"></div>

            <h3 className="text-[#003399] font-bold text-xs uppercase tracking-widest mb-4 border-b border-gray-300 pb-2">
              Adivinha a Letra
            </h3>
            <p className="text-sm md:text-lg font-serif italic leading-relaxed whitespace-pre-line">
              "{currentTrack.lyricsSnippet || "Letra indisponível..."}"
            </p>
          </div>
        ) : (
          /* MODO ÁUDIO: Vinil Giratório */
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

        {/* Revelação Final (Capa do álbum) */}
        {isAnswered && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-fadeIn z-30">
            <img
              src={currentTrack.cover}
              alt="Capa"
              className="w-40 h-40 object-cover border-4 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] mb-4"
            />
            <div className="text-white text-center px-4">
              <h3 className="text-lg font-bold text-shadow-md">
                {currentTrack.title}
              </h3>
              <p className="text-sm text-gray-300">{currentTrack.artist}</p>
            </div>
          </div>
        )}
      </div>

      {/* Botões de Opção */}
      <div className="grid grid-cols-2 gap-2 h-32">
        {options.map((opt) => {
          let btnClass =
            "bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] text-[#003C74]";

          if (isAnswered) {
            if (opt.id === currentTrack.id)
              btnClass =
                "bg-[#4CAF50] text-white font-bold border-[#2E7D32]"; // Certa (Verde)
            else if (opt.id === selectedOption)
              btnClass =
                "bg-[#F44336] text-white border-[#C62828]"; // Errada (Vermelho)
            else btnClass = "opacity-40 grayscale"; // Outras
          } else {
            btnClass +=
              " hover:bg-[#FFFFCC] active:translate-y-[1px] hover:border-[#E6DB55]";
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              className={`rounded-[3px] p-2 text-xs font-bold shadow-sm transition-all duration-75 ${btnClass}`}
              disabled={isAnswered}
            >
              {opt.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizGame;
