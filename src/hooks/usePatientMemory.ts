import { useEffect } from 'react';
import { useMemoryStore } from '@/store/memoryStore';

export function usePatientMemory() {
  const { memory, isLoaded, loadMemory, updateMemory, addEmotionWords, addTrigger, updateMedications, setLastSession, incrementSessionCount } =
    useMemoryStore();

  useEffect(() => {
    if (!isLoaded) {
      loadMemory();
    }
  }, [isLoaded, loadMemory]);

  return {
    memory,
    isLoaded,
    loadMemory,
    updateMemory,
    addEmotionWords,
    addTrigger,
    updateMedications,
    setLastSession,
    incrementSessionCount,
  };
}
