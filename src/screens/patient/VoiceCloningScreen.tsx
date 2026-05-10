import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { H2, H3, Body, BodySmall, Label } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useMemoryStore } from '@/store/memoryStore';
import { cloneVoice } from '@/services/tts/elevenlabsTtsService';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';
const MIN_DURATION_MS = 30_000;

export function VoiceCloningScreen() {
  const navigation = useNavigation();
  const { updateMemory } = useMemoryStore();
  const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder();

  const [voiceName, setVoiceName] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordedMs, setRecordedMs] = useState(0);
  const [cloning, setCloning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleStartRecording = async () => {
    setAudioUri(null);
    setRecordedMs(0);
    startTimeRef.current = Date.now();
    await startRecording();
    timerRef.current = setInterval(() => {
      setRecordedMs(Date.now() - startTimeRef.current);
    }, 200);
  };

  const handleStopRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const uri = await stopRecording();
    setAudioUri(uri);
  };

  const handleClone = async () => {
    if (!audioUri) return;
    if (!voiceName.trim()) {
      Alert.alert('Name required', 'Give this voice a name first.');
      return;
    }
    if (recordedMs < MIN_DURATION_MS) {
      Alert.alert(
        'Recording too short',
        `Please record at least 30 seconds for best quality. You recorded ${Math.round(recordedMs / 1000)}s.`,
      );
      return;
    }
    if (!ELEVENLABS_API_KEY) {
      Alert.alert('API key missing', 'No ElevenLabs API key configured.');
      return;
    }
    setCloning(true);
    try {
      const voiceId = await cloneVoice(voiceName.trim(), audioUri, ELEVENLABS_API_KEY);
      await updateMemory({
        clonedVoiceId: voiceId,
        clonedVoiceName: voiceName.trim(),
        preferredVoice: 'custom',
      });
      setDone(true);
    } catch (err) {
      Alert.alert('Cloning failed', String(err));
    } finally {
      setCloning(false);
    }
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <H2 style={styles.doneTitle}>Voice Cloned!</H2>
          <Body color={colors.textSecondary} style={styles.doneSub}>
            Milo will now speak in{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{voiceName}</Text>'s voice.
          </Body>
          <Button label="Back to Profile" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  const hasRecording = !!audioUri;
  const sufficientLength = recordedMs >= MIN_DURATION_MS;
  const canClone = hasRecording && voiceName.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <H2 style={styles.title}>Clone a Voice</H2>
        <Body color={colors.textSecondary} style={styles.sub}>
          Record someone speaking naturally for at least 30 seconds. Milo will speak in that voice.
        </Body>

        {/* Name input */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Voice Name</H3>
          <TextInput
            style={styles.input}
            value={voiceName}
            onChangeText={setVoiceName}
            placeholder="e.g. Mom, Dad, Best Friend…"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />
        </Card>

        {/* Record */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Record Sample</H3>
          <BodySmall color={colors.textTertiary} style={styles.hint}>
            Minimum 30 seconds · Speak naturally · Quiet environment works best
          </BodySmall>

          {/* Waveform bar */}
          {isRecording && (
            <View style={styles.waveRow}>
              {Array.from({ length: 24 }).map((_, i) => {
                const height = 4 + audioLevel * 36 * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.7)));
                return (
                  <View
                    key={i}
                    style={[styles.waveBar, { height, opacity: 0.5 + audioLevel * 0.5 }]}
                  />
                );
              })}
            </View>
          )}

          <View style={styles.timerRow}>
            <Text style={[styles.timer, isRecording && styles.timerActive]}>
              {isRecording ? formatDuration(recordedMs) : hasRecording ? formatDuration(recordedMs) : '0:00'}
            </Text>
            {hasRecording && !isRecording && (
              <View style={[styles.badge, sufficientLength ? styles.badgeGood : styles.badgeWarn]}>
                <Text style={styles.badgeText}>
                  {sufficientLength ? '✓ Good length' : `⚠ Too short (need 30s)`}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            activeOpacity={0.8}
          >
            <View style={[styles.recordDot, isRecording && styles.recordDotStop]} />
            <Text style={[styles.recordLabel, isRecording && styles.recordLabelActive]}>
              {isRecording ? 'Stop Recording' : hasRecording ? 'Re-record' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          {hasRecording && !isRecording && (
            <BodySmall color={colors.textTertiary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              Recording saved. Give it a name above, then tap Clone.
            </BodySmall>
          )}
        </Card>

        {/* Tips */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Tips for Best Results</H3>
          {[
            'Record in a quiet room with minimal background noise',
            'The person should speak naturally at a normal pace',
            'Read a paragraph from a book or have a short conversation',
            'Avoid music, TV, or other voices in the background',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipNum}>{i + 1}</Text>
              <BodySmall color={colors.textSecondary} style={{ flex: 1 }}>{tip}</BodySmall>
            </View>
          ))}
        </Card>

        <Button
          label={cloning ? 'Cloning Voice…' : 'Clone Voice'}
          onPress={handleClone}
          disabled={!canClone || cloning}
          loading={cloning}
          style={styles.cta}
        />
        {!canClone && (
          <BodySmall color={colors.textTertiary} style={{ textAlign: 'center', marginTop: spacing.xs }}>
            {!hasRecording ? 'Record a sample first' : 'Enter a name for this voice'}
          </BodySmall>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: 100, gap: spacing.base },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  title: { marginTop: spacing.xs },
  sub: { lineHeight: 22 },
  section: { gap: spacing.sm },
  sectionTitle: { marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  hint: { lineHeight: 18 },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 44,
    marginVertical: spacing.sm,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timer: { fontSize: 32, fontWeight: '800', color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  timerActive: { color: colors.primary },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeGood: { backgroundColor: '#D1FAE5' },
  badgeWarn: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  recordBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  recordDotStop: {
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  recordLabel: { fontSize: 15, fontWeight: '700', color: colors.primary },
  recordLabelActive: { color: '#EF4444' },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  tipNum: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    width: 18,
  },
  cta: { marginTop: spacing.xs },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  doneEmoji: { fontSize: 64 },
  doneTitle: { textAlign: 'center' },
  doneSub: { textAlign: 'center', lineHeight: 24 },
});
