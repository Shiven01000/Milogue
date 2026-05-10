import AsyncStorage from '@react-native-async-storage/async-storage';
import { PatientMemory, DEFAULT_PATIENT_MEMORY } from '@/types/memory';
import { STORAGE_KEYS } from './keys';

export async function loadPatientMemory(): Promise<PatientMemory> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PATIENT_MEMORY);
    if (!raw) return { ...DEFAULT_PATIENT_MEMORY };
    return { ...DEFAULT_PATIENT_MEMORY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PATIENT_MEMORY };
  }
}

export async function savePatientMemory(memory: PatientMemory): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_MEMORY, JSON.stringify(memory));
}

export async function clearPatientMemory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.PATIENT_MEMORY);
}
