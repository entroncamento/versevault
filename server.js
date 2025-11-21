import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = 3001;

app.use(cors());

// User-Agent genérico e moderno
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

app.get("/api/itunes", async (req, res) => {
  try {
    const { term, entity, limit } = req.query;
    console.log(`🎵 iTunes: "${term}"`);

    const response = await axios.get("https://itunes.apple.com/search", {
      params: { term, entity: entity || "song", limit: limit || 50 },
      headers: { "User-Agent": UA }, // Apenas User-Agent, sem Origin/Referer
      timeout: 5000,
    });

    res.json(response.data);
  } catch (error) {
    // Silencioso no erro para não sujar logs, mas devolve vazio para ativar Deezer
    res.json({ results: [] });
  }
});

app.get("/api/deezer", async (req, res) => {
  try {
    const { q } = req.query;
    console.log(`🎧 Deezer: "${q}"`);
    const response = await axios.get("https://api.deezer.com/search", {
      params: { q, limit: 50 },
      headers: { "User-Agent": UA },
    });
    res.json(response.data);
  } catch (error) {
    res.json({ data: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy Simples a correr na porta ${PORT}`);
});
