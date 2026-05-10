import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H2, H3, Body, BodySmall, Label } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { loadDoctorProfile, saveDoctorProfile } from '@/services/storage/doctorStorage';
import { loadPatientMemory } from '@/services/storage/memoryStorage';
import { loadAllSessions } from '@/services/storage/checkinStorage';
import { getLatestSnapshot } from '@/services/healthkit/healthService';
import { CheckinSession } from '@/types/checkin';
import { DoctorProfile, ConnectedPatient, DEFAULT_DOCTOR_PROFILE } from '@/types/doctor';
import { PatientMemory, DEFAULT_PATIENT_MEMORY } from '@/types/memory';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function moodColor(score: number) {
  if (score <= 4) return colors.moodLow;
  if (score <= 7) return colors.moodMid;
  return colors.moodHigh;
}

function MoodDots({ sessions }: { sessions: CheckinSession[] }) {
  const last7 = sessions.slice(-7);
  if (last7.length === 0) {
    return <BodySmall color={colors.textTertiary}>No check-ins yet</BodySmall>;
  }
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {last7.map((s, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: moodColor(s.moodScoreAtStart),
          }}
        />
      ))}
    </View>
  );
}

export function DoctorPatientsScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorProfile>(DEFAULT_DOCTOR_PROFILE);
  const [patientMemory, setPatientMemory] = useState<PatientMemory>(DEFAULT_PATIENT_MEMORY);
  const [sessions, setSessions] = useState<CheckinSession[]>([]);

  // Add Patient state
  const [showAddForm, setShowAddForm] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const latestSnapshot = getLatestSnapshot();

  const reload = useCallback(async () => {
    const [d, p, s] = await Promise.all([
      loadDoctorProfile(),
      loadPatientMemory(),
      loadAllSessions(),
    ]);
    setDoctor(d);
    setPatientMemory(p);
    setSessions(s);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const lastCheckin =
    sessions.length > 0
      ? new Date(sessions[sessions.length - 1].startedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null;

  const handleAddPatient = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      setAddError('Please enter a valid 4-digit code.');
      return;
    }
    // Check duplicate
    if (doctor.patients.some(p => p.code === code)) {
      setAddError('This patient is already in your list.');
      return;
    }
    setAddLoading(true);
    setAddError(null);
    // Look up patient on this device
    const mem = await loadPatientMemory();
    if (!mem.patientCode || mem.patientCode !== code) {
      setAddError('No patient found with this code. Make sure you\'re on the same device as your patient.');
      setAddLoading(false);
      return;
    }
    const newPatient: ConnectedPatient = { name: mem.patientName || `Patient #${code}`, code };
    const updated: DoctorProfile = {
      ...doctor,
      patients: [...doctor.patients, newPatient],
    };
    await saveDoctorProfile(updated);
    setDoctor(updated);
    setCodeInput('');
    setShowAddForm(false);
    setAddLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.badge}>Doctor View</Text>
          <View style={styles.titleRow}>
            <H2 style={styles.title}>My Patients</H2>
            <TouchableOpacity
              style={styles.addPatientBtn}
              onPress={() => { setShowAddForm(v => !v); setAddError(null); setCodeInput(''); }}
              accessibilityRole="button"
              accessibilityLabel="Add patient"
            >
              <Text style={styles.addPatientBtnText}>{showAddForm ? '✕ Cancel' : '+ Add Patient'}</Text>
            </TouchableOpacity>
          </View>
          {doctor.clinicName ? (
            <Body color={colors.textSecondary}>{doctor.clinicName}</Body>
          ) : null}
        </View>

        {/* Add Patient inline form */}
        {showAddForm && (
          <Card style={styles.addForm}>
            <H3 style={{ marginBottom: spacing.xs }}>Add by Patient Code</H3>
            <Body color={colors.textSecondary} style={styles.addHint}>
              Ask your patient to open their Profile tab and share their 4-digit code.
            </Body>
            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={t => { setCodeInput(t.replace(/\D/g, '').slice(0, 4)); setAddError(null); }}
              placeholder="e.g. 4821"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              maxLength={4}
              autoFocus
            />
            {addError ? (
              <Body color={colors.error} style={{ fontSize: 13, marginTop: spacing.xs }}>
                {addError}
              </Body>
            ) : null}
            <Button
              label="Connect patient"
              onPress={handleAddPatient}
              loading={addLoading}
              disabled={codeInput.length !== 4}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        {doctor.patients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Body color={colors.textSecondary} style={{ textAlign: 'center' }}>
              No patients connected yet.{'\n'}Tap "+ Add Patient" and enter a patient code.
            </Body>
          </Card>
        ) : (
          doctor.patients.map(patient => {
            const isConnected =
              !!patientMemory.patientCode && patientMemory.patientCode === patient.code;
            return (
              <TouchableOpacity
                key={patient.code}
                onPress={() => navigation.navigate('PatientDetail', {
                  patientName: patient.name,
                  patientCode: patient.code,
                })}
                activeOpacity={0.85}
              >
                <Card style={styles.patientCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitial}>
                        {patient.name[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <H3>{patient.name}</H3>
                      {isConnected ? (
                        <BodySmall color={colors.success}>● Connected on this device</BodySmall>
                      ) : (
                        <BodySmall color={colors.textTertiary}>Code: {patient.code}</BodySmall>
                      )}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>

                  {isConnected && (
                    <View style={styles.stats}>
                      <View style={styles.stat}>
                        <Label>Last check-in</Label>
                        <BodySmall color={colors.textSecondary}>
                          {lastCheckin ?? '—'}
                        </BodySmall>
                      </View>
                      <View style={styles.stat}>
                        <Label>Mood trend</Label>
                        <MoodDots sessions={sessions} />
                      </View>
                      <View style={styles.stat}>
                        <Label>HRV</Label>
                        <BodySmall color={colors.textSecondary}>
                          {latestSnapshot ? `${latestSnapshot.hrv.morningHRV}ms` : '—'}
                        </BodySmall>
                      </View>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: 100, gap: spacing.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { gap: 4, marginBottom: spacing.xs },
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
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {},
  addPatientBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  addPatientBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  addForm: { gap: spacing.sm },
  addHint: { fontSize: 13, lineHeight: 18 },
  codeInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    textAlign: 'center',
    letterSpacing: 10,
    fontVariant: ['tabular-nums'],
  },
  patientCard: { gap: spacing.sm },
  emptyCard: { alignItems: 'center', padding: spacing.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: colors.primary },
  chevron: { fontSize: 24, color: colors.textTertiary, fontWeight: '600' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { gap: 3 },
});
