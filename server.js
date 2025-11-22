import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO DE CHAVES ---
const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.warn(
    "⚠️ AVISO: SPOTIFY_CLIENT_ID ou SECRET não configurados no .env!"
  );
}

// --- CORS ---
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Bloqueado pelo CORS"));
    },
  })
);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// --- GESTOR DE TOKEN SPOTIFY ---
let spotifyToken = null;
let tokenExpiration = 0;

const getSpotifyToken = async () => {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiration) return spotifyToken;

  try {
    console.log("🔄 A renovar token Spotify...");
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    const authStr = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authStr}`,
        },
      }
    );

    spotifyToken = res.data.access_token;
    tokenExpiration = now + (res.data.expires_in - 300) * 1000;
    return spotifyToken;
  } catch (e) {
    console.error("❌ Erro Spotify Auth:", e.message);
    throw new Error("Falha na autenticação Spotify");
  }
};

// --- HELPERS & FALLBACKS ---

const cleanStr = (s) =>
  s
    ? s
        .toLowerCase()
        .replace(/[\(\[].*?[\)\]]/g, "")
        .replace(/feat\..*/g, "")
        .trim()
    : "";

// 1. Fallback: iTunes
async function fetchItunesPreview(title, artist) {
  try {
    const term = `${cleanStr(title)} ${cleanStr(artist)}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&entity=song&limit=3`;

    const res = await axios.get(url, { timeout: 2500 });
    const match = res.data.results.find(
      (t) => t.previewUrl && cleanStr(t.trackName).includes(cleanStr(title))
    );
    return match ? match.previewUrl : null;
  } catch {
    return null;
  }
}

// 2. Fallback: Deezer (Salva artistas PT/Hip-Hop)
async function fetchDeezerPreview(title, artist) {
  try {
    const q = `artist:"${cleanStr(artist)}" track:"${cleanStr(title)}"`;
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(
      q
    )}&limit=1`;

    const res = await axios.get(url, { timeout: 2500 });
    if (res.data.data && res.data.data.length > 0) {
      return res.data.data[0].preview;
    }
    return null;
  } catch {
    return null;
  }
}

// --- ENDPOINT DE PESQUISA ---
app.get("/api/search", async (req, res) => {
  try {
    const { q, type } = req.query;
    const token = await getSpotifyToken();
    console.log(`🔍 A procurar: "${q}" [${type || "track"}]`);

    // 1. Buscar lista de músicas ao Spotify
    // AUMENTÁMOS O LIMIT PARA 50 para ter material suficiente para a curva de dificuldade
    const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: type === "artist" ? `artist:${q}` : q,
        type: "track",
        limit: 50,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    const tracks = spotifyRes.data.tracks.items;

    // 2. Tentar encontrar áudio (Spotify -> iTunes -> Deezer)
    const promises = tracks.map(async (t) => {
      const lowerTitle = t.name.toLowerCase();
      if (lowerTitle.includes("karaoke") || lowerTitle.includes("instrumental"))
        return null;

      let preview = t.preview_url;

      if (!preview)
        preview = await fetchItunesPreview(t.name, t.artists[0].name);
      if (!preview)
        preview = await fetchDeezerPreview(t.name, t.artists[0].name);

      if (!preview) return null;

      return {
        id: `spot-${t.id}`,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        normalizedArtist: t.artists[0].name.toLowerCase(),
        cover: t.album.images[0]?.url,
        previewUrl: preview,
        popularity: t.popularity, // <--- IMPORTANTE: Envia a popularidade (0-100)
        source: "Hybrid",
      };
    });

    const results = await Promise.all(promises);
    const finalData = results.filter((r) => r !== null);

    console.log(`✅ Encontradas ${finalData.length} músicas com áudio.`);
    res.json(finalData);
  } catch (error) {
    console.error("❌ Erro Search:", error.message);
    res.status(500).json({ error: "Erro na pesquisa" });
  }
});

// --- ENDPOINT GENIUS ---
app.get("/api/genius/snippet", async (req, res) => {
  try {
    const { t, a } = req.query;
    const response = await axios.get("https://api.genius.com/search", {
      params: { q: `${t} ${a}` },
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}`, "User-Agent": UA },
    });
    const hits = response.data.response.hits;
    res.json({ url: hits.length > 0 ? hits[0].result.url : null });
  } catch {
    res.json({ url: null });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com Deezer+iTunes+Spotify na porta ${PORT}`);
});
