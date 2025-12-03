import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import Groq from "groq-sdk";
import querystring from "querystring";

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const REDIRECT_URI = `http://localhost:${PORT}/api/spotify/callback`;

console.log("------------------------------------------------");
console.log("🚀 Iniciando VerseVault Server (Official Spotify APIs)...");
console.log(`🔑 Groq Key: ${GROQ_API_KEY ? "✅" : "❌"}`);
console.log(`🎵 Spotify ID: ${SPOTIFY_CLIENT_ID ? "✅" : "❌"}`);
console.log("------------------------------------------------");

const groq = new Groq({ apiKey: GROQ_API_KEY });

app.use(cors({ origin: "*" }));
app.use(express.json());

// --- TOKEN MANAGER (Client Credentials) ---
let spotifyToken = null;
let tokenExpiration = 0;

const getSpotifyToken = async () => {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiration) return spotifyToken;

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const res = await axios.post(
      "https://accounts.spotify.com/api/token", // URL OFICIAL DE TOKEN
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
    console.error("❌ Erro Spotify Auth:", e.message);
    throw new Error("Falha na autenticação Spotify");
  }
};

// --- HELPERS ---
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

async function fetchPreview(title, artist) {
  const targetArtist = normalize(artist);
  const targetTitle = normalize(title);
  try {
    // iTunes fallback
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        title + " " + artist
      )}&entity=song&limit=3`
    );
    if (res.data.resultCount > 0) {
      const match = res.data.results.find((track) => {
        const fa = normalize(track.artistName);
        const ft = normalize(track.trackName);
        return (
          (fa.includes(targetArtist) || targetArtist.includes(fa)) &&
          (ft.includes(targetTitle) || targetTitle.includes(ft))
        );
      });
      if (match && match.previewUrl) return match.previewUrl;
    }
    // Deezer fallback
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(
        `artist:"${artist}" track:"${title}"`
      )}&limit=1`
    );
    if (res2.data.data?.[0]?.preview) return res2.data.data[0].preview;
  } catch (e) {}
  return null;
}

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
      return (
        (sentences.find((s) => !s.includes(artistName)) || sentences[0]) + "."
      );
    }
  } catch (e) {}
  return "A legendary artist known worldwide.";
}

// =========================================================
//      ENDPOINT IA DJ
// =========================================================
app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { vibe, userContext } = req.body;
    console.log(`🤖 AI DJ: "${vibe}"`);
    const token = await getSpotifyToken();

    let aiParams = {};
    let searchSeed = vibe;

    if (GROQ_API_KEY) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a music expert API. Return ONLY JSON. Convert user input to Spotify API params.
              Output Format: { "seed_search_query": "string", "target_valence": float, "target_energy": float, "target_danceability": float, "min_popularity": int }`,
            },
            {
              role: "user",
              content: `Input: "${vibe}". Context: "${userContext || ""}"`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        aiParams = JSON.parse(chatCompletion.choices[0].message.content);
        console.log("🧠 Plano:", aiParams);
        if (aiParams.seed_search_query) searchSeed = aiParams.seed_search_query;
      } catch (err) {
        console.error("⚠️ Erro Groq:", err.message);
      }
    }

    // 1. Buscar Seed (URL OFICIAL)
    const seedRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: searchSeed, type: "track,artist", limit: 1 },
      headers: { Authorization: `Bearer ${token}` },
    });

    let seedTracks, seedArtists, seedGenres;
    if (seedRes.data.tracks?.items?.length)
      seedTracks = seedRes.data.tracks.items[0].id;
    else if (seedRes.data.artists?.items?.length)
      seedArtists = seedRes.data.artists.items[0].id;
    else seedGenres = "pop";

    // 2. Recomendações (URL OFICIAL)
    const recParams = {
      limit: 12,
      market: "US",
      ...(aiParams.target_valence && {
        target_valence: aiParams.target_valence,
      }),
      ...(aiParams.target_energy && { target_energy: aiParams.target_energy }),
      ...(aiParams.target_danceability && {
        target_danceability: aiParams.target_danceability,
      }),
      ...(aiParams.min_popularity && {
        min_popularity: aiParams.min_popularity,
      }),
    };
    if (seedTracks) recParams.seed_tracks = seedTracks;
    if (seedArtists) recParams.seed_artists = seedArtists;
    if (seedGenres && !seedTracks && !seedArtists)
      recParams.seed_genres = seedGenres;

    const recRes = await axios.get(
      "https://api.spotify.com/v1/recommendations",
      {
        params: recParams,
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // 3. Previews
    const processedTracks = await Promise.all(
      recRes.data.tracks.map(async (track) => {
        let previewUrl =
          track.preview_url ||
          (await fetchPreview(track.name, track.artists[0].name));
        return {
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist: track.artists[0].name,
          url: previewUrl,
          cover: track.album.images[0]?.url,
          album: track.album.name,
        };
      })
    );

    const validTracks = processedTracks.filter((t) => t.url);
    if (validTracks.length === 0)
      return res.status(404).json({ error: "No audio previews found." });
    res.json(validTracks);
  } catch (error) {
    console.error("Erro AI:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

// =========================================================
//               LOGIN SPOTIFY
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
  // URL OFICIAL
  res.redirect(`https://accounts.spotify.com/authorize?${query}`);
});

app.get("/api/spotify/callback", async (req, res) => {
  const code = req.query.code || null;
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token", // URL OFICIAL
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
    res.send("Erro login: " + error.message);
  }
});

// =========================================================
//               OUTROS ENDPOINTS (URLS REAIS)
// =========================================================
app.post("/api/spotify/top", async (req, res) => {
  const { token } = req.body;
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/artists",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    res.json({ artists: response.data.items.map((a) => a.name) });
  } catch (error) {
    res.status(500).json({ error: "Erro top" });
  }
});

app.post("/api/spotify/save", async (req, res) => {
  const { token, track } = req.body;
  try {
    let spotifyId = track.id;
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

    await axios.put(
      "https://api.spotify.com/v1/me/tracks",
      { ids: [spotifyId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro save" });
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
      { name: `VerseVault: ${name}`, public: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const playlistId = createRes.data.id;
    if (trackUris?.length > 0) {
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
    res.status(500).json({ error: "Erro playlist" });
  }
});

app.get("/api/spotify/search-suggestions", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const token = await getSpotifyToken();
    const response = await axios.get("https://api.spotify.com/v1/search", {
      params: { q, type: "track,artist", limit: 5 },
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(
      response.data.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        image: track.album.images[2]?.url,
        type: "track",
      }))
    );
  } catch (error) {
    res.json([]);
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

    let tracks = shuffleArray(spotifyRes.data.tracks.items || []);
    const finalGameTracks = [];

    for (const t of tracks) {
      if (finalGameTracks.length >= 5) break;
      let preview =
        t.preview_url || (await fetchPreview(t.name, t.artists[0].name));
      if (!preview) continue;

      const distractors = tracks
        .filter((d) => d.id !== t.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((d) => ({ id: d.id, title: d.name, artist: d.artists[0].name }));

      finalGameTracks.push({
        id: t.id,
        title: t.name,
        artist: t.artists[0].name,
        cover: t.album.images[0]?.url,
        previewUrl: preview,
        options: [
          { id: t.id, title: t.name, artist: t.artists[0].name },
          ...distractors,
        ].sort(() => 0.5 - Math.random()),
      });
    }
    res.json(finalGameTracks);
  } catch (error) {
    res.status(500).json({ error: "Erro Game" });
  }
});

app.get("/api/game/daily", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const daySeed = Math.floor(Date.now() / 86400000);
    const offset = (daySeed * 97) % 500;
    let r = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: "genre:pop OR genre:rock",
        type: "artist",
        limit: 1,
        offset,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    const artist = r.data.artists.items[0];
    const topRes = await axios.get(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const fact = await getWikiFact(artist.name);
    res.json({
      dayId: daySeed,
      name: artist.name,
      image: artist.images[0]?.url,
      hints: [
        `Genre: ${artist.genres[0]}`,
        `Hit: "${topRes.data.tracks[0]?.name}"`,
        `Fact: ${fact}`,
      ],
    });
  } catch (error) {
    res.status(500).json({ error: "Erro Daily" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor a correr na porta ${PORT}`));
