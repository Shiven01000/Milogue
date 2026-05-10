export type RootStackParamList = {
  RoleSelection: undefined;
  Onboarding: undefined;
  ProfileSetup: undefined;
  OnboardingComplete: undefined;
  Tabs: undefined;
  DoctorOnboarding: undefined;
  DoctorOnboardingComplete: undefined;
  DoctorTabs: undefined;
  PatientDetail: { patientName: string; patientCode: string };
  CheckinStart: undefined;
  CheckinFlow: { sessionId?: string };
  CheckinSummary: { sessionId: string };
  IncomingCall: undefined;
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Medications: undefined;
  Profile: undefined;
};

export type DoctorTabParamList = {
  DoctorPatients: undefined;
  DoctorSettings: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
  OnboardingComplete: undefined;
};
