import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H2, Body, Label } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { ProgressDots } from '@/components/common/ProgressDots';
import { VoicePicker } from '@/components/common/VoicePicker';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useMemoryStore } from '@/store/memoryStore';
import { RootStackParamList } from '@/navigation/types';
import { isNonEmpty } from '@/utils/validation';
import { VoiceGender } from '@/services/tts/elevenlabsTtsService';
import { AppLanguageCode } from '@/types/memory';
import { LANGUAGES, getLanguageName } from '@/constants/languages';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const CONDITIONS = [
  'Anxiety',
  'Depression',
  'ADHD',
  'Bipolar',
  'PTSD',
  'OCD',
  'Schizophrenia',
  'Eating disorder',
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

function LanguagePicker({
  value,
  onChange,
}: {
  value: AppLanguageCode;
  onChange: (code: AppLanguageCode) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? LANGUAGES.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
    : LANGUAGES;

  const showing = filtered.slice(0, 6);
  const overflow = filtered.length - showing.length;
  const selectedLabel = getLanguageName(value);

  return (
    <View style={lpStyles.wrap}>
      <View style={lpStyles.selectedRow}>
        <Text style={lpStyles.selectedGlobe}>🌐</Text>
        <Text style={lpStyles.selectedLabel}>{selectedLabel}</Text>
      </View>
      <TextInput
        style={lpStyles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search languages…"
        placeholderTextColor={colors.textTertiary}
        autoCorrect={false}
      />
      <View style={lpStyles.list}>
        {showing.map(lang => {
          const active = lang.code === value;
          return (
            <TouchableOpacity
              key={lang.code}
              onPress={() => { onChange(lang.code); setQuery(''); }}
              style={[lpStyles.item, active && lpStyles.itemActive]}
              activeOpacity={0.7}
            >
              <Text style={[lpStyles.itemText, active && lpStyles.itemTextActive]}>
                {lang.label}
              </Text>
              {active && <Text style={lpStyles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && (
          <Text style={lpStyles.hint}>No match — try a different spelling.</Text>
        )}
        {overflow > 0 && (
          <Text style={lpStyles.hint}>+{overflow} more — keep typing to filter.</Text>
        )}
      </View>
    </View>
  );
}

const lpStyles = StyleSheet.create({
  wrap: { gap: 8 },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  selectedGlobe: { fontSize: 14 },
  selectedLabel: { fontSize: 13, fontWeight: '700', color: colors.primary },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemActive: { backgroundColor: colors.primaryFaint },
  itemText: { fontSize: 14, color: colors.textPrimary },
  itemTextActive: { color: colors.primary, fontWeight: '700' },
  check: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    padding: spacing.sm,
    textAlign: 'center',
  },
});

export function ProfileSetupScreen() {
  const navigation = useNavigation<Nav>();
  const { updateMemory } = useMemoryStore();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [preferredVoice, setPreferredVoice] = useState<VoiceGender | 'custom' | undefined>(undefined);
  const [language, setLanguage] = useState<AppLanguageCode>('en');
  const [saving, setSaving] = useState(false);

  const canContinue = isNonEmpty(name);

  const toggleCondition = (c: string) =>
    setConditions(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));

  const handleContinue = async () => {
    setSaving(true);
    const patientCode = String(Math.floor(1000 + Math.random() * 9000));
    await updateMemory({
      patientName: name.trim(),
      dateOfBirth: dob.trim() || undefined,
      gender: gender ?? undefined,
      phone: phone.trim() || undefined,
      emergencyContactName: emergencyName.trim() || undefined,
      emergencyContactPhone: emergencyPhone.trim() || undefined,
      conditions,
      patientCode,
      preferredVoice: (preferredVoice === 'custom' ? 'female' : preferredVoice) ?? 'female',
      preferredLanguage: language,
      setupComplete: true,
    });
    setSaving(false);
    navigation.navigate('OnboardingComplete');
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
          <ProgressDots total={2} current={0} />
          <H2 style={styles.heading}>Let's get to know you</H2>
          <Body color={colors.textSecondary} style={styles.sub}>
            This helps Milo personalize your check-ins.
          </Body>

          <View style={styles.field}>
            <Label>Full name *</Label>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex Johnson"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Label>Date of birth</Label>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Label>Gender</Label>
            <ChipGroup
              options={GENDERS}
              selected={gender ? [gender] : []}
              onToggle={v => setGender(prev => (prev === v ? null : v))}
            />
          </View>

          <View style={styles.field}>
            <Label>Phone number</Label>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Label>Emergency contact name</Label>
            <TextInput
              style={styles.input}
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="e.g. Sarah Johnson"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Label>Emergency contact phone</Label>
            <TextInput
              style={styles.input}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Label>Conditions (select all that apply)</Label>
            <ChipGroup options={CONDITIONS} selected={conditions} onToggle={toggleCondition} />
          </View>

          <View style={styles.field}>
            <Label>Preferred language</Label>
            <LanguagePicker value={language} onChange={setLanguage} />
          </View>

          <View style={styles.field}>
            <Label>Milo's voice</Label>
            <Text style={styles.voiceHint}>Pick a voice and tap Sample to hear it.</Text>
            <VoicePicker value={preferredVoice} onChange={setPreferredVoice} />
          </View>

          <Button
            label="Continue"
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
  heading: { marginTop: spacing.base },
  sub: { lineHeight: 22 },
  field: { gap: spacing.xs },
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
  voiceHint: { fontSize: 12, color: colors.textTertiary, marginBottom: spacing.xs },
});
