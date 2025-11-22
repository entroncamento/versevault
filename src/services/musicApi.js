const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WIKIPEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";

// --- SERVIÇOS AUXILIARES ---

const WikipediaService = {
  async getArtistSummary(artistName) {
    try {
      // Normaliza o nome para a Wikipedia (ex: "The Beatles" -> "The_Beatles")
      const formatted = artistName.trim().replace(/ /g, "_");
      const res = await fetch(
        `${WIKIPEDIA_BASE}/${encodeURIComponent(formatted)}`
      );
      const data = await res.json();

      if (data.type === "standard" && data.extract) {
        return data.extract.substring(0, 250) + "...";
      }
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
      return data.url || null;
    } catch {
      return null;
    }
  },
};

// --- API PRINCIPAL ---

export const musicApi = {
  // Gera opções de resposta (1 Certa + 3 Erradas)
  generateOptions(correctTrack, allTracks) {
    // As opções erradas devem ser aleatórias para não ser óbvio
    let others = allTracks
      .filter((t) => t.id !== correctTrack.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Salvaguarda: Se houver poucas músicas no total, repete algumas para não crashar
    while (others.length < 3 && allTracks.length > 1) {
      const random = allTracks[Math.floor(Math.random() * allTracks.length)];
      if (random.id !== correctTrack.id) {
        others.push(random);
      }
    }

    // Mistura a certa com as erradas
    return [...others, correctTrack].sort(() => 0.5 - Math.random());
  },

  // Gera opções para o modo "Missing Word"
  generateWordOptions(w) {
    const seeds = [
      "Love",
      "Night",
      "Baby",
      "Heart",
      "World",
      "Time",
      "Dance",
      "Life",
      "Fire",
      "Dream",
      "Vibe",
      "Kizomba",
      "Trap",
      "Saudade",
      "Vida",
    ];
    return [
      ...seeds
        .filter((ow) => ow.toLowerCase() !== w.toLowerCase())
        .sort(() => 0.5 - Math.random())
        .slice(0, 3),
      w,
    ].sort(() => 0.5 - Math.random());
  },

  // --- LÓGICA CENTRAL DO JOGO (COM DIFICULDADE) ---
  async getGameData(mode, query) {
    try {
      let searchUrl = `${PROXY_BASE}/api/search`;

      // 1. Constrói o URL dependendo do modo
      if (mode === "RANDOM") {
        const randomChars = "abcdefghijklmnopqrstuvwxyz";
        const genres = [
          "tuga",
          "hip hop tuga",
          "funk",
          "pop",
          "hits",
          "party",
          "rock",
          "r&b",
        ];

        // 50% hipótese de ser por género, 50% por letra aleatória
        const q =
          Math.random() > 0.5
            ? genres[Math.floor(Math.random() * genres.length)]
            : randomChars[Math.floor(Math.random() * randomChars.length)];

        searchUrl += `?q=${encodeURIComponent(q)}&type=track`;
      } else {
        // MODO ARTISTA
        searchUrl += `?q=${encodeURIComponent(query)}&type=artist`;
      }

      // 2. Faz o pedido ao Backend
      const res = await fetch(searchUrl);
      const tracks = await res.json();

      // 3. Deduplicação (remove músicas repetidas)
      const uniqueIds = new Set();
      const allUniqueTracks = tracks.filter((track) => {
        if (uniqueIds.has(track.id)) return false;
        uniqueIds.add(track.id);
        return true;
      });

      // 4. ORDENAÇÃO POR POPULARIDADE (Hit -> Niche)
      // O backend agora envia 'popularity' (0-100) do Spotify
      allUniqueTracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      // 5. CRIAÇÃO DA CURVA DE DIFICULDADE
      let gameSession = [];

      if (allUniqueTracks.length <= 12) {
        // Se houver poucas músicas, usa a ordem de popularidade direta
        gameSession = allUniqueTracks;
      } else {
        // Se houver muitas, selecionamos cirurgicamente:

        // NÍVEL FÁCIL: Top 4 Hits (Início do array)
        const easy = allUniqueTracks.slice(0, 4);

        // NÍVEL MÉDIO: 4 músicas do meio da tabela
        const midStart = Math.floor(allUniqueTracks.length / 2 - 2);
        const medium = allUniqueTracks.slice(midStart, midStart + 4);

        // NÍVEL DIFÍCIL: 4 músicas do fundo da tabela (fim do array)
        const hard = allUniqueTracks.slice(allUniqueTracks.length - 4);

        // Constrói o jogo: Fácil -> Médio -> Difícil
        gameSession = [...easy, ...medium, ...hard];
      }

      // 6. Adicionar Facto Wikipedia (apenas à primeira música, que é o maior Hit)
      if (mode === "ARTIST" && gameSession.length > 0) {
        gameSession[0].fact = await WikipediaService.getArtistSummary(query);
      }

      // IMPORTANTE: Retornamos o array SEM baralhar novamente,
      // para garantir que o jogador joga na ordem Fácil -> Difícil.
      return gameSession;
    } catch (error) {
      console.error("Erro ao buscar dados do jogo:", error);
      return [];
    }
  },

  async getHint(t, a) {
    return await GeniusService.getSnippet(t, a);
  },
};
