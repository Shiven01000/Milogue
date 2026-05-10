export type MedicationLanguageCode = 'en' | 'bn' | 'ar' | 'fr';

export interface MedicationBrandInfo {
  brandNames: string[];
}

export interface MedicationCandidate {
  id: string;
  name: string; // generic name or best match
  brandNames: string[];
}

export interface MedicationDatabaseEntry {
  id: string;
  name: string; // Generic name
  brandNames: string[];

  // "Verified" source fields (mocked for now)
  whatItDoes: string;
  whyDoctorsPrescribe: string;
  commonSideEffects: string[];
  seriousSideEffects: string[];
  questionsToAskPharmacistOrDoctor: string[];
}

export interface MedicationExplanationSectionText {
  title: string;
  content: string;
}

export interface MedicationExplanationSectionList {
  title: string;
  items: string[];
  contactDoctorText?: string;
}

export interface MedicationExplanation {
  medicationId: string;
  medicationName: string;
  brandNames: string[];

  whatItDoes: MedicationExplanationSectionText;
  whyDoctorsPrescribe: MedicationExplanationSectionText;
  commonSideEffects: MedicationExplanationSectionList;
  seriousSideEffects: MedicationExplanationSectionList;
  questionsToAskPharmacistOrDoctor: MedicationExplanationSectionList;

  safetyDisclaimer: string;
}

export interface MedicationFollowupQA {
  id: string;
  question: string;
  answer: string;
  askedAt: number;
}

