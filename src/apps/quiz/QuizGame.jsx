import React, { useState, useEffect, useRef } from "react";
import { musicApi } from "../../services/musicApi";

const QuizGame = ({ tracks, mode, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  const audioRef = useRef(null);
  const currentTrack = tracks[currentIndex];

  // Initial round setup
  useEffect(() => {
    if (!currentTrack) return;

    // Always generate song options (Track ID vs Track ID)
    setOptions(musicApi.generateOptions(currentTrack, tracks));

    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOption(null);

    if (gameStarted && currentTrack.previewUrl) {
      if (audioRef.current) {
        audioRef.current.src = currentTrack.previewUrl;
        audioRef.current.load();
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch((e) => console.log("Autoplay:", e));
      }
    }
  }, [currentIndex, currentTrack, gameStarted, tracks]);

  // General timer
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

  const handleAnswer = (answerId) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(answerId);

    // Simple validation: chosen ID == current track ID
    const isCorrect = answerId === currentTrack.id;

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

  if (!currentTrack) return <div>Loading...</div>;

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] text-[#003399]">
        <div className="bg-white p-8 border-2 border-[#003C74] shadow-lg text-center rounded">
          <h2 className="text-xl font-bold mb-4">Quiz Ready!</h2>
          <p className="mb-6 text-gray-600">Found {tracks.length} songs.</p>
          <button
            onClick={handleStartGame}
            className="bg-[#0054E3] text-white px-6 py-2 rounded font-bold shadow-md active:translate-y-1"
          >
            START ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] p-2 select-none">
      <div className="flex justify-between items-center bg-black text-green-500 font-mono p-2 mb-2 rounded-sm shadow-inner">
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
        <span className="text-xs md:text-sm">POINTS: {score}</span>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 border-2 border-gray-600 relative overflow-hidden mb-2 p-4 shadow-inner">
        <audio ref={audioRef} key={currentTrack.id} />

        {/* Vinyl animation (always visible now) */}
        <div
          className="w-40 h-40 rounded-full border-8 border-[#111] flex items-center justify-center bg-[#222] shadow-2xl animate-spin"
          style={{ animationDuration: "4s" }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-gray-600 relative">
            <div className="absolute top-3 left-4 w-3 h-3 bg-white/20 rounded-full"></div>
          </div>
        </div>

        {/* Result / Cover after answering */}
        {isAnswered && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-fadeIn z-30 backdrop-blur-sm">
            <img
              src={currentTrack.cover}
              alt="Cover"
              className="w-40 h-40 object-cover border-4 border-white shadow-lg mb-4"
            />
            <div className="text-white text-center px-4">
              <h3 className="text-lg font-bold">{currentTrack.title}</h3>
              <p className="text-sm text-gray-300">{currentTrack.artist}</p>
            </div>
          </div>
        )}
      </div>

      {/* Option buttons */}
      <div className="grid grid-cols-2 gap-2 h-32">
        {options.map((opt, idx) => {
          const val = opt.id;
          const label = opt.title; // Always show track title
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
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizGame;
