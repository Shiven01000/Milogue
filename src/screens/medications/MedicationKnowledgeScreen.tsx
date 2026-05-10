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
import { H2, H3, Body, BodySmall, Caption } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { MedicationCandidate, MedicationExplanation, MedicationLanguageCode } from '@/types/medication';
import { getMedicationSafetyBlockedMessage, isUnsafeMedicationQuestion } from '@/utils/medicationSafety';
import { chatCompletion, chatCompletionJSON } from '@/api/openai';
import {
  buildMedicationExplanationFromCandidateMessages,
  buildMedicationExplanationMessages,
  buildMedicationFollowupMessages,
  buildMedicationTranslationMessages,
} from '@/api/prompts';
import {
  fetchMedicationEntryFromOpenFda,
  searchMedicationCandidatesFromOpenFda,
  searchMedicationCandidatesWithAI,
  fetchMedicationEntryWithAI,
} from '@/services/medications/openFdaService';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const LANGUAGE_OPTIONS: Array<{ code: MedicationLanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
];

function labelForLanguage(code: MedicationLanguageCode): string {
  return LANGUAGE_OPTIONS.find(o => o.code === code)?.label ?? 'English';
}

function buildFallbackExplanation(candidate: MedicationCandidate): MedicationExplanation {
  return {
    medicationId: candidate.id,
    medicationName: candidate.name,
    brandNames: candidate.brandNames,
    whatItDoes: {
      title: 'What it does',
      content:
        'I can help explain this medicine in simple language, but to give accurate, medicine-specific details I need an AI response. If you have an OpenAI API key configured, select the medicine again and try generating the explanation.',
    },
    whyDoctorsPrescribe: {
      title: 'Why doctors prescribe it',
      content:
        'Doctors prescribe medicines based on the condition they are treating and the person’s health history. For safe, personal guidance about why this was chosen for you, ask your doctor or pharmacist.',
    },
    commonSideEffects: {
      title: 'Common side effects',
      items: ['Side effects vary by person. Ask your pharmacist what side effects to expect for your specific prescription.'],
    },
    seriousSideEffects: {
      title: 'Serious side effects',
      items: ['Get urgent medical help if you have severe or alarming symptoms.'],
      contactDoctorText: 'If you notice serious symptoms, contact your doctor or seek urgent care.',
    },
    questionsToAskPharmacistOrDoctor: {
      title: 'Questions to ask your pharmacist/doctor',
      items: [
        'What condition is this medicine for in my case?',
        'What common side effects should I watch for?',
        'Are there any interactions with my other medicines?',
      ],
    },
    safetyDisclaimer:
      'This feature is for understanding your medication only. It does not replace advice from your doctor or pharmacist.',
  };
}

function MedicationTitle({ entry }: { entry: MedicationCandidate }) {
  return (
    <View style={styles.medTitleBlock}>
      <H3 style={styles.medName}>{entry.name}</H3>
      {entry.brandNames.length > 0 ? (
        <Caption color={colors.textSecondary}>Common brands: {entry.brandNames.join(', ')}</Caption>
      ) : null}
    </View>
  );
}

function LanguageDropdown({
  value,
  onChange,
}: {
  value: MedicationLanguageCode;
  onChange: (next: MedicationLanguageCode) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.langWrap}>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        style={styles.langButton}
        accessibilityRole="button"
        accessibilityLabel="Select language"
      >
        <Body style={styles.langButtonText}>{labelForLanguage(value)}</Body>
        <Caption color={colors.textTertiary} style={styles.langCaret}>
          {open ? '▲' : '▼'}
        </Caption>
      </TouchableOpacity>

      {open && (
        <Card style={styles.langMenu} padded={false}>
          {LANGUAGE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.code}
              onPress={() => {
                onChange(opt.code);
                setOpen(false);
              }}
              style={styles.langMenuItem}
              accessibilityRole="button"
              accessibilityLabel={`Language: ${opt.label}`}
            >
              <Body style={{ color: opt.code === value ? colors.primary : colors.textPrimary }}>
                {opt.label}
              </Body>
            </TouchableOpacity>
          ))}
        </Card>
      )}
    </View>
  );
}

export function MedicationKnowledgeScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MedicationCandidate | null>(null);

  const [candidates, setCandidates] = useState<MedicationCandidate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [baseExplanation, setBaseExplanation] = useState<MedicationExplanation | null>(null);
  const [translatedExplanation, setTranslatedExplanation] = useState<MedicationExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const [language, setLanguage] = useState<MedicationLanguageCode>('en');
  const [translationLoading, setTranslationLoading] = useState(false);

  const [question, setQuestion] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followups, setFollowups] = useState<Array<{ id: string; question: string; answer: string; askedAt: number }>>([]);

  const displayedExplanation = useMemo(() => {
    if (!baseExplanation) return null;
    if (language === 'en') return baseExplanation;
    return translatedExplanation ?? baseExplanation;
  }, [baseExplanation, translatedExplanation, language]);

  const handleSelect = useCallback((candidate: MedicationCandidate) => {
    setSelected(candidate);
    setBaseExplanation(null);
    setTranslatedExplanation(null);
    setExplanationLoading(false);
    setQuestion('');
    setFollowups([]);
    setLanguage('en');
  }, []);

  // Search for mental health medications using AI.
  useEffect(() => {
    if (selected) return;

    const q = query.trim();
    if (!q) {
      setCandidates([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        if (!OPENAI_API_KEY) {
          setCandidates([]);
          setSearchError('OpenAI API key required for medication search.');
          return;
        }

        const next = await searchMedicationCandidatesWithAI(q, OPENAI_API_KEY);
        if (!cancelled) {
          setCandidates(next);
          if (next.length === 0) {
            setSearchError('No mental health medication matches found. Try different search terms.');
          }
        }
      } catch {
        if (!cancelled) {
          setCandidates([]);
          setSearchError('Could not perform medication search. Please try again.');
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, selected]);

  useEffect(() => {
    if (!selected) return;

    let cancelled = false;

    const generate = async () => {
      setExplanationLoading(true);
      try {
        if (!OPENAI_API_KEY) {
          if (!cancelled) setBaseExplanation(buildFallbackExplanation(selected));
          return;
        }

        // Use AI to generate explanation directly from candidate
        const messages = buildMedicationExplanationFromCandidateMessages(selected);
        const raw = await chatCompletionJSON(messages, OPENAI_API_KEY, { maxTokens: 1024, temperature: 0.2 });
        const parsed = JSON.parse(raw) as MedicationExplanation;
        if (!cancelled) setBaseExplanation(parsed);
      } catch {
        if (!cancelled) setBaseExplanation(buildFallbackExplanation(selected));
      } finally {
        if (!cancelled) setExplanationLoading(false);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const handleTranslate = useCallback(async () => {
    if (!baseExplanation) return;
    if (language === 'en') {
      setTranslatedExplanation(null);
      return;
    }

    setTranslationLoading(true);
    try {
      if (!OPENAI_API_KEY) {
        // Without an API key we cannot translate; keep showing English until translation succeeds.
        setTranslatedExplanation(null);
        return;
      }

      const messages = buildMedicationTranslationMessages(baseExplanation, language);
      const raw = await chatCompletionJSON(messages, OPENAI_API_KEY, { maxTokens: 1024, temperature: 0.3 });
      const parsed = JSON.parse(raw) as MedicationExplanation;
      setTranslatedExplanation(parsed);
    } catch {
      setTranslatedExplanation(null);
    } finally {
      setTranslationLoading(false);
    }
  }, [baseExplanation, language]);

  const handleAsk = useCallback(async () => {
    if (!selected || !baseExplanation) return;
    const q = question.trim();
    if (!q) return;

    setQuestion('');

    const unsafe = isUnsafeMedicationQuestion(q);
    const now = Date.now();

    if (unsafe.unsafe) {
      const answer = getMedicationSafetyBlockedMessage();
      setFollowups(prev => [...prev, { id: `fu_${now}`, question: q, answer, askedAt: now }]);
      return;
    }

    setFollowupLoading(true);
    try {
      if (!OPENAI_API_KEY) {
        setFollowups(prev => [
          ...prev,
          {
            id: `fu_${now}`,
            question: q,
            answer:
              'I can explain what medicines and side effects mean in general, but the simplified/translated answer needs an OpenAI API key for full responses. You can still ask your doctor/pharmacist for personalized guidance.',
            askedAt: now,
          },
        ]);
        return;
      }

      const messages = buildMedicationFollowupMessages(selected, baseExplanation, q, language);
      const answer = await chatCompletion(messages, OPENAI_API_KEY, { temperature: 0.4, maxTokens: 256 });
      setFollowups(prev => [...prev, { id: `fu_${now}`, question: q, answer, askedAt: now }]);
    } catch {
      setFollowups(prev => [
        ...prev,
        {
          id: `fu_${now}`,
          question: q,
          answer: 'Sorry, I had trouble connecting right now. Please try again.',
          askedAt: now,
        },
      ]);
    } finally {
      setFollowupLoading(false);
    }
  }, [selected, baseExplanation, question, language]);

  if (!selected) {
    const trimmed = query.trim();

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <H2 style={styles.title}>Medication Knowledge</H2>
          <Body color={colors.textSecondary} style={styles.subtitle}>
            Search any medication you want to know about. You can translate the explanation and ask safe follow-up questions.
          </Body>

          <Card style={styles.searchCard}>
            <Caption>Search any medication you want to know about</Caption>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Type a medicine name or brand (e.g., Zoloft)"
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Card>

          {trimmed.length === 0 ? (
            <Card style={styles.emptyCard}>
              <H3 style={styles.emptyTitle}>Type a medicine name</H3>
              <Body color={colors.textSecondary} style={styles.emptyBody}>
                Try generic names (e.g., sertraline) or brand names (e.g., Zoloft).
              </Body>
            </Card>
          ) : searchLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
                <Caption color={colors.textSecondary}>Searching official medication labels...</Caption>
            </View>
          ) : searchError ? (
            <Card style={styles.errorCard}>
              <Body color={colors.error}>{searchError}</Body>
            </Card>
          ) : candidates.length === 0 ? (
            <Card style={styles.emptyCard}>
              <H3>No matches found</H3>
              <Body color={colors.textSecondary} style={styles.emptyBody}>
                Try a different spelling (or a brand name you recognize).
              </Body>
            </Card>
          ) : (
            <View>
              {candidates.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select medicine ${item.name}`}
                  >
                    <Card style={styles.resultCard}>
                      <MedicationTitle entry={item} />
                    </Card>
                  </TouchableOpacity>
                  {idx < candidates.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showEnglishHint = language !== 'en' && !translatedExplanation;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSelected(null)} accessibilityRole="button">
              <Caption color={colors.primary}>← Back</Caption>
            </TouchableOpacity>
          </View>

          <MedicationTitle entry={selected} />

          <Card style={styles.translateCard}>
            <View style={styles.translateRow}>
              <LanguageDropdown value={language} onChange={setLanguage} />
              <View style={{ flex: 1 }} />
            </View>
            {showEnglishHint ? (
              <BodySmall color={colors.textSecondary} style={styles.translateHint}>
                Showing English. Tap `Translate` after generating the explanation.
              </BodySmall>
            ) : null}
            {language !== 'en' && (
              <Button
                label={translationLoading ? 'Translating...' : 'Translate'}
                onPress={handleTranslate}
                disabled={!baseExplanation || translationLoading}
                loading={translationLoading}
                variant="secondary"
                style={styles.translateBtn}
              />
            )}
          </Card>

          {explanationLoading || !displayedExplanation ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Caption color={colors.textSecondary}>Preparing your explanation...</Caption>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <H3>{displayedExplanation.whatItDoes.title}</H3>
                <Body color={colors.textSecondary}>{displayedExplanation.whatItDoes.content}</Body>
              </View>

              <View style={styles.section}>
                <H3>{displayedExplanation.whyDoctorsPrescribe.title}</H3>
                <Body color={colors.textSecondary}>{displayedExplanation.whyDoctorsPrescribe.content}</Body>
              </View>

              <View style={styles.section}>
                <H3>{displayedExplanation.commonSideEffects.title}</H3>
                {displayedExplanation.commonSideEffects.items.map((s, idx) => (
                  <BodySmall key={idx} color={colors.textSecondary} style={styles.bulletRow}>
                    • {s}
                  </BodySmall>
                ))}
              </View>

              <View style={styles.section}>
                <H3>{displayedExplanation.seriousSideEffects.title}</H3>
                {displayedExplanation.seriousSideEffects.items.map((s, idx) => (
                  <BodySmall key={idx} color={colors.textSecondary} style={styles.bulletRow}>
                    • {s}
                  </BodySmall>
                ))}
                {displayedExplanation.seriousSideEffects.contactDoctorText ? (
                  <BodySmall
                    color={colors.textSecondary}
                    style={{ ...styles.bulletRow, ...styles.contactDoctorText }}
                  >
                    {displayedExplanation.seriousSideEffects.contactDoctorText}
                  </BodySmall>
                ) : null}
              </View>

              <View style={styles.section}>
                <H3>{displayedExplanation.questionsToAskPharmacistOrDoctor.title}</H3>
                {displayedExplanation.questionsToAskPharmacistOrDoctor.items.map((s, idx) => (
                  <BodySmall key={idx} color={colors.textSecondary} style={styles.bulletRow}>
                    • {s}
                  </BodySmall>
                ))}
              </View>

              <Card style={styles.followupCard}>
                <H3 style={styles.followupTitle}>Ask a follow-up question</H3>
                <Body color={colors.textSecondary} style={styles.followupSubtitle}>
                  Ask about what side effects mean or why people take this medicine.
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
                    label={followupLoading ? 'Sending...' : 'Ask'}
                    onPress={handleAsk}
                    disabled={followupLoading}
                    loading={followupLoading}
                    style={styles.askBtn}
                  />
                </View>

                {followups.length > 0 && (
                  <View style={styles.followupList}>
                    {followups.slice().reverse().map(fu => (
                      <View key={fu.id} style={styles.followupItem}>
                        <Body style={styles.followupQ}>{fu.question}</Body>
                        <Body color={colors.textSecondary} style={styles.followupA}>
                          {fu.answer}
                        </Body>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </>
          )}

          <Card style={styles.disclaimerCard}>
            <H3 style={styles.disclaimerTitle}>Safety disclaimer</H3>
            <Body color={colors.textSecondary}>{displayedExplanation?.safetyDisclaimer ?? ''}</Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.base },
  title: { marginBottom: spacing.sm },
  subtitle: { lineHeight: 22, marginBottom: spacing.base },
  searchCard: { gap: spacing.sm },
  searchInput: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  resultCard: { padding: spacing.base },
  separator: { height: spacing.sm },
  emptyCard: { padding: spacing.base },
  errorCard: { padding: spacing.base, marginTop: spacing.base, backgroundColor: colors.recordingFaint },
  emptyTitle: { marginBottom: spacing.xs },
  emptyBody: { marginTop: spacing.sm, lineHeight: 22 },
  medInputWrap: { gap: spacing.xs, marginTop: spacing.base },
  medInputLabel: { lineHeight: 16 },
  medInput: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  medButtonsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
  medButton: { flex: 1 },
  medButtonSpacer: { width: spacing.sm },
  medNote: { marginTop: spacing.sm, lineHeight: 18 },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  medTitleBlock: { gap: 4 },
  medName: { marginBottom: 2 },

  translateCard: { gap: spacing.sm },
  translateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  translateBtn: { marginTop: spacing.sm },
  translateHint: { lineHeight: 18, marginTop: spacing.xs },

  langWrap: { position: 'relative', flex: 1 },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  langButtonText: { flex: 1, paddingRight: spacing.sm },
  langCaret: { width: 20, textAlign: 'right' },
  langMenu: { paddingVertical: spacing.xs, marginTop: spacing.xs, overflow: 'hidden' },
  langMenuItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row' },

  loadingWrap: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.base },

  section: { gap: spacing.xs, paddingVertical: spacing.base },
  bulletRow: { marginTop: 3, lineHeight: 20 },
  contactDoctorText: { marginTop: spacing.xs },

  followupCard: { padding: spacing.base, marginTop: spacing.base, gap: spacing.sm },
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
  followupItem: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  followupQ: { fontWeight: '600' },
  followupA: { lineHeight: 22 },

  disclaimerCard: { padding: spacing.base, gap: spacing.sm, marginTop: spacing.base },
  disclaimerTitle: { marginBottom: 0 },
});

