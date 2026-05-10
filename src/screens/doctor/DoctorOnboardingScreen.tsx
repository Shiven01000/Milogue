import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H2, Body, Label } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { saveDoctorProfile } from '@/services/storage/doctorStorage';
import { RootStackParamList } from '@/navigation/types';
import { isNonEmpty } from '@/utils/validation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SPECIALTIES = [
  'Psychiatrist',
  'Therapist',
  'General Practitioner',
  'Psychologist',
  'Neurologist',
  'Other',
];

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onToggle(opt)}
            style={[chipStyles.chip, active && chipStyles.chipActive]}
          >
            <Text style={[chipStyles.label, active && chipStyles.labelActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  labelActive: { color: colors.primary },
});

export function DoctorOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const [doctorName, setDoctorName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [saving, setSaving] = useState(false);

  const canContinue = isNonEmpty(doctorName) && isNonEmpty(licenseNumber);

  const handleContinue = async () => {
    setSaving(true);
    await saveDoctorProfile({
      doctorName: doctorName.trim(),
      licenseNumber: licenseNumber.trim(),
      specialty: specialty ?? '',
      clinicName: clinicName.trim(),
      patients: [],
      setupComplete: true,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    navigation.reset({ index: 0, routes: [{ name: 'DoctorOnboardingComplete' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <H2 style={styles.heading}>Doctor Setup</H2>
          <Body color={colors.textSecondary} style={styles.sub}>
            Set up your clinician profile to access the doctor dashboard.
          </Body>

          <View style={styles.field}>
            <Label>Full name *</Label>
            <TextInput
              style={styles.input}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholder="Dr. Sarah Chen"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Label>Medical license number *</Label>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="e.g. MD-12345678"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.field}>
            <Label>Specialty</Label>
            <ChipGroup
              options={SPECIALTIES}
              selected={specialty ? [specialty] : []}
              onToggle={v => setSpecialty(prev => (prev === v ? null : v))}
            />
          </View>

          <View style={styles.field}>
            <Label>Clinic or practice name</Label>
            <TextInput
              style={styles.input}
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="e.g. Riverside Mental Health"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <Button
            label="Set up dashboard"
            onPress={handleContinue}
            disabled={!canContinue}
            loading={saving}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.base },
  logo: { width: 72, height: 72, marginLeft: -spacing.base, alignSelf: 'flex-start', opacity: 0.9 },
  header: { alignItems: 'flex-start' },
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
  },
  heading: { marginTop: spacing.xs },
  sub: { lineHeight: 22 },
  field: { gap: spacing.xs },
  hint: { fontSize: 12 },
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
  cta: { marginTop: spacing.base },
});
