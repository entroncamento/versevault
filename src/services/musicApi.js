const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WIKIPEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";

const WikipediaService = {
  async getArtistSummary(artistName) {
    try {
      const formatted = artistName.trim().replace(/ /g, "_");
      const res = await fetch(
        `${WIKIPEDIA_BASE}/${encodeURIComponent(formatted)}`
      );
      const data = await res.json();
      if (data.type === "standard" && data.extract)
        return data.extract.substring(0, 250) + "...";
      return null;
    } catch {
      return null;
    }
  },
};

const GeniusService = {
  async getSnippet(t, a) {
    try {
      const res = await fetch(
        `${PROXY_BASE}/api/genius/snippet?t=${encodeURIComponent(
          t
        )}&a=${encodeURIComponent(a)}`
      );
      const data = await res.json();
      return data.snippet || data.url || null;
    } catch {
      return null;
    }
  },
};

// Fallback Word Bank (só usado se o servidor falhar)
const WORD_BANK = [
  "Love",
  "Hate",
  "Pain",
  "Joy",
  "Hope",
  "Fear",
  "Dream",
  "Soul",
  "Music",
  "Song",
  "Night",
  "Day",
  "Life",
  "Time",
  "World",
];

export const musicApi = {
  // Agora aceita opções vindas do backend
  generateOptions(correctTrack, allTracks) {
    // SE o servidor já enviou opções curadas (do mesmo género), usa-as!
    if (correctTrack.options && correctTrack.options.length > 0) {
      return correctTrack.options;
    }

    // Fallback antigo (Client-side random)
    if (!allTracks || !correctTrack) return [];
    let others = allTracks
      .filter((t) => t.id !== correctTrack.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    while (others.length < 3 && allTracks.length > 1) {
      const random = allTracks[Math.floor(Math.random() * allTracks.length)];
      if (
        random.id !== correctTrack.id &&
        !others.find((o) => o.id === random.id)
      )
        others.push(random);
      else if (others.length + 1 >= allTracks.length) break;
    }
    return [...others, correctTrack].sort(() => 0.5 - Math.random());
  },

  // Agora aceita opções de palavras vindas do backend
  generateWordOptions(correctWord, serverWordOptions) {
    // SE o servidor enviou opções da própria letra, usa-as!
    if (serverWordOptions && serverWordOptions.length > 0) {
      return serverWordOptions;
    }

    // Fallback antigo
    if (!correctWord) return ["???", "Error", "Retry", "Loading"];

    const cleanCorrect = correctWord.toLowerCase();
    const candidates = WORD_BANK.filter(
      (w) => w.toLowerCase() !== cleanCorrect
    );
    const shuffled = candidates.sort(() => 0.5 - Math.random());

    return [...shuffled.slice(0, 3), correctWord].sort(
      () => 0.5 - Math.random()
    );
  },

  async getGameData(mode, query) {
    return [];
  },
  async getHint(t, a) {
    return await GeniusService.getSnippet(t, a);
  },
};
