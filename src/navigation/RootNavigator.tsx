import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { DoctorTabNavigator } from './DoctorTabNavigator';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { ProfileSetupScreen } from '@/screens/onboarding/ProfileSetupScreen';
import { OnboardingCompleteScreen } from '@/screens/onboarding/OnboardingCompleteScreen';
import { RoleSelectionScreen } from '@/screens/onboarding/RoleSelectionScreen';
import { DoctorOnboardingScreen } from '@/screens/doctor/DoctorOnboardingScreen';
import { DoctorOnboardingCompleteScreen } from '@/screens/doctor/DoctorOnboardingCompleteScreen';
import { PatientDetailScreen } from '@/screens/doctor/PatientDetailScreen';
import { CheckinConversationScreen } from '@/screens/checkin/CheckinConversationScreen';
import { CheckinSummaryScreen } from '@/screens/checkin/CheckinSummaryScreen';
import { CheckinStartScreen } from '@/screens/checkin/CheckinStartScreen';
import { IncomingCallScreen } from '@/screens/incoming-call/IncomingCallScreen';
import { VocabularyFlashcardScreen } from '@/screens/vocabulary/VocabularyFlashcardScreen';
import { VoiceCloningScreen } from '@/screens/patient/VoiceCloningScreen';
import { RootStackParamList } from './types';
import { useMemoryStore } from '@/store/memoryStore';
import { loadAppRole, loadDoctorProfile } from '@/services/storage/doctorStorage';
import { DoctorProfile, DEFAULT_DOCTOR_PROFILE } from '@/types/doctor';
import { colors } from '@/constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { memory, isLoaded, loadMemory } = useMemoryStore();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(DEFAULT_DOCTOR_PROFILE);

  useEffect(() => {
    Promise.all([loadMemory(), loadAppRole(), loadDoctorProfile()]).then(([, r, d]) => {
      setRole(r);
      setDoctorProfile(d);
      setReady(true);
    });
  }, [loadMemory]);

  if (!ready || !isLoaded) return null;

  let initialRoute: keyof RootStackParamList;
  if (role === null) {
    initialRoute = 'RoleSelection';
  } else if (role === 'patient') {
    initialRoute = memory.setupComplete ? 'Tabs' : 'Onboarding';
  } else {
    initialRoute = doctorProfile.setupComplete ? 'DoctorTabs' : 'DoctorOnboarding';
  }

  const screenOptions = {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    contentStyle: { backgroundColor: colors.background },
    animation: 'slide_from_right' as const,
  };

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ title: 'About You' }} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="DoctorOnboarding" component={DoctorOnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoctorOnboardingComplete" component={DoctorOnboardingCompleteScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoctorTabs" component={DoctorTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Patient Profile', headerShown: true }} />
      <Stack.Screen name="CheckinStart" component={CheckinStartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CheckinFlow" component={CheckinConversationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CheckinSummary" component={CheckinSummaryScreen} options={{ title: 'Session Complete', headerBackVisible: false }} />
      <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="VocabularyFlashcards" component={VocabularyFlashcardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VoiceCloning" component={VoiceCloningScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
