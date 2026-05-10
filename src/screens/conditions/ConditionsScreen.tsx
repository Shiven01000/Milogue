import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  H2,
  H3,
  Body,
  BodySmall,
  Caption,
  Label,
} from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import {
  ConditionBlurb,
  ConditionExplanation,
  ConditionFollowupQA,
  ConditionId,
  ConditionLanguageCode,
  ExploreResult,
} from '@/types/conditions';
import { chatCompletion, chatCompletionJSON } from '@/api/openai';
import {
  buildConditionExploreMessages,
  buildConditionExplanationMessages,
  buildConditionFollowupMessages,
} from '@/api/prompts';
import { useMemoryStore } from '@/store/memoryStore';
import { getLanguageName } from '@/constants/languages';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';


// ─── Explore Section ──────────────────────────────────────────

function ExploreSection({
  language,
  conditions,
  onNavigateToCondition,
}: {
  language: string;
  conditions: ConditionId[];
  onNavigateToCondition: (id: ConditionId) => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [error, setError] = useState('');
  const [expandedBlurb, setExpandedBlurb] =
    useState<string | null>(null);

  const handleAsk = useCallback(async () => {
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    setError('');
    setExpandedBlurb(null);

    try {
      const conditionNames = conditions.map(c => c.name).join(', ');
      const messages = buildConditionExploreMessages(q, language, conditionNames);
      const raw = await chatCompletionJSON(
        messages,
        OPENAI_API_KEY,
        { maxTokens: 1024, temperature: 0.3 },
      );
      const parsed = JSON.parse(raw) as ExploreResult;
      setResult(parsed);
    } catch {
      setError(
        'Could not get a response. Please check your connection.',
      );
    } finally {
      setLoading(false);
    }
  }, [input, language, conditions]);

  const handleBlurbTap = (conditionId: string) => {
    setExpandedBlurb(prev =>
      prev === conditionId ? null : conditionId,
    );
  };

  const handleNavigate = (conditionName: string) => {
    const match =
      conditions.find(
        c => c.name.toLowerCase() === conditionName.toLowerCase(),
      ) ?? {
        id: conditionName.toLowerCase().replace(/\s/g, '_'),
        name: conditionName,
      };
    onNavigateToCondition(match);
  };

  return (
    <Card style={styles.exploreCard}>
      <Label style={styles.exploreTitle}>Ask or Explore</Label>
      <BodySmall
        color={colors.textSecondary}
        style={styles.exploreSubtitle}
      >
        Ask a question about a condition, or describe symptoms to
        find related conditions.
      </BodySmall>

      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="e.g. What is OCD? or I feel restless and can't focus..."
        placeholderTextColor={colors.textTertiary}
        style={styles.exploreInput}
        multiline
        returnKeyType="done"
      />

      <Button
        label={loading ? 'Thinking...' : 'Ask'}
        onPress={handleAsk}
        disabled={loading || !input.trim()}
        loading={loading}
      />

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Caption color={colors.textSecondary}>
            Finding relevant information...
          </Caption>
        </View>
      )}

      {error !== '' && (
        <Caption color={colors.error} style={styles.exploreError}>
          {error}
        </Caption>
      )}

      {result && result.type === 'question' && result.answer && (
        <View style={styles.answerBlock}>
          <Body
            color={colors.textSecondary}
            style={styles.answerText}
          >
            {result.answer}
          </Body>
        </View>
      )}

      {result &&
        result.type === 'symptoms' &&
        result.matchedConditions && (
          <View style={styles.matchBlock}>
            <Caption
              color={colors.textSecondary}
              style={styles.matchLabel}
            >
              Conditions with related symptoms:
            </Caption>
            {result.matchedConditions.map(c => (
              <View key={c.conditionId} style={styles.blurbCard}>
                <TouchableOpacity
                  onPress={() => handleBlurbTap(c.conditionId)}
                  activeOpacity={0.8}
                  style={styles.blurbHeader}
                >
                  <Body style={styles.blurbName}>
                    {c.conditionName}
                  </Body>
                  <Caption color={colors.primary}>
                    {expandedBlurb === c.conditionId
                      ? '▲'
                      : '▼'}
                  </Caption>
                </TouchableOpacity>

                {expandedBlurb === c.conditionId && (
                  <View style={styles.blurbExpanded}>
                    <BodySmall
                      color={colors.textSecondary}
                      style={styles.blurbText}
                    >
                      {c.blurb}
                    </BodySmall>
                    <TouchableOpacity
                      onPress={() => handleNavigate(c.conditionName)}
                      activeOpacity={0.8}
                      style={styles.learnMoreBtn}
                    >
                      <Caption color={colors.primary}>
                        Learn more about {c.conditionName} →
                      </Caption>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
    </Card>
  );
}

// ─── Condition Card ───────────────────────────────────────────

function ConditionCard({
  condition,
  onPress,
}: {
  condition: ConditionId;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Learn about ${condition.name}`}
    >
      <Card style={styles.conditionCard}>
        <View style={styles.conditionRow}>
          <View style={styles.conditionInfo}>
            <H3>{condition.name}</H3>
            <Caption color={colors.textTertiary}>
              Tap to learn more
            </Caption>
          </View>
          <Caption color={colors.primary}>›</Caption>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Detail View ──────────────────────────────────────────────

function ConditionDetailView({
  condition,
  languageName,
  onBack,
}: {
  condition: ConditionId;
  languageName: string;
  onBack: () => void;
}) {
  const [explanation, setExplanation] =
    useState<ConditionExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [followups, setFollowups] = useState<ConditionFollowupQA[]>(
    [],
  );
  const [followupLoading, setFollowupLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setExplanationLoading(true);
    setExplanation(null);
    setFollowups([]);

    const generate = async () => {
      try {
        const messages = buildConditionExplanationMessages(
          condition.name,
          languageName,
        );
        const raw = await chatCompletionJSON(
          messages,
          OPENAI_API_KEY,
          { maxTokens: 1024, temperature: 0.2 },
        );
        const parsed = JSON.parse(raw) as ConditionExplanation;
        if (!cancelled) setExplanation(parsed);
      } catch {
        if (!cancelled) {
          setExplanation({
            conditionId: condition.id,
            conditionName: condition.name,
            whatItIs: {
              title: 'What it is',
              content:
                'Could not load explanation. Please check your connection and try again.',
            },
            symptoms: { title: 'Symptoms', items: [] },
            disclaimer:
              'This feature is for education only and does not replace professional advice.',
          });
        }
      } finally {
        if (!cancelled) setExplanationLoading(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [condition, languageName]);

  const handleAsk = useCallback(async () => {
    if (!explanation) return;
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    setFollowupLoading(true);
    const now = Date.now();

    try {
      const messages = buildConditionFollowupMessages(
        condition.name,
        explanation,
        q,
        languageName,
      );
      const answer = await chatCompletion(
        messages,
        OPENAI_API_KEY,
        { temperature: 0.4, maxTokens: 256 },
      );
      setFollowups(prev => [
        ...prev,
        { id: `fu_${now}`, question: q, answer, askedAt: now },
      ]);
    } catch {
      setFollowups(prev => [
        ...prev,
        {
          id: `fu_${now}`,
          question: q,
          answer:
            'Sorry, I had trouble connecting. Please try again.',
          askedAt: now,
        },
      ]);
    } finally {
      setFollowupLoading(false);
    }
  }, [explanation, question, languageName, condition]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          style={styles.backRow}
        >
          <Caption color={colors.primary}>← Back</Caption>
        </TouchableOpacity>

        <View style={styles.detailTitleRow}>
          <H2>{condition.name}</H2>
        </View>

        {languageName !== 'English' && (
          <View style={styles.langPill}>
            <Caption style={styles.langPillText}>🌐  {languageName}</Caption>
          </View>
        )}

        {explanationLoading || !explanation ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Caption color={colors.textSecondary}>
              Loading explanation...
            </Caption>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <H3>{explanation.whatItIs.title}</H3>
              <Body color={colors.textSecondary}>
                {explanation.whatItIs.content}
              </Body>
            </View>

            <View style={styles.section}>
              <H3>{explanation.symptoms.title}</H3>
              {explanation.symptoms.items.map(
                (s, idx) => (
                  <BodySmall
                    key={idx}
                    color={colors.textSecondary}
                    style={styles.bulletRow}
                  >
                    • {s}
                  </BodySmall>
                ),
              )}
            </View>

            <Card style={styles.followupCard}>
              <H3 style={styles.followupTitle}>
                Have a question?
              </H3>
              <Body
                color={colors.textSecondary}
                style={styles.followupSubtitle}
              >
                Ask anything about what this condition is or what
                its symptoms mean.
              </Body>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Type your question"
                placeholderTextColor={colors.textTertiary}
                style={styles.questionInput}
                multiline
              />
              <View style={styles.askRow}>
                <Button
                  label={
                    followupLoading ? 'Sending...' : 'Ask'
                  }
                  onPress={handleAsk}
                  disabled={followupLoading}
                  loading={followupLoading}
                  style={styles.askBtn}
                />
              </View>
              {followups.length > 0 && (
                <View style={styles.followupList}>
                  {followups
                    .slice()
                    .reverse()
                    .map(fu => (
                      <View
                        key={fu.id}
                        style={styles.followupItem}
                      >
                        <Body style={styles.followupQ}>
                          {fu.question}
                        </Body>
                        <Body
                          color={colors.textSecondary}
                          style={styles.followupA}
                        >
                          {fu.answer}
                        </Body>
                      </View>
                    ))}
                </View>
              )}
            </Card>

            <Card style={styles.disclaimerCard}>
              <H3 style={styles.disclaimerTitle}>
                Important note
              </H3>
              <Body color={colors.textSecondary}>
                {explanation.disclaimer}
              </Body>
            </Card>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export function ConditionsScreen() {
  const { memory, isLoaded } = useMemoryStore();
  const [selected, setSelected] = useState<ConditionId | null>(null);
  const language = memory.preferredLanguage ?? 'en';
  const languageName = getLanguageName(language);

  const patientConditions: ConditionId[] = memory.conditions.map(name => ({
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name,
  }));

  if (selected) {
    return (
      <SafeAreaView style={styles.safe}>
        <ConditionDetailView
          condition={selected}
          languageName={languageName}
          onBack={() => setSelected(null)}
        />
      </SafeAreaView>
    );
  }

  if (isLoaded && patientConditions.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <H2 style={styles.title}>My Conditions</H2>
          <Card style={styles.emptyCard}>
            <Body
              color={colors.textSecondary}
              style={styles.emptyText}
            >
              No conditions have been recorded yet. Ask your doctor
              to update your profile.
            </Body>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <H2 style={styles.title}>My Conditions</H2>
        <Body color={colors.textSecondary} style={styles.subtitle}>
          Learn about your diagnosed conditions in simple language.
        </Body>

        <ExploreSection
          language={languageName}
          conditions={patientConditions}
          onNavigateToCondition={setSelected}
        />

        <View style={styles.divider} />

        <Label style={styles.listTitle}>Your Conditions</Label>
        {patientConditions.map(condition => (
          <ConditionCard
            key={condition.id}
            condition={condition}
            onPress={() => setSelected(condition)}
          />
        ))}

        <Card style={styles.bottomDisclaimer}>
          <Caption
            color={colors.textTertiary}
            style={styles.disclaimerText}
          >
            This page is for educational purposes only. The
            information provided does not constitute medical advice
            and should not be used to self-diagnose. Always consult
            a qualified healthcare professional for personal
            guidance.
          </Caption>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { lineHeight: 22 },

  // Explore section
  exploreCard: { gap: spacing.sm },
  exploreTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  exploreSubtitle: { lineHeight: 20, marginBottom: spacing.xs },
  exploreInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 80,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: 15,
  },
  exploreError: { marginTop: spacing.xs },
  answerBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerText: { lineHeight: 22 },
  matchBlock: { marginTop: spacing.sm, gap: spacing.xs },
  matchLabel: { marginBottom: spacing.xs },
  blurbCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  blurbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  blurbName: { fontWeight: '600', flex: 1 },
  blurbExpanded: {
    padding: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  blurbText: { lineHeight: 20 },
  learnMoreBtn: { alignSelf: 'flex-start' },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  listTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Condition list
  conditionCard: { marginBottom: 0 },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  conditionInfo: { flex: 1, gap: 2 },

  // Language pill (in detail view)
  langPill: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  langPillText: { color: colors.primary, fontWeight: '700' },

  // Detail view
  backRow: { marginBottom: spacing.base },
  detailTitleRow: { marginBottom: spacing.base },
  translateCard: { gap: spacing.sm },
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  translateBtn: { marginTop: spacing.sm },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
  },

  // Sections
  section: { gap: spacing.xs, paddingVertical: spacing.sm },
  bulletRow: { marginTop: 3, lineHeight: 20 },

  // Follow-up
  followupCard: {
    padding: spacing.base,
    marginTop: spacing.base,
    gap: spacing.sm,
  },
  followupTitle: { marginBottom: 0 },
  followupSubtitle: { marginTop: -spacing.sm, lineHeight: 22 },
  questionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 90,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  askRow: { flexDirection: 'row', alignItems: 'center' },
  askBtn: { flex: 1 },
  followupList: { marginTop: spacing.base, gap: spacing.sm },
  followupItem: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  followupQ: { fontWeight: '600' },
  followupA: { lineHeight: 22 },

  // Disclaimer
  disclaimerCard: {
    padding: spacing.base,
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  disclaimerTitle: { marginBottom: 0 },
  bottomDisclaimer: { marginTop: spacing.xs },
  disclaimerText: { lineHeight: 18, textAlign: 'center' },

  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
