export function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const parsed = [];

  const timeRegex = /\[(\d{2}):(\d{2}\.\d{2})]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (!match) continue;

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const time = minutes * 60 + seconds;

    const text = line.replace(timeRegex, "").trim();

    parsed.push({ time, text });
  }

  return parsed;
}
