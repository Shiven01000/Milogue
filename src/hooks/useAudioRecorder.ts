import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

interface RecordingState {
  isRecording: boolean;
  audioLevel: number;
  audioUri: string | null;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    audioLevel: 0,
    audioUri: null,
    error: null,
  });
  const recordingRef = useRef<Audio.Recording | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);

  useEffect(() => {
    Audio.requestPermissionsAsync();
    return () => {
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Evict any stale recording object from a previous interrupted session
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }

      console.log('[AudioRecorder] Requesting audio mode');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[AudioRecorder] Creating recording');
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      console.log('[AudioRecorder] Recording started');
      setState(s => ({ ...s, isRecording: true, audioUri: null, error: null }));

      // Poll audio metering every 100ms for waveform
      levelIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording && 'metering' in status && typeof status.metering === 'number') {
          // Normalize metering from ~-160..0 dBFS to 0..1
          const normalized = Math.max(0, (status.metering + 60) / 60);
          setState(s => ({ ...s, audioLevel: normalized }));
        }
      }, 100);
    } catch (err) {
      console.error('[AudioRecorder] startRecording failed:', err);
      setState(s => ({ ...s, error: String(err), isRecording: false }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }

    if (!recordingRef.current) return null;

    try {
      console.log('[AudioRecorder] Stopping recording');
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      const durationMs = Date.now() - recordingStartRef.current;
      console.log('[AudioRecorder] Stopped, URI:', uri ?? 'null', 'duration:', durationMs, 'ms');
      // Reject recordings under 500ms — too short for Whisper and likely accidental taps
      if (durationMs < 500) {
        console.log('[AudioRecorder] Recording too short, discarding');
        setState(s => ({ ...s, isRecording: false, audioLevel: 0 }));
        return null;
      }
      setState(s => ({ ...s, isRecording: false, audioLevel: 0, audioUri: uri ?? null }));
      return uri ?? null;
    } catch (err) {
      console.error('[AudioRecorder] stopRecording failed:', err);
      setState(s => ({ ...s, error: String(err), isRecording: false }));
      return null;
    }
  }, []);

  return {
    isRecording: state.isRecording,
    audioLevel: state.audioLevel,
    audioUri: state.audioUri,
    error: state.error,
    startRecording,
    stopRecording,
  };
}
