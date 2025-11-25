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
    if (e.response) {
      console.error("Detalhes:", e.response.data);
    }
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
    const term = `${title} ${artist}`;
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=5`
    );

    if (res.data.resultCount > 0) {
      const exactMatch = res.data.results.find((track) => {
        const foundArtist = normalize(track.artistName);
        return (
          foundArtist.includes(targetArtist) ||
          targetArtist.includes(foundArtist)
        );
      });
      if (exactMatch && exactMatch.previewUrl) return exactMatch.previewUrl;
    }

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

// --- WIKIPEDIA HELPER ---
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
//                  ENDPOINT DAILY DROP
// =========================================================
app.get("/api/game/daily", async (req, res) => {
  try {
    const token = await getSpotifyToken();

    // 1. Gerar Seed baseada no Dia (Data Atual)
    const daySeed = Math.floor(Date.now() / 86400000);

    // 2. Escolher um Offset "Aleatório" mas Determinístico
    const offset = (daySeed * 17) % 500;

    // 3. Buscar Artista ao Spotify (Artistas relevantes por popularidade)
    const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: "year:1980-2023 genre:pop OR genre:rock OR genre:hip-hop",
        type: "artist",
        limit: 1,
        offset: offset,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    const artist = spotifyRes.data.artists.items[0];

    if (!artist)
      return res.status(404).json({ error: "Daily artist not found" });

    // 4. Buscar Top Track para Dica
    const topTracksRes = await axios.get(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const topTrack = topTracksRes.data.tracks[0]?.name || "Unknown Hit";

    // 5. Buscar Facto Wiki
    const fact = await getWikiFact(artist.name);

    // 6. Construir Resposta do Jogo
    const gameData = {
      dayId: daySeed,
      name: artist.name,
      image: artist.images[0]?.url,
      hints: [
        `Genre: ${artist.genres.slice(0, 2).join(", ") || "Pop"}`,
        `Popularity Score: ${artist.popularity}/100`,
        `Biggest Hit: "${topTrack}"`,
        `Fact: ${fact}`,
      ],
    };

    res.json(gameData);
  } catch (error) {
    console.error("Daily Error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// =========================================================
//                  ENDPOINT QUIZ PRINCIPAL
// =========================================================
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

    const distractorPool = tracks.map((t) => ({
      id: t.id,
      title: t.name,
      artist: t.artists[0].name,
    }));

    for (const t of tracks) {
      if (finalGameTracks.length >= 5) break;

      const artist = t.artists[0].name;
      const title = t.name;

      let preview = t.preview_url || (await fetchPreview(title, artist));
      if (!preview) continue;

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
        options: options,
      });
    }

    if (finalGameTracks.length < 1)
      return res.status(404).json({ error: "Sem músicas suficientes." });

    console.log(`✅ Jogo pronto: ${finalGameTracks.length} faixas.`);
    res.json(finalGameTracks);
  } catch (error) {
    console.error("Erro Fatal:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));
