import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import { synthesizeSpeechElevenLabs, ELEVENLABS_VOICES, VoiceGender } from '@/services/tts/elevenlabsTtsService';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';
const SAMPLE_TEXT = "Hi, I'm Milo! I'm here to support you through your daily check-ins. How are you feeling today?";

const VOICES: Array<{ gender: VoiceGender; emoji: string; label: string; description: string }> = [
  { gender: 'female', emoji: '👩', label: 'Charlotte', description: 'Warm, calm female voice' },
  { gender: 'male',   emoji: '👨', label: 'James',     description: 'Clear, grounded male voice' },
];

interface Props {
  value: VoiceGender | 'custom' | undefined;
  onChange: (v: VoiceGender | 'custom') => void;
  clonedVoiceName?: string;
  onClonePress?: () => void;
}

export function VoicePicker({ value, onChange, clonedVoiceName, onClonePress }: Props) {
  const [samplingGender, setSamplingGender] = useState<VoiceGender | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const handleSample = useCallback(async (gender: VoiceGender) => {
    // Stop any playing sample
    const prev = soundRef.current;
    if (prev) { soundRef.current = null; await prev.stopAsync().catch(() => {}); await prev.unloadAsync().catch(() => {}); }

    if (!ELEVENLABS_API_KEY) return;
    setSamplingGender(gender);
    try {
      const sound = await synthesizeSpeechElevenLabs(SAMPLE_TEXT, ELEVENLABS_API_KEY, ELEVENLABS_VOICES[gender]);
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
          setSamplingGender(null);
        }
      });
      await sound.playAsync();
    } catch {
      setSamplingGender(null);
    }
  }, []);

  return (
    <View style={styles.column}>
      <View style={styles.row}>
        {VOICES.map(v => {
          const selected = value === v.gender;
          const loading = samplingGender === v.gender;
          return (
            <TouchableOpacity
              key={v.gender}
              onPress={() => onChange(v.gender)}
              style={[styles.card, selected && styles.cardActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${v.label} voice`}
            >
              <Text style={styles.emoji}>{v.emoji}</Text>
              <Text style={[styles.label, selected && styles.labelActive]}>{v.label}</Text>
              <Text style={styles.description}>{v.description}</Text>
              <TouchableOpacity
                onPress={() => handleSample(v.gender)}
                disabled={loading}
                style={[styles.sampleBtn, selected && styles.sampleBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={`Play ${v.label} voice sample`}
              >
                {loading
                  ? <ActivityIndicator size="small" color={selected ? '#fff' : colors.primary} />
                  : <Text style={[styles.sampleText, selected && styles.sampleTextActive]}>▶ Sample</Text>
                }
              </TouchableOpacity>
              {selected && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom cloned voice card — shown when a cloned voice exists */}
      {clonedVoiceName ? (
        <TouchableOpacity
          style={[styles.customCard, value === 'custom' && styles.cardActive]}
          onPress={() => onChange('custom')}
          accessibilityRole="button"
          accessibilityLabel={`Select cloned voice ${clonedVoiceName}`}
        >
          <View style={styles.customCardInner}>
            <Text style={styles.customEmoji}>🎙</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, value === 'custom' && styles.labelActive]}>{clonedVoiceName}</Text>
              <Text style={styles.description}>Your cloned voice</Text>
            </View>
            {value === 'custom' && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Clone CTA */}
      {onClonePress && (
        <TouchableOpacity style={styles.cloneBtn} onPress={onClonePress} accessibilityRole="button">
          <Text style={styles.cloneBtnText}>
            {clonedVoiceName ? '↺ Re-clone a Voice' : '+ Clone a Loved One\'s Voice'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
    position: 'relative',
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  emoji: { fontSize: 32 },
  label: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  labelActive: { color: colors.primary },
  description: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', lineHeight: 15 },
  sampleBtn: {
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  sampleBtnActive: { backgroundColor: colors.primary },
  sampleText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  sampleTextActive: { color: '#fff' },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 11, color: '#fff', fontWeight: '900' },
  customCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.base,
    position: 'relative',
  },
  customCardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customEmoji: { fontSize: 28 },
  cloneBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    backgroundColor: colors.primaryFaint,
  },
  cloneBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
