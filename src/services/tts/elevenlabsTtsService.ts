import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export const ELEVENLABS_VOICES = {
  male:   'E01VVAfDdpbHObuCs5NH',
  female: '6fZce9LFNG3iEITDfqZZ',
} as const;

export type VoiceGender = keyof typeof ELEVENLABS_VOICES;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[ElevenLabs TTS] ${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function cloneVoice(
  name: string,
  audioUri: string,
  apiKey: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', 'Cloned via MindLog');
  // React Native FormData accepts { uri, name, type } for files
  formData.append('files', { uri: audioUri, name: 'voice_sample.m4a', type: 'audio/mp4' } as unknown as Blob);

  const response = await withTimeout(
    fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    }),
    60000,
    'cloneVoice fetch'
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs voice clone ${response.status}: ${err}`);
  }

  const data = await response.json() as { voice_id: string };
  return data.voice_id;
}

export async function synthesizeSpeechElevenLabs(
  text: string,
  apiKey: string,
  voiceId = '6fZce9LFNG3iEITDfqZZ',
): Promise<Audio.Sound> {
  const response = await withTimeout(
    fetch(`${BASE_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    }),
    22000,
    'fetch'
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs TTS ${response.status}: ${err}`);
  }

  const blob = await withTimeout(response.blob(), 15000, 'blob');

  const base64 = await withTimeout(
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    }),
    10000,
    'FileReader'
  );

  const fileUri = `${FileSystem.cacheDirectory}el_tts_${Date.now()}.mp3`;
  await withTimeout(
    FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 }),
    10000,
    'FileSystem.write'
  );

  await withTimeout(
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false }),
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
