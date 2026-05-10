import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H1, Body } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { loadDoctorProfile } from '@/services/storage/doctorStorage';
import { DoctorProfile, DEFAULT_DOCTOR_PROFILE } from '@/types/doctor';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DoctorOnboardingCompleteScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<DoctorProfile>(DEFAULT_DOCTOR_PROFILE);

  useEffect(() => {
    loadDoctorProfile().then(setProfile);
  }, []);

  const handleStart = () =>
    navigation.reset({ index: 0, routes: [{ name: 'DoctorTabs' }] });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <H1 color={colors.primary} style={styles.greeting}>
            Welcome,{'\n'}{profile.doctorName || 'Doctor'} 👋
          </H1>
          <Body color={colors.textSecondary} style={styles.body}>
            Your clinician dashboard is ready.{'\n\n'}
            You can view patient check-in history, manage medications, generate clinical reports, and schedule check-in calls — all from one place.
          </Body>
        </View>
        <Button label="Open my dashboard" onPress={handleStart} />
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
    paddingBottom: spacing.xl,
  },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.base },
  logo: { width: 160, height: 160, alignSelf: 'center', opacity: 0.9 },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.primary,
    textTransform: 'uppercase',
    backgroundColor: colors.primaryFaint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  greeting: { lineHeight: 42 },
  body: { lineHeight: 26 },
});
