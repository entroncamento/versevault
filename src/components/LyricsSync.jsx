import { useEffect, useState } from "react";

export default function LyricSync({ audioRef, lyrics, missingWord }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!audioRef.current) return;

    const interval = setInterval(() => {
      const t = audioRef.current.currentTime;
      // vamos assumir 3s por linha como fallback
      const index = Math.floor(t / 3);
      setActiveIndex(Math.min(index, lyrics.length - 1));
    }, 100);

    return () => clearInterval(interval);
  }, [audioRef, lyrics]);

  return (
    <div className="bg-[#FFFBE6] text-gray-800 p-6 rounded shadow-lg max-w-md w-full text-center border border-[#D4C495] relative">
      <h3 className="text-[#003399] font-bold text-xs uppercase tracking-widest mb-4 border-b border-gray-300 pb-2">
        Complete a Letra
      </h3>
      <div className="text-sm md:text-lg font-serif italic leading-relaxed font-medium whitespace-pre-line">
        {lyrics.map((line, idx) => {
          const highlight = idx === activeIndex;
          let displayed = line;
          if (highlight && missingWord) {
            displayed = line.replace(
              new RegExp(`\\b${missingWord}\\b`, "i"),
              "_______"
            );
          }
          return (
            <p
              key={idx}
              style={{
                color: highlight ? "#003399" : "#555",
                fontWeight: highlight ? "bold" : "normal",
                opacity: highlight ? 1 : 0.5,
                transition: "0.3s",
              }}
            >
              {displayed}
            </p>
          );
        })}
      </div>
    </div>
  );
}
