// server/lyrics/transcribe_openai.js
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAITranscription(filePath) {
  // Faz upload do ficheiro para o endpoint /v1/audio/transcriptions
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model", "whisper-1"); // ou modelo que estiveres a usar
  // podes adicionar "response_format" custom se quiseres JSON de palavras
  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });
  if (!resp.ok) throw new Error(`openai transcription error ${resp.status}`);
  const data = await resp.json(); // normalmente dá texto transcrito
  return data.text;
}

function textToLRC(transcript, segmentDuration = 4) {
  // simples: parte o transcript em blocos x palavras e gere timestamps aproximados
  // idealmente pedes ao OpenAI 'timestamps' mas este exemplo gera LRC simples
  const words = transcript.split(/\s+/);
  const chunkSize = 7;
  const res = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    const time = Math.floor(i / chunkSize) * segmentDuration;
    const mm = String(Math.floor(time / 60)).padStart(2, "0");
    const ss = String(Math.floor(time % 60)).padStart(2, "0");
    res.push(`[${mm}:${ss}.00]${chunk}`);
  }
  return res.join("\n");
}

async function generateLRCFromFile(filePath) {
  const transcript = await callOpenAITranscription(filePath);
  const lrc = textToLRC(transcript);
  return lrc;
}

async function generateLRCFromUrl(url) {
  // baixa o ficheiro primeiro
  const tmp = path.join(
    __dirname,
    "..",
    "..",
    "tmp_download_" + Date.now() + ".mp3"
  );
  const r = await fetch(url);
  const dest = fs.createWriteStream(tmp);
  await new Promise((resolve, reject) => {
    r.body.pipe(dest);
    r.body.on("error", reject);
    dest.on("finish", resolve);
  });
  const lrc = await generateLRCFromFile(tmp);
  fs.unlinkSync(tmp);
  return lrc;
}

module.exports = { generateLRCFromFile, generateLRCFromUrl };
