import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Display, Body, BodySmall } from '@/components/common/Typography';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { saveAppRole } from '@/services/storage/doctorStorage';
import { seedDemoData } from '@/services/demo/seedDemoData';
import { useMemoryStore } from '@/store/memoryStore';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RoleSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const { loadMemory } = useMemoryStore();
  const [loading, setLoading] = useState<'patient' | 'doctor' | 'demo' | null>(null);

  const select = async (role: 'patient' | 'doctor') => {
    setLoading(role);
    await saveAppRole(role);
    navigation.navigate(role === 'patient' ? 'Onboarding' : 'DoctorOnboarding');
    setLoading(null);
  };

  const handleLoadDemo = async () => {
    setLoading('demo');
    await seedDemoData();
    await loadMemory();
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Display style={styles.logo}>MindLog</Display>
          <Body color={colors.textSecondary} style={styles.tagline}>
            Who are you today?
          </Body>
        </View>

        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.cardWrap}
            onPress={() => select('patient')}
            activeOpacity={0.85}
            disabled={loading !== null}
            accessibilityRole="button"
            accessibilityLabel="I am a patient"
          >
            <LinearGradient
              colors={['#7F6FE8', '#4A3DB5']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.card}
            >
              {loading === 'patient' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.cardEmoji}>🧘</Text>
                  <Text style={styles.cardTitle}>I am a{'\n'}Patient</Text>
                  <Text style={styles.cardSub}>Daily check-ins & mood tracking</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardWrap}
            onPress={() => select('doctor')}
            activeOpacity={0.85}
            disabled={loading !== null}
            accessibilityRole="button"
            accessibilityLabel="I am a doctor"
          >
            <LinearGradient
              colors={['#3ECFBE', '#1AAC99']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.card}
            >
              {loading === 'doctor' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.cardEmoji}>🩺</Text>
                  <Text style={styles.cardTitle}>I am a{'\n'}Doctor</Text>
                  <Text style={styles.cardSub}>Clinician dashboard & patient reports</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Demo Mode */}
        <View style={styles.demoSection}>
          <View style={styles.demoDivider}>
            <View style={styles.dividerLine} />
            <BodySmall color={colors.textTertiary} style={styles.dividerLabel}>or</BodySmall>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.demoBtn, loading === 'demo' && styles.demoBtnLoading]}
            onPress={handleLoadDemo}
            activeOpacity={0.80}
            disabled={loading !== null}
            accessibilityRole="button"
            accessibilityLabel="Load demo data for presentation"
          >
            {loading === 'demo' ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.demoBtnText}>🎬  Load Demo Data</Text>
            )}
          </TouchableOpacity>
          <BodySmall color={colors.textTertiary} style={styles.demoHint}>
            Seeds a full patient profile, 7 days of check-ins, and a connected doctor account ready to demo.
          </BodySmall>
        </View>

        <Body color={colors.textTertiary} style={styles.privacy}>
          Your data stays on this device.
        </Body>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  hero: { flex: 1, justifyContent: 'center' },
  logo: { color: colors.primary, marginBottom: spacing.sm },
  tagline: { fontSize: 18, lineHeight: 26 },
  cards: { flexDirection: 'row', gap: 12, marginBottom: spacing.base },
  cardWrap: {
    flex: 1,
    borderRadius: 24,
    shadowColor: '#3D2A99',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    borderRadius: 24,
    padding: spacing.base,
    minHeight: 200,
    justifyContent: 'flex-end',
    gap: 6,
  },
  cardEmoji: { fontSize: 44, marginBottom: spacing.sm },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28 },
  cardSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.72)', lineHeight: 17 },
  demoSection: { gap: spacing.sm, marginBottom: spacing.base },
  demoDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { fontSize: 12 },
  demoBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
    minHeight: 52,
  },
  demoBtnLoading: { opacity: 0.6 },
  demoBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  demoHint: {
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.sm,
  },
  privacy: { textAlign: 'center', fontSize: 12 },
});
