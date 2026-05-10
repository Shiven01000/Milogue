import { useEffect } from 'react';
import { useHealthStore } from '@/store/healthStore';

export function useHealthData() {
  const { snapshots, todaySnapshot, isLoaded, loadHealthData } = useHealthStore();

  useEffect(() => {
    if (!isLoaded) {
      loadHealthData();
    }
  }, [isLoaded, loadHealthData]);

  return { snapshots, todaySnapshot, isLoaded };
}
