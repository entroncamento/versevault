import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import fs from "fs";
import multer from "multer";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO ---
const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

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

// --- HELPERS DE LIMPEZA ---
const cleanStr = (s) =>
  s
    ? s
        .toLowerCase()
        .replace(/[\(\[].*?[\)\]]/g, "")
        .replace(/feat\..*/g, "")
        .replace(/- remastered.*/g, "")
        .trim()
    : "";

// Limpa HTML e Caracteres Estranhos
const cleanHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "") // Remove tags HTML
    .replace(/\[.*?\]/g, "") // Remove [Verse], etc.
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/ /g, " ")
    .replace(/\\"/g, '"')
    .trim();
};

// --- LÓGICA INTELIGENTE (Smart Sync) ---
function processLyricsForGame(fullLyrics) {
  if (!fullLyrics) return null;

  // 1. Limpeza básica inicial
  let text = fullLyrics
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/"/g, '"')
    .replace(/'/g, "'");

  // 2. Tenta encontrar o REFRÃO (Chorus)
  const chorusRegex = /\[(Chorus|Hook|Refrain|Refrão).*?\]/i;
  const match = text.match(chorusRegex);

  let snippetLines = [];

  if (match) {
    const startIndex = match.index + match[0].length;
    const chorusText = text.substring(startIndex);
    const cleanChorus = cleanHtml(chorusText);
    const lines = cleanChorus
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && !l.startsWith("["));
    snippetLines = lines.slice(0, 4);
  }

  // Fallback: Se não encontrou refrão
  if (snippetLines.length < 4) {
    const cleanText = cleanHtml(text);
    const lines = cleanText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && !l.startsWith("["));
    if (lines.length < 5) return null;

    const maxStart = Math.max(0, lines.length - 6);
    const startIdx = Math.floor(Math.random() * maxStart);
    snippetLines = lines.slice(startIdx, startIdx + 4);
  }

  // 3. Escolher a palavra a esconder
  const targetLineIndex = 3;
  const targetLine = snippetLines[targetLineIndex];
  if (!targetLine) return null;

  const words = targetLine.split(" ");
  const candidates = words.filter(
    (w) => w.replace(/[^a-zA-Z]/g, "").length > 3
  );

  if (candidates.length === 0) return null;

  const missingWordRaw =
    candidates[Math.floor(Math.random() * candidates.length)];
  const missingWordClean = missingWordRaw.replace(/[^a-zA-Z0-9À-ÿ]/g, "");

  const maskedLine = targetLine.replace(missingWordRaw, "_______");
  snippetLines[targetLineIndex] = maskedLine;

  return {
    snippet: snippetLines.join("\n"),
    missingWord: missingWordClean,
  };
}

// --- BUSCAR LETRAS ---
async function fetchLyricsData(title, artist) {
  const cleanA = cleanStr(artist);

  if (GENIUS_TOKEN) {
    try {
      const searchRes = await axios.get(
        `https://api.genius.com/search?q=${encodeURIComponent(
          artist + " " + title
        )}`,
        {
          headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
          timeout: 4000,
        }
      );
      const hit =
        searchRes.data.response.hits.find(
          (h) =>
            h.type === "song" &&
            h.result.primary_artist.name
              .toLowerCase()
              .includes(cleanA.split(" ")[0])
        ) || searchRes.data.response.hits[0];

      if (hit) {
        const page = await axios.get(hit.result.url);
        const parts = page.data.match(
          /<div data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g
        );
        if (parts) return parts.map((p) => p).join("\n");
      }
    } catch (e) {}
  }
  // Fallback OVH
  try {
    const res = await axios.get(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(
        artist
      )}/${encodeURIComponent(cleanStr(title))}`,
      { timeout: 3000 }
    );
    return res.data.lyrics;
  } catch (e) {}

  return null;
}

// --- PREVIEW AUDIO ---
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

    const q = `artist:"${cleanStr(artist)}" track:"${cleanStr(title)}"`;
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`,
      { timeout: 1500 }
    );
    if (res2.data.data?.[0]?.preview) return res2.data.data[0].preview;
  } catch {}
  return null;
}

// --- ENDPOINT ---
app.get("/api/game/generate", async (req, res) => {
  try {
    const { mode, query } = req.query;
    const token = await getSpotifyToken();

    let searchTerm = query;
    if (mode === "ARTIST" || mode === "LYRICS") searchTerm = `artist:${query}`;
    else if (mode === "GENRE") searchTerm = `genre:${query}`;
    else if (mode === "RANDOM") searchTerm = "year:2024";

    console.log(`🎮 A gerar jogo: [${mode}] "${searchTerm}"`);

    const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: searchTerm, type: "track", limit: 40 },
      headers: { Authorization: `Bearer ${token}` },
    });

    let tracks = spotifyRes.data.tracks.items;
    if (!tracks.length)
      return res.status(404).json({ error: "No tracks found" });

    tracks.sort((a, b) => b.popularity - a.popularity);
    const candidates = tracks.slice(0, 15);

    const finalGameTracks = [];
    const promises = candidates.map(async (t) => {
      if (finalGameTracks.length >= 10) return;

      const artist = t.artists[0].name;
      const title = t.name;

      if (mode === "LYRICS") {
        const rawLyrics = await fetchLyricsData(title, artist);
        const gameData = processLyricsForGame(rawLyrics);
        let preview = t.preview_url || (await fetchPreview(title, artist));

        if (gameData && preview) {
          finalGameTracks.push({
            id: t.id,
            title: t.name,
            artist: t.artists.map((a) => a.name).join(", "),
            cover: t.album.images[0]?.url,
            gameMode: "LYRICS",
            lyricsSnippet: gameData.snippet,
            missingWord: gameData.missingWord,
            previewUrl: preview,
          });
        }
      } else {
        let preview = t.preview_url || (await fetchPreview(title, artist));
        if (preview) {
          finalGameTracks.push({
            id: t.id,
            title: t.name,
            artist: t.artists.map((a) => a.name).join(", "),
            cover: t.album.images[0]?.url,
            gameMode: mode,
            previewUrl: preview,
          });
        }
      }
    });

    await Promise.all(promises);
    console.log(`✅ Jogo pronto com ${finalGameTracks.length} faixas.`);
    res.json(finalGameTracks);
  } catch (error) {
    console.error("Erro:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Servidor Final VerseVault na porta ${PORT}`)
);
