// Ficheiro: src/services/musicApi.js

// URL do Backend (usado para chamadas diretas ou fallbacks)
const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WIKIPEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";

// =========================================================
// WIKIPEDIA SERVICE (Client-Side)
// =========================================================
const WikipediaService = {
  /**
   * Obtém um resumo curto sobre o artista.
   * A Wikipedia permite CORS, por isso podemos chamar diretamente do frontend.
   */
  async getArtistSummary(artistName) {
    try {
      // Formata "Daft Punk" para "Daft_Punk"
      const formatted = artistName.trim().replace(/ /g, "_");

      const res = await fetch(
        `${WIKIPEDIA_BASE}/${encodeURIComponent(formatted)}`
      );

      if (!res.ok) return null;

      const data = await res.json();

      // Retorna apenas se for uma página padrão e tiver texto
      if (data.type === "standard" && data.extract) {
        return data.extract.substring(0, 250) + "...";
      }
      return null;
    } catch (error) {
      console.warn("Wikipedia fetch failed:", error);
      return null;
    }
  },
};

// =========================================================
// GENIUS SERVICE (Via Proxy/Backend)
// =========================================================
const GeniusService = {
  /**
   * Tenta obter o URL da letra ou anotação no Genius.
   * Usa caminho relativo '/api/genius' assumindo configuração de Proxy no Vite
   * OU que o frontend e backend estão na mesma origem em produção.
   */
  async getSnippet(title, artist) {
    try {
      // Chama o endpoint do nosso backend (server.js)
      const res = await fetch(
        `${PROXY_BASE}/api/genius/search?q=${encodeURIComponent(
          title + " " + artist
        )}`
      );

      if (!res.ok) throw new Error("Genius API Error");

      const data = await res.json();

      // Estrutura típica do Genius API Response
      if (
        data.response &&
        data.response.hits &&
        data.response.hits.length > 0
      ) {
        // Retorna o URL da página da música no Genius
        return data.response.hits[0].result.url;
      }
      return null;
    } catch (e) {
      console.error("Erro no Genius Service:", e);
      return null;
    }
  },
};

// =========================================================
// MAIN API EXPORT
// =========================================================
export const musicApi = {
  // Expor o serviço da Wikipedia para uso no componente de Detalhes/Info
  getArtistSummary: WikipediaService.getArtistSummary,

  // Expor o serviço do Genius (usado como "Dica" no jogo)
  async getHint(title, artist) {
    return await GeniusService.getSnippet(title, artist);
  },

  /**
   * Lógica do Quiz: Gera 3 respostas erradas e 1 certa.
   * @param {Object} correctTrack - A música correta.
   * @param {Array} allTracks - A lista completa de músicas do jogo.
   */
  generateOptions(correctTrack, allTracks) {
    // Se a música já trouxer opções pré-calculadas do backend, usa-as.
    if (correctTrack.options && correctTrack.options.length > 0) {
      return correctTrack.options;
    }

    if (!allTracks || !correctTrack) return [];

    // 1. Filtra a correta da lista
    let pool = allTracks.filter((t) => t.id !== correctTrack.id);

    // 2. Baralha a lista (Shuffle simples)
    pool.sort(() => 0.5 - Math.random());

    // 3. Seleciona 3 erradas
    // O slice garante que não rebenta se houver menos de 3 músicas na pool
    const wrongOptions = pool.slice(0, 3);

    // 4. Junta tudo e baralha novamente para a resposta certa não estar sempre na mesma posição
    const finalOptions = [...wrongOptions, correctTrack].sort(
      () => 0.5 - Math.random()
    );

    return finalOptions;
  },

  /**
   * Wrapper para obter dados do jogo.
   * Nota: O QuizApp.jsx atualmente chama o fetch diretamente,
   * mas é boa prática ter isto centralizado aqui.
   */
  async getGameData(mode, query) {
    try {
      const res = await fetch(
        `${PROXY_BASE}/api/game/generate?mode=${mode}&query=${encodeURIComponent(
          query
        )}`
      );
      if (!res.ok) throw new Error("Failed to fetch game data");
      return await res.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },
};
