import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

app.use(cors({ origin: "*" }));

// --- TOKEN MANAGER SPOTIFY ---
let spotifyToken = null;
let tokenExpiration = 0;

const getSpotifyToken = async () => {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiration) return spotifyToken;

  try {
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
    tokenExpiration = now + (res.data.expires_in - 60) * 1000;
    return spotifyToken;
  } catch (e) {
    console.error("❌ Erro Spotify Auth:", e.message);
    throw new Error("Falha na autenticação Spotify");
  }
};

// --- PREVIEW AUDIO (iTunes/Deezer Fallback) ---
async function fetchPreview(title, artist) {
  const normalize = (str) =>
    str
      ? str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9 ]/g, "")
          .trim()
      : "";

  const targetArtist = normalize(artist);

  try {
    // 1. Tenta iTunes
    const term = `${title} ${artist}`;
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=5`
    );

    if (res.data.resultCount > 0) {
      const exactMatch = res.data.results.find((track) => {
        const foundArtist = normalize(track.artistName);
        // Validação simples de artista
        return (
          foundArtist.includes(targetArtist) ||
          targetArtist.includes(foundArtist)
        );
      });
      if (exactMatch && exactMatch.previewUrl) return exactMatch.previewUrl;
    }

    // 2. Tenta Deezer
    const q = `artist:"${artist}" track:"${title}"`;
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`
    );
    if (res2.data.data?.[0]?.preview) return res2.data.data[0].preview;
  } catch (e) {
    console.log(`⚠️ Audio não encontrado para: ${title}`);
  }
  return null;
}

// --- SHUFFLE ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- ENDPOINT PRINCIPAL ---
app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    const token = await getSpotifyToken();

    let searchTerm = query || "year:2024";
    if (mode === "ARTIST") searchTerm = `artist:${query}`;
    else if (mode === "GENRE") searchTerm = `genre:${query}`;

    console.log(`🎮 Gerando: [${mode}] "${searchTerm}"`);

    const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: searchTerm, type: "track", limit: 50 },
      headers: { Authorization: `Bearer ${token}` },
    });

    let tracks = shuffleArray(spotifyRes.data.tracks.items);
    const finalGameTracks = [];

    // Pool de Distratores (Músicas erradas do mesmo tema)
    const distractorPool = tracks.map((t) => ({
      id: t.id,
      title: t.name,
      artist: t.artists[0].name,
    }));

    for (const t of tracks) {
      if (finalGameTracks.length >= 5) break;

      const artist = t.artists[0].name;
      const title = t.name;

      // Garante que temos áudio
      let preview = t.preview_url || (await fetchPreview(title, artist));
      if (!preview) continue;

      // Gera opções erradas
      const distractors = distractorPool
        .filter((d) => d.id !== t.id && d.title !== title)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [
        { id: t.id, title: title, artist: artist },
        ...distractors,
      ].sort(() => 0.5 - Math.random());

      finalGameTracks.push({
        id: t.id,
        title: title,
        artist: artist,
        cover: t.album.images[0]?.url,
        gameMode: mode || "RANDOM",
        previewUrl: preview,
        options: options, // O servidor já manda as opções baralhadas
      });
    }

    if (finalGameTracks.length < 1)
      return res.status(404).json({ error: "Sem músicas suficientes." });

    console.log(`✅ Jogo pronto: ${finalGameTracks.length} faixas.`);
    res.json(finalGameTracks);
  } catch (error) {
    console.error("Erro Fatal:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));
