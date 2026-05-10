import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, H3, Body, BodySmall, Caption } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { loadAllSessions } from '@/services/storage/checkinStorage';
import { CheckinSession } from '@/types/checkin';
import { formatDisplayDate, groupByWeek } from '@/utils/dateUtils';

function MoodDot({ score }: { score: number }) {
  const color = score <= 3 ? colors.moodLow : score <= 6 ? colors.moodMid : colors.moodHigh;
  return <View style={[styles.moodDot, { backgroundColor: color }]} />;
}

function SessionRow({ session }: { session: CheckinSession }) {
  return (
    <View style={styles.sessionRow}>
      <MoodDot score={session.moodScoreAtStart} />
      <View style={styles.sessionInfo}>
        <BodySmall style={styles.sessionDate}>{formatDisplayDate(session.date)}</BodySmall>
        {session.emotionTags.length > 0 && (
          <Caption color={colors.textTertiary}>{session.emotionTags.slice(0, 3).join(' · ')}</Caption>
        )}
        {session.sessionSummary ? (
          <Caption color={colors.textSecondary} style={styles.summary} numberOfLines={2}>
            {session.sessionSummary}
          </Caption>
        ) : null}
      </View>
      <Caption>{session.moodScoreAtStart}/10</Caption>
    </View>
  );
}

export function HistoryScreen() {
  const [sessions, setSessions] = useState<CheckinSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAllSessions().then(all =>
        setSessions(all.sort((a, b) => b.date.localeCompare(a.date)))
      );
    }, [])
  );

  if (sessions.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <H3>No check-ins yet</H3>
          <Body color={colors.textSecondary} style={styles.emptyBody}>
            Complete your first check-in to see your history here.
          </Body>
        </View>
      </SafeAreaView>
    );
  }

  const groups = groupByWeek(sessions.map(s => s.date));
  const weekKeys = Object.keys(groups).sort().reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={weekKeys}
        keyExtractor={k => k}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<H2 style={styles.title}>Check-in History</H2>}
        renderItem={({ item: weekStart }) => {
          const weekSessions = groups[weekStart]
            .map(date => sessions.find(s => s.date === date)!)
            .filter(Boolean)
            .sort((a, b) => b.date.localeCompare(a.date));

          return (
            <View style={styles.weekGroup}>
              <Caption style={styles.weekLabel}>
                Week of {formatDisplayDate(weekStart)}
              </Caption>
              <Card padded={false}>
                {weekSessions.map((session, i) => (
                  <View key={session.id}>
                    <SessionRow session={session} />
                    {i < weekSessions.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </Card>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.base, paddingBottom: spacing.xxl },
  title: { marginBottom: spacing.base },
  weekGroup: { marginBottom: spacing.base },
  weekLabel: { marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.base,
    gap: spacing.sm,
  },
  moodDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  sessionInfo: { flex: 1, gap: 2 },
  sessionDate: { fontWeight: '600' },
  summary: { lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.base },
  empty: { flex: 1, padding: spacing.base, justifyContent: 'center' },
  emptyBody: { marginTop: spacing.sm, lineHeight: 22 },
});
