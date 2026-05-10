import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { HealthSnapshot } from '@/types/health';

interface HealthSummaryCardProps {
  snapshot: HealthSnapshot | undefined;
}

function Metric({ label, value, unit, sub }: { label: string; value: string; unit: string; sub?: string }) {
  return (
    <View style={styles.metric} accessibilityLabel={`${label}: ${value} ${unit}`}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

export function HealthSummaryCard({ snapshot }: HealthSummaryCardProps) {
  if (!snapshot) {
    return (
      <Card style={styles.card}>
        <Text style={styles.empty}>No health data available today.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Today's Body</Text>
      <View style={styles.grid}>
        <Metric label="Sleep" value={String(snapshot.sleep.durationHours)} unit="hrs" sub={snapshot.sleep.quality} />
        <Metric label="HRV" value={String(snapshot.hrv.morningHRV)} unit="ms" sub={snapshot.hrv.trend.replace(/_/g, ' ')} />
        <Metric label="Resting HR" value={String(snapshot.restingHeartRate)} unit="bpm" />
        <Metric label="Steps" value={snapshot.stepCount.toLocaleString()} unit="" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.base },
  title: { fontSize: 10, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flex: 1, minWidth: '44%', backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12 },
  metricLabel: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  metricValue: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, lineHeight: 26 },
  metricUnit: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  metricSub: { fontSize: 9, color: colors.textTertiary, fontWeight: '600', marginTop: 2 },
  empty: { fontSize: 13, color: colors.textTertiary },
});