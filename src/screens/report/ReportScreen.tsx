import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, H3, Body, BodySmall } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ReportSection } from '@/components/report/ReportSection';
import { TrendChartFull } from '@/components/report/TrendChartFull';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useMemoryStore } from '@/store/memoryStore';
import { useHealthData } from '@/hooks/useHealthData';
import { getLastNSessions } from '@/services/storage/checkinStorage';
import { getHealthRange } from '@/services/healthkit/healthService';
import { buildClinicalReportMessages } from '@/api/prompts';
import { chatCompletionJSON } from '@/api/openai';
import { parseClinicalSummaryFromJSON } from '@/utils/reportFormatter';
import { ClinicalSummary } from '@/types/report';
import { daysAgo, todayISO } from '@/utils/dateUtils';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

export function ReportScreen() {
  const { memory } = useMemoryStore();
  const { snapshots } = useHealthData();
  const [report, setReport] = useState<ClinicalSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const sessions = await getLastNSessions(7);
      const startDate = daysAgo(7);
      const endDate = todayISO();
      const healthData = getHealthRange(startDate, endDate);

      if (sessions.length === 0) {
        setError('Complete at least one check-in before generating a report.');
        return;
      }

      const sessionPayload = sessions.map(s => ({
        date: s.date,
        moodScore: s.moodScoreAtStart,
        transcript: s.messages.map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.content}`).join('\n'),
        emotionTags: s.emotionTags,
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
        memory.patientName || 'Patient',
        sessionPayload,
        healthPayload
      );

      const raw = await chatCompletionJSON(messages, OPENAI_API_KEY, { maxTokens: 2048 });
      const avgMood =
        sessions.reduce((s, session) => s + session.moodScoreAtStart, 0) / sessions.length;

      const summary = parseClinicalSummaryFromJSON(
        raw,
        memory.patientName || 'Patient',
        startDate,
        endDate,
        sessions.length,
        Math.round(avgMood * 10) / 10
      );
      setReport(summary);
    } catch (err) {
      setError('Failed to generate report. Please check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <H2 style={styles.title}>Clinician Summary</H2>
        <Body color={colors.textSecondary} style={styles.sub}>
          A structured 7-day report for your next appointment, generated from your check-ins and
          wearable data.
        </Body>

        {!report && (
          <Button
            label="Generate Report"
            onPress={handleGenerate}
            loading={generating}
            style={styles.generateBtn}
          />
        )}

        {generating && (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.primary} />
            <Body color={colors.textSecondary}>Preparing your summary...</Body>
          </View>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Body color={colors.error}>{error}</Body>
          </Card>
        )}

        {report && (
          <View style={styles.reportContent}>
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <H3 color={colors.primary}>{report.sessionCount}</H3>
                  <BodySmall>Sessions</BodySmall>
                </View>
                <View style={styles.stat}>
                  <H3 color={colors.primary}>{report.averageMoodScore}</H3>
                  <BodySmall>Avg mood</BodySmall>
                </View>
                <View style={styles.stat}>
                  <H3 color={colors.primary}>7</H3>
                  <BodySmall>Days covered</BodySmall>
                </View>
              </View>
            </Card>

            <TrendChartFull snapshots={snapshots} />

            {report.wearableTrendNarrative ? (
              <Card style={styles.narrativeCard}>
                <Body color={colors.textSecondary} style={styles.narrative}>
                  {report.wearableTrendNarrative}
                </Body>
              </Card>
            ) : null}

            {report.sections.map(section => (
              <ReportSection key={section.key} section={section} />
            ))}

            {report.recommendedDiscussionPoints.length > 0 && (
              <Card style={styles.discussionCard}>
                <H3 style={styles.discussionTitle}>Suggested Discussion Points</H3>
                {report.recommendedDiscussionPoints.map((point, i) => (
                  <View key={i} style={styles.discussionItem}>
                    <View style={styles.discussionBullet} />
                    <Body color={colors.textSecondary} style={{ flex: 1 }}>
                      {point}
                    </Body>
                  </View>
                ))}
              </Card>
            )}

            <Button
              label="Regenerate"
              variant="ghost"
              onPress={handleGenerate}
              loading={generating}
              style={styles.regenerateBtn}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg, lineHeight: 22 },
  generateBtn: { marginBottom: spacing.base },
  loadingBlock: { alignItems: 'center', gap: spacing.base, paddingVertical: spacing.xl },
  errorCard: { backgroundColor: colors.recordingFaint, marginBottom: spacing.base },
  reportContent: { gap: 0 },
  statsCard: { marginBottom: spacing.base },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  narrativeCard: { marginBottom: spacing.base },
  narrative: { lineHeight: 22 },
  discussionCard: { marginBottom: spacing.base },
  discussionTitle: { marginBottom: spacing.base },
  discussionItem: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  discussionBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7, flexShrink: 0 },
  regenerateBtn: { marginTop: spacing.base },
});
