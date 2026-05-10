import AsyncStorage from '@react-native-async-storage/async-storage';
import { DoctorProfile, DEFAULT_DOCTOR_PROFILE, AppRole } from '@/types/doctor';
import { STORAGE_KEYS } from './keys';

export async function loadDoctorProfile(): Promise<DoctorProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_PROFILE);
    if (!raw) return { ...DEFAULT_DOCTOR_PROFILE };
    const parsed = JSON.parse(raw);
    // Migrate old patientNames[] → patients[]
    if (Array.isArray(parsed.patientNames) && !parsed.patients) {
      parsed.patients = (parsed.patientNames as string[]).map(name => ({ name, code: '' }));
      delete parsed.patientNames;
    }
    return { ...DEFAULT_DOCTOR_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_DOCTOR_PROFILE };
  }
}

export async function saveDoctorProfile(profile: DoctorProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DOCTOR_PROFILE, JSON.stringify(profile));
}

export async function loadAppRole(): Promise<AppRole | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_ROLE);
    if (raw === 'patient' || raw === 'doctor') return raw;
    return null;
  } catch {
    return null;
  }
}

export async function saveAppRole(role: AppRole): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.APP_ROLE, role);
}

export async function clearPatientData(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.PATIENT_MEMORY,
    STORAGE_KEYS.CHECKIN_SESSIONS,
  ]);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.clear();
}
