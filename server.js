import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import Groq from "groq-sdk";
import querystring from "querystring";

const app = express();
const PORT = process.env.PORT || 3001;

// --- LOGS DE ARRANQUE ---
const groqKey = process.env.GROQ_API_KEY;

console.log("------------------------------------------------");
console.log("🚀 Iniciando VerseVault Server (Fixed & Robust)...");
console.log(
  `🧠 Groq Key: ${
    groqKey && groqKey.length > 10 ? "✅ Detetada" : "❌ Em falta"
  }`
);
console.log("------------------------------------------------");

// --- CONFIGURAÇÃO SPOTIFY ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/api/spotify/callback`; // Ajusta se usares outro IP/Porta

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "no-key" });

app.use(cors({ origin: "*" }));
app.use(express.json());

// --- TOKEN MANAGER SPOTIFY ---
let spotifyToken = null;
let tokenExpiration = 0;

const getSpotifyToken = async () => {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiration) return spotifyToken;

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    // URL CORRIGIDO
    const res = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    spotifyToken = res.data.access_token;
    tokenExpiration = now + (res.data.expires_in - 60) * 1000;
    return spotifyToken;
  } catch (e) {
    console.error("❌ Erro Spotify Auth:", e.response?.data || e.message);
    throw new Error("Falha na autenticação Spotify");
  }
};

// --- FUNÇÃO AUXILIAR: NORMALIZAÇÃO DE TEXTO ---
function normalize(str) {
  return str
    ? str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "")
        .trim()
    : "";
}

// --- FUNÇÃO PREVIEW AUDIO (FALLBACKS) ---
async function fetchPreview(title, artist) {
  const targetArtist = normalize(artist);
  const targetTitle = normalize(title);

  try {
    // 1. iTunes (Geralmente o mais fiável para previews de 30s)
    const term = `${title} ${artist}`;
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=5`
    );

    if (res.data.resultCount > 0) {
      const match = res.data.results.find((track) => {
        const foundArtist = normalize(track.artistName);
        const foundTitle = normalize(track.trackName);
        // Verifica se os nomes batem mais ou menos
        return (
          (foundArtist.includes(targetArtist) ||
            targetArtist.includes(foundArtist)) &&
          (foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle))
        );
      });
      if (match && match.previewUrl) return match.previewUrl;
    }

    // 2. Deezer (Fallback secundário)
    const q = `artist:"${artist}" track:"${title}"`;
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`
    );
    if (res2.data.data && res2.data.data.length > 0) {
      const matchDeezer = res2.data.data.find((track) => {
        const foundTitle = normalize(track.title);
        return (
          foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle)
        );
      });
      if (matchDeezer && matchDeezer.preview) return matchDeezer.preview;
    }
  } catch (e) {
    // Silently fail external previews
  }
  return null;
}

// --- AUXILIARES GERAIS ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getWikiFact(artistName) {
  try {
    const res = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        artistName
      )}`
    );
    if (res.data.extract) {
      const sentences = res.data.extract.split(". ");
      const safeSentence =
        sentences.find((s) => !s.includes(artistName)) || sentences[0];
      return safeSentence + ".";
    }
  } catch (e) {
    return "A legendary artist known worldwide.";
  }
  return "An iconic music figure.";
}

// =========================================================
//      ENDPOINT NATIVO SPOTIFY (SEM IA / LLM)
// =========================================================
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe } = req.body;
    console.log(`🎵 Spotify Algo a processar: "${vibe}"`);

    const token = await getSpotifyToken();

    // 1. ACHAR A "SEMENTE" (SEED)
    // Pesquisa o que o user escreveu para achar o Artista ou Música base
    // Remove palavras inúteis como "musica tipo", "parecido com"
    const cleanQuery = vibe
      .replace(/songs similar to/i, "")
      .replace(/music like/i, "")
      .replace(/parecido com/i, "")
      .trim();

    const searchRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: cleanQuery, type: "track,artist", limit: 1 },
      headers: { Authorization: `Bearer ${token}` },
    });

    let seedArtists = "";
    let seedTracks = "";
    let seedGenres = "";

    const items = searchRes.data.tracks?.items || [];
    const artists = searchRes.data.artists?.items || [];

    if (items.length > 0) {
      // Se encontrou uma música, usa o ID da música como semente
      seedTracks = items[0].id;
      console.log(
        `🌱 Seed Track: ${items[0].name} (${items[0].artists[0].name})`
      );
    } else if (artists.length > 0) {
      // Se encontrou um artista, usa o ID do artista
      seedArtists = artists[0].id;
      console.log(`🌱 Seed Artist: ${artists[0].name}`);
    } else {
      // Se não achou nada, tenta um género genérico baseada no texto (fallback simples)
      // (Opcional: podes remover isto e dar erro 404)
      seedGenres = "pop";
    }

    // 2. PEDIR RECOMENDAÇÕES AO ALGORITMO DO SPOTIFY
    // Este endpoint é mágico. Ele aceita seeds e devolve musicas similares.
    const recParams = {
      limit: 15,
      market: "US", // Garante musicas disponiveis
    };

    if (seedTracks) recParams.seed_tracks = seedTracks;
    if (seedArtists) recParams.seed_artists = seedArtists;
    if (seedGenres) recParams.seed_genres = seedGenres;

    // Se detetarmos "Unicorn" ou "Hardcore" ou "Frenchcore", forçamos energia alta
    // Isto é um pequeno "tweak" manual, mas o algoritmo base já é bom.
    if (
      cleanQuery.toLowerCase().includes("ketamine") ||
      cleanQuery.toLowerCase().includes("hardcore")
    ) {
      recParams.min_energy = 0.8;
      recParams.min_tempo = 160;
    }

    // URL OFICIAL DE RECOMENDAÇÕES
    // Nota: O endpoint é v1/recommendations.
    // Como estás a usar proxies, o URL deve ser algo como:
    // https://api.spotify.com/v1/search4 (confirma se tens esse mapeamento)
    // Se não tiveres proxy para recommendations, usa o URL direto se possível ou cria o proxy.
    // Vou assumir o URL direto da API para garantir que funciona,
    // mas se tiveres proxy obrigatório, substitui por ele.

    const recommendations = await axios.get(
      "https://api.spotify.com/v1/recommendations",
      {
        params: recParams,
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const rawTracks = recommendations.data.tracks;

    // 3. PROCESSAR PREVIEWS (MANTER A TUA LÓGICA DE AUDIO)
    const processedTracks = await Promise.all(
      rawTracks.map(async (track) => {
        let previewUrl = track.preview_url;

        // Fallback iTunes/Deezer
        if (!previewUrl) {
          previewUrl = await fetchPreview(track.name, track.artists[0].name);
        }

        return {
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist: track.artists[0].name,
          url: previewUrl, // Pode ser null
          cover: track.album.images[0]?.url,
          album: track.album.name,
        };
      })
    );

    // Filtra nulos e devolve
    const validTracks = processedTracks.filter((t) => t); // Remove erros

    if (validTracks.length === 0)
      return res.status(404).json({ error: "Nenhuma recomendação encontrada" });

    res.json(validTracks);
  } catch (error) {
    console.error(
      "Erro Recommendations:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Falha ao obter recomendações." });
  }
});
// =========================================================
//               SPOTIFY USER ACTIONS (LOGIN)
// =========================================================
app.get("/api/spotify/login", (req, res) => {
  const scope =
    "playlist-modify-public playlist-modify-private user-top-read user-library-modify";
  const query = querystring.stringify({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URI,
  });
  // URL CORRIGIDO
  res.redirect(`https://accounts.spotify.com/authorize?${query}`);
});

app.get("/api/spotify/callback", async (req, res) => {
  const code = req.query.code || null;
  try {
    // URL CORRIGIDO
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const access_token = response.data.access_token;
    res.send(
      `<html><body><script>window.opener.postMessage({type:'SPOTIFY_TOKEN',token:'${access_token}'},'*');window.close();</script></body></html>`
    );
  } catch (error) {
    console.error("Erro callback:", error.response?.data || error.message);
    res.send("Erro no login Spotify.");
  }
});

app.post("/api/spotify/top", async (req, res) => {
  const { token } = req.body;
  try {
    // URL CORRIGIDO
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/artists",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json({ artists: response.data.items.map((a) => a.name) });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar top artists" });
  }
});

app.post("/api/spotify/save", async (req, res) => {
  const { token, track } = req.body;
  try {
    let spotifyId = track.id;
    // Lógica para encontrar ID se vier de fonte externa, mantida
    if (!spotifyId) {
      const q = `track:${track.title} artist:${track.artist}`;
      const searchRes = await axios.get("https://api.spotify.com/v1/search", {
        params: { q, type: "track", limit: 1 },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (searchRes.data.tracks.items.length > 0)
        spotifyId = searchRes.data.tracks.items[0].id;
    }
    if (!spotifyId) return res.status(404).json({ error: "Not found" });

    // URL CORRIGIDO (Save Tracks for User)
    await axios.put(
      "https://api.spotify.com/v1/me/tracks",
      { ids: [spotifyId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar musica" });
  }
});

app.post("/api/spotify/create-playlist", async (req, res) => {
  const { token, name, trackUris } = req.body;

  try {
    // 1. Get User ID - URL CORRIGIDO
    const userRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userId = userRes.data.id;

    // 2. Create Playlist - URL CORRIGIDO
    const createRes = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      { name: `VerseVault: ${name}`, public: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const playlistId = createRes.data.id;

    // 3. Add Tracks - URL CORRIGIDO
    if (trackUris && trackUris.length > 0) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: trackUris.slice(0, 99) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    res.json({
      success: true,
      playlistUrl: createRes.data.external_urls.spotify,
    });
  } catch (error) {
    console.error(
      "Erro ao criar playlist:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Falha ao criar playlist" });
  }
});

app.get("/api/spotify/search-suggestions", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const token = await getSpotifyToken();
    // URL CORRIGIDO
    const response = await axios.get("https://api.spotify.com/v1/search", {
      params: { q, type: "track,artist", limit: 5 },
      headers: { Authorization: `Bearer ${token}` },
    });

    const suggestions = response.data.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      image: track.album.images[2]?.url,
      type: "track",
    }));

    res.json(suggestions);
  } catch (error) {
    res.json([]);
  }
});

// =========================================================
//                   GAME MODES
// =========================================================

app.get("/api/game/daily", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const daySeed = Math.floor(Date.now() / 86400000);
    const offset = (daySeed * 97) % 500;
    let artist = null;
    try {
      // URL CORRIGIDO
      let r = await axios.get("https://api.spotify.com/v1/search", {
        params: {
          q: "genre:pop OR genre:rock",
          type: "artist",
          limit: 1,
          offset,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      artist = r.data.artists.items[0];
    } catch (e) {}

    if (!artist)
      return res.status(500).json({ error: "Failed to fetch artist" });

    // URL CORRIGIDO
    const topTracksRes = await axios.get(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const topTrack = topTracksRes.data.tracks[0]?.name || "Hit";
    const fact = await getWikiFact(artist.name);

    res.json({
      dayId: daySeed,
      name: artist.name,
      image: artist.images[0]?.url,
      hints: [
        `Genre: ${artist.genres[0]}`,
        `Hit: "${topTrack}"`,
        `Fact: ${fact}`,
      ],
    });
  } catch (error) {
    res.status(500).json({ error: "Erro Daily Game" });
  }
});

app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    const token = await getSpotifyToken();

    // Lógica Artista/Gênero Específico
    if (
      mode === "ARTIST" ||
      mode === "GENRE" ||
      (query && query !== "random")
    ) {
      let searchTerm = query || "year:2024";
      if (mode === "ARTIST") searchTerm = `artist:${query}`;
      else if (mode === "GENRE") searchTerm = `genre:${query}`;

      // URL CORRIGIDO
      const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
        params: { q: searchTerm, type: "track", limit: 50 },
        headers: { Authorization: `Bearer ${token}` },
      });

      let tracks = shuffleArray(spotifyRes.data.tracks.items || []);
      const finalGameTracks = [];
      const distractorPool = tracks.map((t) => ({
        id: t.id,
        title: t.name,
        artist: t.artists[0].name,
      }));

      for (const t of tracks) {
        if (finalGameTracks.length >= 5) break;

        let preview = t.preview_url;
        if (!preview) {
          preview = await fetchPreview(t.name, t.artists[0].name);
        }

        // No jogo precisamos MESMO de audio. Se não houver, pula.
        if (!preview) continue;

        const distractors = distractorPool
          .filter((d) => d.id !== t.id && d.title !== t.name)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        finalGameTracks.push({
          id: t.id,
          title: t.name,
          artist: t.artists[0].name,
          cover: t.album.images[0]?.url,
          gameMode: mode || "RANDOM",
          previewUrl: preview,
          options: [
            { id: t.id, title: t.name, artist: t.artists[0].name },
            ...distractors,
          ].sort(() => 0.5 - Math.random()),
        });
      }
      return res.json(finalGameTracks);
    }

    // Lógica Aleatória (Genres)
    const genres = [
      "pop",
      "rock",
      "hip-hop",
      "indie",
      "alternative",
      "metal",
      "r-n-b",
      "reggaeton",
      "dance",
      "hits",
    ];

    const promises = Array(5)
      .fill(null)
      .map(async () => {
        try {
          const randomGenre = genres[Math.floor(Math.random() * genres.length)];
          const randomYear =
            Math.floor(Math.random() * (2024 - 1980 + 1)) + 1980;
          const searchTerm = `genre:${randomGenre} year:${randomYear}`;

          // URL CORRIGIDO
          const r = await axios.get("https://api.spotify.com/v1/search", {
            params: { q: searchTerm, type: "track", limit: 20 },
            headers: { Authorization: `Bearer ${token}` },
          });

          const items = r.data.tracks.items;
          if (!items || items.length < 4) return null;

          shuffleArray(items);

          let selectedTrack = null;
          for (const t of items) {
            let preview =
              t.preview_url || (await fetchPreview(t.name, t.artists[0].name));
            if (preview) {
              t.preview_url = preview;
              selectedTrack = t;
              break;
            }
          }

          if (!selectedTrack) return null;

          const distractors = items
            .filter(
              (d) => d.id !== selectedTrack.id && d.title !== selectedTrack.name
            )
            .slice(0, 3)
            .map((t) => ({
              id: t.id,
              title: t.name,
              artist: t.artists[0].name,
            }));

          return {
            id: selectedTrack.id,
            title: selectedTrack.name,
            artist: selectedTrack.artists[0].name,
            cover: selectedTrack.album.images[0]?.url,
            gameMode: "RANDOM",
            previewUrl: selectedTrack.preview_url,
            options: [
              {
                id: selectedTrack.id,
                title: selectedTrack.name,
                artist: selectedTrack.artists[0].name,
              },
              ...distractors,
            ].sort(() => 0.5 - Math.random()),
          };
        } catch (e) {
          return null;
        }
      });

    const results = await Promise.all(promises);
    const finalGameTracks = results.filter((t) => t !== null);

    if (finalGameTracks.length === 0)
      return res.status(500).json({ error: "Failed to generate game" });

    res.json(finalGameTracks);
  } catch (error) {
    console.error("Erro no jogo:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor a correr na porta ${PORT}`));
