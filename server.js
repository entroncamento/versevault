import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config"; // Carrega variáveis de ambiente (.env)
import Groq from "groq-sdk";
import querystring from "querystring";

const app = express();
const PORT = process.env.PORT || 3001;

// =========================================================
// 1. CONFIGURAÇÃO & SEGURANÇA
// =========================================================

// Configuração Dinâmica do URL Base (para Deploy vs Localhost)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const REDIRECT_URI = `${BASE_URL}/api/spotify/callback`;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN; // Necessário para as Dicas

// Log de Arranque (Com máscara de segurança nas chaves)
console.log("------------------------------------------------");
console.log("🚀 Iniciando VerseVault Server (Backend)");
console.log(`📡 Base URL: ${BASE_URL}`);
console.log(`🔑 Groq Key: ${GROQ_API_KEY ? "✅ Carregada" : "❌ Em falta"}`);
console.log(
  `🎵 Spotify ID: ${SPOTIFY_CLIENT_ID ? "✅ Carregado" : "❌ Em falta"}`
);
console.log(
  `🧠 Genius Token: ${
    GENIUS_ACCESS_TOKEN ? "✅ Carregado" : "⚠️ Opcional (Dicas)"
  }`
);
console.log("------------------------------------------------");

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Middleware
app.use(cors({ origin: "*" })); // Em produção, restringe isto ao domínio do frontend
app.use(express.json());

// =========================================================
// 2. CACHE & HELPERS
// =========================================================

// Cache em memória para evitar Rate-Limiting da Deezer
const searchCache = new Map();

// Cache Diário (Daily Drop) - Reinicia a cada 24h
let dailyCache = { dayId: null, data: null };

/**
 * Normaliza strings para comparações (remove acentos e caracteres especiais)
 */
function normalize(str) {
  return str
    ? str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    : "";
}

/**
 * Fisher-Yates Shuffle (Baralhar array sem viés)
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Formata resposta da Deezer para o modelo interno
function formatTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    url: t.preview, // O preview de 30s MP3
    cover: t.album.cover_medium,
    album: t.album.title,
    source: "deezer",
  };
}

// =========================================================
// 3. CORE: PESQUISA DE MÚSICA (DEEZER)
// =========================================================
async function searchDeezer(title, artist) {
  const cacheKey = `deezer:${normalize(title)}|${normalize(artist)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  const targetArtistNorm = normalize(artist);

  // Validador: Garante que a música encontrada pertence ao artista pedido
  const isArtistMatch = (foundName) => {
    const f = normalize(foundName);
    return f.includes(targetArtistNorm) || targetArtistNorm.includes(f);
  };

  let result = null;
  try {
    // 1. Busca Estrita (Exact Match)
    let res = await axios.get(`https://api.deezer.com/search`, {
      params: { q: `artist:"${artist}" track:"${title}"`, limit: 1 },
    });

    if (res.data?.data?.length > 0) {
      let t = res.data.data[0];
      if (isArtistMatch(t.artist.name) && t.preview) result = formatTrack(t);
    }

    // 2. Busca Fuzzy (Fallback se a estrita falhar)
    if (!result) {
      res = await axios.get(`https://api.deezer.com/search`, {
        params: { q: `${title} ${artist}`, limit: 3 },
      });
      if (res.data?.data?.length > 0) {
        const valid = res.data.data.find(
          (t) => isArtistMatch(t.artist.name) && t.preview
        );
        if (valid) result = formatTrack(valid);
      }
    }
  } catch (e) {
    console.error(`Erro na busca Deezer (${title}):`, e.message);
  }

  searchCache.set(cacheKey, result);
  return result;
}

// =========================================================
// 4. INTEGRAÇÃO SPOTIFY (OAUTH & PLAYLISTS)
// =========================================================

// Login Redirect
app.get("/api/spotify/login", (req, res) => {
  const scope =
    "playlist-modify-public playlist-modify-private user-library-modify";
  const query = querystring.stringify({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URI,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${query}`);
});

// Callback (Troca Code por Token)
app.get("/api/spotify/callback", async (req, res) => {
  const code = req.query.code || null;
  try {
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

    // HTML Response que injeta o token no opener e fecha a popup
    res.send(`
      <html><body><script>
        window.opener.postMessage({type:'SPOTIFY_TOKEN', token:'${access_token}'}, '*');
        window.close();
      </script></body></html>
    `);
  } catch (error) {
    res.send("Erro no login Spotify. Verifica as credenciais no .env");
  }
});

// Criar Playlist e Salvar Músicas
app.post("/api/spotify/create-playlist", async (req, res) => {
  const { token, name, trackUris } = req.body;
  if (!trackUris || trackUris.length === 0)
    return res.status(400).json({ error: "Lista vazia" });

  try {
    // 1. Get User ID
    const userRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userId = userRes.data.id;

    // 2. Create Playlist
    const createRes = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: `VerseVault: ${name}`,
        public: false,
        description: "Gerada via VerseVault XP",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const playlistId = createRes.data.id;

    // 3. Search Tracks (Parallel Execution)
    const searchPromises = trackUris.map((trackStr) =>
      axios
        .get("https://api.spotify.com/v1/search", {
          params: { q: trackStr, type: "track", limit: 1 },
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((r) => r.data.tracks.items[0]?.uri)
        .catch(() => null)
    );

    const results = await Promise.all(searchPromises);
    const validUris = results.filter((uri) => uri);

    // 4. Add to Playlist
    if (validUris.length > 0) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: validUris.slice(0, 99) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    res.json({
      success: true,
      playlistUrl: createRes.data.external_urls.spotify,
    });
  } catch (error) {
    console.error("Spotify Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao criar playlist" });
  }
});

// Novo Endpoint: Adicionar uma música aos 'Liked Songs' (Biblioteca)
app.post("/api/spotify/save", async (req, res) => {
  const { token, track } = req.body;

  if (!track || !track.title)
    return res.status(400).json({ error: "Invalid track" });

  try {
    // 1. Encontrar o ID Spotify da música
    const searchRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: `${track.title} ${track.artist}`, type: "track", limit: 1 },
      headers: { Authorization: `Bearer ${token}` },
    });

    const spotifyTrackId = searchRes.data.tracks.items[0]?.id;

    if (!spotifyTrackId) throw new Error("Track not found on Spotify");

    // 2. PUT request para /me/tracks (Save)
    await axios.put(
      "https://api.spotify.com/v1/me/tracks",
      { ids: [spotifyTrackId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Spotify Save Error:", error.message);
    res.status(500).json({ error: "Failed to save track" });
  }
});

// =========================================================
// 5. PROXY GENIUS (Dicas / Lyrics)
// =========================================================
app.get("/api/genius/search", async (req, res) => {
  const { q } = req.query;
  if (!GENIUS_ACCESS_TOKEN) return res.json({ response: { hits: [] } });

  try {
    const response = await axios.get("https://api.genius.com/search", {
      params: { q },
      headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Genius Proxy Error:", error.message);
    res.status(500).json({ error: "Genius API Error" });
  }
});

// =========================================================
// 6. INTELIGÊNCIA ARTIFICIAL (DJ MODE)
// =========================================================
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe, userContext } = req.body; // userContext vem do MyComputer (histórico)
    console.log(`🤖 AI Request: "${vibe}"`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Music Expert DJ. 
          Context about user taste: "${userContext || "Unknown"}".
          Based on the user Input Vibe, suggest 10 specific songs.
          Respond strictly with a JSON object containing a key "songs" which is an array of objects {title, artist}.`,
        },
        { role: "user", content: `Input Vibe: "${vibe}".` },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    const songList = aiResponse.songs || [];

    // Resolver com Deezer
    const promises = songList.map(async (song) => {
      return await searchDeezer(song.title, song.artist);
    });

    const results = await Promise.all(promises);
    const validTracks = results.filter((t) => t !== null);

    // Deduplicação por ID
    const uniqueTracks = Array.from(
      new Map(validTracks.map((item) => [item.id, item])).values()
    );

    if (uniqueTracks.length === 0) {
      return res.status(404).json({ error: "No tracks found." });
    }

    res.json(uniqueTracks);
  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: "AI Processing Failed" });
  }
});

// =========================================================
// 7. MOTOR DE JOGO (QUIZ & DAILY DROP)
// =========================================================

app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    let deezerQuery = query || "pop";
    if (mode === "ARTIST") deezerQuery = `artist:"${query}"`;

    const response = await axios.get("https://api.deezer.com/search", {
      params: { q: deezerQuery, limit: 50 },
    });

    let tracks = response.data.data || [];
    // Fallback para Charts se a pesquisa não der resultados
    if (tracks.length < 4) {
      const chart = await axios.get("https://api.deezer.com/chart");
      tracks = chart.data.tracks.data;
    }

    tracks = shuffleArray(tracks);
    const finalGameTracks = [];

    // Gerar Perguntas
    for (let i = 0; i < tracks.length; i++) {
      if (finalGameTracks.length >= 5) break;
      const t = tracks[i];
      if (!t.preview) continue;

      // Gerar Distratores (Respostas Erradas)
      const distractors = [];
      const usedIndices = new Set([i]);
      let attempts = 0;

      while (distractors.length < 3 && attempts < 20) {
        const randIdx = Math.floor(Math.random() * tracks.length);
        if (!usedIndices.has(randIdx)) {
          const d = tracks[randIdx];
          distractors.push({ id: d.id, title: d.title, artist: d.artist.name });
          usedIndices.add(randIdx);
        }
        attempts++;
      }

      // Só adiciona se tivermos 3 distratores
      if (distractors.length === 3) {
        finalGameTracks.push({
          id: t.id,
          title: t.title,
          artist: t.artist.name,
          cover: t.album.cover_medium,
          previewUrl: t.preview,
          options: shuffleArray([
            { id: t.id, title: t.title, artist: t.artist.name },
            ...distractors,
          ]),
        });
      }
    }
    res.json(finalGameTracks);
  } catch (error) {
    res.status(500).json({ error: "Game Generation Error" });
  }
});

// Daily Drop (Desafio Diário Global)
app.get("/api/game/daily", async (req, res) => {
  try {
    const daySeed = Math.floor(Date.now() / 86400000);

    if (dailyCache.dayId === daySeed && dailyCache.data) {
      return res.json(dailyCache.data);
    }

    const legends = [
      "Michael Jackson",
      "Queen",
      "Eminem",
      "Rihanna",
      "Drake",
      "The Weeknd",
      "Coldplay",
      "Beyoncé",
      "Bruno Mars",
      "Adele",
      "Beatles",
      "Madonna",
    ];
    const artistName = legends[daySeed % legends.length];

    const searchRes = await axios.get("https://api.deezer.com/search/artist", {
      params: { q: artistName, limit: 1 },
    });
    const artist = searchRes.data.data[0];

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Generate 3 fun trivia hints about this artist. Do NOT mention the name. Respond JSON { hints: [] }.",
        },
        { role: "user", content: `Artist: ${artistName}` },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const aiData = JSON.parse(chatCompletion.choices[0].message.content);

    const responseData = {
      dayId: daySeed,
      name: artist.name,
      image: artist.picture_medium,
      hints: aiData.hints || ["Lenda da música", "Vencedor de Grammys"],
    };

    dailyCache = { dayId: daySeed, data: responseData };
    res.json(responseData);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Daily Drop Error" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Servidor VerseVault a correr na porta ${PORT}`)
);
