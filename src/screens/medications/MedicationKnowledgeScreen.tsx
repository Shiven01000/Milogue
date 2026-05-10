import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, H3, Body, BodySmall, Caption } from '@/components/common/Typography';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { MedicationCandidate, MedicationExplanation, MedicationLanguageCode } from '@/types/medication';
import { getMedicationSafetyBlockedMessage, isUnsafeMedicationQuestion } from '@/utils/medicationSafety';
import { synthesizeSpeech } from '@/services/tts/openaiTtsService';
import { Audio } from 'expo-av';
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
  identifyMedicationFromImage,
} from '@/services/medications/openFdaService';
import { useMemoryStore } from '@/store/memoryStore';
import { getLanguageName } from '@/constants/languages';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const LANGUAGE_LABELS: Record<MedicationLanguageCode, string> = {
  en: 'English', bn: 'Bengali', ar: 'Arabic', fr: 'French',
};

function labelForLanguage(code: MedicationLanguageCode): string {
  return LANGUAGE_LABELS[code] ?? 'English';
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

function buildTtsScript(explanation: MedicationExplanation): string {
  const parts = [
    explanation.medicationName + '.',
    explanation.whatItDoes.content,
    `Why doctors prescribe it. ${explanation.whyDoctorsPrescribe.content}`,
    `Common side effects. ${explanation.commonSideEffects.items.join('. ')}.`,
    `Serious side effects. ${explanation.seriousSideEffects.items.join('. ')}.`,
    explanation.seriousSideEffects.contactDoctorText ?? '',
    `Questions to ask your pharmacist or doctor. ${explanation.questionsToAskPharmacistOrDoctor.items.join('. ')}.`,
    explanation.safetyDisclaimer,
  ].filter(Boolean).join('\n\n');
  // OpenAI TTS limit is 4096 chars
  return parts.length > 4000 ? parts.slice(0, 4000) + '…' : parts;
}

export function MedicationKnowledgeScreen() {
  const { memory } = useMemoryStore();
  const languageName = getLanguageName(memory.preferredLanguage ?? 'en');

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MedicationCandidate | null>(null);

  const [candidates, setCandidates] = useState<MedicationCandidate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [explanation, setExplanation] = useState<MedicationExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [question, setQuestion] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followups, setFollowups] = useState<Array<{ id: string; question: string; answer: string; askedAt: number }>>([]);


  const handleScanCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed', 'Allow camera access in Settings to scan a medication.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    if (!OPENAI_API_KEY) {
      Alert.alert('API key required', 'An OpenAI API key is needed to identify medications from photos.');
      return;
    }

    setScanning(true);
    setSearchError(null);
    setCandidates([]);

    try {
      const { base64, mimeType } = result.assets[0];
      const name = await identifyMedicationFromImage(base64!, mimeType ?? 'image/jpeg', OPENAI_API_KEY);
      if (!name) {
        setSearchError('Could not identify a medication in that photo. Try a clearer shot of the label or packaging.');
        return;
      }
      setQuery(name);
      const next = await searchMedicationCandidatesWithAI(name, OPENAI_API_KEY);
      if (next.length === 0) {
        setSearchError(`Identified "${name}" but couldn't find medication details. Try searching manually.`);
      } else {
        setCandidates(next);
      }
    } catch {
      setSearchError('Something went wrong scanning the medication. Please try again.');
    } finally {
      setScanning(false);
    }
  }, []);

  const handleSelect = useCallback((candidate: MedicationCandidate) => {
    setSelected(candidate);
    setExplanation(null);
    setExplanationLoading(false);
    const s = soundRef.current;
    if (s) { soundRef.current = null; s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
    setIsSpeaking(false);
    setQuestion('');
    setFollowups([]);
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
            setSearchError('No medication matches found. Try a different spelling or brand name.');
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
          if (!cancelled) setExplanation(buildFallbackExplanation(selected));
          return;
        }

        const messages = buildMedicationExplanationFromCandidateMessages(selected, languageName);
        const raw = await chatCompletionJSON(messages, OPENAI_API_KEY, { maxTokens: 1024, temperature: 0.2 });
        const parsed = JSON.parse(raw) as MedicationExplanation;
        if (!cancelled) setExplanation(parsed);
      } catch {
        if (!cancelled) setExplanation(buildFallbackExplanation(selected));
      } finally {
        if (!cancelled) setExplanationLoading(false);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const handleAsk = useCallback(async () => {
    if (!selected || !explanation) return;
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

      const messages = buildMedicationFollowupMessages(selected, explanation, q, languageName);
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
  }, [selected, explanation, question, languageName]);

  const handleToggleSpeech = useCallback(async () => {
    if (isSpeaking) {
      const s = soundRef.current;
      if (s) { soundRef.current = null; await s.stopAsync().catch(() => {}); await s.unloadAsync().catch(() => {}); }
      setIsSpeaking(false);
      return;
    }
    if (!explanation || !OPENAI_API_KEY) return;
    setIsSpeaking(true);
    try {
      const sound = await synthesizeSpeech(buildTtsScript(explanation), OPENAI_API_KEY, 'nova');
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
          setIsSpeaking(false);
        }
      });
      await sound.playAsync();
    } catch {
      setIsSpeaking(false);
    }
  }, [isSpeaking, explanation]);

  if (!selected) {
    const trimmed = query.trim();

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <H2 style={styles.title}>Medication Knowledge</H2>
          <Body color={colors.textSecondary} style={styles.subtitle}>
            Search any medication. Translate the explanation or ask follow-up questions in your language.
          </Body>

          <Card style={styles.searchCard}>
            <Caption>Search any medication you want to know about</Caption>
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Type a medicine name or brand (e.g., ibuprofen, Zoloft)"
                placeholderTextColor={colors.textTertiary}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={handleScanCamera}
                style={styles.cameraButton}
                accessibilityRole="button"
                accessibilityLabel="Scan medication with camera"
                disabled={scanning}
              >
                {scanning
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Body style={styles.cameraIcon}>📷</Body>
                }
              </TouchableOpacity>
            </View>
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

          {languageName !== 'English' && (
            <View style={styles.langPill}>
              <Caption style={styles.langPillText}>🌐  {languageName}</Caption>
            </View>
          )}

          {explanation && !explanationLoading && (
            <TouchableOpacity
              onPress={handleToggleSpeech}
              style={[styles.listenBtn, isSpeaking && styles.listenBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={isSpeaking ? 'Stop reading' : 'Listen to explanation'}
            >
              <Body style={isSpeaking ? styles.listenBtnTextActive : styles.listenBtnText}>
                {isSpeaking ? '⏹  Stop' : '🔊  Listen to explanation'}
              </Body>
            </TouchableOpacity>
          )}

          {explanationLoading || !explanation ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Caption color={colors.textSecondary}>Preparing your explanation...</Caption>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <H3>{explanation.whatItDoes.title}</H3>
                <Body color={colors.textSecondary}>{explanation.whatItDoes.content}</Body>
              </View>

              <View style={styles.section}>
                <H3>{explanation.whyDoctorsPrescribe.title}</H3>
                <Body color={colors.textSecondary}>{explanation.whyDoctorsPrescribe.content}</Body>
              </View>

              <View style={styles.section}>
                <H3>{explanation.commonSideEffects.title}</H3>
                {explanation.commonSideEffects.items.map((s, idx) => (
                  <BodySmall key={idx} color={colors.textSecondary} style={styles.bulletRow}>
                    • {s}
                  </BodySmall>
                ))}
              </View>

              <View style={styles.section}>
                <H3>{explanation.seriousSideEffects.title}</H3>
                {explanation.seriousSideEffects.items.map((s, idx) => (
                  <BodySmall key={idx} color={colors.textSecondary} style={styles.bulletRow}>
                    • {s}
                  </BodySmall>
                ))}
                {explanation.seriousSideEffects.contactDoctorText ? (
                  <BodySmall
                    color={colors.textSecondary}
                    style={{ ...styles.bulletRow, ...styles.contactDoctorText }}
                  >
                    {explanation.seriousSideEffects.contactDoctorText}
                  </BodySmall>
                ) : null}
              </View>

              <View style={styles.section}>
                <H3>{explanation.questionsToAskPharmacistOrDoctor.title}</H3>
                {explanation.questionsToAskPharmacistOrDoctor.items.map((s, idx) => (
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
            <Body color={colors.textSecondary}>{explanation?.safetyDisclaimer ?? ''}</Body>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { fontSize: 20 },
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
  langPill: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  langPillText: { color: colors.primary, fontWeight: '700' },

  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  listenBtnActive: {
    backgroundColor: colors.primary,
  },
  listenBtnText: {
    color: colors.primary,
    fontWeight: '700',
  },
  listenBtnTextActive: {
    color: '#fff',
  },
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

