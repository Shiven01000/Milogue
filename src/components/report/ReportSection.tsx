import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { H3, Body, BodySmall, Label } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { ReportSection as ReportSectionType } from '@/types/report';

interface ReportSectionProps {
  section: ReportSectionType;
  defaultExpanded?: boolean;
}

export function ReportSection({ section, defaultExpanded = false }: ReportSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${section.title}, ${expanded ? 'collapse' : 'expand'}`}
        style={styles.header}
      >
        <H3 style={styles.title}>{section.title}</H3>
        <Label color={colors.primary}>{expanded ? '−' : '+'}</Label>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Body color={colors.textSecondary} style={styles.summary}>
            {section.summary}
          </Body>

          {section.keyFindings.length > 0 && (
            <View style={styles.findings}>
              <Label style={styles.findingsLabel}>Key Findings</Label>
              {section.keyFindings.map((finding, i) => (
                <View key={i} style={styles.finding}>
                  <View style={styles.bullet} />
                  <BodySmall style={styles.findingText}>{finding}</BodySmall>
                </View>
              ))}
            </View>
          )}

          {section.dataPoints && section.dataPoints.length > 0 && (
            <View style={styles.dataPoints}>
              {section.dataPoints.map((dp, i) => (
                <View key={i} style={styles.dataPoint}>
                  <BodySmall color={colors.primary}>{dp}</BodySmall>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
  },
  content: {
    marginTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.base,
  },
  summary: {
    lineHeight: 22,
    marginBottom: spacing.base,
  },
  findings: {
    gap: spacing.sm,
  },
  findingsLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  finding: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  findingText: {
    flex: 1,
    lineHeight: 20,
  },
  dataPoints: {
    marginTop: spacing.base,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dataPoint: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
  },
});
