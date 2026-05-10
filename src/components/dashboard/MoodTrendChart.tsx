import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { CheckinSession } from '@/types/checkin';

const { width } = Dimensions.get('window');
const CHART_W = width - spacing.base * 4;
const CHART_H = 80;

export function MoodTrendChart({ sessions }: { sessions: CheckinSession[] }) {
  if (sessions.length < 2) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Mood This Week</Text>
        <Text style={styles.empty}>Complete a few check-ins to see your mood trend.</Text>
      </Card>
    );
  }

  const last7 = sessions.slice(-7);
  const scores = last7.map(s => s.moodScoreAtStart);
  const pad = 10;

  const pts = scores.map((score, i) => ({
    x: pad + (i / (scores.length - 1)) * (CHART_W - pad * 2),
    y: pad + (CHART_H - pad * 2) - ((score - 1) / 9) * (CHART_H - pad * 2),
  }));

  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const areaPath = linePath + ` L ${pts[pts.length - 1].x},${CHART_H} L ${pts[0].x},${CHART_H} Z`;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Mood This Week</Text>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.chartLine} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={colors.chartLine} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#moodFill)" />
        <Path d={linePath} stroke={colors.chartLine} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y}
            r={i === pts.length - 1 ? 5 : 4}
            fill={i === pts.length - 1 ? colors.primary : colors.chartLine}
            stroke={i === pts.length - 1 ? '#fff' : 'none'}
            strokeWidth={i === pts.length - 1 ? 2 : 0}
          />
        ))}
      </Svg>
      <View style={styles.labels}>
        {last7.map((s, i) => (
          <Text key={i} style={styles.dayLabel}>
            {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })[0]}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.base },
  title: { fontSize: 10, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  empty: { fontSize: 13, color: colors.textTertiary, paddingVertical: spacing.base, textAlign: 'center' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  dayLabel: { fontSize: 9, color: colors.textTertiary, fontWeight: '700' },
});