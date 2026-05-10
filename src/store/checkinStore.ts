import { create } from 'zustand';
import { ConversationMessage, TLICCCoverage, DetectedEmotion, EmotionSample } from '@/types/checkin';
import { EMPTY_TLICC_COVERAGE } from '@/constants/tlicc';

interface CheckinState {
  messages: ConversationMessage[];
  isRecording: boolean;
  isAIResponding: boolean;
  tliccCoverage: TLICCCoverage;
  moodScoreAtStart: number;
  sessionId: string | null;
  currentDetectedEmotion: DetectedEmotion | null;
  emotionTimeline: EmotionSample[];
  addMessage: (message: ConversationMessage) => void;
  updateLastMessage: (delta: string) => void;
  setRecording: (value: boolean) => void;
  setAIResponding: (value: boolean) => void;
  updateTLICC: (updates: Partial<TLICCCoverage>) => void;
  setMoodScore: (score: number) => void;
  startSession: (sessionId: string) => void;
  resetSession: () => void;
  setDetectedEmotion: (emotion: DetectedEmotion) => void;
  addEmotionSample: (emotion: DetectedEmotion, sessionStartTime: number) => void;
}

export const useCheckinStore = create<CheckinState>((set) => ({
  messages: [],
  isRecording: false,
  isAIResponding: false,
  tliccCoverage: { ...EMPTY_TLICC_COVERAGE },
  moodScoreAtStart: 5,
  sessionId: null,
  currentDetectedEmotion: null,
  emotionTimeline: [],

  addMessage: (message) =>
    set(state => ({ messages: [...state.messages, message] })),

  updateLastMessage: (delta) =>
    set(state => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return state;
      const last = msgs[msgs.length - 1];
      msgs[msgs.length - 1] = { ...last, content: last.content + delta, isStreaming: false };
      return { messages: msgs };
    }),

  setRecording: (value) => set({ isRecording: value }),
  setAIResponding: (value) => set({ isAIResponding: value }),

  updateTLICC: (updates) =>
    set(state => ({ tliccCoverage: { ...state.tliccCoverage, ...updates } })),

  setMoodScore: (score) => set({ moodScoreAtStart: score }),

  startSession: (sessionId) =>
    set({
      sessionId,
      messages: [],
      tliccCoverage: { ...EMPTY_TLICC_COVERAGE },
      isRecording: false,
      isAIResponding: false,
      currentDetectedEmotion: null,
      emotionTimeline: [],
    }),

  resetSession: () =>
    set({
      messages: [],
      isRecording: false,
      isAIResponding: false,
      tliccCoverage: { ...EMPTY_TLICC_COVERAGE },
      sessionId: null,
      currentDetectedEmotion: null,
      emotionTimeline: [],
    }),

  setDetectedEmotion: (emotion) => set({ currentDetectedEmotion: emotion }),

  addEmotionSample: (emotion, sessionStartTime) =>
    set(state => ({
      currentDetectedEmotion: emotion,
      emotionTimeline: [
        ...state.emotionTimeline,
        {
          emotion,
          timestamp: Date.now(),
          offsetSeconds: Math.round((Date.now() - sessionStartTime) / 1000),
        },
      ],
    })),
}));
