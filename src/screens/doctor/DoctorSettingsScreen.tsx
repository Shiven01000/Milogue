import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H2, H3, Body, Label, BodySmall } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { loadDoctorProfile, clearAllData, saveAppRole } from '@/services/storage/doctorStorage';
import { loadPatientMemory } from '@/services/storage/memoryStorage';
import { DoctorProfile, DEFAULT_DOCTOR_PROFILE } from '@/types/doctor';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DoctorSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<DoctorProfile>(DEFAULT_DOCTOR_PROFILE);

  useEffect(() => {
    loadDoctorProfile().then(setProfile);
  }, []);

  const handleSwitchToPatient = async () => {
    await saveAppRole('patient');
    const mem = await loadPatientMemory();
    navigation.reset({
      index: 0,
      routes: [{ name: mem.setupComplete ? 'Tabs' : 'Onboarding' }],
    });
  };

  const handleClear = () => {
    Alert.alert(
      'Clear all data?',
      'This will delete all patient data, check-in history, and your doctor profile. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.badge}>Doctor View</Text>
          <H2 style={styles.title}>Settings</H2>
        </View>

        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Doctor Profile</H3>
          <View style={styles.row}>
            <Label>Name</Label>
            <Body>{profile.doctorName || '—'}</Body>
          </View>
          <View style={styles.row}>
            <Label>License</Label>
            <Body>{profile.licenseNumber || '—'}</Body>
          </View>
          <View style={styles.row}>
            <Label>Specialty</Label>
            <Body>{profile.specialty || '—'}</Body>
          </View>
          <View style={styles.row}>
            <Label>Clinic</Label>
            <Body>{profile.clinicName || '—'}</Body>
          </View>
          <View style={styles.row}>
            <Label>Patients</Label>
            <Body>{profile.patients.length} connected</Body>
          </View>
        </Card>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={handleSwitchToPatient}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Switch to patient view"
        >
          <Text style={styles.switchBtnText}>Switch to Patient View  →</Text>
        </TouchableOpacity>

        <Card style={StyleSheet.flatten([styles.section, styles.dangerCard])}>
          <H3 style={StyleSheet.flatten([styles.sectionTitle, { color: colors.error }])}>Danger Zone</H3>
          <Body color={colors.textSecondary} style={{ marginBottom: spacing.base, lineHeight: 20 }}>
            Permanently delete all check-in data, patient memory, and this doctor profile.
            Returns the app to the role selection screen.
          </Body>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleClear}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Clear all data"
          >
            <Text style={styles.dangerBtnText}>Clear all data</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: 100, gap: spacing.base },
  header: { gap: 4 },
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
  title: {},
  section: { gap: spacing.xs },
  sectionTitle: { marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primaryFaint,
  },
  switchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  dangerCard: { borderWidth: 1.5, borderColor: colors.error + '33' },
  dangerBtn: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
});
