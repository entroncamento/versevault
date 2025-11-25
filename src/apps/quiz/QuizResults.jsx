import React from "react";

const QuizResults = ({ score, tracks, onRetry, onExit }) => {
  // Rank logic based on score - Gen Z Edition
  const getRank = (s) => {
    if (s > 4000)
      return { title: "CEO of Aux Cord 👑", color: "text-[#FFD700]" }; // Gold
    if (s > 3000) return { title: "Vibe Curator ✨", color: "text-[#C0C0C0]" }; // Silver
    if (s > 1500) return { title: "Kinda Mid NGL 😐", color: "text-[#CD7F32]" }; // Bronze
    return { title: "In Your Flop Era 💀", color: "text-gray-500" };
  };

  const rank = getRank(score);

  // Get the fact from the first track (if available)
  const wikiFact = tracks && tracks.length > 0 ? tracks[0].fact : null;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] p-6 text-center font-sans overflow-y-auto scrollbar-thin">
      <div className="bg-white p-6 rounded-lg border-2 border-[#0055E5] shadow-[4px_4px_10px_rgba(0,0,0,0.2)] w-full max-w-sm relative">
        {/* Top Decoration (XP Blue Bar) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0055E5] via-[#3593FF] to-[#0055E5]"></div>

        <h2 className="text-2xl font-bold text-[#003399] mb-2 drop-shadow-sm">
          Vibe Check Complete!
        </h2>

        {/* Score Area */}
        <div className="my-6 p-4 bg-[#F0F0F0] rounded border border-[#D3D3D3] shadow-inner">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">
            Clout Score
          </p>
          <p className="text-5xl font-black text-[#333] tracking-tighter">
            {score}
          </p>
        </div>

        {/* Rank Area */}
        <div className="mb-6">
          <p className="text-xs text-gray-600 mb-1">Your Era:</p>
          <div
            className={`text-2xl font-bold ${rank.color} bg-gray-50 inline-block px-4 py-1 rounded-full border border-gray-200 shadow-sm`}
          >
            {rank.title}
          </div>
        </div>

        {/* Wikipedia "Did You Know?" Section -> "Random Lore" */}
        {wikiFact && (
          <div className="mb-6 p-3 bg-[#FFFFE1] border border-[#E6DB55] rounded text-left shadow-sm relative">
            <div className="flex items-center mb-2 text-[#996600] border-b border-[#E6DB55] pb-1">
              <span className="text-lg mr-2">🍵</span>
              <span className="text-xs font-bold uppercase">
                Random Lore (No Cap)
              </span>
            </div>
            <p className="text-xs text-gray-800 leading-relaxed italic">
              "{wikiFact}"
            </p>
            <p className="text-[9px] text-gray-400 text-right mt-1">
              - Source: Trust Me Bro (Wiki API)
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] text-white rounded shadow hover:brightness-110 active:translate-y-[1px] font-bold text-sm border border-[#1B5E20]"
          >
            Run It Back
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gradient-to-b from-[#F44336] to-[#C62828] text-white rounded shadow hover:brightness-110 active:translate-y-[1px] font-bold text-sm border border-[#B71C1C]"
          >
            Touch Grass
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
