const WHISPER_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function transcribeAudio(
  audioUri: string,
  apiKey: string
): Promise<string> {
  console.log('[Whisper] Starting transcription for URI:', audioUri);
  console.log('[Whisper] API key present:', apiKey.length > 0);

  if (!apiKey) {
    throw new Error('Whisper: EXPO_PUBLIC_OPENAI_API_KEY is empty. Restart Expo with --clear after setting .env');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  formData.append('model', 'whisper-1');

  console.log('[Whisper] Sending request to OpenAI...');
  const response = await withTimeout(
    fetch(WHISPER_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    }),
    20000
  );

  console.log('[Whisper] Response status:', response.status);
  if (!response.ok) {
    const err = await response.text();
    console.error('[Whisper] API error body:', err);
    throw new Error(`Whisper ${response.status}: ${err}`);
  }

  const data = await withTimeout(response.json() as Promise<{ text: string }>, 8000);
  console.log('[Whisper] Transcription:', JSON.stringify(data.text));
  return data.text.trim();
}
