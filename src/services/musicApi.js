// --- CONFIGURAÇÃO DAS CHAVES ---
// ⚠️ IMPORTANTE: Substitui estas strings pelas tuas chaves reais!
const LASTFM_API_KEY = "4d35ccc1f80b0849a7fa7e946707ebb3";
const GENIUS_ACCESS_TOKEN =
  "fnsqEBYA2b0n3Uin4bmjMPk1QHWXpACh5eACwi6XTnrxHpXV0KPEAvb5wphf8D_J";

// URLs BASE
const ITUNES_BASE = "https://itunes.apple.com";
const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0";
const WIKIPEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";

// Proxy APENAS para Genius (iTunes não precisa)
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";

// --- DETEÇÃO DE CIRÍLICO (Anti-Russo) ---
const hasCyrillic = (text) => /[\u0400-\u04FF]/.test(text);

// --- FILTRO DE LIMPEZA (NOVO: Anti-Remix) ---
const isCleanTrack = (title) => {
  const lower = title.toLowerCase();
  const bannedTerms = [
    "remix",
    "mix",
    "live",
    "instrumental",
    "karaoke",
    "cover",
    "acoustic",
    "demo",
    "session",
    "edit",
    "version",
  ];
  // Retorna true se NÃO tiver nenhum termo banido
  return !bannedTerms.some((term) => lower.includes(term));
};

// --- ALGORITMO DE LEVENSHTEIN ---
const getLevenshteinDistance = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// --- VALIDAÇÃO DE STRINGS ---
const isStringMatch = (str1, str2) => {
  const normalize = (s) => s.toLowerCase().trim();
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const a = normalize(str1);
  const b = normalize(str2);

  if (a === b) return true;

  const cleanA = clean(str1);
  const cleanB = clean(str2);

  // Inclusão (Para apanhar colaborações)
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
    const minLen = Math.min(cleanA.length, cleanB.length);
    if (minLen >= 4) return true;
    if (Math.abs(cleanA.length - cleanB.length) > 4) return false;
    return true;
  }

  // Levenshtein
  const dist = getLevenshteinDistance(cleanA, cleanB);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen < 5) return dist <= 0;
  if (maxLen < 8) return dist <= 1;
  return dist <= 2;
};

// --- 1. SERVIÇO ITUNES (ROBUSTO & SIMPLIFICADO) ---
const iTunesService = {
  normalize(track) {
    return {
      id: `itunes-${track.trackId}`,
      title: track.trackName,
      artist: track.artistName,
      cover: track.artworkUrl100.replace("100x100", "500x500"),
      previewUrl: track.previewUrl,
      album: track.collectionName,
      year: new Date(track.releaseDate).getFullYear(),
      source: "iTunes",
      fact: null,
      geniusUrl: null,
    };
  },

  // Tenta encontrar uma música específica
  async searchTrack(targetArtist, targetTrackName) {
    try {
      const cleanTrackName = targetTrackName.split(/[\(\-\[]/)[0].trim();
      // Pesquisa combinada
      let term = encodeURIComponent(`${targetArtist} ${cleanTrackName}`);
      let res = await fetch(
        `${ITUNES_BASE}/search?term=${term}&entity=song&limit=5`
      );
      let data = await res.json();

      let foundTrack = this.findBestMatch(
        data.results,
        targetArtist,
        targetTrackName
      );

      if (!foundTrack) {
        // Tenta só pelo nome da música
        term = encodeURIComponent(cleanTrackName);
        res = await fetch(
          `${ITUNES_BASE}/search?term=${term}&entity=song&limit=10`
        );
        data = await res.json();
        foundTrack = this.findBestMatch(
          data.results,
          targetArtist,
          targetTrackName
        );
      }

      if (foundTrack) return this.normalize(foundTrack);
      return null;
    } catch (e) {
      return null;
    }
  },

  // Valida se o resultado do iTunes é bom
  findBestMatch(results, targetArtist, targetTrackName) {
    if (!results || results.length === 0) return null;

    return results.find((track) => {
      if (!track.previewUrl) return false;
      // NOVO: Filtra Remixes
      if (!isCleanTrack(track.trackName)) return false;

      // Filtro Anti-Russo
      if (
        !hasCyrillic(targetArtist) &&
        (hasCyrillic(track.artistName) || hasCyrillic(track.trackName))
      )
        return false;

      const artistMatch = isStringMatch(track.artistName, targetArtist);
      // Validação de título mais relaxada
      const cleanTitle = targetTrackName.split(/[\(\-\[]/)[0].trim();
      const titleMatch = isStringMatch(track.trackName, cleanTitle);

      return artistMatch && titleMatch;
    });
  },

  // PESQUISA DE RESGATE: Busca TUDO do artista
  async getArtistTopTracks(artistName) {
    try {
      // Pesquisa apenas pelo nome do artista
      const term = encodeURIComponent(artistName);
      // attribute=artistTerm força a pesquisa a ser sobre o artista, não o nome da música
      const res = await fetch(
        `${ITUNES_BASE}/search?term=${term}&entity=song&attribute=artistTerm&limit=50`
      );
      const data = await res.json();

      // Filtra para garantir que é mesmo o artista e tem preview
      const validTracks = data.results.filter((track) => {
        if (!track.previewUrl) return false;
        if (!isCleanTrack(track.trackName)) return false; // NOVO
        if (
          !hasCyrillic(artistName) &&
          (hasCyrillic(track.artistName) || hasCyrillic(track.trackName))
        )
          return false;
        return isStringMatch(track.artistName, artistName);
      });

      // Remove duplicados
      const uniqueTracks = [];
      const seenIds = new Set();
      for (const t of validTracks) {
        // Normaliza título para evitar "Song" e "Song (Live)"
        const cleanTitle = t.trackName
          .split(/[\(\-\[]/)[0]
          .trim()
          .toLowerCase();
        if (!seenIds.has(cleanTitle)) {
          seenIds.add(cleanTitle);
          uniqueTracks.push(this.normalize(t));
        }
      }

      return uniqueTracks.slice(0, 15);
    } catch (e) {
      return [];
    }
  },

  // Para modo género, pesquisa genérica
  async getGenreTracks(genre) {
    try {
      const term = encodeURIComponent(genre);
      const res = await fetch(
        `${ITUNES_BASE}/search?term=${term}&entity=song&limit=50`
      );
      const data = await res.json();

      return data.results
        .filter((t) => t.previewUrl && isCleanTrack(t.trackName))
        .map(this.normalize)
        .slice(0, 15);
    } catch (e) {
      return [];
    }
  },
};

// --- 2. SERVIÇO LAST.FM ---
const LastFmService = {
  async getTopTracksByArtist(artist) {
    try {
      const url = `${LASTFM_BASE}/?method=artist.gettoptracks&artist=${encodeURIComponent(
        artist
      )}&api_key=${LASTFM_API_KEY}&format=json&limit=30`;
      const res = await fetch(url);
      const data = await res.json();
      const rawTracks = data.toptracks?.track || [];
      return rawTracks.filter((t) => isStringMatch(t.artist.name, artist));
    } catch (e) {
      return [];
    }
  },

  async getTopTracksByTag(tag) {
    try {
      const url = `${LASTFM_BASE}/?method=tag.gettoptracks&tag=${encodeURIComponent(
        tag
      )}&api_key=${LASTFM_API_KEY}&format=json&limit=40`;
      const res = await fetch(url);
      const data = await res.json();
      return data.tracks?.track || [];
    } catch (e) {
      return [];
    }
  },
};

// --- 3. SERVIÇO GENIUS ---
const GeniusService = {
  async getSnippet(trackName, artistName) {
    if (!GENIUS_ACCESS_TOKEN || GENIUS_ACCESS_TOKEN.includes("TOKEN_DO_GENIUS"))
      return null;
    try {
      const cleanTrack = trackName.split(/[\(\-\[]/)[0].trim();
      const query = encodeURIComponent(`${cleanTrack} ${artistName}`);
      const res = await fetch(
        `${CORS_PROXY}https://api.genius.com/search?q=${query}`,
        {
          headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` },
        }
      );
      const data = await res.json();
      if (data.response.hits.length > 0) {
        const hit = data.response.hits.find((h) =>
          isStringMatch(h.result.primary_artist.name, artistName)
        );
        return hit ? hit.result.url : null;
      }
      return null;
    } catch (e) {
      return null;
    }
  },
};

// --- 4. SERVIÇO WIKIPEDIA ---
const WikipediaService = {
  async getArtistSummary(artistName) {
    try {
      const res = await fetch(
        `${WIKIPEDIA_BASE}/${encodeURIComponent(artistName.replace(/ /g, "_"))}`
      );
      const data = await res.json();
      return data.extract ? data.extract.substring(0, 200) + "..." : null;
    } catch (e) {
      return null;
    }
  },
};

// --- ORQUESTRADOR ---
export const musicApi = {
  generateOptions(correctTrack, allTracks) {
    const wrong = allTracks
      .filter((t) => t.title !== correctTrack.title)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    return [...wrong, correctTrack].sort(() => 0.5 - Math.random());
  },

  generateWordOptions(correctWord) {
    const commonWords = [
      "Love",
      "Night",
      "Baby",
      "Heart",
      "World",
      "Time",
      "Life",
      "Yeah",
      "Feel",
      "Dance",
      "Fire",
      "Soul",
    ];
    const wrongOptions = commonWords
      .filter((w) => w.toLowerCase() !== correctWord.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    return [...wrongOptions, correctWord].sort(() => 0.5 - Math.random());
  },

  async getLyricChallenge(artist, title) {
    return null;
  },

  async getGameData(mode, query) {
    let finalTracks = [];

    // --- FASE 1: TENTATIVA "PERFEITA" (LAST.FM + ITUNES MATCH) ---
    // Tenta encontrar as músicas mais populares do Last.fm no iTunes
    try {
      let rawTracks = [];
      if (mode === "ARTIST") {
        rawTracks = await LastFmService.getTopTracksByArtist(query);
      } else if (mode === "GENRE") {
        const genres = ["rock", "pop", "hip-hop", "electronic", "jazz", "80s"];
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        rawTracks = await LastFmService.getTopTracksByTag(
          mode === "GENRE" ? query : randomGenre
        );
      } else {
        // Random
        const genres = ["pop", "rock", "rap"];
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        rawTracks = await LastFmService.getTopTracksByTag(randomGenre);
      }

      if (rawTracks.length > 0) {
        const tracksToEnrich = rawTracks.slice(0, 15);
        const enrichedPromises = tracksToEnrich.map((t) =>
          iTunesService.searchTrack(t.artist.name, t.name)
        );
        const results = await Promise.all(enrichedPromises);
        finalTracks = results.filter((t) => t !== null);

        // Remove duplicados
        finalTracks = finalTracks.filter(
          (v, i, a) => a.findIndex((t) => t.title === v.title) === i
        );
      }
    } catch (e) {
      console.warn("Fase 1 falhou");
    }

    // --- FASE 2: FALLBACK "BRUTO" (ITUNES DIRETO) ---
    // Se a combinação falhou (ex: nomes não batem certo), pedimos ao iTunes
    // tudo o que ele tem desse artista/género.
    if (finalTracks.length < 4) {
      console.log("Ativando iTunes Fallback para:", query);
      let fallbackTracks = [];

      if (mode === "ARTIST") {
        fallbackTracks = await iTunesService.getArtistTopTracks(query);
      } else {
        fallbackTracks = await iTunesService.getGenreTracks(query);
      }

      // Merge inteligente (evita adicionar músicas que já lá estão)
      const existingTitles = new Set(
        finalTracks.map((t) => t.title.toLowerCase())
      );
      for (const t of fallbackTracks) {
        if (!existingTitles.has(t.title.toLowerCase())) {
          finalTracks.push(t);
          existingTitles.add(t.title.toLowerCase());
        }
      }
    }

    if (finalTracks.length < 4) return [];

    // --- FASE 3: WIKIPEDIA ---
    const wikiFact = await WikipediaService.getArtistSummary(
      finalTracks[0].artist
    );
    if (finalTracks[0]) finalTracks[0].fact = wikiFact;

    return finalTracks.slice(0, 10);
  },

  async getHint(trackName, artistName) {
    return await GeniusService.getSnippet(trackName, artistName);
  },
};
