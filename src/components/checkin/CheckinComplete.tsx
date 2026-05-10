import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { H2, Body, BodySmall, Label } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { TLICCCoverage } from '@/types/checkin';
import { TLICC_DIMENSIONS } from '@/constants/tlicc';

interface CheckinCompleteProps {
  emotionTags: string[];
  tliccCoverage: TLICCCoverage;
  summary: string;
  onDone: () => void;
}

export function CheckinComplete({ emotionTags, tliccCoverage, summary, onDone }: CheckinCompleteProps) {
  const coveredCount = Object.values(tliccCoverage).filter(Boolean).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H2 style={styles.title}>Check-in complete</H2>
      <Body color={colors.textSecondary} style={styles.summary}>{summary}</Body>

      {emotionTags.length > 0 && (
        <Card style={styles.section}>
          <Label style={styles.sectionLabel}>Emotions you shared</Label>
          <View style={styles.tagRow}>
            {emotionTags.map(tag => (
              <View key={tag} style={styles.tag}>
                <BodySmall color={colors.primary}>{tag}</BodySmall>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card style={styles.section}>
        <Label style={styles.sectionLabel}>Topics covered ({coveredCount}/5)</Label>
        <View style={styles.tliccGrid}>
          {TLICC_DIMENSIONS.map(dim => (
            <View key={dim.key} style={styles.tliccItem}>
              <View
                style={[styles.tliccDot, tliccCoverage[dim.key] ? styles.tliccDotFilled : null]}
              />
              <BodySmall color={tliccCoverage[dim.key] ? colors.primary : colors.textTertiary}>
                {dim.label}
              </BodySmall>
            </View>
          ))}
        </View>
      </Card>

      <Button label="Done" onPress={onDone} style={styles.button} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.sm,
  },
  summary: {
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primaryFaint,
    borderRadius: 20,
  },
  tliccGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tliccItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  tliccDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  tliccDotFilled: {
    backgroundColor: colors.primary,
  },
  button: {
    marginTop: spacing.lg,
  },
});
