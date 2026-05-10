import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckinComplete } from '@/components/checkin/CheckinComplete';
import { colors } from '@/constants/colors';
import { useCheckinStore } from '@/store/checkinStore';
import { loadAllSessions } from '@/services/storage/checkinStorage';
import { CheckinSession } from '@/types/checkin';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CheckinSummaryScreen({ route }: { route: { params: { sessionId: string } } }) {
  const navigation = useNavigation<Nav>();
  const { resetSession } = useCheckinStore();
  const [session, setSession] = useState<CheckinSession | null>(null);

  useEffect(() => {
    loadAllSessions().then(sessions => {
      const found = sessions.find(s => s.id === route.params.sessionId);
      if (found) setSession(found);
    });
  }, [route.params.sessionId]);

  const handleDone = () => {
    resetSession();
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  if (!session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <CheckinComplete
        emotionTags={session.emotionTags}
        tliccCoverage={session.tliccCoverage}
        summary={session.sessionSummary}
        onDone={handleDone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
