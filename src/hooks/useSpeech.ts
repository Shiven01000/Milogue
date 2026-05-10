import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { synthesizeSpeech } from '@/services/tts/openaiTtsService';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

export function useSpeech() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopSpeaking = useCallback(async () => {
    const current = soundRef.current;
    if (!current) return;
    soundRef.current = null;
    await current.stopAsync().catch(() => {});
    await current.unloadAsync().catch(() => {});
  }, []);

  const speak = useCallback(async (text: string) => {
    // Stop anything currently playing
    const existing = soundRef.current;
    if (existing) {
      soundRef.current = null;
      await existing.stopAsync().catch(() => {});
      await existing.unloadAsync().catch(() => {});
    }

    if (!text.trim()) return;

    try {
      console.log('[TTS] Synthesizing via OpenAI, chars:', text.length);
      const sound = await synthesizeSpeech(text, OPENAI_API_KEY);
      soundRef.current = sound;
      await sound.setVolumeAsync(1.0);
      await sound.playAsync();
      console.log('[TTS] Playback started');

      // Clean up after playback finishes
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
        }
      });
    } catch (err) {
      console.error('[TTS] synthesizeSpeech failed:', err);
    }
  }, []);

  return { speak, stopSpeaking };
}
