import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { chatCompletionJSON } from '@/api/openai';
import { buildVocabularyFlashcardsMessages } from '@/api/prompts';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { EmotionFlashcard, FlashcardIntensity } from '@/types/vocabulary';
import { CheckinSession } from '@/types/checkin';
import { getLastNSessions } from '@/services/storage/checkinStorage';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const INTENSITY_COLORS: Record<FlashcardIntensity, [string, string]> = {
  mild:     ['#3ECFBE', '#1AAC99'],
  moderate: ['#A78BFA', '#7C3AED'],
  intense:  ['#FB923C', '#EA580C'],
};

const INTENSITY_LABEL: Record<FlashcardIntensity, string> = {
  mild:     'Mild',
  moderate: 'Moderate',
  intense:  'Intense',
};

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function extractUserText(session: CheckinSession): string {
  return session.messages
    .filter(m => m.role === 'user')
    .map(m => m.content.trim())
    .filter(Boolean)
    .join(' ');
}

function FlashCard({ card, index, total }: { card: EmotionFlashcard; index: number; total: number }) {
  const [gradStart, gradEnd] = INTENSITY_COLORS[card.intensity];
  return (
    <View style={styles.cardOuter}>
      <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.intensityBadge}>
            <Text style={styles.intensityText}>{INTENSITY_LABEL[card.intensity]}</Text>
          </View>
          <Text style={styles.cardCounter}>{index + 1} / {total}</Text>
        </View>

        <Text style={styles.wordText}>{card.word}</Text>
        <Text style={styles.definitionText}>{card.simpleDefinition}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>WHY IT FITS YOU</Text>
        <Text style={styles.bodyText}>{card.whyItFits}</Text>

        <Text style={styles.sectionLabel}>EXAMPLE</Text>
        <Text style={styles.bodyText}>"{card.exampleSentence}"</Text>

        <Text style={styles.sectionLabel}>RELATED WORDS</Text>
        <View style={styles.tagsRow}>
          {card.relatedWords.map((w, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{w}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

export function VocabularyFlashcardScreen() {
  const navigation = useNavigation();

  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cards, setCards] = useState<EmotionFlashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load last 5 sessions on mount and auto-generate for the most recent one.
  useEffect(() => {
    getLastNSessions(5).then(loaded => {
      // Newest first
      const sorted = [...loaded].sort((a, b) => b.date.localeCompare(a.date));
      setSessions(sorted);
      setLoading(false);
    });
  }, []);

  const generateCards = useCallback(async (session: CheckinSession) => {
    const userText = extractUserText(session);
    if (!userText) {
      setError('This session has no recorded messages to analyse.');
      setCards([]);
      return;
    }
    if (!OPENAI_API_KEY) {
      setError('OpenAI API key required to generate flashcards.');
      setCards([]);
      return;
    }

    setLoading(true);
    setError(null);
    setCards([]);
    setCurrentCard(0);

    try {
      const messages = buildVocabularyFlashcardsMessages(userText);
      const raw = await chatCompletionJSON(messages, OPENAI_API_KEY, { maxTokens: 1024, temperature: 0.7 });
      const parsed = JSON.parse(raw) as { flashcards: EmotionFlashcard[] };
      if (!parsed.flashcards?.length) throw new Error('empty');
      setCards(parsed.flashcards);
    } catch {
      setError('Could not generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-generate when sessions first load
  useEffect(() => {
    if (sessions.length > 0) generateCards(sessions[0]);
  }, [sessions, generateCards]);

  const handleSelectSession = useCallback((idx: number) => {
    setSelectedIndex(idx);
    generateCards(sessions[idx]);
  }, [sessions, generateCards]);

  const selectedSession = sessions[selectedIndex] ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Emotion Vocabulary</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>Find better words</Text>
        <Text style={styles.heroSub}>
          Words tailored to what you actually said during your check-ins.
        </Text>

        {/* Session picker */}
        {sessions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionPicker} contentContainerStyle={styles.sessionPickerContent}>
            {sessions.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleSelectSession(i)}
                style={[styles.sessionChip, i === selectedIndex && styles.sessionChipActive]}
              >
                <Text style={[styles.sessionChipText, i === selectedIndex && styles.sessionChipTextActive]}>
                  {i === 0 ? 'Latest' : formatSessionDate(s.date)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Source label */}
        {selectedSession && (
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>
              Based on your check-in · {formatSessionDate(selectedSession.date)}
            </Text>
            <TouchableOpacity onPress={() => generateCards(selectedSession)} disabled={loading}>
              <Text style={[styles.refreshText, loading && { opacity: 0.4 }]}>↺ Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No sessions state */}
        {!loading && sessions.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📓</Text>
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Text style={styles.emptyBody}>
              Complete your first daily check-in and come back here — your vocabulary flashcards will be based on what you shared.
            </Text>
          </View>
        )}

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Analysing your words…</Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Flashcards */}
        {!loading && cards.length > 0 && (
          <>
            <FlashCard card={cards[currentCard]} index={currentCard} total={cards.length} />

            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => setCurrentCard(i => i - 1)}
                disabled={currentCard === 0}
                style={[styles.navBtn, currentCard === 0 && styles.navBtnDisabled]}
              >
                <Text style={[styles.navBtnText, currentCard === 0 && styles.navBtnTextDisabled]}>← Prev</Text>
              </TouchableOpacity>

              <View style={styles.dots}>
                {cards.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setCurrentCard(i)}>
                    <View style={[styles.dot, i === currentCard && styles.dotActive]} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => setCurrentCard(i => i + 1)}
                disabled={currentCard === cards.length - 1}
                style={[styles.navBtn, currentCard === cards.length - 1 && styles.navBtnDisabled]}
              >
                <Text style={[styles.navBtnText, currentCard === cards.length - 1 && styles.navBtnTextDisabled]}>Next →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  screenTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  content: { padding: spacing.base, paddingBottom: 60, gap: spacing.base },

  heroTitle: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, lineHeight: 32 },
  heroSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },

  sessionPicker: { flexGrow: 0 },
  sessionPickerContent: { gap: 8, paddingVertical: 4 },
  sessionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sessionChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  sessionChipTextActive: { color: '#fff' },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  sourceLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary },
  refreshText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, textAlign: 'center' },

  loadingWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  loadingText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },

  errorCard: { backgroundColor: colors.recordingFaint, borderRadius: 14, padding: spacing.base },
  errorText: { color: colors.error, fontSize: 14 },

  cardOuter: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  card: { borderRadius: 24, padding: spacing.lg, gap: spacing.sm, minHeight: 320 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  intensityBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  intensityText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' },
  cardCounter: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  wordText: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginTop: 4 },
  definitionText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  sectionLabel: {
    fontSize: 9, fontWeight: '800', letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: spacing.xs,
  },
  bodyText: { fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 21 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.base,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  navBtnTextDisabled: { color: colors.textTertiary },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { backgroundColor: colors.primary, width: 18 },
});
