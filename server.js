import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO ---
const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Já não precisamos da chave da Musixmatch!
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.warn("⚠️ AVISO: Chaves Spotify não configuradas no .env!");
}

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));

// --- TOKEN MANAGER ---
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
    tokenExpiration = now + (res.data.expires_in - 300) * 1000;
    return spotifyToken;
  } catch (e) {
    console.error("❌ Erro Spotify Auth:", e.message);
    throw new Error("Falha na autenticação Spotify");
  }
};

// --- HELPERS ---
const cleanStr = (s) =>
  s
    ? s
        .toLowerCase()
        .replace(/[\(\[].*?[\)\]]/g, "")
        .replace(/feat\..*/g, "")
        .trim()
    : "";

async function fetchPreview(title, artist) {
  try {
    const term = `${cleanStr(title)} ${cleanStr(artist)}`;
    const res1 = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=1`,
      { timeout: 1500 }
    );
    if (res1.data.results?.[0]?.previewUrl)
      return res1.data.results[0].previewUrl;
  } catch {}

  try {
    const q = `artist:"${cleanStr(artist)}" track:"${cleanStr(title)}"`;
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`,
      { timeout: 1500 }
    );
    if (res2.data.data?.[0]?.preview) return res2.data.data[0].preview;
  } catch {}

  return null;
}

// --- NOVA FUNÇÃO DE LETRAS (GRÁTIS - lyrics.ovh) ---
async function fetchLyrics(title, artist) {
  try {
    // Limpeza extra para aumentar a probabilidade de match na API gratuita
    // Removemos "(Remix)", "(Live)", "feat." e pegamos só o artista principal
    const cleanT = title.split("(")[0].split("-")[0].trim();
    const cleanA = artist.split(",")[0].split("&")[0].trim();

    console.log(`📜 A buscar letra: ${cleanA} - ${cleanT}`);

    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
      cleanA
    )}/${encodeURIComponent(cleanT)}`;
    const res = await axios.get(url, { timeout: 4000 }); // Timeout mais longo, APIs grátis podem ser lentas

    if (res.data && res.data.lyrics) {
      const lyrics = res.data.lyrics;

      // Limpeza da letra
      const lines = lyrics
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "" && !l.startsWith("[")); // Remove linhas vazias e headers como [Chorus]

      if (lines.length < 5) return null; // Letra muito curta não serve

      // --- ALGORITMO DE "SNIPPET" ALEATÓRIO ---
      // Em vez de dar o início (que é fácil), pegamos 4 linhas do meio da música
      const maxStart = lines.length - 5;
      const randomStart = Math.floor(Math.random() * maxStart);
      const snippet = lines.slice(randomStart, randomStart + 4).join("\n");

      return snippet;
    }
  } catch (e) {
    // É normal falhar em algumas, ignoramos silenciosamente
    // console.log("Letra não encontrada para: " + title);
  }
  return null;
}

// --- ENDPOINT GERADOR DE JOGO ---
app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    const token = await getSpotifyToken();

    let searchTerm = query;

    if (mode === "ARTIST" || mode === "LYRICS") {
      searchTerm = `artist:${query}`;
    } else if (mode === "GENRE") {
      searchTerm = `genre:${query}`;
    } else if (mode === "RANDOM") {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      searchTerm = chars[Math.floor(Math.random() * chars.length)];
    }

    console.log(`🎮 A Gerar Jogo: [${mode}] "${searchTerm}"`);

    // 1. Buscar 50 músicas
    const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: searchTerm, type: "track", limit: 50 },
      headers: { Authorization: `Bearer ${token}` },
    });

    const rawTracks = spotifyRes.data.tracks.items;
    if (!rawTracks.length)
      return res.status(404).json({ error: "No tracks found" });

    // 2. Deduplicação
    const uniqueTracks = [];
    const seenNames = new Set();
    for (const t of rawTracks) {
      const cleanName = cleanStr(t.name);
      if (
        seenNames.has(cleanName) ||
        cleanName.includes("karaoke") ||
        cleanName.includes("instrumental")
      )
        continue;
      seenNames.add(cleanName);
      uniqueTracks.push(t);
    }

    // 3. Ordenar por Popularidade
    uniqueTracks.sort((a, b) => b.popularity - a.popularity);

    // 4. Selecionar Candidatas (Prioridade aos Hits para ter letras mais prováveis)
    // No modo Lyrics, tentamos usar músicas mais famosas porque é mais provável terem letra na API
    const candidates = uniqueTracks.slice(0, 20); // Top 20 hits

    // 5. Resolver Recursos (Áudio ou Letra)
    const finalGameTracks = [];

    // Processamos sequencialmente para não "matar" a API gratuita com 20 pedidos simultâneos
    for (const t of candidates) {
      if (finalGameTracks.length >= 12) break;

      let gameData = {
        id: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        cover: t.album.images[0]?.url,
        year: t.album.release_date.split("-")[0],
        album: t.album.name,
        popularity: t.popularity,
        gameMode: mode,
      };

      if (mode === "LYRICS") {
        // Modo Letra: Usa a API grátis
        const lyrics = await fetchLyrics(t.name, t.artists[0].name);
        if (lyrics) {
          gameData.lyricsSnippet = lyrics;
          finalGameTracks.push(gameData);
        }
      } else {
        // Modos Normais: Precisa de Preview
        let preview = t.preview_url;
        if (!preview) preview = await fetchPreview(t.name, t.artists[0].name);
        if (preview) {
          gameData.previewUrl = preview;
          finalGameTracks.push(gameData);
        }
      }
    }

    console.log(`✅ Jogo criado com ${finalGameTracks.length} faixas.`);

    // Se não encontrarmos letras suficientes, avisamos o frontend
    if (finalGameTracks.length < 4) {
      return res.status(404).json({ error: "Not enough data found" });
    }

    res.json(finalGameTracks);
  } catch (error) {
    console.error("❌ Erro ao gerar jogo:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- ENDPOINT GENIUS ---
app.get("/api/genius/snippet", async (req, res) => {
  res.json({ url: null });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor VerseVault (Free Edition) a correr na porta ${PORT}`
  );
});
