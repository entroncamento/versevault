// server/lyrics/index.js
const express = require("express");
const fetch = require("node-fetch");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  generateLRCFromFile,
  generateLRCFromUrl,
} = require("./transcribe_openai"); // ou transcribe_local

const upload = multer({
  dest: path.join(__dirname, "..", "..", "tmp_uploads"),
});
const router = express.Router();

const CACHE_DIR = path.join(__dirname, "..", "..", "lyrics_cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// POST /api/lyrics/generate
// body: { songId } + multipart file field "audio" OR { audioUrl }
router.post("/generate", upload.single("audio"), async (req, res) => {
  try {
    const songId = req.body.songId || `song_${Date.now()}`;
    const cacheJson = path.join(CACHE_DIR, `${songId}.json`);
    const cacheLrc = path.join(CACHE_DIR, `${songId}.lrc`);

    // if cached, return
    if (fs.existsSync(cacheJson)) {
      return res.json({ ok: true, songId, cached: true });
    }

    let lrcText;
    if (req.file) {
      // file uploaded
      const filePath = req.file.path;
      lrcText = await generateLRCFromFile(filePath); // implementa na transcribe_*.js
      fs.unlinkSync(filePath);
    } else if (req.body.audioUrl) {
      lrcText = await generateLRCFromUrl(req.body.audioUrl);
    } else {
      return res.status(400).json({ ok: false, error: "no audio provided" });
    }

    // salva LRC e JSON convertido
    fs.writeFileSync(cacheLrc, lrcText, "utf8");

    // converte LRC para JSON array [{time: secs, text: "..."}]
    const lines = lrcText.split(/\r?\n/).filter(Boolean);
    const json = [];
    const timeRe = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
    for (const ln of lines) {
      const m = ln.match(timeRe);
      if (m) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
        json.push({ time: mins * 60 + secs + ms / 1000, text: m[4].trim() });
      }
    }
    fs.writeFileSync(cacheJson, JSON.stringify(json, null, 2), "utf8");

    res.json({ ok: true, songId, cached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/lyrics/:id
router.get("/:id", (req, res) => {
  const id = req.params.id;
  const cacheJson = path.join(CACHE_DIR, `${id}.json`);
  const cacheLrc = path.join(CACHE_DIR, `${id}.lrc`);
  if (fs.existsSync(cacheJson)) {
    return res.json(JSON.parse(fs.readFileSync(cacheJson, "utf8")));
  }
  if (fs.existsSync(cacheLrc)) {
    // fallback: parse LRC live
    const lrcText = fs.readFileSync(cacheLrc, "utf8");
    // (poderias reutilizar a lógica acima; simplifico aqui)
    return res.type("text").send(lrcText);
  }
  res.status(404).json({ error: "not found" });
});

module.exports = router;
