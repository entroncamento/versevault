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
const REDIRECT_URI = `http://127.0.0.1:${PORT}/api/spotify/callback`;

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
  const targetTitle = normalize(title);

  try {
    // 1. iTunes
    const term = `${title} ${artist}`;
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=10`
    );

    if (res.data.resultCount > 0) {
      const exactMatch = res.data.results.find((track) => {
        const foundArtist = normalize(track.artistName);
        const foundTitle = normalize(track.trackName);
        const artistMatch =
          foundArtist.includes(targetArtist) ||
          targetArtist.includes(foundArtist);
        const titleMatch =
          foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle);
        return artistMatch && titleMatch;
      });
      if (exactMatch && exactMatch.previewUrl) return exactMatch.previewUrl;
    }

    // 2. Deezer
    const q = `artist:"${artist}" track:"${title}"`;
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`
    );
    if (res2.data.data && res2.data.data.length > 0) {
      const exactMatchDeezer = res2.data.data.find((track) => {
        const foundTitle = normalize(track.title);
        return (
          foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle)
        );
      });
      if (exactMatchDeezer && exactMatchDeezer.preview)
        return exactMatchDeezer.preview;
    }
  } catch (e) {}
  return null;
}

// --- AUXILIARES ---
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

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// =========================================================
//           ENDPOINT AI DJ - FIX DE "VIÉS DE HISTÓRICO"
// =========================================================
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe, userContext } = req.body;
    // Gerar seed para variedade
    const randomSeed = Math.floor(Math.random() * 1000000);

    console.log(`🧠 AI a processar: "${vibe}" | Seed: ${randomSeed}`);

    const token = await getSpotifyToken();
    let suggestions = [];

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a strict musicologist and music curator.
            
            INPUT:
            Query: "${vibe}"
            User Taste Profile: "${userContext || ""}"
            
            CRITICAL INSTRUCTION - READ CAREFULLY:
            You must decide if the user is asking for a **SPECIFIC MATCH** or a **MOOD**.
            
            SCENARIO 1: SPECIFIC SONG/ARTIST REFERENCE (e.g., "Songs like Terra Firme", "Benjamim", "Pink Floyd")
            -> **IGNORE THE USER TASTE PROFILE COMPLETELY.**
            -> Do NOT recommend what the user usually listens to.
            -> Focus ONLY on the genre, tempo, instruments, and era of the referenced song/artist.
            -> Example: If user asks for "Benjamim" (Portuguese Indie), DO NOT suggest "Wet Bed Gang" (Trap) just because the user likes Trap. Suggest "Capitão Fausto", "B Fachada", "Zambujo".
            
            SCENARIO 2: VIBE/MOOD (e.g., "Gym", "Studying", "Sad")
            -> In this case, YES, use the User Taste Profile to tailor the suggestions to their style.

            OUTPUT FORMAT:
            - Return a JSON ARRAY of 15 songs: [{ "artist": "Name", "title": "Title" }, ...]
            - Do not repeat artists.
            - Do NOT include the referenced artist in the results (if they asked for Benjamim, show similar artists, not Benjamim).
            - Output ONLY JSON.
            `,
          },
        ],
        temperature: 0.7, // Um pouco mais focado que 0.8 para respeitar o género
      });

      const text = completion.choices[0]?.message?.content || "[]";
      const jsonStart = text.indexOf("[");
      const jsonEnd = text.lastIndexOf("]");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const fullList = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        // Baralhar e apanhar 5 para garantir que não são sempre os mesmos top hits
        suggestions = shuffleArray(fullList).slice(0, 5);
      } else {
        throw new Error("JSON inválido");
      }
    } catch (err) {
      console.warn("⚠️ Groq falhou/JSON malformado. Fallback.");
      // Fallback genérico de Indie/Alt tuga caso falhe
      suggestions = [
        { artist: "Capitão Fausto", title: "Amanhã Tou Melhor" },
        { artist: "B Fachada", title: "Joana Transmontana" },
        { artist: "Linda Martini", title: "Cem Metros Sereia" },
        { artist: "Ornatos Violeta", title: "Ouvi Dizer" },
        { artist: "Ganso", title: "Pisão" },
      ];
    }

    // --- Processamento Spotify (Mantém-se igual) ---
    const tracksPromises = suggestions.map(async (suggestion) => {
      try {
        let searchQ = `track:"${suggestion.title}" artist:"${suggestion.artist}"`;
        let items = [];
        try {
          let spotifyRes = await axios.get(
            "https://api.spotify.com/v1/search",
            {
              params: { q: searchQ, type: "track", limit: 1 },
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          items = spotifyRes.data.tracks.items;
        } catch (e) {}

        if (items.length === 0) {
          searchQ = `${suggestion.title} ${suggestion.artist}`;
          try {
            let spotifyRes = await axios.get(
              "https://api.spotify.com/v1/search",
              {
                params: { q: searchQ, type: "track", limit: 1 },
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            items = spotifyRes.data.tracks.items;
          } catch (e) {}
        }

        let track = items[0];
        if (!track) return null;

        let previewUrl = track.preview_url;
        if (!previewUrl) {
          previewUrl = await fetchPreview(track.name, track.artists[0].name);
        }

        return {
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist: track.artists[0].name,
          url: previewUrl,
          cover: track.album.images[0]?.url,
          album: track.album.name,
        };
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(tracksPromises);
    const foundTracks = results.filter((t) => t !== null);

    if (foundTracks.length === 0)
      return res.status(404).json({ error: "Nada encontrado." });
    res.json(foundTracks);
  } catch (error) {
    console.error("Erro AI DJ:", error.message);
    res.status(500).json({ error: "Erro servidor" });
  }
});

// =========================================================
//              SPOTIFY USER ACTIONS
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
    res.send(
      `<html><body><script>window.opener.postMessage({type:'SPOTIFY_TOKEN',token:'${access_token}'},'*');window.close();</script></body></html>`
    );
  } catch (error) {
    res.send("Erro no login Spotify.");
  }
});

app.post("/api/spotify/top", async (req, res) => {
  const { token } = req.body;
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/artists",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json({ artists: response.data.items.map((a) => a.name) });
  } catch (error) {
    res.status(500).json({ error: "Erro" });
  }
});

app.post("/api/spotify/save", async (req, res) => {
  const { token, track } = req.body;
  try {
    let spotifyId = track.id;
    if (
      !spotifyId ||
      track.url.includes("apple") ||
      track.url.includes("deezer")
    ) {
      const q = `track:${track.title} artist:${track.artist}`;
      const searchRes = await axios.get("https://api.spotify.com/v1/search", {
        params: { q, type: "track", limit: 1 },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (searchRes.data.tracks.items.length > 0)
        spotifyId = searchRes.data.tracks.items[0].id;
    }
    if (!spotifyId) return res.status(404).json({ error: "Not found" });

    await axios.put(
      "https://api.spotify.com/v1/me/tracks",
      { ids: [spotifyId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro" });
  }
});

// --- NOVO: Autocomplete de Pesquisa (Sugestões) ---
app.get("/api/spotify/search-suggestions", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const token = await getSpotifyToken();
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
    console.error("Erro no autocomplete:", error.message);
    res.json([]);
  }
});

app.get("/api/game/daily", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const daySeed = Math.floor(Date.now() / 86400000);
    const offset = (daySeed * 97) % 500;
    let artist = null;
    try {
      let r = await axios.get("https://api.spotify.com/v1/search", {
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
    res.status(500).json({ error: "Erro" });
  }
});

// --- ENDPOINT ATUALIZADO: MODO RANDOM CAÓTICO ---
app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    const token = await getSpotifyToken();

    // 1. SE FOR MODO ARTIST/GENRE (COMPORTAMENTO ANTIGO)
    if (
      mode === "ARTIST" ||
      mode === "GENRE" ||
      (query && query !== "random")
    ) {
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
      return res.json(finalGameTracks);
    }

    // 2. MODO RANDOM CAÓTICO (5 Músicas Totalmente Distintas)
    const genres = [
      "pop",
      "rock",
      "hip-hop",
      "rap",
      "indie",
      "alternative",
      "metal",
      "punk",
      "r-n-b",
      "soul",
      "jazz",
      "classical",
      "reggae",
      "funk",
      "disco",
      "techno",
      "house",
      "electronic",
      "country",
      "latin",
      "k-pop",
      "blues",
      "grunge",
      "ska",
      "reggaeton",
      "samba",
      "goth",
      "trance",
    ];

    // Cria 5 promessas para buscar 5 músicas totalmente diferentes
    const promises = Array(5)
      .fill(null)
      .map(async () => {
        try {
          // Sorteia um género e um ano para ESTA música específica
          const randomGenre = genres[Math.floor(Math.random() * genres.length)];
          const randomYear =
            Math.floor(Math.random() * (2024 - 1970 + 1)) + 1970;
          const searchTerm = `genre:${randomGenre} year:${randomYear}`;

          // Busca 10 músicas desse nicho
          const r = await axios.get("https://api.spotify.com/v1/search", {
            params: { q: searchTerm, type: "track", limit: 10 },
            headers: { Authorization: `Bearer ${token}` },
          });

          const items = r.data.tracks.items;
          if (items.length < 4) return null; // Precisa de min 4 para ter distractors

          shuffleArray(items); // Baralha para não pegar sempre a top 1

          // Tenta encontrar uma com preview
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

          // Os distratores vêm da MESMA pesquisa (mesmo género/ano) para ser justo mas difícil
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

          if (distractors.length < 3) return null;

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

    // Executa as 5 buscas em paralelo
    const results = await Promise.all(promises);
    // Filtra as que falharam (null)
    const finalGameTracks = results.filter((t) => t !== null);

    // Se não conseguiu 5, tenta preencher com mais uma volta (opcional, mas para simplicidade retornamos o que temos)
    if (finalGameTracks.length === 0)
      return res.status(500).json({ error: "Failed to gen" });

    res.json(finalGameTracks);
  } catch (error) {
    console.error("Erro no jogo:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor a correr na porta ${PORT}`));
