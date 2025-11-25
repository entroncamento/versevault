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

const WORD_BANK = [
  "Love",
  "Hate",
  "Pain",
  "Joy",
  "Hope",
  "Fear",
  "Dream",
  "Soul",
  "Heart",
  "Mind",
  "Feeling",
  "Touch",
  "Kiss",
  "Smile",
  "Cry",
  "Tears",
  "Lonely",
  "Happy",
  "Sad",
  "Crazy",
  "Wild",
  "Free",
  "Lost",
  "Found",
  "Alive",
  "Dead",
  "Broken",
  "Sorry",
  "Fire",
  "Ice",
  "Rain",
  "Snow",
  "Wind",
  "Storm",
  "Sun",
  "Moon",
  "Star",
  "Sky",
  "Cloud",
  "Sea",
  "Ocean",
  "River",
  "World",
  "Night",
  "Day",
  "Light",
  "Dark",
  "Shadow",
  "Thunder",
  "Lightning",
  "Flower",
  "Rose",
  "Tree",
  "Stone",
  "Gold",
  "Dance",
  "Run",
  "Walk",
  "Fly",
  "Fall",
  "Rise",
  "Shine",
  "Burn",
  "Break",
  "Fix",
  "Give",
  "Take",
  "Stop",
  "Go",
  "Stay",
  "Leave",
  "Wait",
  "Watch",
  "See",
  "Hear",
  "Listen",
  "Speak",
  "Tell",
  "Believe",
  "Trust",
  "Know",
  "Think",
  "Remember",
  "Baby",
  "Girl",
  "Boy",
  "Man",
  "Woman",
  "Friend",
  "Enemy",
  "Angel",
  "Demon",
  "God",
  "Devil",
  "King",
  "Queen",
  "Prince",
  "Hero",
  "Lover",
  "Stranger",
  "People",
  "Time",
  "Now",
  "Forever",
  "Never",
  "Always",
  "Today",
  "Tomorrow",
  "Yesterday",
  "Home",
  "Street",
  "City",
  "Town",
  "Road",
  "Way",
  "Place",
  "Space",
  "Heaven",
  "Hell",
  "Money",
  "Cash",
  "Power",
  "Fame",
  "Glory",
  "Vibe",
  "Party",
  "Club",
  "Drink",
  "High",
  "Low",
  "Fast",
  "Slow",
  "Real",
  "Fake",
  "Magic",
  "Mystery",
  "Secret",
  "Bladee",
  "Drain",
  "Trash",
  "Flash",
  "Crash",
  "Sound",
  "Music",
  "Song",
];

export const musicApi = {
  generateOptions(correctTrack, allTracks) {
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

  generateWordOptions(correctWord) {
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
