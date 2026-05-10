import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H3, Body, BodySmall, Label } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useMemoryStore } from '@/store/memoryStore';
import { loadAllSessions, getLastNSessions } from '@/services/storage/checkinStorage';
import { getHealthRange, getLatestSnapshot } from '@/services/healthkit/healthService';
import { scheduleCall } from '@/services/notifications/callService';
import { loadDoctorProfile } from '@/services/storage/doctorStorage';
import {
  buildClinicalReportMessages,
  buildDoctorFollowupMessages,
} from '@/api/prompts';
import { chatCompletionJSON, chatCompletion, ChatMessage } from '@/api/openai';
import { parseClinicalSummaryFromJSON, formatEmotionArc } from '@/utils/reportFormatter';
import { daysAgo, todayISO } from '@/utils/dateUtils';
import { CheckinSession } from '@/types/checkin';
import { MedicationEntry } from '@/types/memory';
import { ClinicalSummary } from '@/types/report';
import { HealthSnapshot } from '@/types/health';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PatientDetail'>;

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const CHART_HEIGHT = 68;

const COMMON_CONDITIONS = [
  'Depression',
  'Anxiety',
  'Bipolar Disorder',
  'ADHD',
  'OCD',
  'PTSD',
  'Schizophrenia',
  'Borderline Personality Disorder',
];

function moodColor(score: number) {
  if (score <= 4) return colors.moodLow;
  if (score <= 7) return colors.moodMid;
  return colors.moodHigh;
}

function hrvColor(snap: HealthSnapshot): string {
  switch (snap.hrv.trend) {
    case 'well_above_average':
    case 'above_average':
      return '#34C759';
    case 'below_average':
      return colors.warning;
    case 'well_below_average':
      return colors.moodLow;
    default:
      return colors.primary;
  }
}

function sleepColor(snap: HealthSnapshot): string {
  switch (snap.sleep.quality) {
    case 'excellent':
      return '#34C759';
    case 'good':
      return colors.primary;
    case 'fair':
      return colors.warning;
    default:
      return colors.moodLow;
  }
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
}

function WearableBarChart({
  data,
  getValue,
  getColor,
  formatValue,
  label,
}: {
  data: HealthSnapshot[];
  getValue: (s: HealthSnapshot) => number;
  getColor: (s: HealthSnapshot) => string;
  formatValue: (v: number) => string;
  label: string;
}) {
  const values = data.map(getValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Label style={{ marginBottom: 6 }}>{label}</Label>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {data.map(snap => {
          const v = getValue(snap);
          const barH = Math.max(10, ((v - min) / range) * (CHART_HEIGHT - 10) + 10);
          return (
            <View key={snap.date} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.chartValue}>{formatValue(v)}</Text>
              <View
                style={{
                  height: CHART_HEIGHT,
                  justifyContent: 'flex-end',
                  alignSelf: 'stretch',
                  paddingHorizontal: 1,
                }}
              >
                <View
                  style={{
                    height: barH,
                    backgroundColor: getColor(snap),
                    borderRadius: 4,
                    opacity: 0.88,
                  }}
                />
              </View>
              <Text style={styles.chartLabel}>{dayLabel(snap.date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function PatientDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { patientName, patientCode } = route.params;
  const { memory, updateMedications, updateConditions } = useMemoryStore();
  const scrollRef = useRef<ScrollView>(null);

  const isConnected =
    !!memory.patientCode && memory.patientCode === patientCode;

  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [addingMed, setAddingMed] = useState(false);
  const [report, setReport] = useState<ClinicalSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [healthRange, setHealthRange] = useState<HealthSnapshot[]>([]);
  const [followupThread, setFollowupThread] = useState<ChatMessage[]>([]);
  const [followupInput, setFollowupInput] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [callSent, setCallSent] = useState(false);
  // Conditions state
  const [conditions, setConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [addingCondition, setAddingCondition] = useState(false);
  const [conditionError, setConditionError] = useState('');
  // const { updateConditions, memory, updateMedications } = useMemoryStore();

  useEffect(() => {
    if (isConnected) {
      loadAllSessions().then(s => setSessions(s.slice(-5).reverse()));
      setMedications([...memory.medications]);
      setHealthRange(getHealthRange(daysAgo(6), todayISO()));
    }
  }, [isConnected, memory.medications, memory.conditions]);

  useEffect(() => {
    if (followupThread.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [followupThread]);

  const handleAddMed = async () => {
    if (!newMedName.trim()) return;
    const updated: MedicationEntry[] = [
      ...medications,
      { name: newMedName.trim(), dose: newMedDose.trim() || undefined },
    ];
    setMedications(updated);
    await updateMedications(updated);
    setNewMedName('');
    setNewMedDose('');
    setAddingMed(false);
  };

  const handleDeleteMed = async (index: number) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated);
    await updateMedications(updated);
  };

  const handleAddCondition = async () => {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    if (conditions.includes(trimmed)) {
      setConditionError('This condition is already on file.');
      return;
    }
    const updated = [...conditions, trimmed];
    setConditions(updated);
    await updateConditions(updated);
    setNewCondition('');
    setAddingCondition(false);
    setConditionError('');
  };
  
  const handleDeleteCondition = async (index: number) => {
    const updated = conditions.filter((_, i) => i !== index);
    setConditions(updated);
    await updateConditions(updated);
  };


  const handleGenerateReport = useCallback(async () => {
    setGenerating(true);
    setReportError(null);
    setReport(null);
    setFollowupThread([]);
    try {
      const s = await getLastNSessions(7);
      if (s.length === 0) {
        setReportError(
          'No check-in sessions found. Complete at least one check-in first.'
        );
        return;
      }
      const startDate = daysAgo(7);
      const endDate = todayISO();
      const healthData = getHealthRange(startDate, endDate);
      const sessionPayload = s.map(sess => ({
        date: sess.date,
        moodScore: sess.moodScoreAtStart,
        transcript: sess.messages
          .map(m => `${m.role === 'user' ? 'Patient' : 'Milo'}: ${m.content}`)
          .join('\n'),
        emotionTags: sess.emotionTags,
        emotionArc: sess.emotionTimeline ? formatEmotionArc(sess.emotionTimeline) : undefined,
      }));
      const healthPayload = healthData.map(h => ({
        date: h.date,
        sleepHours: h.sleep.durationHours,
        sleepQuality: h.sleep.quality,
        hrv: h.hrv.morningHRV,
        hrvAvg: h.hrv.thirtyDayAverage,
        rhr: h.restingHeartRate,
        steps: h.stepCount,
      }));
      const messages = buildClinicalReportMessages(
        patientName,
        sessionPayload,
        healthPayload
      );
      const raw = await chatCompletionJSON(messages, OPENAI_API_KEY, { maxTokens: 2048 });
      const avg =
        s.reduce((acc, sess) => acc + sess.moodScoreAtStart, 0) / s.length;
      setReport(
        parseClinicalSummaryFromJSON(
          raw,
          patientName,
          startDate,
          endDate,
          s.length,
          Math.round(avg * 10) / 10
        )
      );
    } catch {
      setReportError('Failed to generate report. Check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  }, [patientName]);

  const handleFollowup = useCallback(async () => {
    const q = followupInput.trim();
    if (!q || !report || followupLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: q };
    const newThread = [...followupThread, userMsg];
    setFollowupThread(newThread);
    setFollowupInput('');
    setFollowupLoading(true);
    try {
      const msgs = buildDoctorFollowupMessages(patientName, report, newThread);
      const reply = await chatCompletion(msgs, OPENAI_API_KEY, { maxTokens: 600, temperature: 0.4 });
      setFollowupThread([...newThread, { role: 'assistant', content: reply }]);
    } catch {
      setFollowupThread([
        ...newThread,
        { role: 'assistant', content: 'Failed to generate a response. Please try again.' },
      ]);
    } finally {
      setFollowupLoading(false);
    }
  }, [followupInput, followupThread, report, patientName, followupLoading]);

  const latestSnapshot = getLatestSnapshot();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Patient Info */}
          <Card style={styles.section}>
            <H3 style={styles.sectionTitle}>Patient Info</H3>
            {!isConnected && (
              <Body color={colors.warning}>
                Not connected on this device — data shown below is placeholder only.
              </Body>
            )}
            <View style={styles.infoRow}>
              <Label>Name</Label>
              <Body>{patientName}</Body>
            </View>
            {isConnected && (
              <>
                {memory.dateOfBirth ? (
                  <View style={styles.infoRow}>
                    <Label>Date of birth</Label>
                    <Body>{memory.dateOfBirth}</Body>
                  </View>
                ) : null}
                {memory.gender ? (
                  <View style={styles.infoRow}>
                    <Label>Gender</Label>
                    <Body>{memory.gender}</Body>
                  </View>
                ) : null}
                {memory.phone ? (
                  <View style={styles.infoRow}>
                    <Label>Phone</Label>
                    <Body>{memory.phone}</Body>
                  </View>
                ) : null}
                {memory.conditions.length > 0 ? (
                  <View style={styles.infoRow}>
                    <Label>Conditions</Label>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                      {memory.conditions.map(c => (
                        <View key={c} style={styles.conditionChip}>
                          <Text style={styles.conditionText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {latestSnapshot ? (
                  <View style={styles.infoRow}>
                    <Label>Latest HRV</Label>
                    <Body>{latestSnapshot.hrv.morningHRV}ms</Body>
                  </View>
                ) : null}
              </>
            )}
          </Card>

          {/* Medications */}
          <Card style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <H3 style={styles.sectionTitle}>Medications</H3>
              {isConnected && (
                <TouchableOpacity onPress={() => setAddingMed(v => !v)}>
                  <Text style={styles.addBtn}>{addingMed ? 'Cancel' : '+ Add'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {!isConnected ? (
              <BodySmall color={colors.textTertiary}>
                Patient must be connected to manage medications.
              </BodySmall>
            ) : (
              <>
                {medications.length === 0 && !addingMed ? (
                  <BodySmall color={colors.textTertiary}>No medications on file.</BodySmall>
                ) : null}
                {medications.map((med, i) => (
                  <View key={i} style={styles.medRow}>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: '700' }}>{med.name}</Body>
                      {med.dose ? (
                        <BodySmall color={colors.textSecondary}>
                          {med.dose}
                          {med.frequency ? ` · ${med.frequency}` : ''}
                        </BodySmall>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteMed(i)} style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {addingMed && (
                  <View style={styles.addForm}>
                    <TextInput
                      style={styles.input}
                      value={newMedName}
                      onChangeText={setNewMedName}
                      placeholder="Medication name"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <TextInput
                      style={styles.input}
                      value={newMedDose}
                      onChangeText={setNewMedDose}
                      placeholder="Dose & frequency (optional)"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <Button
                      label="Add medication"
                      onPress={handleAddMed}
                      disabled={!newMedName.trim()}
                    />
                  </View>
                )}
              </>
            )}
          </Card>

          {/* Conditions */}
          <Card style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <H3 style={styles.sectionTitle}>Conditions</H3>
              {isConnected && (
                <TouchableOpacity
                  onPress={() => {
                    setAddingCondition(v => !v);
                    setNewCondition('');
                    setConditionError('');
                  }}
                >
                  <Text style={styles.addBtn}>
                    {addingCondition ? 'Cancel' : '+ Add'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {!isConnected ? (
              <BodySmall color={colors.textTertiary}>
                Patient must be connected to manage conditions.
              </BodySmall>
            ) : (
              <>
                {conditions.length === 0 && !addingCondition ? (
                  <BodySmall color={colors.textTertiary}>
                    No conditions on file.
                  </BodySmall>
                ) : null}

                {conditions.map((condition, i) => (
                  <View key={i} style={styles.medRow}>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: '700' }}>{condition}</Body>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCondition(i)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {addingCondition && (
                  <View style={styles.addForm}>
                    {/* Quick select from common conditions */}
                    <BodySmall
                      color={colors.textSecondary}
                      style={{ marginBottom: spacing.xs }}
                    >
                      Select or type a condition:
                    </BodySmall>
                    <View style={styles.conditionChips}>
                      {COMMON_CONDITIONS
                        .filter(c => !conditions.includes(c))
                        .map(c => (
                          <TouchableOpacity
                            key={c}
                            style={styles.conditionChipOption}
                            onPress={() => setNewCondition(c)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.conditionChipOptionText,
                                newCondition === c &&
                                  styles.conditionChipOptionTextActive,
                              ]}
                            >
                              {c}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                      style={styles.input}
                      value={newCondition}
                      onChangeText={text => {
                        setNewCondition(text);
                        setConditionError('');
                      }}
                      placeholder="Or type a custom condition"
                      placeholderTextColor={colors.textTertiary}
                    />

                    {conditionError ? (
                      <Body
                        color={colors.error}
                        style={{ fontSize: 13, marginTop: spacing.xs }}
                      >
                        {conditionError}
                      </Body>
                    ) : null}

                    <Button
                      label="Add condition"
                      onPress={handleAddCondition}
                      disabled={!newCondition.trim()}
                    />
                  </View>
                )}
              </>
            )}
          </Card>    

          {/* Check-in History */}
          <Card style={styles.section}>
            <H3 style={styles.sectionTitle}>Recent Check-ins</H3>
            {!isConnected || sessions.length === 0 ? (
              <BodySmall color={colors.textTertiary}>No sessions available.</BodySmall>
            ) : (
              sessions.map(s => (
                <View key={s.id} style={styles.sessionRow}>
                  <View
                    style={[
                      styles.moodBadge,
                      { backgroundColor: moodColor(s.moodScoreAtStart) + '22' },
                    ]}
                  >
                    <Text
                      style={[styles.moodScore, { color: moodColor(s.moodScoreAtStart) }]}
                    >
                      {s.moodScoreAtStart}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>
                      {new Date(s.startedAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Label>
                    <BodySmall color={colors.textSecondary} numberOfLines={2}>
                      {s.sessionSummary ||
                        s.messages.find(m => m.role === 'user')?.content?.slice(0, 80) ||
                        'No summary'}
                    </BodySmall>
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Wearable Trends */}
          {isConnected && healthRange.length > 0 && (
            <Card style={styles.section}>
              <View style={styles.wearableHeaderRow}>
                <H3 style={styles.sectionTitle}>Wearable Trends (7-Day)</H3>
                <View style={styles.fitbitBadge}>
                  <View style={styles.fitbitDot} />
                  <Text style={styles.fitbitBadgeText}>Fitbit Charge 6</Text>
                </View>
              </View>
              <WearableBarChart
                data={healthRange}
                getValue={s => s.hrv.morningHRV}
                getColor={hrvColor}
                formatValue={v => `${v}`}
                label="HRV (ms)"
              />
              <WearableBarChart
                data={healthRange}
                getValue={s => s.sleep.durationHours}
                getColor={sleepColor}
                formatValue={v => `${v.toFixed(1)}`}
                label="Sleep (hrs)"
              />
              <View style={styles.legendRow}>
                {[
                  { color: '#34C759', label: 'Good' },
                  { color: colors.primary, label: 'Avg' },
                  { color: colors.warning, label: 'Low' },
                  { color: colors.moodLow, label: 'Poor' },
                ].map(l => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.legendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Clinical Report */}
          <Card style={styles.section}>
            <H3 style={styles.sectionTitle}>Clinical Report</H3>
            {!isConnected ? (
              <BodySmall color={colors.textTertiary}>
                Patient must be connected to generate a report.
              </BodySmall>
            ) : (
              <>
                <Button
                  label={report ? 'Regenerate Report' : 'Generate Clinical Report'}
                  onPress={handleGenerateReport}
                  loading={generating}
                />
                {reportError ? (
                  <Body color={colors.error} style={{ marginTop: spacing.sm }}>
                    {reportError}
                  </Body>
                ) : null}
                {generating && (
                  <View style={styles.generatingRow}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <BodySmall color={colors.textSecondary}>Generating report…</BodySmall>
                  </View>
                )}
                {report && (
                  <View style={styles.reportPreview}>
                    <View style={styles.reportStats}>
                      <View style={styles.reportStat}>
                        <H3 color={colors.primary}>{String(report.sessionCount)}</H3>
                        <BodySmall>Sessions</BodySmall>
                      </View>
                      <View style={styles.reportStat}>
                        <H3 color={colors.primary}>{String(report.averageMoodScore)}</H3>
                        <BodySmall>Avg mood</BodySmall>
                      </View>
                    </View>
                    {report.wearableTrendNarrative ? (
                      <Body
                        color={colors.textSecondary}
                        style={{ lineHeight: 22, marginTop: spacing.sm }}
                      >
                        {report.wearableTrendNarrative}
                      </Body>
                    ) : null}
                    {report.recommendedDiscussionPoints.length > 0 ? (
                      <View style={{ marginTop: spacing.base }}>
                        <Label style={{ marginBottom: spacing.xs }}>Discussion Points</Label>
                        {report.recommendedDiscussionPoints.map((p, i) => (
                          <View key={i} style={styles.discussionPoint}>
                            <View style={styles.bullet} />
                            <BodySmall color={colors.textSecondary} style={{ flex: 1 }}>
                              {p}
                            </BodySmall>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {report.sections.map(sec => (
                      <View key={sec.key} style={{ marginTop: spacing.base }}>
                        <Label style={{ marginBottom: 2 }}>{sec.title}</Label>
                        <BodySmall color={colors.textSecondary}>{sec.summary}</BodySmall>
                      </View>
                    ))}

                    {/* Follow-up Chat */}
                    <View style={styles.followupContainer}>
                      <View style={styles.followupHeader}>
                        <View style={styles.followupDivider} />
                        <BodySmall color={colors.textTertiary} style={styles.followupLabel}>
                          Ask a follow-up question
                        </BodySmall>
                        <View style={styles.followupDivider} />
                      </View>

                      {followupThread.map((msg, i) => (
                        <View
                          key={i}
                          style={[
                            styles.chatBubble,
                            msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI,
                          ]}
                        >
                          <BodySmall
                            style={styles.chatBubbleText}
                            color={msg.role === 'user' ? '#fff' : colors.textPrimary}
                          >
                            {msg.content}
                          </BodySmall>
                        </View>
                      ))}

                      {followupLoading && (
                        <View style={[styles.chatBubble, styles.chatBubbleAI]}>
                          <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                      )}

                      <View style={styles.chatInputRow}>
                        <TextInput
                          style={styles.chatInput}
                          value={followupInput}
                          onChangeText={setFollowupInput}
                          placeholder="e.g. Why did HRV drop on Wednesday?"
                          placeholderTextColor={colors.textTertiary}
                          multiline
                          returnKeyType="send"
                          onSubmitEditing={handleFollowup}
                          blurOnSubmit={false}
                          editable={!followupLoading}
                        />
                        <TouchableOpacity
                          style={[
                            styles.sendBtn,
                            (!followupInput.trim() || followupLoading) && styles.sendBtnDisabled,
                          ]}
                          onPress={handleFollowup}
                          disabled={!followupInput.trim() || followupLoading}
                          accessibilityRole="button"
                          accessibilityLabel="Send question"
                        >
                          <Text style={styles.sendBtnText}>↑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </Card>

          {/* Schedule Call */}
          <Card style={styles.section}>
            <H3 style={styles.sectionTitle}>Schedule Check-in</H3>
            <Body color={colors.textSecondary} style={{ marginBottom: spacing.base, lineHeight: 20 }}>
              Sends a real-time call to the patient's phone. Their device must be open on the Home screen.
            </Body>
            {!isConnected ? (
              <BodySmall color={colors.textTertiary}>
                Patient must be connected to schedule a call.
              </BodySmall>
            ) : (
              <>
                <Button
                  label={callSent ? '✓ Call sent' : '📞 Call Patient\'s Phone'}
                  onPress={async () => {
                    setCallLoading(true);
                    try {
                      const prof = await loadDoctorProfile();
                      await scheduleCall(patientCode, prof.doctorName || 'Your doctor');
                      setCallSent(true);
                      setTimeout(() => setCallSent(false), 8000);
                    } catch {
                      Alert.alert(
                        'Could not send call',
                        'Check your internet connection and try again.'
                      );
                    } finally {
                      setCallLoading(false);
                    }
                  }}
                  loading={callLoading}
                  disabled={callSent}
                  variant="secondary"
                />
                {callSent && (
                  <BodySmall
                    color={colors.primary}
                    style={{ textAlign: 'center', marginTop: spacing.xs }}
                  >
                    Patient's phone is ringing now
                  </BodySmall>
                )}
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: 100, gap: spacing.base },
  section: { gap: spacing.sm },
  sectionTitle: { marginBottom: spacing.xs },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  addBtn: { fontSize: 14, fontWeight: '700', color: colors.primary },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  conditionChip: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  conditionText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteBtn: { padding: spacing.xs },
  deleteText: { fontSize: 14, color: colors.error, fontWeight: '700' },
  addForm: { gap: spacing.sm, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moodBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moodScore: { fontSize: 15, fontWeight: '800' },
  // Wearable header + Fitbit badge
  wearableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  fitbitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fitbitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  fitbitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
  // Wearable chart
  chartValue: { fontSize: 9, color: colors.textTertiary, marginBottom: 2 },
  chartLabel: { fontSize: 9, color: colors.textTertiary, marginTop: 3 },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textTertiary, fontWeight: '600' },
  // Report
  generatingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  reportPreview: { marginTop: spacing.sm },
  reportStats: { flexDirection: 'row', gap: spacing.xl },
  reportStat: { alignItems: 'center', gap: 2 },
  discussionPoint: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  // Follow-up chat
  followupContainer: { marginTop: spacing.lg, gap: spacing.sm },
  followupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  followupDivider: { flex: 1, height: 1, backgroundColor: colors.border },
  followupLabel: { fontSize: 11, letterSpacing: 0.3 },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatBubbleUser: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatBubbleAI: {
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    minWidth: 52,
    alignItems: 'center',
  },
  chatBubbleText: { fontSize: 14, lineHeight: 20 },
  chatInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontSize: 18, color: '#fff', fontWeight: '700', marginTop: -2 },

  conditionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  conditionChipOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  conditionChipOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  conditionChipOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
