import React from "react";

const ModeButton = ({ title, desc, color, onClick }) => (
  <button
    onClick={onClick}
    className="group relative w-full text-left p-3 mb-3 border-2 border-white rounded bg-gradient-to-b from-white to-[#ECE9D8] hover:to-[#FFFFCC] shadow-sm active:translate-y-[1px] transition-all"
  >
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />
    <div className="ml-3">
      <h3 className="font-bold text-[#003399] text-sm group-hover:underline">
        {title}
      </h3>
      <p className="text-xs text-gray-600">{desc}</p>
    </div>
  </button>
);

const QuizLobby = ({ onStartGame }) => {
  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003399] to-[#5882D9] p-4 text-white border-b-4 border-[#FF9900]">
        <h1 className="text-xl font-bold italic tracking-wider shadow-sm">
          VerseVault Quiz
        </h1>
        <p className="text-xs opacity-80">Select a game mode to begin</p>
      </div>

      {/* Content */}
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="bg-white border border-[#7F9DB9] p-4 rounded-sm h-full shadow-inner">
          <h2 className="text-sm font-bold text-gray-700 mb-4 border-b border-gray-300 pb-1">
            Select Mode
          </h2>

          <ModeButton
            title="Artist Master (Audio)"
            desc="Test your ear on specific discographies."
            color="bg-purple-600"
            onClick={() => onStartGame("ARTIST")}
          />

          <ModeButton
            title="Genre Explorer (Audio)"
            desc="Cloud Rap, Grunge, House... Pick your vibe."
            color="bg-green-600"
            onClick={() => onStartGame("GENRE")}
          />

          <ModeButton
            title="Lyrics Challenge 📜"
            desc="Guess the song by reading the lyrics!"
            color="bg-pink-500"
            onClick={() => onStartGame("LYRICS")}
          />

          <ModeButton
            title="I'm Feeling Lucky"
            desc="Total chaos. Max XP multiplier. Good luck."
            color="bg-orange-500"
            onClick={() => onStartGame("RANDOM")}
          />
        </div>
      </div>
    </div>
  );
};

export default QuizLobby;
