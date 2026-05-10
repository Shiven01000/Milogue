export type AppRole = 'patient' | 'doctor';

export interface ConnectedPatient {
  name: string;
  code: string;
}

export interface DoctorProfile {
  doctorName: string;
  licenseNumber: string;
  specialty: string;
  clinicName: string;
  patients: ConnectedPatient[];
  setupComplete: boolean;
  createdAt: string;
}

export const DEFAULT_DOCTOR_PROFILE: DoctorProfile = {
  doctorName: '',
  licenseNumber: '',
  specialty: '',
  clinicName: '',
  patients: [],
  setupComplete: false,
  createdAt: new Date().toISOString(),
};
