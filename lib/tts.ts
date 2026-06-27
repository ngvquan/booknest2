const GOOGLE_AI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const CHUNK_SIZE = 3000;

export const VOICES = [
  { id: "Aoede", label: "Aoede", desc: "Nữ · nhẹ nhàng" },
  { id: "Kore", label: "Kore", desc: "Nữ · trầm ấm" },
  { id: "Charon", label: "Charon", desc: "Nam · trầm" },
  { id: "Fenrir", label: "Fenrir", desc: "Nam · mạnh mẽ" },
  { id: "Puck", label: "Puck", desc: "Nam · vui tươi" },
];

function buildWavBase64(pcmBase64: string): string {
  const binary = atob(pcmBase64);
  const pcmLen = binary.length;
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + pcmLen);
  const view = new DataView(buffer);
  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + pcmLen, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  write(36, "data");
  view.setUint32(40, pcmLen, true);

  const uint8 = new Uint8Array(buffer);
  for (let i = 0; i < pcmLen; i++) uint8[44 + i] = binary.charCodeAt(i);

  let out = "";
  for (let i = 0; i < uint8.length; i += 8192) {
    out += String.fromCharCode(...uint8.subarray(i, i + 8192));
  }
  return btoa(out);
}

export async function callGeminiTTS(text: string, voice: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini TTS lỗi ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const pcm = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!pcm) throw new Error("Không nhận được audio từ Gemini.");
  return buildWavBase64(pcm);
}

export function splitChunks(text: string): string[] {
  const chunks: string[] = [];
  let cur = "";

  for (const sentence of text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text]) {
    if (cur.length + sentence.length > CHUNK_SIZE && cur) {
      chunks.push(cur.trim());
      cur = sentence;
    } else {
      cur += sentence;
    }
  }

  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export function hasTtsApiKey() {
  return !!GOOGLE_AI_API_KEY;
}
