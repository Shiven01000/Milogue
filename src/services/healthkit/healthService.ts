import { HealthSnapshot } from '@/types/health';
import { generateMockHealthData } from './mockData';

let _cache: HealthSnapshot[] | null = null;

function getAll(): HealthSnapshot[] {
  if (!_cache) {
    _cache = generateMockHealthData(30);
  }
  return _cache;
}

export function getHealthSnapshot(date: string): HealthSnapshot | undefined {
  return getAll().find(s => s.date === date);
}

export function getHealthRange(startDate: string, endDate: string): HealthSnapshot[] {
  return getAll().filter(s => s.date >= startDate && s.date <= endDate);
}

export function getLatestSnapshot(): HealthSnapshot | undefined {
  const all = getAll();
  return all[all.length - 1];
}

export function getAllSnapshots(): HealthSnapshot[] {
  return getAll();
}
