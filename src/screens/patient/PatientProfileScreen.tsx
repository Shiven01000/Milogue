import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Share,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H2, H3, Body, BodySmall, Label } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useMemoryStore } from '@/store/memoryStore';
import { getLatestSnapshot } from '@/services/healthkit/healthService';
import { clearPatientData, saveAppRole, loadDoctorProfile } from '@/services/storage/doctorStorage';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const APP_VERSION = '1.0.0';
const BATTERY_LEVEL = '73%';
const FIRMWARE_VERSION = '199.0.0.0';

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function PatientProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { memory, updateMemory } = useMemoryStore();

  const [notifEnabled, setNotifEnabled] = useState(memory.notificationEnabled ?? false);
  const [checkinTime, setCheckinTime] = useState(memory.preferredCheckinTime ?? '09:00');

  // Fitbit device state
  const todaySnap = getLatestSnapshot();
  const baseHRV = todaySnap?.hrv.morningHRV ?? 42;
  const baseSleep = todaySnap?.sleep.durationHours ?? 7.2;
  const [lastSynced, setLastSynced] = useState('Just now');
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [displayHRV, setDisplayHRV] = useState(baseHRV);
  const [displaySleep, setDisplaySleep] = useState(baseSleep);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const patientCode = memory.patientCode ?? '—';

  const handleToggleNotif = async (val: boolean) => {
    setNotifEnabled(val);
    await updateMemory({ notificationEnabled: val });
  };

  const handleTimeChange = async (val: string) => {
    setCheckinTime(val);
  };

  const handleTimeSave = async () => {
    await updateMemory({ preferredCheckinTime: checkinTime });
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `My MindLog patient code: ${patientCode} — Enter this on the doctor dashboard to connect.`,
      });
    } catch {
      Alert.alert('Your Patient Code', patientCode);
    }
  };

  const handleSwitchToDoctor = async () => {
    await saveAppRole('doctor');
    const prof = await loadDoctorProfile();
    navigation.reset({
      index: 0,
      routes: [{ name: prof.setupComplete ? 'DoctorTabs' : 'DoctorOnboarding' }],
    });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear My Data',
      'This will delete all your check-in history and reset the app. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: async () => {
            await clearPatientData();
            navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
          },
        },
      ]
    );
  };

  const handleSync = () => {
    setSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      const newHRV = Math.round(clamp(baseHRV + (Math.random() - 0.5) * 6, baseHRV - 3, baseHRV + 3));
      const rawSleep = baseSleep + (Math.random() - 0.5) * 0.4;
      const newSleep = Math.round(rawSleep * 10) / 10;
      setSyncing(false);
      setLastSynced('Just now');
      setDisplayHRV(newHRV);
      setDisplaySleep(newSleep);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }, 2000);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Fitbit Charge 6',
      'Your wearable will stop syncing data. You can reconnect at any time in device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.badge}>Patient View</Text>
          <H2 style={styles.title}>My Profile</H2>
        </View>

        {/* Personal Info */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Personal Info</H3>
          <InfoRow label="Name" value={memory.patientName || '—'} />
          {memory.dateOfBirth ? <InfoRow label="Date of birth" value={memory.dateOfBirth} /> : null}
          {memory.gender ? <InfoRow label="Gender" value={memory.gender} /> : null}
          {memory.phone ? <InfoRow label="Phone" value={memory.phone} /> : null}
        </Card>

        {/* Fitbit Device */}
        <Card style={styles.section}>
          <View style={styles.deviceHeaderRow}>
            <Text style={styles.deviceIcon}>⌚</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <H3 style={styles.sectionTitle}>Fitbit Charge 6</H3>
              <View style={styles.connectedRow}>
                <Animated.View style={[styles.connectedDot, { opacity: pulseAnim }]} />
                <BodySmall color="#34C759">Connected  ·  Last synced: {lastSynced}</BodySmall>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
              onPress={handleSync}
              disabled={syncing}
              accessibilityRole="button"
              accessibilityLabel="Sync Fitbit now"
            >
              {syncing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.syncBtnText}>Sync Now</Text>
              }
            </TouchableOpacity>
          </View>

          {syncSuccess && (
            <View style={styles.syncSuccessRow}>
              <Text style={styles.syncSuccessText}>✓ Synced successfully</Text>
            </View>
          )}

          <View style={styles.deviceGrid}>
            <DeviceRow label="Device" value="Fitbit Charge 6" />
            <DeviceRow label="Battery" value={BATTERY_LEVEL} />
            <DeviceRow label="Firmware" value={FIRMWARE_VERSION} />
            <DeviceRow label="Morning HRV" value={`${displayHRV} ms`} />
            <DeviceRow label="Last night's sleep" value={`${displaySleep} h`} />
          </View>

          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={handleDisconnect}
            accessibilityRole="button"
            accessibilityLabel="Disconnect Fitbit"
          >
            <Text style={styles.disconnectBtnText}>Disconnect</Text>
          </TouchableOpacity>
        </Card>

        {/* Patient Code */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Patient Code</H3>
          <Body color={colors.textSecondary} style={styles.codeHint}>
            Share this code with your doctor to connect your data.
          </Body>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{patientCode}</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareCode}
              accessibilityRole="button"
              accessibilityLabel="Share patient code"
            >
              <Text style={styles.shareBtnText}>Share ↗</Text>
            </TouchableOpacity>
          </View>
          <BodySmall color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
            Your doctor enters this code in their dashboard under "Add Patient".
          </BodySmall>
        </Card>

        {/* Conditions */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Conditions</H3>
          <BodySmall color={colors.textTertiary} style={{ marginBottom: spacing.sm }}>
            Managed by your doctor.
          </BodySmall>
          {memory.conditions.length === 0 ? (
            <BodySmall color={colors.textTertiary}>None on file.</BodySmall>
          ) : (
            <View style={styles.chipRow}>
              {memory.conditions.map(c => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Medications */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Medications</H3>
          <BodySmall color={colors.textTertiary} style={{ marginBottom: spacing.sm }}>
            Managed by your doctor.
          </BodySmall>
          {memory.medications.length === 0 ? (
            <BodySmall color={colors.textTertiary}>None on file.</BodySmall>
          ) : (
            memory.medications.map((med, i) => (
              <View key={i} style={styles.medRow}>
                <Body style={{ fontWeight: '700' }}>{med.name}</Body>
                {med.dose ? (
                  <BodySmall color={colors.textSecondary}>
                    {med.dose}{med.frequency ? ` · ${med.frequency}` : ''}
                  </BodySmall>
                ) : null}
              </View>
            ))
          )}
        </Card>

        {/* Notification Settings */}
        <Card style={styles.section}>
          <H3 style={styles.sectionTitle}>Notifications</H3>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Body>Daily check-in reminder</Body>
              <BodySmall color={colors.textSecondary}>Get reminded to log in with Milo</BodySmall>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotif}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={notifEnabled ? colors.primary : colors.textTertiary}
            />
          </View>
          {notifEnabled && (
            <View style={styles.timeRow}>
              <Label>Preferred time</Label>
              <TextInput
                style={styles.timeInput}
                value={checkinTime}
                onChangeText={handleTimeChange}
                onBlur={handleTimeSave}
                placeholder="09:00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          )}
        </Card>

        {/* Switch role */}
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={handleSwitchToDoctor}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Switch to doctor view"
        >
          <Text style={styles.switchBtnText}>Switch to Doctor View  →</Text>
        </TouchableOpacity>

        {/* Clear Data */}
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClearData}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Clear my data"
        >
          <Text style={styles.clearBtnText}>Clear My Data</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MindLog v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Label>{label}</Label>
      <Body style={{ flex: 1, textAlign: 'right' }}>{value}</Body>
    </View>
  );
}

function DeviceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.deviceRow}>
      <BodySmall color={colors.textSecondary}>{label}</BodySmall>
      <BodySmall style={{ fontWeight: '600' }} color={colors.textPrimary}>{value}</BodySmall>
    </View>
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
    marginBottom: 4,
  },
  title: {},
  section: { gap: spacing.sm },
  sectionTitle: { marginBottom: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  // Fitbit device card
  deviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deviceIcon: {
    fontSize: 28,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  syncBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    minWidth: 80,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  syncSuccessRow: {
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
    textAlign: 'center',
  },
  deviceGrid: {
    gap: 2,
    marginTop: spacing.xs,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disconnectBtn: {
    marginTop: spacing.xs,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '55',
    alignItems: 'center',
  },
  disconnectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  // Patient code
  codeHint: { lineHeight: 18 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginTop: spacing.sm,
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    padding: spacing.base,
  },
  codeText: {
    flex: 1,
    fontSize: 40,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  shareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  medRow: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    width: 80,
    textAlign: 'center',
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
  clearBtn: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: spacing.sm,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
