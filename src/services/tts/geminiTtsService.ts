import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const GEMINI_TTS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

// Gemini TTS returns raw 16-bit mono PCM at 24 kHz — prepend a WAV header so
// expo-av can load it without a native decoder.
function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const pcmStr = atob(pcmBase64);
  const dataLen = pcmStr.length;

  const header = new Uint8Array(44);
  const v = new DataView(header.buffer);

  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) header[off + i] = s.charCodeAt(i);
  };

  w(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);           // PCM
  v.setUint16(22, 1, true);           // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate (16-bit mono)
  v.setUint16(32, 2, true);           // block align
  v.setUint16(34, 16, true);          // bits per sample
  w(36, 'data');
  v.setUint32(40, dataLen, true);

  let out = '';
  for (let i = 0; i < 44; i++) out += String.fromCharCode(header[i]);
  out += pcmStr;
  return btoa(out);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`[Gemini TTS] ${label} timed out`)), ms)
    ),
  ]);
}

type GeminiTtsResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
};

export async function synthesizeSpeechGemini(
  text: string,
  apiKey: string,
  voiceName = 'Aoede',
): Promise<Audio.Sound> {
  const response = await withTimeout(
    fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    }),
    22000,
    'fetch'
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini TTS ${response.status}: ${err}`);
  }

  const json = (await withTimeout(response.json(), 10000, 'json')) as GeminiTtsResponse;
  const pcmBase64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!pcmBase64) throw new Error('Gemini TTS: no audio data in response');

  const wavBase64 = pcmBase64ToWavBase64(pcmBase64);

  const fileUri = `${FileSystem.cacheDirectory}gemini_tts_${Date.now()}.wav`;
  await withTimeout(
    FileSystem.writeAsStringAsync(fileUri, wavBase64, {
      encoding: FileSystem.EncodingType.Base64,
    }),
    10000,
    'FileSystem.write'
  );

  await withTimeout(
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }),
    5000,
    'setAudioMode'
  );

  const { sound } = await withTimeout(
    Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: false, volume: 1.0 }),
    10000,
    'createAsync'
  );

  return sound;
}
