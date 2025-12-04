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
// URL correta para o Spotify Dashboard
const REDIRECT_URI = `http://127.0.0.1:${PORT}/api/spotify/callback`;

console.log("------------------------------------------------");
console.log("🚀 Iniciando VerseVault Server (Global Edition)");
console.log(`🔑 Groq Key: ${GROQ_API_KEY ? "✅" : "❌"}`);
console.log(`🎵 Spotify ID: ${SPOTIFY_CLIENT_ID ? "✅" : "❌"}`);
console.log("------------------------------------------------");

const groq = new Groq({ apiKey: GROQ_API_KEY });

app.use(cors({ origin: "*" }));
app.use(express.json());

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
    url: t.preview,
    cover: t.album.cover_medium,
    album: t.album.title,
  };
}

// --- LÓGICA DE PESQUISA DEEZER (COM PROTEÇÃO DE ERROS) ---
async function searchDeezer(title, artist) {
  const targetArtistNorm = normalize(artist);

  const isArtistMatch = (foundName) => {
    const f = normalize(foundName);
    if (f === targetArtistNorm) return true;
    if (f.includes(targetArtistNorm) && f.length < targetArtistNorm.length + 5)
      return true;
    if (targetArtistNorm.includes(f)) return true;
    return false;
  };

  try {
    // 1. Busca Exata
    let query = `artist:"${artist}" track:"${title}"`;
    let res = await axios.get(`https://api.deezer.com/search`, {
      params: { q: query, limit: 1 },
    });

    if (res.data && res.data.data && res.data.data.length > 0) {
      let t = res.data.data[0];
      if (isArtistMatch(t.artist.name)) return formatTrack(t);
    }

    // 2. Busca Solta
    res = await axios.get(`https://api.deezer.com/search`, {
      params: { q: `${title} ${artist}`, limit: 3 },
    });

    if (res.data && res.data.data && res.data.data.length > 0) {
      const validTrack = res.data.data.find((t) =>
        isArtistMatch(t.artist.name)
      );
      if (validTrack) return formatTrack(validTrack);
    }

    // 3. Fallback de Artista (Top Tracks)
    console.log(
      `⚠️ Falha na música "${title}". Tentando Top Track de "${artist}"...`
    );

    res = await axios.get(`https://api.deezer.com/search`, {
      params: { q: `artist:"${artist}"`, limit: 5 },
    });

    if (res.data && res.data.data && res.data.data.length > 0) {
      const artistHit = res.data.data.find((t) => isArtistMatch(t.artist.name));
      if (artistHit) {
        console.log(
          `🔄 Fallback Sucesso: Substituído por "${artistHit.title}" (${artistHit.artist.name})`
        );
        return formatTrack(artistHit);
      }
    }

    console.log(`❌ Artista não encontrado ou sem dados: ${artist}`);
  } catch (e) {
    console.error(`Erro busca (${title}):`, e.message);
  }
  return null;
}

// =========================================================
//      ENDPOINTS SPOTIFY (LOGIN & EXPORT)
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

    const spotifyUris = [];
    for (const trackStr of trackUris) {
      try {
        const search = await axios.get("https://api.spotify.com/v1/search", {
          params: { q: trackStr, type: "track", limit: 1 },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (search.data.tracks.items.length > 0) {
          spotifyUris.push(search.data.tracks.items[0].uri);
        }
      } catch (e) {}
    }

    if (spotifyUris.length > 0) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: spotifyUris.slice(0, 99) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
    res.json({
      success: true,
      playlistUrl: createRes.data.external_urls.spotify,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar playlist" });
  }
});

// =========================================================
//      ENDPOINTS AI & DEEZER (CÉREBRO UNIVERSAL)
// =========================================================

app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe } = req.body;
    console.log(`🤖 Análise: "${vibe}"`);

    // --- PROMPT UNIVERSAL (EQUILIBRADO) ---
    // Agora tem exemplos Internacionais E Portugueses para não viciar.
    const systemPrompt = `
      You are a Global Music Expert.
      
      YOUR GOAL:
      Analyze the input to determine the Genre, Scene, and Language.
      Generate 20 recommendations that strictly match these criteria.
      
      LOGIC EXAMPLES:
      - Input: "Fontaines D.C." -> Genre: Post-Punk (Irish/UK). Suggest: IDLES, Shame, The Murder Capital, Gilla Band, Squid.
      - Input: "Linda Martini" -> Genre: Post-Hardcore/Rock (PT). Suggest: Ornatos Violeta, PAUS, Xutos, Mão Morta.
      - Input: "Tz da Coronel" -> Genre: Trap (BR). Suggest: Matuê, Orochi, Poze.
      - Input: "Daft Punk" -> Genre: French House. Suggest: Justice, Cassius, Modjo.
      
      RULES:
      1. MATCH THE VIBE: If the input is heavy/fast (Starburster), suggest heavy/fast songs.
      2. MATCH THE ORIGIN: If the band is Irish/UK Post-Punk, suggest other UK/Irish Post-Punk bands. Do NOT suggest Portuguese music unless asked.
      3. OUTPUT: JSON object with key "songs" (array of objects with "title" and "artist").
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Input: "${vibe}".` },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    const songList = aiResponse.songs || [];

    console.log(`🧠 AI Sugeriu ${songList.length} faixas. A processar...`);

    const promises = songList.map((song) =>
      searchDeezer(song.title, song.artist)
    );
    const results = await Promise.all(promises);

    const validTracks = results.filter((t) => t !== null && t.url);
    const uniqueTracks = validTracks.filter(
      (track, index, self) => index === self.findIndex((t) => t.id === track.id)
    );

    console.log(`✅ ${uniqueTracks.length} músicas finais.`);

    if (uniqueTracks.length === 0) {
      return res
        .status(404)
        .json({ error: "Não foi possível encontrar músicas." });
    }

    res.json(uniqueTracks);
  } catch (error) {
    console.error("Erro Server:", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

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
    const finalGameTracks = [];
    // Função local para shuffle
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    tracks = shuffle(tracks);
    for (const t of tracks) {
      if (finalGameTracks.length >= 5) break;
      if (!t.preview) continue;
      const distractors = tracks
        .filter((d) => d.id !== t.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((d) => ({ id: d.id, title: d.title, artist: d.artist.name }));
      finalGameTracks.push({
        id: t.id,
        title: t.title,
        artist: t.artist.name,
        cover: t.album.cover_medium,
        previewUrl: t.preview,
        options: [
          { id: t.id, title: t.title, artist: t.artist.name },
          ...distractors,
        ].sort(() => 0.5 - Math.random()),
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
      "Nirvana",
      "Metallica",
      "Pink Floyd",
      "David Bowie",
      "Prince",
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
          content: "Generate 3 fun trivia hints about this artist. No names.",
        },
        { role: "user", content: `Artist: ${artistName}` },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });
    const aiData = JSON.parse(chatCompletion.choices[0].message.content);

    res.json({
      dayId: daySeed,
      name: artist.name,
      image: artist.picture_medium,
      hints: aiData.hints || ["Superstar", "Chart topper", "Legend"],
    });
  } catch (e) {
    res.status(500).json({ error: "Daily Error" });
  }
});

app.get("/api/spotify/search-suggestions", (req, res) => res.json([]));

app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));
