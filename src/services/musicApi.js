// Ficheiro: src/services/musicApi.js

// A URL base do backend continua a ser necessária para outras chamadas (se existirem no futuro)
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
      // CORREÇÃO: Removemos o ${PROXY_BASE} para usar o caminho relativo.
      // Isto ativa o proxy configurado no vite.config.js que aponta para https://api.genius.com
      const res = await fetch(
        `/api/genius/search?q=${encodeURIComponent(t + " " + a)}`
      );

      // Nota: A API do Genius retorna dados complexos.
      // Se estiveres a usar a API pública, o endpoint correto costuma ser /search
      const data = await res.json();

      // Lógica simplificada para tentar obter algo útil
      if (
        data.response &&
        data.response.hits &&
        data.response.hits.length > 0
      ) {
        return data.response.hits[0].result.url;
      }
      return null;
    } catch (e) {
      console.error("Erro no Genius Fetch:", e);
      return null;
    }
  },
};

export const musicApi = {
  // Gera opções de resposta baseadas nas outras faixas disponíveis
  generateOptions(correctTrack, allTracks) {
    if (correctTrack.options && correctTrack.options.length > 0) {
      return correctTrack.options;
    }

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

  // Função placeholder para manter compatibilidade, caso seja chamada
  async getGameData(mode, query) {
    return [];
  },

  async getHint(t, a) {
    return await GeniusService.getSnippet(t, a);
  },
};
