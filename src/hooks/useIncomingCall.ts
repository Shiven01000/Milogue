import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pollForIncomingCall } from '@/services/notifications/callService';
import { RootStackParamList } from '@/navigation/types';

const POLL_INTERVAL_MS = 3000;

export function useIncomingCall(patientCode: string | undefined) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sinceRef = useRef(Math.floor(Date.now() / 1000));
  const activeRef = useRef(false);

  useEffect(() => {
    if (!patientCode) return;

    sinceRef.current = Math.floor(Date.now() / 1000);
    activeRef.current = true;

    const interval = setInterval(async () => {
      if (!activeRef.current) return;
      try {
        const hasCall = await pollForIncomingCall(patientCode, sinceRef.current);
        if (hasCall && activeRef.current) {
          sinceRef.current = Math.floor(Date.now() / 1000);
          navigation.navigate('IncomingCall');
        }
      } catch {
        // network error — skip this tick silently
      }
    }, POLL_INTERVAL_MS);

    return () => {
      activeRef.current = false;
      clearInterval(interval);
    };
  }, [patientCode, navigation]);
}
