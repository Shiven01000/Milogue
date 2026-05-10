import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, H3, Body, BodySmall, Caption } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { loadAllSessions } from '@/services/storage/checkinStorage';
import { CheckinSession, TLICCCoverage } from '@/types/checkin';
import { formatDisplayDate, groupByWeek } from '@/utils/dateUtils';

const TLICC_KEYS: { label: string; key: keyof TLICCCoverage }[] = [
  { label: 'Time', key: 'time' },
  { label: 'Location', key: 'location' },
  { label: 'Intensity', key: 'intensity' },
  { label: 'Context', key: 'context' },
  { label: 'Change', key: 'change' },
];

function MoodDot({ score }: { score: number }) {
  const color = score <= 3 ? colors.moodLow : score <= 6 ? colors.moodMid : colors.moodHigh;
  return <View style={[styles.moodDot, { backgroundColor: color }]} />;
}

function SessionRow({ session }: { session: CheckinSession }) {
  const [expanded, setExpanded] = useState(false);

  const durationMin =
    session.completedAt && session.startedAt
      ? Math.round((session.completedAt - session.startedAt) / 60000)
      : null;

  const userMessages = session.messages.filter(m => m.role === 'user');

  return (
    <View>
      <TouchableOpacity
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.72}
        style={styles.sessionRow}
      >
        <MoodDot score={session.moodScoreAtStart} />
        <View style={styles.sessionInfo}>
          <BodySmall style={styles.sessionDate}>{formatDisplayDate(session.date)}</BodySmall>
          {session.emotionTags.length > 0 && (
            <Caption color={colors.textTertiary}>
              {session.emotionTags.slice(0, 3).join(' · ')}
            </Caption>
          )}
          {session.sessionSummary ? (
            <Caption
              color={colors.textSecondary}
              style={styles.summary}
              numberOfLines={expanded ? undefined : 2}
            >
              {session.sessionSummary}
            </Caption>
          ) : null}
        </View>
        <View style={styles.rowRight}>
          <Caption>{session.moodScoreAtStart}/10</Caption>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedPanel}>
          {/* T-LICC coverage */}
          <View style={styles.tliccRow}>
            {TLICC_KEYS.map(({ label, key }) => {
              const hit = session.tliccCoverage[key];
              return (
                <View key={key} style={[styles.tliccBadge, hit ? styles.tliccBadgeHit : styles.tliccBadgeMiss]}>
                  <Text style={[styles.tliccCheck, hit ? styles.tliccCheckHit : styles.tliccCheckMiss]}>
                    {hit ? '✓' : '✗'}
                  </Text>
                  <Text style={[styles.tliccLabel, hit ? styles.tliccLabelHit : styles.tliccLabelMiss]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {durationMin !== null && (
              <Caption style={styles.statChip}>{durationMin} min</Caption>
            )}
            {session.moodScoreAtEnd !== undefined && (
              <Caption style={styles.statChip}>
                Mood {session.moodScoreAtStart} → {session.moodScoreAtEnd}
              </Caption>
            )}
            {session.sessionAvgHR !== undefined && (
              <Caption style={styles.statChip}>
                ♥ {Math.round(session.sessionAvgHR)} bpm
              </Caption>
            )}
          </View>

          {/* All emotion tags */}
          {session.emotionTags.length > 0 && (
            <View style={styles.tagsRow}>
              {session.emotionTags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Caption style={styles.tagText}>{tag}</Caption>
                </View>
              ))}
            </View>
          )}

          {/* Conversation transcript */}
          {userMessages.length > 0 && (
            <View style={styles.transcriptSection}>
              <Caption style={styles.transcriptLabel}>YOUR WORDS</Caption>
              {userMessages.map((m, i) => (
                <View key={i} style={styles.transcriptBubble}>
                  <Caption color={colors.textSecondary} style={styles.transcriptText}>
                    {m.content}
                  </Caption>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
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
  rowRight: { alignItems: 'flex-end', gap: 4 },
  chevron: { fontSize: 9, color: colors.textTertiary },
  moodDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  sessionInfo: { flex: 1, gap: 2 },
  sessionDate: { fontWeight: '600' },
  summary: { lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.base },
  empty: { flex: 1, padding: spacing.base, justifyContent: 'center' },
  emptyBody: { marginTop: spacing.sm, lineHeight: 22 },

  // Expanded panel
  expandedPanel: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // T-LICC
  tliccRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: spacing.sm },
  tliccBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tliccBadgeHit: { backgroundColor: colors.primaryFaint, borderColor: colors.primary + '44' },
  tliccBadgeMiss: { backgroundColor: colors.overlayLight, borderColor: colors.border },
  tliccCheck: { fontSize: 10, fontWeight: '800' },
  tliccCheckHit: { color: colors.primary },
  tliccCheckMiss: { color: colors.textTertiary },
  tliccLabel: { fontSize: 10, fontWeight: '700' },
  tliccLabelHit: { color: colors.primary },
  tliccLabelMiss: { color: colors.textTertiary },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statChip: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textSecondary,
  },

  // Tags
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: colors.primary + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { color: colors.primary, fontWeight: '700' },

  // Transcript
  transcriptSection: { gap: 6 },
  transcriptLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  transcriptBubble: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptText: { lineHeight: 18 },
});
