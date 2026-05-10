import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { synthesizeSpeech } from '@/services/tts/openaiTtsService';
import { synthesizeSpeechElevenLabs, ELEVENLABS_VOICES } from '@/services/tts/elevenlabsTtsService';
import { useMemoryStore } from '@/store/memoryStore';

function audioOp<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('audio op timeout')), 2500)),
  ]);
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';

export type MiloState = 'idle' | 'speaking' | 'listening' | 'happy';

// Split text into 5-8 word subtitle chunks.
// No lookbehind regex — Hermes on older Expo SDKs doesn't support them.
function chunkText(text: string): string[] {
  // Match each sentence as "stuff ending with punctuation" or trailing unpunctuated text
  const sentences = text.match(/[^.!?]*[.!?]+|[^.!?]+$/g)
    ?.map(s => s.trim()).filter(Boolean) ?? [text.trim()];

  const chunks: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= 8) {
      chunks.push(sentence);
      continue;
    }
    // Long sentence — split at commas or conjunctions (no lookbehind needed)
    const parts = sentence
      .split(/,\s*|\s+(?:and|but|so|yet|or|because|though|although|while)\s+/i)
      .map(p => p.trim())
      .filter(Boolean);

    let buffer: string[] = [];
    for (const part of parts) {
      const partWords = part.split(/\s+/).filter(Boolean);
      if (buffer.length + partWords.length > 8 && buffer.length > 0) {
        chunks.push(buffer.join(' '));
        buffer = partWords;
      } else {
        buffer.push(...partWords);
      }
    }
    if (buffer.length > 0) chunks.push(buffer.join(' '));
  }

  return chunks.filter(Boolean);
}

export function useMiloSpeech() {
  const { memory } = useMemoryStore();
  const [miloState, setMiloState]       = useState<MiloState>('idle');
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const soundRef       = useRef<Audio.Sound | null>(null);
  const subtitleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const synthesizeMiloSpeech = useCallback((text: string): Promise<Audio.Sound> => {
    if (ELEVENLABS_API_KEY) {
      let voiceId: string;
      if (memory.preferredVoice === 'custom' && memory.clonedVoiceId) {
        voiceId = memory.clonedVoiceId;
      } else {
        const gender = memory.preferredVoice === 'custom' ? 'female' : (memory.preferredVoice ?? 'female');
        voiceId = ELEVENLABS_VOICES[gender];
      }
      return synthesizeSpeechElevenLabs(text, ELEVENLABS_API_KEY, voiceId);
    }
    return synthesizeSpeech(text, OPENAI_API_KEY);
  }, [memory.preferredVoice, memory.clonedVoiceId]);

  const clearSubtitleTimer = useCallback(() => {
    if (subtitleTimerRef.current) {
      clearInterval(subtitleTimerRef.current);
      subtitleTimerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(async () => {
    clearSubtitleTimer();
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null; // null first so concurrent speak() sees null immediately
      try { await audioOp(s.stopAsync()); } catch {}
      try { await audioOp(s.unloadAsync()); } catch {}
    }
    setMiloState('idle');
    setCurrentSubtitle('');
  }, [clearSubtitleTimer]);

  const speak = useCallback(async (text: string) => {
    console.log('[speak] start, len=', text.length, 'soundRef=', soundRef.current ? 'exists' : 'null');
    // Tear down any existing audio without flickering Milo to idle —
    // we stay in (or transition to) listening while TTS loads.
    clearSubtitleTimer();
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      try { await audioOp(s.stopAsync()); } catch {}
      try { await audioOp(s.unloadAsync()); } catch {}
    }
    // Listening state while TTS is being fetched — keeps Milo active-looking
    setMiloState('listening');
    setCurrentSubtitle('');

    try {
      const chunks = chunkText(text);
      console.log('[speak] calling TTS');
      // Kick off TTS — master timeout guards against any internal hang
      const sound = await Promise.race([
        synthesizeMiloSpeech(text),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TTS master timeout')), 22000)
        ),
      ]);
      soundRef.current = sound;
      await sound.setVolumeAsync(1.0);

      // Get actual audio duration for precise subtitle sync
      const initialStatus = await sound.getStatusAsync();
      const durationMillis =
        (initialStatus.isLoaded && initialStatus.durationMillis != null && initialStatus.durationMillis > 0)
          ? initialStatus.durationMillis
          : Math.max((text.length / 15) * 1000, 2000);

      const chunkDurationMs = durationMillis / Math.max(chunks.length, 1);
      console.log('[useMiloSpeech] duration:', durationMillis, 'ms |', chunks.length, 'chunks |', Math.round(chunkDurationMs), 'ms/chunk');

      // Switch to speaking just before playback starts
      setMiloState('speaking');
      setCurrentSubtitle(chunks[0] ?? '');

      // Drive subtitles from real playback position every 300ms poll
      subtitleTimerRef.current = setInterval(async () => {
        if (!soundRef.current) { clearSubtitleTimer(); return; }
        try {
          const status = await soundRef.current.getStatusAsync();
          if (!status.isLoaded) { clearSubtitleTimer(); return; }
          if (status.isPlaying && durationMillis > 0) {
            const idx = Math.min(
              Math.floor(status.positionMillis / chunkDurationMs),
              chunks.length - 1,
            );
            console.log('[subtitle] pos:', status.positionMillis, '→ idx:', idx, '|', chunks[idx]);
            setCurrentSubtitle(chunks[idx]);
          }
        } catch {
          clearSubtitleTimer();
        }
      }, 300);

      // Finish handler — also clears the timer
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          clearSubtitleTimer();
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          setMiloState('idle');
          setCurrentSubtitle('');
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.error('[useMiloSpeech] speak error:', err);
      clearSubtitleTimer();
      setMiloState('idle');
      setCurrentSubtitle('');
    }
  }, [clearSubtitleTimer]);

  const setListening = useCallback(() => { setMiloState('listening'); }, []);
  const setIdle      = useCallback(() => { setMiloState('idle'); },      []);

  useEffect(() => {
    return () => {
      clearSubtitleTimer();
      if (soundRef.current) {
        const s = soundRef.current;
        soundRef.current = null;
        audioOp(s.stopAsync()).catch(() => {});
        audioOp(s.unloadAsync()).catch(() => {});
      }
    };
  }, [clearSubtitleTimer]);

  return { speak, stopSpeaking, setListening, setIdle, miloState, currentSubtitle };
}
