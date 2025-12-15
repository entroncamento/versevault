import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import Groq from "groq-sdk";
import querystring from "querystring";

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// YOUTUBE REMOVIDO
const REDIRECT_URI = `http://127.0.0.1:${PORT}/api/spotify/callback`;

console.log("------------------------------------------------");
console.log("🚀 Iniciando VerseVault Server (Audio Only Edition)");
console.log(`🔑 Groq Key: ${GROQ_API_KEY ? "✅" : "❌"}`);
console.log(`🎵 Spotify ID: ${SPOTIFY_CLIENT_ID ? "✅" : "❌"}`);
console.log("------------------------------------------------");

const groq = new Groq({ apiKey: GROQ_API_KEY });

app.use(cors({ origin: "*" }));
app.use(express.json());

// --- CACHES ---
const searchCache = new Map();
let dailyCache = { dayId: null, data: null };

// --- HELPERS ---
function normalize(str) {
  return str
    ? str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    : "";
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    url: t.preview, // Preview de 30s do Deezer
    cover: t.album.cover_medium,
    album: t.album.title,
    source: "deezer",
  };
}

// --- PESQUISA DEEZER (COM CACHE) ---
async function searchDeezer(title, artist) {
  const cacheKey = `deezer:${normalize(title)}|${normalize(artist)}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  const targetArtistNorm = normalize(artist);
  const isArtistMatch = (foundName) => {
    const f = normalize(foundName);
    return f.includes(targetArtistNorm) || targetArtistNorm.includes(f);
  };

  let result = null;
  try {
    // 1. Busca Exata
    let res = await axios.get(`https://api.deezer.com/search`, {
      params: { q: `artist:"${artist}" track:"${title}"`, limit: 1 },
    });

    if (res.data?.data?.length > 0) {
      let t = res.data.data[0];
      if (isArtistMatch(t.artist.name) && t.preview) result = formatTrack(t);
    }

    // 2. Busca Solta (Fallback)
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
    console.error(`Erro busca Deezer (${title}):`, e.message);
  }

  searchCache.set(cacheKey, result);
  return result;
}

// =========================================================
//      ENDPOINTS SPOTIFY
// =========================================================
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
    res.send(`
      <html><body><script>
        window.opener.postMessage({type:'SPOTIFY_TOKEN', token:'${access_token}'}, '*');
        window.close();
      </script></body></html>
    `);
  } catch (error) {
    res.send(
      "Erro login Spotify: " +
        (error.response?.data?.error_description || error.message)
    );
  }
});

app.post("/api/spotify/create-playlist", async (req, res) => {
  const { token, name, trackUris } = req.body;
  if (!trackUris || trackUris.length === 0)
    return res.status(400).json({ error: "Empty list" });

  try {
    const userRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userId = userRes.data.id;

    const createRes = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: `VerseVault: ${name}`,
        public: false,
        description: "Created via VerseVault XP",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const playlistId = createRes.data.id;

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

// =========================================================
//      ENDPOINTS AI & GAME
// =========================================================

// AI DJ (Apenas Deezer)
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe } = req.body;
    console.log(`🤖 AI Request: "${vibe}"`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Global Music Expert. Analyze input for Genre/Language. 
          Respond JSON object with key "songs" (array of {title, artist}). 
          Give 10 recommendations.`,
        },
        { role: "user", content: `Input: "${vibe}".` },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    const songList = aiResponse.songs || [];

    // Lógica Simplificada: Apenas Deezer
    const promises = songList.map(async (song) => {
      return await searchDeezer(song.title, song.artist);
    });

    const results = await Promise.all(promises);
    const validTracks = results.filter((t) => t !== null);

    const uniqueTracks = Array.from(
      new Map(validTracks.map((item) => [item.id, item])).values()
    );

    if (uniqueTracks.length === 0) {
      return res.status(404).json({ error: "Nenhuma música encontrada." });
    }

    res.json(uniqueTracks);
  } catch (error) {
    console.error("Erro AI:", error.message);
    res.status(500).json({ error: "Erro interno." });
  }
});

// Game (mantido igual, já usava Deezer)
app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    let deezerQuery = query || "pop";
    if (mode === "ARTIST") deezerQuery = `artist:"${query}"`;

    const response = await axios.get("https://api.deezer.com/search", {
      params: { q: deezerQuery, limit: 50 },
    });

    let tracks = response.data.data || [];
    if (tracks.length < 4) {
      const chart = await axios.get("https://api.deezer.com/chart");
      tracks = chart.data.tracks.data;
    }

    tracks = shuffleArray(tracks);
    const finalGameTracks = [];

    for (let i = 0; i < tracks.length; i++) {
      if (finalGameTracks.length >= 5) break;
      const t = tracks[i];
      if (!t.preview) continue;

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
    res.json(finalGameTracks);
  } catch (error) {
    res.status(500).json({ error: "Game Error" });
  }
});

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
            "Generate 3 fun trivia hints about this artist. No names. Respond in JSON with a 'hints' array.",
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
      hints: aiData.hints || ["Legend"],
    };
    dailyCache = { dayId: daySeed, data: responseData };
    res.json(responseData);
  } catch (e) {
    res.status(500).json({ error: "Daily Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));
