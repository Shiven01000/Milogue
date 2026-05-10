import { create } from 'zustand';
import { PatientMemory, EmotionEntry, TriggerEntry, MedicationEntry, DEFAULT_PATIENT_MEMORY } from '@/types/memory';
import { loadPatientMemory, savePatientMemory } from '@/services/storage/memoryStorage';

interface MemoryState {
  memory: PatientMemory;
  isLoaded: boolean;
  loadMemory: () => Promise<void>;
  updateMemory: (updates: Partial<PatientMemory>) => Promise<void>;
  addEmotionWords: (words: string[]) => Promise<void>;
  addTrigger: (description: string, sessionId: string) => Promise<void>;
  updateMedications: (medications: MedicationEntry[]) => Promise<void>;
  setLastSession: (sessionId: string, summary: string) => Promise<void>;
  incrementSessionCount: () => Promise<void>;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memory: { ...DEFAULT_PATIENT_MEMORY },
  isLoaded: false,

  loadMemory: async () => {
    const memory = await loadPatientMemory();
    set({ memory, isLoaded: true });
  },

  updateMemory: async (updates) => {
    const updated = { ...get().memory, ...updates };
    set({ memory: updated });
    await savePatientMemory(updated);
  },

  addEmotionWords: async (words) => {
    const { memory } = get();
    const vocab = [...memory.emotionVocabulary];
    const today = new Date().toISOString().split('T')[0];

    for (const word of words) {
      const existing = vocab.findIndex(e => e.word === word);
      if (existing >= 0) {
        vocab[existing] = { ...vocab[existing], useCount: vocab[existing].useCount + 1 };
      } else {
        vocab.push({ word, firstUsed: today, useCount: 1 });
      }
    }

    const updated = { ...memory, emotionVocabulary: vocab };
    set({ memory: updated });
    await savePatientMemory(updated);
  },

  addTrigger: async (description, sessionId) => {
    const { memory } = get();
    const triggers = [...memory.triggers];
    const existing = triggers.findIndex(t => t.description === description);

    if (existing >= 0) {
      triggers[existing] = {
        ...triggers[existing],
        sessionIds: [...triggers[existing].sessionIds, sessionId],
      };
    } else {
      triggers.push({
        description,
        firstIdentified: new Date().toISOString().split('T')[0],
        sessionIds: [sessionId],
      });
    }

    const updated = { ...memory, triggers };
    set({ memory: updated });
    await savePatientMemory(updated);
  },

  updateMedications: async (medications) => {
    const updated = { ...get().memory, medications };
    set({ memory: updated });
    await savePatientMemory(updated);
  },

  setLastSession: async (sessionId, summary) => {
    const updated = {
      ...get().memory,
      lastSessionId: sessionId,
      lastSessionSummary: summary,
    };
    set({ memory: updated });
    await savePatientMemory(updated);
  },

  incrementSessionCount: async () => {
    const { memory } = get();
    const updated = { ...memory, totalSessionCount: memory.totalSessionCount + 1 };
    set({ memory: updated });
    await savePatientMemory(updated);
  },
}));
