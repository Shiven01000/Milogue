import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[TTS] ${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function synthesizeSpeech(text: string, apiKey: string): Promise<Audio.Sound> {
  console.log('[TTS] fetch start');
  const response = await withTimeout(
    fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'tts-1', input: text, voice: 'fable', response_format: 'mp3' }),
    }),
    20000,
    'fetch'
  );
  console.log('[TTS] fetch done, status=', response.status);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI TTS ${response.status}: ${err}`);
  }

  console.log('[TTS] reading blob');
  const blob = await withTimeout(response.blob(), 15000, 'blob');
  console.log('[TTS] blob done, size=', blob.size);

  const base64 = await withTimeout(
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    }),
    10000,
    'FileReader'
  );
  console.log('[TTS] base64 done');

  const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
  await withTimeout(
    FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 }),
    10000,
    'FileSystem.write'
  );
  console.log('[TTS] file written');

  await withTimeout(
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }),
    5000,
    'setAudioMode'
  );
  console.log('[TTS] audio mode set');

  const { sound } = await withTimeout(
    Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: false, volume: 1.0 }),
    10000,
    'createAsync'
  );
  console.log('[TTS] sound created');

  return sound;
}
