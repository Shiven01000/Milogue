import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, SafeAreaView, View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { NextCheckinBanner } from '@/components/dashboard/NextCheckinBanner';
import { HealthSummaryCard } from '@/components/dashboard/HealthSummaryCard';
import { MoodTrendChart } from '@/components/dashboard/MoodTrendChart';
import { StreakBadge } from '@/components/dashboard/StreakBadge';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useHealthData } from '@/hooks/useHealthData';
import { usePatientMemory } from '@/hooks/usePatientMemory';
import { useIncomingCall } from '@/hooks/useIncomingCall';
import { loadAllSessions } from '@/services/storage/checkinStorage';
import { loadDoctorProfile } from '@/services/storage/doctorStorage';
import { CheckinSession } from '@/types/checkin';
import { DoctorProfile } from '@/types/doctor';
import { calculateStreak, todayISO } from '@/utils/dateUtils';
import { RootStackParamList, TabParamList } from '@/navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const FEATURES = [
  { key: 'medications', label: 'Medications',    top: '#FB923C', bot: '#EA580C', shadow: '#9A3412', emoji: '💊', nav: 'Medications'         as const },
  { key: 'history',     label: 'History',        top: '#60A5FA', bot: '#3B82F6', shadow: '#1D4ED8', emoji: '📅', nav: 'History'             as const },
  { key: 'learn',       label: 'Learn',          top: '#A78BFA', bot: '#7C3AED', shadow: '#4C1D95', emoji: '🧠', nav: 'Learn'               as const },
  { key: 'vocab',       label: 'Emotion\nVocab', top: '#F472B6', bot: '#DB2777', shadow: '#831843', emoji: '💬', nav: 'VocabularyFlashcards' as const },
];

function FeatureCard({ item, onPress }: { item: typeof FEATURES[0]; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[styles.fcShadow, { shadowColor: item.shadow }]}>
      <LinearGradient colors={[item.top, item.bot]} start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={styles.fc}>
        <Text style={styles.fcName}>{item.label}</Text>
        <Text style={styles.fcEmoji}>{item.emoji}</Text>
        <View style={styles.fcBtn}>
          <Text style={styles.fcArrow}>›</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { todaySnapshot } = useHealthData();
  const { memory } = usePatientMemory();
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  useIncomingCall(memory.setupComplete ? memory.patientCode : undefined);

  useEffect(() => {
    loadAllSessions().then(setSessions);
    loadDoctorProfile().then(d => {
      if (d.setupComplete) setDoctorProfile(d);
    });
  }, []);

  const hasCheckedInToday = sessions.some(s => s.date === todayISO());
  const streak = calculateStreak(sessions.map(s => s.date));
  const name = memory.patientName;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.eyebrow}>{getGreeting()}</Text>
              <Text style={styles.heroName}>{name ? `Hey, ${name} 👋` : 'Hey there 👋'}</Text>
              <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('PatientProfile')}
              style={styles.profileBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <NextCheckinBanner hasCheckedInToday={hasCheckedInToday} onPress={() => navigation.navigate('CheckinStart')} />

        {doctorProfile && (
          <Card style={styles.doctorCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>🩺</Text>
              <View>
                <Text style={styles.doctorLabel}>My Doctor</Text>
                <Text style={styles.doctorName}>{doctorProfile.doctorName}</Text>
                <Text style={styles.doctorSub}>
                  {doctorProfile.specialty || doctorProfile.clinicName}
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.sectionLabel}>Explore</Text>
        <View style={styles.featureGrid}>
          {FEATURES.map(item => (
            <FeatureCard
              key={item.key}
              item={item}
              onPress={() => navigation.navigate(item.nav)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Mood This Week</Text>
        <MoodTrendChart sessions={sessions} />

        {streak > 0 && <StreakBadge streak={streak} />}

        {memory.setupComplete && memory.patientCode ? (
          <View style={styles.listeningPill}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Listening for check-in calls</Text>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Today's Smartwatch Data</Text>
        <HealthSummaryCard snapshot={todaySnapshot} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: 100 },
  header: { marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  profileIcon: { fontSize: 20 },
  logo: {
    width: 90,
    height: 90,
    marginLeft: -spacing.base,
    marginBottom: spacing.sm,
    opacity: 0.88,
    alignSelf: 'flex-start',
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  heroName: { fontSize: 25, fontWeight: '900', color: colors.textPrimary, lineHeight: 30 },
  date: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, marginTop: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  doctorCard: { marginBottom: spacing.base, padding: spacing.base },
  doctorLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase' },
  doctorName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  doctorSub: { fontSize: 12, color: colors.textSecondary },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginBottom: spacing.base },
  fcShadow: { width: '47.5%', borderRadius: 22, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.55, shadowRadius: 0, elevation: 10 },
  fc: { borderRadius: 22, padding: 15, height: 108, position: 'relative', overflow: 'hidden' },
  fcName: { fontSize: 14, fontWeight: '900', color: '#fff', lineHeight: 19, position: 'relative', zIndex: 2 },
  fcEmoji: { position: 'absolute', bottom: -8, right: -4, fontSize: 52, opacity: 0.22, lineHeight: 56 },
  fcBtn: { position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  fcArrow: { fontSize: 18, color: '#fff', fontWeight: '900', lineHeight: 22 },
  listeningPill: {
    alignSelf: 'center',
    marginTop: spacing.base,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.primaryFaint,
  },
  listeningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34C759',
  },
  listeningText: { fontSize: 11, fontWeight: '600', color: colors.primary },
});
