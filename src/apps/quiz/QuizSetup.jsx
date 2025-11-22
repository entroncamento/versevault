import React, { useState } from "react";

const QuizSetup = ({ mode, onStart, onBack }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onStart(query);
    }
  };

  const getLabel = () => {
    if (mode === "ARTIST") return "Type the Artist's Name:";
    if (mode === "LYRICS") return "Artist to guess lyrics from:";
    if (mode === "GENRE") return "Type a Genre (e.g. Rock, Pop):";
    return "Search:";
  };

  const getIcon = () => {
    if (mode === "ARTIST") return "/icons/cd_audio_cd_a-0.png";
    if (mode === "LYRICS") return "/icons/notepad.png";
    if (mode === "GENRE") return "/icons/world-0.png";
    return "/icons/Minesweeper.ico";
  };

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8] p-4 font-sans">
      <div className="mb-6 flex items-center gap-4">
        <img
          src={getIcon()}
          alt="Mode"
          className="w-12 h-12 drop-shadow-md object-contain"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div>
          <h2 className="text-xl font-bold text-[#003399] italic">
            {mode === "LYRICS"
              ? "Lyrics Challenge"
              : mode === "ARTIST"
              ? "Artist Master"
              : "Genre Explorer"}
          </h2>
          <p className="text-xs text-gray-600">
            Configure your game session settings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <fieldset className="border border-[#D0D0BF] p-4 rounded-sm mb-4 bg-white shadow-inner">
          <legend className="text-xs text-[#003399] px-1 ml-2 font-bold">
            Search Parameters
          </legend>

          <label className="block text-xs mb-2 text-gray-700 font-bold">
            {getLabel()}
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-2 border-[#7F9DB9] p-1 text-sm outline-none focus:border-[#003399]"
            autoFocus
            placeholder={mode === "GENRE" ? "e.g. 80s Pop" : "e.g. The Weeknd"}
          />
        </fieldset>

        <div className="flex-grow" />

        <div className="flex justify-end gap-2 border-t border-white pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm hover:bg-[#E1EAF8] shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm font-bold disabled:opacity-50 hover:bg-[#E1EAF8] border-b-2 border-r-2 border-b-[#003C74] border-r-[#003C74]"
          >
            Start Game
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizSetup;
