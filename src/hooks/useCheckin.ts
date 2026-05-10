import { useCallback } from 'react';
import { useCheckinStore } from '@/store/checkinStore';
import { useMemoryStore } from '@/store/memoryStore';
import { useHealthStore } from '@/store/healthStore';
import { buildCheckinMessages, buildSessionSummaryMessages } from '@/api/prompts';
import { chatCompletion } from '@/api/openai';
import { ChatMessage } from '@/api/openai';
import { ConversationMessage, TLICCCoverage } from '@/types/checkin';
import { extractEmotionWords } from '@/utils/emotionExtractor';
import { generateId } from '@/utils/validation';
import { todayISO } from '@/utils/dateUtils';
import { saveSession } from '@/services/storage/checkinStorage';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const TLICC_KEYWORDS: Record<keyof TLICCCoverage, string[]> = {
  time: ['when', 'yesterday', 'last', 'morning', 'night', 'week', 'hour', 'ago', 'since', 'during', 'after', 'before'],
  location: ['home', 'work', 'outside', 'alone', 'with', 'at', 'where', 'place', 'room', 'office', 'store'],
  intensity: ['severe', 'strong', 'intense', 'mild', 'overwhelming', 'worst', 'bad', 'little', 'lot', 'scale', 'level', 'bad'],
  context: ['because', 'trigger', 'caused', 'happened', 'going on', 'situation', 'event', 'stress', 'thought', 'noticed'],
  change: ['better', 'worse', 'improving', 'getting', 'same', 'different', 'changed', 'progress', 'still', 'lately'],
};

function detectTLICC(text: string): Partial<TLICCCoverage> {
  const lower = text.toLowerCase();
  const updates: Partial<TLICCCoverage> = {};
  for (const [dim, keywords] of Object.entries(TLICC_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      updates[dim as keyof TLICCCoverage] = true;
    }
  }
  return updates;
}

export function useCheckin() {
  const store = useCheckinStore();
  const { memory } = useMemoryStore();
  const { todaySnapshot } = useHealthStore();
  const memoryStore = useMemoryStore();

  const initSession = useCallback(() => {
    const id = generateId();
    store.startSession(id);
    return id;
  }, [store]);

  const sendMessage = useCallback(
    async (userText: string, audioUri?: string) => {
      if (!userText.trim()) return;

      const userMessage: ConversationMessage = {
        id: generateId(),
        role: 'user',
        content: userText,
        audioUri,
        timestamp: Date.now(),
      };
      store.addMessage(userMessage);

      // Detect T-LICC coverage from user's message
      const tliccUpdates = detectTLICC(userText);
      if (Object.keys(tliccUpdates).length > 0) {
        store.updateTLICC(tliccUpdates);
      }

      // Build conversation history for OpenAI
      const history: ChatMessage[] = [...store.messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const messages = buildCheckinMessages(memory, todaySnapshot, history, store.currentDetectedEmotion);

      // Placeholder for AI response while fetching
      const aiMessageId = generateId();
      store.addMessage({
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      });
      store.setAIResponding(true);

      try {
        const response = await chatCompletion(messages, OPENAI_API_KEY, {
          model: 'gpt-4o-mini',
          temperature: 0.85,
          maxTokens: 180,
        });

        store.updateLastMessage(response);

        // Fire-and-forget — must not block setAIResponding(false)
        const emotions = extractEmotionWords(userText);
        if (emotions.length > 0) {
          memoryStore.addEmotionWords(emotions).catch(() => {});
        }
      } catch (err) {
        store.updateLastMessage("I didn't catch that — could you try again?");
      } finally {
        store.setAIResponding(false);
      }
    },
    [store, memory, todaySnapshot, memoryStore]
  );

  const completeSession = useCallback(async (opts?: { sessionAvgHR?: number }) => {
    const { messages, tliccCoverage, moodScoreAtStart, sessionId, emotionTimeline } = store;
    if (!sessionId) return null;

    const transcript = messages.map(m => `${m.role === 'user' ? 'Patient' : 'MindLog'}: ${m.content}`).join('\n\n');

    let sessionSummary = '';
    try {
      const summaryMessages = buildSessionSummaryMessages(transcript, memory.patientName);
      sessionSummary = await chatCompletion(summaryMessages, OPENAI_API_KEY, {
        temperature: 0.3,
        maxTokens: 128,
      });
    } catch {
      sessionSummary = 'Session completed.';
    }

    const allUserText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');
    const emotionTags = extractEmotionWords(allUserText);

    const session = {
      id: sessionId,
      date: todayISO(),
      startedAt: messages[0]?.timestamp ?? Date.now(),
      completedAt: Date.now(),
      messages,
      moodScoreAtStart,
      emotionTags,
      tliccCoverage,
      sessionSummary,
      healthSnapshotId: todaySnapshot?.id ?? '',
      emotionTimeline: emotionTimeline.length > 0 ? emotionTimeline : undefined,
      sessionAvgHR: opts?.sessionAvgHR,
    };

    await saveSession(session);
    await memoryStore.setLastSession(sessionId, sessionSummary);
    await memoryStore.incrementSessionCount();

    return session;
  }, [store, memory, todaySnapshot, memoryStore]);

  const openingGreeting = useCallback((): { id: string; text: string } => {
    const id = generateId();
    const name = memory.patientName || 'there';
    const text = memory.lastSessionSummary
      ? `Hey ${name}, really good to see you again! How have you been since we last spoke?`
      : `Hey ${name}! I'm Milo, your wellness companion. How are you feeling today?`;

    store.addMessage({ id, role: 'assistant', content: text, timestamp: Date.now(), isStreaming: false });
    return { id, text };
  }, [store, memory]);

  return {
    messages: store.messages,
    isRecording: store.isRecording,
    isAIResponding: store.isAIResponding,
    tliccCoverage: store.tliccCoverage,
    moodScoreAtStart: store.moodScoreAtStart,
    sessionId: store.sessionId,
    initSession,
    sendMessage,
    completeSession,
    openingGreeting,
    setMoodScore: store.setMoodScore,
    resetSession: store.resetSession,
  };
}
