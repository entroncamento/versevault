// src/hooks/useLyricsSync.js
import { useEffect, useState } from "react";

export default function useLyricsSync(audioRef, lines) {
  const [idx, setIdx] = useState(-1);

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    function onTime() {
      const t = audio.currentTime;
      // encontra último index onde time <= t
      let i = -1;
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].time <= t) i = j;
        else break;
      }
      setIdx(i);
    }

    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [audioRef, JSON.stringify(lines)]); // stringify small arrays ok

  return idx;
}
