// --- CONFIGURAÇÃO ---
const GENIUS_ACCESS_TOKEN =
  "fnsqEBYA2b0n3Uin4bmjMPk1QHWXpACh5eACwi6XTnrxHpXV0KPEAvb5wphf8D_J";

// Aponta para o teu servidor proxy local (certifica-te que o node server.js está a correr)
const PROXY_BASE = "http://localhost:3001";
const WIKIPEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";

// --- UTILS ---
const isCleanTrack = (title) =>
  ![
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
  ].some((t) => title.toLowerCase().includes(t));

// Permite colaborações (feat, &, etc)
const isCollab = (artistName) => {
  const lower = artistName.toLowerCase();
  return (
    lower.includes("feat") ||
    lower.includes("ft.") ||
    lower.includes("&") ||
    lower.includes(",") ||
    lower.includes(" x ") ||
    lower.includes(" with ")
  );
};

const normalizeStr = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
const isSameName = (str1, str2) => normalizeStr(str1) === normalizeStr(str2);

// Filtro de Acentos (O "Anti-Jüse")
const hasUnwantedAccents = (artistName, query) => {
  const q = query.toLowerCase();
  const a = artistName.toLowerCase();
  const queryHasAccents = q.normalize("NFD").match(/[\u0300-\u036f]/);
  const artistHasAccents = a.normalize("NFD").match(/[\u0300-\u036f]/);
  // Se a query for "pura" (sem acentos) mas o artista tiver acentos -> LIXO
  return !queryHasAccents && artistHasAccents;
};

// --- SERVIÇOS ---
const iTunesService = {
  normalize: (t) => ({
    id: `itunes-${t.trackId}`,
    title: t.trackName,
    artist: t.artistName,
    artistId: String(t.artistId),
    cover: t.artworkUrl100.replace("100x100", "500x500"),
    previewUrl: t.previewUrl,
    album: t.collectionName,
    year: new Date(t.releaseDate).getFullYear(),
    source: "iTunes",
  }),
  async search(term, limit = 50) {
    try {
      // Pede logo 50 músicas de uma vez via Proxy
      const res = await fetch(
        `${PROXY_BASE}/api/itunes?term=${encodeURIComponent(
          term
        )}&entity=song&limit=${limit}`
      );
      const data = await res.json();
      return data.results
        ? data.results
            .filter((t) => t.previewUrl && isCleanTrack(t.trackName))
            .map(this.normalize)
        : [];
    } catch {
      return [];
    }
  },
};

const DeezerService = {
  normalize: (t) => ({
    id: `deezer-${t.id}`,
    title: t.title,
    artist: t.artist.name,
    artistId: String(t.artist.id),
    cover: t.album.cover_xl || t.album.cover_medium,
    previewUrl: t.preview,
    album: t.album.title,
    year: null,
    source: "Deezer",
  }),
  async search(query, isArtistMode = false) {
    try {
      // Se for modo artista, usamos "artist:" para filtrar logo na fonte
      const q = isArtistMode ? `artist:"${query}"` : query;
      const res = await fetch(
        `${PROXY_BASE}/api/deezer?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      return data.data
        ? data.data
            .filter((t) => t.preview && isCleanTrack(t.title))
            .map(this.normalize)
        : [];
    } catch {
      return [];
    }
  },
};

const GeniusService = {
  async getSnippet(t, a) {
    try {
      const res = await fetch(
        `${CORS_PROXY}https://api.genius.com/search?q=${encodeURIComponent(
          t + " " + a
        )}`,
        { headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` } }
      );
      const data = await res.json();
      return data.response.hits[0]?.result.url || null;
    } catch {
      return null;
    }
  },
};

const WikipediaService = {
  async getArtistSummary(a) {
    try {
      // Limpa o nome para a Wikipedia (remove "feat", "&", etc) para ter mais sucesso
      const cleanArtist = a.split(/ feat| ft\.| &|,| x /)[0].trim();
      const res = await fetch(
        `${WIKIPEDIA_BASE}/${encodeURIComponent(
          cleanArtist.replace(/ /g, "_")
        )}`
      );
      const data = await res.json();
      return data.extract ? data.extract.substring(0, 200) + "..." : null;
    } catch {
      return null;
    }
  },
};

// --- ORQUESTRADOR ---
export const musicApi = {
  generateOptions(correct, all) {
    const others = all
      .filter((t) => t.title !== correct.title)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    return [...others, correct].sort(() => 0.5 - Math.random());
  },
  generateWordOptions(w) {
    return [
      ...["Love", "Night", "Baby", "Heart", "World", "Time"]
        .filter((ow) => ow.toLowerCase() !== w.toLowerCase())
        .sort(() => 0.5 - Math.random())
        .slice(0, 3),
      w,
    ].sort(() => 0.5 - Math.random());
  },
  async getLyricChallenge() {
    return null;
  },

  async getGameData(mode, query) {
    let tracks = [];

    console.log(`🚀 BUSCA DIRETA: "${query}" [${mode}]`);

    // --- MODO 1: RANDOM (CAOS TOTAL) ---
    if (mode === "RANDOM") {
      // Sementes do caos para garantir variedade
      const seeds = [
        "love",
        "feat",
        "2024",
        "trap",
        "rock",
        "vibe",
        "hit",
        "the",
        "me",
        "you",
      ];
      const seed1 = seeds[Math.floor(Math.random() * seeds.length)];
      const seed2 = seeds[Math.floor(Math.random() * seeds.length)];

      // Dispara buscas paralelas (sem filtros de artista)
      const [itunes, deezer] = await Promise.all([
        iTunesService.search(seed1, 50),
        DeezerService.search(seed2),
      ]);
      tracks = [...itunes, ...deezer].sort(() => 0.5 - Math.random());
    }

    // --- MODO 2: ARTISTA (CIRÚRGICO) ---
    else {
      // 1. Busca simultânea no iTunes e Deezer (Sem Last.fm para não atrasar)
      // Nota: Deezer usa true para ativar o modo 'artist:"query"'
      const [itunes, deezer] = await Promise.all([
        iTunesService.search(query),
        DeezerService.search(query, true),
      ]);
      tracks = [...itunes, ...deezer];

      // 2. FILTRO DE SEGURANÇA (O "Porteiro")
      // Elimina tudo o que não for EXATAMENTE o artista ou uma colaboração dele
      tracks = tracks.filter((t) => {
        // a) Nome tem de conter a pesquisa (ou ser igual)
        const nameMatch =
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          isSameName(t.artist, query);
        if (!nameMatch) return false;

        // b) Acentos têm de bater certo (Anti-Impostor)
        if (hasUnwantedAccents(t.artist, query)) return false;

        return true;
      });

      // 3. ELEIÇÃO DE ID (Para garantir consistência)
      // Se encontrarmos vários artistas com o mesmo nome (raro com o filtro acima), ficamos com o mais popular
      if (tracks.length > 0) {
        const counts = {};
        tracks.forEach((t) => {
          if (t.artistId) counts[t.artistId] = (counts[t.artistId] || 0) + 1;
        });

        // Encontra o ID vencedor
        const winnerId = Object.keys(counts).sort(
          (a, b) => counts[b] - counts[a]
        )[0];

        if (winnerId) {
          tracks = tracks.filter(
            (t) => String(t.artistId) === String(winnerId) || isCollab(t.artist)
          );
        }
      }
    }

    // Remove duplicados exatos (mesmo título)
    tracks = tracks.filter(
      (v, i, a) =>
        a.findIndex((t) => t.title.toLowerCase() === v.title.toLowerCase()) ===
        i
    );

    // Obtém info da Wikipedia usando a query original (mais provável de existir)
    if (tracks.length && tracks[0]) {
      const wikiTarget = mode === "ARTIST" ? query : tracks[0].artist;
      tracks[0].fact = await WikipediaService.getArtistSummary(wikiTarget);
    }

    console.log(`✅ Resultados finais: ${tracks.length} faixas.`);
    return tracks.slice(0, 10);
  },

  async getHint(t, a) {
    return await GeniusService.getSnippet(t, a);
  },
};
