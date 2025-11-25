// server/lyrics/transcribe_local.js (exemplo)
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

async function convertToWav(srcPath, outPath) {
  return new Promise((res, rej) => {
    ffmpeg(srcPath)
      .outputOptions("-ar 16000", "-ac 1")
      .save(outPath)
      .on("end", res)
      .on("error", rej);
  });
}

async function generateLRCFromFile(filePath) {
  const wavPath = filePath + ".wav";
  await convertToWav(filePath, wavPath);
  // Assumes you have a local whisper binary that outputs JSON with timestamps
  const whisperBin = process.env.WHISPER_BIN || "/usr/local/bin/whisper_cpp"; // adapt
  const outJson = `${wavPath}.json`;
  await new Promise((res, rej) =>
    execFile(
      whisperBin,
      ["-m", "models/ggml-small.bin", "-f", wavPath, "-otxt", "-os", outJson],
      (err) => (err ? rej(err) : res())
    )
  );
  // ler outJson e converter para LRC — depende do formato do teu whisper local
  const transcript = fs.readFileSync(outJson, "utf8");
  // aqui convém parsear com timestamps reais...
  return `[00:00.00] ${transcript}`;
}
module.exports = {
  generateLRCFromFile,
  generateLRCFromUrl: async (u) => {
    throw new Error("not implemented");
  },
};
