export type TLICCDimension = 'time' | 'location' | 'intensity' | 'context' | 'change';

export type DetectedEmotion = 'neutral' | 'stressed' | 'sad' | 'anxious' | 'tired' | 'content';

export interface EmotionSample {
  emotion: DetectedEmotion;
  timestamp: number;
  offsetSeconds: number;
}

export interface TLICCCoverage {
  time: boolean;
  location: boolean;
  intensity: boolean;
  context: boolean;
  change: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUri?: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface CheckinSession {
  id: string;
  date: string;
  startedAt: number;
  completedAt: number | null;
  messages: ConversationMessage[];
  moodScoreAtStart: number;
  moodScoreAtEnd?: number;
  emotionTags: string[];
  tliccCoverage: TLICCCoverage;
  sessionSummary: string;
  healthSnapshotId: string;
  emotionTimeline?: EmotionSample[];
}
