export interface EmotionEntry {
  word: string;
  firstUsed: string;
  useCount: number;
}

export interface TriggerEntry {
  description: string;
  firstIdentified: string;
  sessionIds: string[];
}

export interface MedicationEntry {
  name: string;
  dose?: string;
  frequency?: string;
}

export type AppLanguageCode = string;

export interface PatientMemory {
  patientName: string;
  setupComplete: boolean;
  conditions: string[];
  medications: MedicationEntry[];
  emotionVocabulary: EmotionEntry[];
  triggers: TriggerEntry[];
  lastSessionId: string | null;
  lastSessionSummary: string | null;
  totalSessionCount: number;
  createdAt: string;
  patientCode?: string;
  notificationEnabled?: boolean;
  preferredCheckinTime?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  assignedDoctorName?: string;
  preferredVoice?: 'male' | 'female' | 'custom';
  clonedVoiceId?: string;
  clonedVoiceName?: string;
  preferredLanguage?: AppLanguageCode;
}

export const DEFAULT_PATIENT_MEMORY: PatientMemory = {
  patientName: '',
  setupComplete: false,
  conditions: [],
  medications: [],
  emotionVocabulary: [],
  triggers: [],
  lastSessionId: null,
  lastSessionSummary: null,
  totalSessionCount: 0,
  createdAt: new Date().toISOString(),
};
