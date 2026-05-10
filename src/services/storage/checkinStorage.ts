import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckinSession } from '@/types/checkin';
import { STORAGE_KEYS } from './keys';

export async function loadAllSessions(): Promise<CheckinSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CHECKIN_SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw) as CheckinSession[];
  } catch {
    return [];
  }
}

export async function saveSession(session: CheckinSession): Promise<void> {
  const sessions = await loadAllSessions();
  const existing = sessions.findIndex(s => s.id === session.id);
  if (existing >= 0) {
    sessions[existing] = session;
  } else {
    sessions.push(session);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.CHECKIN_SESSIONS, JSON.stringify(sessions));
}

export async function getSessionsInRange(
  startDate: string,
  endDate: string
): Promise<CheckinSession[]> {
  const all = await loadAllSessions();
  return all.filter(s => s.date >= startDate && s.date <= endDate);
}

export async function getLastNSessions(n: number): Promise<CheckinSession[]> {
  const all = await loadAllSessions();
  return all.sort((a, b) => a.date.localeCompare(b.date)).slice(-n);
}
