import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card } from '@/components/common/Card';
import { Label, Caption } from '@/components/common/Typography';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { HealthSnapshot } from '@/types/health';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 100;

interface TrendChartFullProps {
  snapshots: HealthSnapshot[];
}

export function TrendChartFull({ snapshots }: TrendChartFullProps) {
  const last30 = snapshots.slice(-30);
  if (last30.length === 0) return null;

  const maxHRV = Math.max(...last30.map(s => s.hrv.morningHRV));
  const minHRV = Math.min(...last30.map(s => s.hrv.morningHRV));
  const range = maxHRV - minHRV || 1;

  return (
    <Card style={styles.card}>
      <Label style={styles.title}>30-Day HRV Trend</Label>
      <View style={styles.chart} accessibilityLabel="30 day heart rate variability trend chart">
        {last30.map((s, i) => {
          const barHeight = ((s.hrv.morningHRV - minHRV) / range) * CHART_HEIGHT + 8;
          return (
            <View
              key={s.id}
              style={[styles.bar, { height: barHeight, backgroundColor: getHRVColor(s.hrv.trend) }]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.moodHigh }]} />
          <Caption>Above avg</Caption>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.moodMid }]} />
          <Caption>Average</Caption>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.moodLow }]} />
          <Caption>Below avg</Caption>
        </View>
      </View>
    </Card>
  );
}

function getHRVColor(trend: string): string {
  if (trend.includes('above')) return colors.moodHigh;
  if (trend.includes('below')) return colors.moodLow;
  return colors.moodMid;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.base,
  },
  title: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chart: {
    height: CHART_HEIGHT + 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    padding: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
