import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import multer from "multer";
import OpenAI from "openai";
import { Client as GeniusClient } from "genius-lyrics"; // Nova biblioteca

const genius = new GeniusClient(); // Não precisa de chave para o básico

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- CONFIGURAÇÃO ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

app.use(cors({ origin: "*" })); // Temporariamente "*" para facilitar testes, depois restringe

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
      "https://accounts.spotify.com/api/token", // URL Corrigida
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

// --- PREVIEW AUDIO (iTunes Fallback com Validação Rigorosa) ---
async function fetchPreview(title, artist) {
  // Helper para normalizar texto (tira acentos, caracteres especiais e mete minúsculas)
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

  // Palavras-chave a evitar se não estiverem na busca original
  const badKeywords = [
    "cover",
    "karaoke",
    "tribute",
    "instrumental",
    "ringtone",
    "type beat",
    "remix",
  ];

  try {
    // 1. Tenta iTunes (Melhor qualidade e gratuito)
    const term = `${title} ${artist}`;
    // Pedimos 10 resultados para ter uma boa margem de filtragem
    const res = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=10`
    );

    if (res.data.resultCount > 0) {
      // Filtra e encontra a melhor correspondência
      const exactMatch = res.data.results.find((track) => {
        const foundArtist = normalize(track.artistName);
        const foundTitle = normalize(track.trackName);

        // Verificação 1: O artista deve conter o artista alvo OU o inverso
        const artistMatch =
          foundArtist.includes(targetArtist) ||
          targetArtist.includes(foundArtist);

        // Verificação 2: O título deve ser similar (Check Duplo)
        const titleMatch =
          foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle);

        // Verificação 3: Evitar Covers/Karaoke se não pedido
        // Se o título original NÃO tem "cover", rejeita resultados que tenham "cover"
        const isBad =
          !targetTitle.includes("cover") &&
          badKeywords.some(
            (bad) => foundTitle.includes(bad) || foundArtist.includes(bad)
          );

        // Só aceita se tudo bater certo
        return artistMatch && titleMatch && !isBad;
      });

      if (exactMatch && exactMatch.previewUrl) {
        return exactMatch.previewUrl;
      }
    }

    // 2. Tenta Deezer como último recurso
    const q = `artist:"${artist}" track:"${title}"`;
    const res2 = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=3`
    );

    if (res2.data.data && res2.data.data.length > 0) {
      // Mesma lógica de validação para Deezer
      const exactMatchDeezer = res2.data.data.find((track) => {
        const foundArtist = normalize(track.artist.name);
        const foundTitle = normalize(track.title);

        const artistMatch =
          foundArtist.includes(targetArtist) ||
          targetArtist.includes(foundArtist);
        const titleMatch =
          foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle);
        const isBad =
          !targetTitle.includes("cover") &&
          badKeywords.some((bad) => foundTitle.includes(bad));

        return artistMatch && titleMatch && !isBad && track.preview;
      });

      if (exactMatchDeezer) return exactMatchDeezer.preview;
    }
  } catch (e) {
    console.log(`⚠️ Audio não encontrado para: ${title} - ${artist}`);
  }
  return null;
}

// --- LETRAS (Genius Lib + OVH) ---
async function fetchLyricsData(title, artist) {
  // 1. Tenta Lyrics.ovh (Simples e rápido)
  try {
    const res = await axios.get(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(
        artist
      )}/${encodeURIComponent(title)}`,
      { timeout: 3000 }
    );
    if (res.data.lyrics) return res.data.lyrics;
  } catch (e) {}

  // 2. Tenta Genius-Lyrics Library (Scraper robusto)
  try {
    const searches = await genius.songs.search(`${title} ${artist}`);
    if (searches.length > 0) {
      const lyrics = await searches[0].lyrics();
      return lyrics;
    }
  } catch (e) {
    console.log(`⚠️ Letra não encontrada para: ${title}`);
  }

  return null;
}

// --- PROCESSADOR DE LETRAS (Smart Sync Melhorado) ---
function processLyricsForGame(fullLyrics) {
  if (!fullLyrics) return null;

  // 1. Limpeza Profunda
  let text = fullLyrics
    .replace(/\[.*?\]/g, "") // Remove [Chorus], [Verse 1], etc.
    .replace(/\(.*?\)/g, "") // Remove (feat. X), (Remix)
    .replace(/instrumental|guitar solo|repeat x\d/gi, "") // Remove instruções musicais
    .split("\n")
    .map((line) => line.trim()) // Remove espaços extras
    .filter((l) => l.length > 15 && l.split(" ").length > 3) // Remove linhas muito curtas ou com poucas palavras
    .join("\n");

  const lines = text.split("\n");

  // Exige pelo menos 8 linhas válidas para considerar a música jogável
  if (lines.length < 8) return null;

  // 2. Seleção Inteligente de Excerto
  const maxStart = Math.max(0, lines.length - 8);
  const startIdx =
    Math.floor(Math.random() * (maxStart * 0.6)) +
    Math.floor(lines.length * 0.2);

  // Pega 4 linhas consecutivas
  const snippetLines = lines.slice(startIdx, startIdx + 4);
  if (snippetLines.length < 4) return null;

  // 3. Escolher a palavra a esconder
  const targetLineIndex = 3;
  const targetLine = snippetLines[targetLineIndex];

  // Palavras candidatas (mais de 3 letras)
  const words = targetLine.split(" ").filter((w) => {
    const clean = w.replace(/[^a-zA-ZÀ-ÿ]/g, "");
    return clean.length > 3;
  });

  if (words.length === 0) return null;

  // Escolhe a palavra alvo
  const missingWordRaw = words[Math.floor(Math.random() * words.length)];
  const missingWordClean = missingWordRaw.replace(/[^a-zA-Z0-9À-ÿ]/g, "");

  // --- NOVO: GERAR DISTRATORES DA PRÓPRIA LETRA (Mesma Língua) ---
  // Pega em todas as palavras das 4 linhas do excerto
  const allContextWords = snippetLines
    .join(" ")
    .split(" ")
    .map((w) => w.replace(/[^a-zA-Z0-9À-ÿ]/g, ""));

  // Filtra para ter palavras únicas, grandes e diferentes da resposta
  const distinctWords = [...new Set(allContextWords)].filter(
    (w) => w.length > 3 && w.toLowerCase() !== missingWordClean.toLowerCase()
  );

  // Escolhe 3 palavras aleatórias do contexto
  const distractors = distinctWords.sort(() => 0.5 - Math.random()).slice(0, 3);

  // Se não houver suficientes, paciência (o frontend lida), mas garante pelo menos a resposta
  const wordOptions = [missingWordClean, ...distractors].sort(
    () => 0.5 - Math.random()
  );

  snippetLines[targetLineIndex] = targetLine.replace(missingWordRaw, "_______");

  return {
    snippet: snippetLines.join("\n"),
    missingWord: missingWordClean,
    wordOptions: wordOptions,
  };
}

// --- SHUFFLE ARRAY (Fisher-Yates) ---
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

    let searchTerm = query || "year:2023";
    if (mode === "ARTIST" || mode === "LYRICS") searchTerm = `artist:${query}`;
    else if (mode === "GENRE") searchTerm = `genre:${query}`;

    console.log(`🎮 Gerando jogo: [${mode}] "${searchTerm}"`);

    // Busca 50 faixas para ter um bom "pool" de opções
    const spotifyRes = await axios.get("https://api.spotify.com/v1/search", {
      params: { q: searchTerm, type: "track", limit: 50 },
      headers: { Authorization: `Bearer ${token}` },
    });

    let tracks = spotifyRes.data.tracks.items;

    // Pool de Distratores: Todas as músicas encontradas na pesquisa (garante mesmo género/artista)
    const distractorPool = tracks.map((t) => ({
      id: t.id,
      title: t.name,
      artist: t.artists[0].name,
    }));

    // Embaralha para escolher as 5 perguntas
    tracks = shuffleArray(tracks);

    const finalGameTracks = [];

    // Processa em paralelo, mas com limite
    for (const t of tracks) {
      if (finalGameTracks.length >= 5) break;

      const artist = t.artists[0].name;
      const title = t.name;

      // 1. Garante ÁUDIO
      let preview = t.preview_url || (await fetchPreview(title, artist));
      if (!preview) continue;

      // 2. Gera Opções (Distratores) baseados na pesquisa original
      // Escolhe 3 músicas da lista total que NÃO sejam a música atual
      const distractors = distractorPool
        .filter((d) => d.id !== t.id && d.title !== title) // Evita a própria música
        .sort(() => 0.5 - Math.random()) // Embaralha
        .slice(0, 3); // Pega 3

      // Mistura a correta com as erradas
      const options = [
        { id: t.id, title: title, artist: artist },
        ...distractors,
      ].sort(() => 0.5 - Math.random());

      if (mode === "LYRICS") {
        const rawLyrics = await fetchLyricsData(title, artist);
        const gameData = processLyricsForGame(rawLyrics);

        if (gameData) {
          finalGameTracks.push({
            id: t.id,
            title: title,
            artist: artist,
            cover: t.album.images[0]?.url,
            gameMode: "LYRICS",
            lyricsSnippet: gameData.snippet,
            missingWord: gameData.missingWord,
            wordOptions: gameData.wordOptions, // Opções de palavras (da mesma língua)
            previewUrl: preview,
            options: options, // Opções de música (backup)
          });
        }
      } else {
        finalGameTracks.push({
          id: t.id,
          title: title,
          artist: artist,
          cover: t.album.images[0]?.url,
          gameMode: mode || "RANDOM",
          previewUrl: preview,
          options: options, // Opções da mesma pesquisa (mesmo género/artista)
        });
      }
    }

    if (finalGameTracks.length < 1) {
      return res.status(404).json({
        error:
          "Não foi possível encontrar músicas com áudio/letras suficientes.",
      });
    }

    console.log(`✅ Jogo pronto com ${finalGameTracks.length} faixas.`);
    res.json(finalGameTracks);
  } catch (error) {
    console.error("Erro Fatal:", error.message);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Servidor VerseVault rodando na porta ${PORT}`)
);
