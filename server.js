import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import Groq from "groq-sdk";

const app = express();
const PORT = process.env.PORT || 3001;

// --- LOGS DE ARRANQUE ---
const groqKey = process.env.GROQ_API_KEY;

console.log("------------------------------------------------");
console.log("🚀 Iniciando VerseVault Server...");
console.log(
  `🧠 Groq Key: ${
    groqKey && groqKey.length > 10 ? "✅ Detetada" : "❌ Em falta"
  }`
);
console.log("------------------------------------------------");

// --- CONFIGURAÇÃO SPOTIFY ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Inicializa Groq com chave ou fallback para evitar crash no boot
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

// --- FUNÇÃO PREVIEW AUDIO ---
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
  } catch (e) {}

  return null;
}

// --- SHUFFLE ARRAY ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- WIKIPEDIA FACTS ---
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

// --- NORMALIZAÇÃO PARA COMPARAÇÃO ---
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// =========================================================
//                  ENDPOINT AI DJ (GROQ)
// =========================================================
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe } = req.body;
    console.log(`🤖 AI DJ a processar vibe: "${vibe}"`);

    const token = await getSpotifyToken();
    let suggestion = { artist: "Unknown", title: "Unknown" };

    try {
      const completion = await groq.chat.completions.create({
        // MODELO ATUALIZADO E ESTÁVEL
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a music expert DJ. 
            Your goal is to suggest the PERFECT song for the user's vibe.
            
            RULES:
            1. Output ONLY valid JSON: { "artist": "Exact Name", "title": "Exact Title" }
            2. If the user mentions a specific artist, YOU MUST pick a song by that artist.
            
            GENRE RULES (CRITICAL):
            3. "Brazilian Trap": Suggest Matuê, Teto, Wiu, KayBlack, Veigh, Derek, Ryu, The Runner. Do NOT suggest Anitta, Ludmilla or Funk artists.
            4. "Portuguese (PT) Trap/Hip-Hop": Suggest Wet Bed Gang, Dillaz, ProfJam, T-Rex, Piruka, Lon3r Johny. Do NOT suggest Blaya, David Carreira or Pop.
            5. "Funk": Only suggest Funk if explicitly asked.
            6. Ensure artist names are spelled correctly (e.g., "Blaya" not "Blay", "Matuê" not "Matue").
            
            7. If the vibe is vague, pick a popular hit fitting the description.`,
          },
          {
            role: "user",
            content: vibe,
          },
        ],
        temperature: 0.4, // Mais baixo para reduzir alucinações (nomes errados)
      });

      const text = completion.choices[0]?.message?.content || "{}";
      // Limpeza básica para garantir que é JSON puro
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const clean = text.substring(jsonStart, jsonEnd + 1);
        suggestion = JSON.parse(clean);
      } else {
        throw new Error("Resposta não contém JSON válido");
      }

      console.log(
        `🧠 (Groq) Sugeriu: ${suggestion.artist} - ${suggestion.title}`
      );
    } catch (err) {
      console.warn("⚠️ Groq falhou. Usando fallback.");
      if (err.error) console.error("Groq API Error:", err.error);
      else console.error(err);

      // Fallback hardcoded melhorado
      const v = vibe.toLowerCase();
      if (v.includes("sad"))
        suggestion = { artist: "Adele", title: "Someone Like You" };
      else if (v.includes("party"))
        suggestion = { artist: "Dua Lipa", title: "Levitating" };
      else if (v.includes("trap") && v.includes("portug"))
        suggestion = { artist: "Dillaz", title: "Mo Boy" };
      else if (v.includes("trap") || v.includes("matue"))
        suggestion = { artist: "Matuê", title: "Kenny G" };
      else
        suggestion = {
          artist: "Rick Astley",
          title: "Never Gonna Give You Up",
        };
    }

    // --- PESQUISA ROBUSTA NO SPOTIFY ---

    // 1. Tentativa Específica (Strict)
    let searchQ = `track:${suggestion.title} artist:${suggestion.artist}`;

    let spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: searchQ,
        type: "track",
        limit: 10,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    let items = spotifyRes.data.tracks.items;

    // 2. Tentativa Genérica (Loose) - Se a estrita falhar
    if (items.length === 0) {
      console.log("⚠️ Busca estrita falhou. Tentando busca genérica...");
      searchQ = `${suggestion.title} ${suggestion.artist}`;

      spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
        params: {
          q: searchQ,
          type: "track",
          limit: 10,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      items = spotifyRes.data.tracks.items;
    }

    // 3. Filtragem Inteligente
    let track = items.find(
      (t) =>
        normalize(t.name).includes(normalize(suggestion.title)) &&
        normalize(t.artists[0].name).includes(normalize(suggestion.artist))
    );

    // Se a busca genérica der resultados mas o filtro falhar (ex: grafia diferente), aceita o primeiro
    if (!track && items.length > 0) {
      track = items[0];
    }

    if (!track) {
      return res
        .status(404)
        .json({ error: "Música não encontrada no Spotify" });
    }

    // preview
    let previewUrl = track.preview_url;
    if (!previewUrl) {
      previewUrl = await fetchPreview(track.name, track.artists[0].name);
    }

    res.json({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      url: previewUrl,
      cover: track.album.images[0]?.url,
      album: track.album.name,
    });
  } catch (error) {
    console.error("❌ Erro Geral no AI DJ:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================================================
//                  ENDPOINTS DE JOGO (IGUAIS)
// =========================================================

app.get("/api/game/daily", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const daySeed = Math.floor(Date.now() / 86400000);
    const offset = (daySeed * 97) % 500;
    let artist = null;

    try {
      const r = await axios.get("https://api.spotify.com/v1/search", {
        params: {
          q: "genre:pop OR genre:rock",
          type: "artist",
          limit: 10,
          offset,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      artist = r.data.artists.items[0];
    } catch (e) {}

    if (!artist) {
      const r = await axios.get("https://api.spotify.com/v1/search", {
        params: { q: "a", type: "artist", limit: 1, offset: 0 },
        headers: { Authorization: `Bearer ${token}` },
      });
      artist = r.data.artists.items[0];
    }

    const topTracksRes = await axios.get(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const topTrack = topTracksRes.data.tracks[0]?.name || "Unknown Hit";
    const fact = await getWikiFact(artist.name);

    res.json({
      dayId: daySeed,
      name: artist.name,
      image: artist.images[0]?.url,
      hints: [
        `Genre: ${artist.genres.slice(0, 2).join(", ")}`,
        `Popularity: ${artist.popularity}`,
        `Hit: "${topTrack}"`,
        `Fact: ${fact}`,
      ],
    });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    const token = await getSpotifyToken();
    let searchTerm = query || "year:2024";
    if (mode === "ARTIST") searchTerm = `artist:${query}`;
    else if (mode === "GENRE") searchTerm = `genre:${query}`;

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
      let preview =
        t.preview_url || (await fetchPreview(t.name, t.artists[0].name));
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
    res.json(finalGameTracks);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor a correr na porta ${PORT}`));
