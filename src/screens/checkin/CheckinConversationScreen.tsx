import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MascotScene from '@/components/mascot/MascotScene';
import { SubtitleBar } from '@/components/mascot/SubtitleBar';
import { useMiloSpeech } from '@/components/mascot/useMiloSpeech';
import { Button } from '@/components/common/Button';
import { Caption } from '@/components/common/Typography';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useCheckin } from '@/hooks/useCheckin';
import { useCheckinStore } from '@/store/checkinStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useLiveHeartRate } from '@/hooks/useLiveHeartRate';
import { transcribeAudio } from '@/services/transcription/whisperService';
import { getLatestSnapshot } from '@/services/healthkit/healthService';
import { detectFacialEmotion } from '@/api/openai';
import { DetectedEmotion } from '@/types/checkin';
import { RootStackParamList } from '@/navigation/types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const EMOTION_INTERVAL_MS = 5000;

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMOTION_COLORS: Record<DetectedEmotion, string> = {
  neutral:  '#9E9E9E',
  content:  '#4A7C6B',
  tired:    '#60A5FA',
  sad:      '#9B8EC4',
  stressed: '#FCD34D',
  anxious:  '#FB923C',
};

export function CheckinConversationScreen() {
  const navigation = useNavigation<Nav>();
  const { messages, isAIResponding, sessionId, openingGreeting, sendMessage, completeSession } =
    useCheckin();
  const { resetSession, addEmotionSample, currentDetectedEmotion } = useCheckinStore();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { speak, stopSpeaking, setListening, miloState, currentSubtitle } = useMiloSpeech();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const sessionStartRef = useRef(Date.now());
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const micScale = useRef(new Animated.Value(1)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
  const livePulse = useRef(new Animated.Value(1)).current;
  const lastSpokenId = useRef<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const todaySnapshot = getLatestSnapshot();
  const { hr, sessionAvgHR } = useLiveHeartRate(
    todaySnapshot?.restingHeartRate ?? 72,
    messages,
  );

  // Ambient animations for health widget
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, { toValue: 0.45, duration: 500, useNativeDriver: true }),
        Animated.timing(heartPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(300),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start emotion capture loop once camera is granted
  useEffect(() => {
    if (!permission?.granted) return;

    sessionStartRef.current = Date.now();

    captureIntervalRef.current = setInterval(async () => {
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          base64: true,
          quality: 0.3,
        });
        if (!photo?.base64) return;
        const emotion = await detectFacialEmotion(photo.base64, OPENAI_API_KEY);
        if (emotion) {
          addEmotionSample(emotion, sessionStartRef.current);
        }
      } catch {
        // silently skip failed captures
      }
    }, EMOTION_INTERVAL_MS);

    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, [permission?.granted, addEmotionSample]);

  // Speak new AI messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      last &&
      last.role === 'assistant' &&
      !last.isStreaming &&
      last.content &&
      last.id !== lastSpokenId.current
    ) {
      lastSpokenId.current = last.id;
      speak(last.content);
    }
  }, [messages, speak]);

  // Milo listens while AI is processing
  useEffect(() => {
    if (isAIResponding) setListening();
  }, [isAIResponding, setListening]);

  // Opening greeting
  useEffect(() => {
    const { id, text } = openingGreeting();
    lastSpokenId.current = id;
    speak(text);
    return () => { stopSpeaking(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate mic button
  useEffect(() => {
    Animated.spring(micScale, {
      toValue: isRecording ? 0.93 : 1,
      useNativeDriver: true,
    }).start();
  }, [isRecording, micScale]);

  const handleExit = useCallback(() => {
    stopSpeaking();
    resetSession();
    navigation.goBack();
  }, [stopSpeaking, resetSession, navigation]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      const uri = await stopRecording();
      if (!uri) return;
      setIsTranscribing(true);
      try {
        const text = await transcribeAudio(uri, OPENAI_API_KEY);
        if (text.trim()) await sendMessage(text, uri);
      } catch (err) {
        console.error('[handleMicPress] Error:', err);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await stopSpeaking();
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, sendMessage, stopSpeaking]);

  const handleEndSession = useCallback(async () => {
    stopSpeaking();
    const session = await completeSession({ sessionAvgHR });
    if (session) {
      navigation.replace('CheckinSummary', { sessionId: session.id });
    }
  }, [completeSession, navigation, stopSpeaking, sessionAvgHR]);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <MascotScene state={miloState} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top section: exit + health widget */}
        <View style={styles.topSection} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.exitButton}
            onPress={handleExit}
            accessibilityRole="button"
            accessibilityLabel="Exit check-in"
          >
            <Caption color="rgba(255,255,255,0.85)">✕ Exit</Caption>
          </TouchableOpacity>

          <View style={styles.healthWidget} pointerEvents="none">
            <View style={styles.hwTopRow}>
              <Animated.Text style={[styles.hwHeart, { opacity: heartPulse }]}>♥</Animated.Text>
              <Text style={styles.hwHRValue}>{hr}</Text>
              <Text style={styles.hwHRUnit}> bpm</Text>
              <Text style={styles.hwDivider}>  ·  </Text>
              <Text style={styles.hwStat}>{todaySnapshot?.hrv.morningHRV ?? '—'}ms</Text>
              <Text style={styles.hwDivider}>  ·  </Text>
              <Text style={styles.hwStat}>{todaySnapshot?.sleep.durationHours ?? '—'}h 💤</Text>
            </View>
            <View style={styles.hwBottomRow}>
              <Text style={styles.hwFitbit}>FITBIT</Text>
              <View style={styles.hwLiveBadge}>
                <Animated.View style={[styles.hwLiveDot, { opacity: livePulse }]} />
                <Text style={styles.hwLiveText}>LIVE</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomControls} pointerEvents="box-none">
          <SubtitleBar text={(isAIResponding || isTranscribing) && !currentSubtitle ? 'Thinking...' : currentSubtitle} />

          {!isAIResponding && !isTranscribing && (miloState === 'idle' || miloState === 'speaking' || isRecording) && (
            <Animated.View style={{ transform: [{ scale: micScale }] }}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Tap to send' : 'Tap to speak'}
              >
                <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
                <Caption style={styles.micLabel}>
                  {isRecording ? 'Tap to send' : 'Tap to speak'}
                </Caption>
              </TouchableOpacity>
            </Animated.View>
          )}

          {messages.length >= 6 && !isRecording && !isAIResponding && (
            <Button
              label="End session"
              variant="ghost"
              onPress={handleEndSession}
              style={styles.endButton}
            />
          )}
        </View>
      </SafeAreaView>

      {/* Camera self-view + emotion indicator — top right */}
      {permission?.granted && (
        <View style={styles.cameraContainer} pointerEvents="none">
          <View style={styles.cameraWrapper}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
            />
          </View>
          {currentDetectedEmotion && (
            <View style={styles.emotionPill}>
              <View
                style={[
                  styles.emotionDot,
                  { backgroundColor: EMOTION_COLORS[currentDetectedEmotion] },
                ]}
              />
              <Text style={styles.emotionLabel}>{currentDetectedEmotion}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'flex-start',
    gap: 8,
  },
  exitButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
  },
  // Health widget
  healthWidget: {
    marginHorizontal: spacing.base,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 3,
    maxWidth: '62%',
  },
  hwTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hwHeart: {
    fontSize: 12,
    color: '#FF6B6B',
    marginRight: 3,
  },
  hwHRValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  hwHRUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  hwDivider: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
  },
  hwStat: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
  },
  hwBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  hwFitbit: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.45)',
  },
  hwLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52,199,89,0.18)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hwLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34C759',
  },
  hwLiveText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#34C759',
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.base,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#AFA9EC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  micButtonRecording: {
    backgroundColor: colors.recording,
  },
  micIcon: { fontSize: 28 },
  micLabel: { color: '#FFFFFF', fontSize: 11 },
  endButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    minWidth: 140,
  },
  // Camera self-view
  cameraContainer: {
    position: 'absolute',
    top: 56,
    right: spacing.base,
    alignItems: 'center',
    gap: 5,
  },
  cameraWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  emotionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  emotionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emotionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
});
