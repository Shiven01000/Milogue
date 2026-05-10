import { create } from 'zustand';
import { HealthSnapshot } from '@/types/health';
import { getAllSnapshots, getLatestSnapshot } from '@/services/healthkit/healthService';

interface HealthState {
  snapshots: HealthSnapshot[];
  todaySnapshot: HealthSnapshot | undefined;
  isLoaded: boolean;
  loadHealthData: () => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  snapshots: [],
  todaySnapshot: undefined,
  isLoaded: false,

  loadHealthData: () => {
    const snapshots = getAllSnapshots();
    const todaySnapshot = getLatestSnapshot();
    set({ snapshots, todaySnapshot, isLoaded: true });
  },
}));
