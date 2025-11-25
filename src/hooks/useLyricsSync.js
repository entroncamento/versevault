import { useState, useEffect } from "react";

/**
 * Hook para sincronizar letras com o tempo do áudio.
 * @param {React.RefObject} audioRef - Referência para o elemento <audio>
 * @param {Array} lines - Array de objetos { time: number, text: string }
 * @returns {number} - Índice da linha ativa (-1 se nenhuma)
 */
const useLyricsSync = (audioRef, lines) => {
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !lines || lines.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;

      // Encontra a linha atual baseada no tempo
      // A linha ativa é a última linha cujo tempo é menor ou igual ao tempo atual
      let activeIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (currentTime >= lines[i].time) {
          activeIndex = i;
        } else {
          // Como as linhas estão ordenadas por tempo, podemos parar assim que passarmos o tempo atual
          break;
        }
      }

      setActiveLineIndex(activeIndex);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef, lines]);

  return activeLineIndex;
};

export default useLyricsSync;
