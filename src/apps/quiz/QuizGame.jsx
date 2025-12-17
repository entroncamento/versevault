import React, { useState, useEffect, useRef } from "react";
import { musicApi } from "../../services/musicApi";
import { FaLightbulb } from "react-icons/fa"; // Ícone para o botão de dica

/**
 * Componente principal do motor de jogo.
 * Responsável por gerir o ciclo de vida de cada ronda, o temporizador,
 * a reprodução de áudio, o cálculo da pontuação e o sistema de dicas.
 */
const QuizGame = ({ tracks, mode, onFinish }) => {
  // --- STATE MANAGEMENT ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Lógica do Tempo e Jogo
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);

  // Feedback Visual e Interação
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState([]);

  // --- HINT SYSTEM STATE ---
  const [hint, setHint] = useState(null); // Guarda o texto da dica atual
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [hintUsed, setHintUsed] = useState(false); // Evita pedir dicas repetidas na mesma ronda

  const audioRef = useRef(null);
  const currentTrack = tracks[currentIndex];

  // =========================================================
  // 1. SETUP DA RONDA
  // =========================================================
  useEffect(() => {
    if (!currentTrack) return;

    setOptions(musicApi.generateOptions(currentTrack, tracks));

    // Reset de estado para a nova ronda
    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOption(null);

    // Reset da Dica
    setHint(null);
    setHintUsed(false);
    setIsHintLoading(false);

    // Autoplay Logic
    if (gameStarted && currentTrack.previewUrl) {
      if (audioRef.current) {
        audioRef.current.src = currentTrack.previewUrl;
        audioRef.current.load();
        audioRef.current.volume = 0.5;
        audioRef.current
          .play()
          .catch((e) => console.warn("Autoplay bloqueado:", e));
      }
    }
  }, [currentIndex, currentTrack, gameStarted, tracks]);

  // =========================================================
  // 2. MOTOR DE TEMPO
  // =========================================================
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

  // =========================================================
  // 3. HANDLERS E LÓGICA
  // =========================================================

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleTimeOut = () => {
    setIsAnswered(true);
    setTimeout(nextQuestion, 2500);
  };

  const handleAnswer = (answerId) => {
    if (isAnswered) return;

    setIsAnswered(true);
    setSelectedOption(answerId);

    const isCorrect = answerId === currentTrack.id;

    if (isCorrect) {
      // Cálculo de Pontuação: (Base + Tempo) - Penalização por Dica
      let roundScore = 100 + timeLeft * 10;
      if (hintUsed) roundScore -= 300; // Custo da dica

      // Garante que a pontuação não desce (não queremos pontuação negativa na ronda)
      // Mas se o user tiver 0 total e usar dica, pode ficar negativo no total, o que é aceitável.
      setScore((prev) => prev + roundScore);
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

  // --- LÓGICA DE DICA ---
  const handleGetHint = async () => {
    if (hintUsed || isAnswered) return; // Só uma dica por ronda

    setIsHintLoading(true);
    try {
      // Chama a API (Backend/Genius/AI)
      const hintData = await musicApi.getHint(
        currentTrack.title,
        currentTrack.artist
      );

      if (hintData) {
        setHint(hintData);
        setHintUsed(true);
        // Penalização visual imediata ou apenas no cálculo final?
        // Optamos por descontar no fim da ronda se acertar.
      } else {
        alert("Sorry, no hints available for this track.");
      }
    } catch (error) {
      console.error("Hint Error:", error);
    } finally {
      setIsHintLoading(false);
    }
  };

  if (!currentTrack) return <div>A carregar recursos...</div>;

  // =========================================================
  // 4. RENDERIZAÇÃO
  // =========================================================

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] text-[#003399]">
        <div className="bg-white p-8 border-2 border-[#003C74] shadow-lg text-center rounded">
          <h2 className="text-xl font-bold mb-4">O Quiz está pronto!</h2>
          <p className="mb-6 text-gray-600">
            Carregadas {tracks.length} músicas.
          </p>
          <button
            onClick={handleStartGame}
            className="bg-[#0054E3] text-white px-6 py-2 rounded font-bold shadow-md active:translate-y-1 hover:bg-[#0046bd] transition-colors"
          >
            COMEÇAR ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] p-2 select-none relative">
      {/* HUD (Heads-Up Display) */}
      <div className="flex justify-between items-center bg-black text-green-500 font-mono p-2 mb-2 rounded-sm shadow-inner">
        <span className="text-xs md:text-sm">
          FAIXA {currentIndex + 1}/{tracks.length}
        </span>

        {/* Timer */}
        <span
          className={`text-xl font-bold ${
            timeLeft < 10 ? "text-red-500 animate-pulse" : ""
          }`}
        >
          00:{timeLeft.toString().padStart(2, "0")}
        </span>

        {/* Score & Hint Button Container */}
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm mr-2">PTS: {score}</span>

          <button
            onClick={handleGetHint}
            disabled={hintUsed || isHintLoading || isAnswered}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all
              ${
                hintUsed
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95 shadow-sm"
              }`}
            title="Get a Hint (-300 pts)"
          >
            {isHintLoading ? (
              <span className="animate-spin">⌛</span>
            ) : (
              <FaLightbulb />
            )}
            {hintUsed ? "Used" : "Hint"}
          </button>
        </div>
      </div>

      {/* Área Central */}
      <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 border-2 border-gray-600 relative overflow-hidden mb-2 p-4 shadow-inner">
        <audio ref={audioRef} key={currentTrack.id} />

        {/* Animação Vinil */}
        <div
          className="w-40 h-40 rounded-full border-8 border-[#111] flex items-center justify-center bg-[#222] shadow-2xl animate-spin"
          style={{ animationDuration: "4s" }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-gray-600 relative">
            <div className="absolute top-3 left-4 w-3 h-3 bg-white/20 rounded-full"></div>
          </div>
        </div>

        {/* OVERLAY: DICA (Se ativa) */}
        {hint && !isAnswered && (
          <div className="absolute bottom-4 left-4 right-4 bg-yellow-100 border-2 border-yellow-500 p-2 rounded shadow-lg animate-slideUp z-20">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-yellow-800 uppercase">
                💡 Hint (Genius/AI)
              </span>
              <button
                onClick={() => setHint(null)}
                className="text-xs text-red-500 font-bold px-1"
              >
                ✕
              </button>
            </div>
            {/* O hint pode ser um URL (se vier do Genius) ou Texto (se vier da IA/Wikipedia) */}
            {hint.startsWith("http") ? (
              <div className="text-xs text-blue-600 truncate">
                <a
                  href={hint}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  View Lyrics on Genius ↗
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-800 italic leading-tight line-clamp-3">
                "{hint}"
              </p>
            )}
          </div>
        )}

        {/* OVERLAY: RESPOSTA (Se respondido) */}
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
            </div>
          </div>
        )}
      </div>

      {/* Grelha de Opções */}
      <div className="grid grid-cols-2 gap-2 h-32">
        {options.map((opt, idx) => {
          const val = opt.id;
          let btnClass =
            "bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] text-[#003C74]";

          if (isAnswered) {
            if (val === currentTrack.id)
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
              {opt.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizGame;
