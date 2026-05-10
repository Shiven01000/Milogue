import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { H1, Body } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useMemoryStore } from '@/store/memoryStore';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OnboardingCompleteScreen() {
  const navigation = useNavigation<Nav>();
  const { memory, updateMemory } = useMemoryStore();

  const handleStart = async () => {
    await updateMemory({ setupComplete: true });
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <H1 color={colors.primary} style={styles.greeting}>
            Hi, {memory.patientName || 'there'} 👋
          </H1>
          <Body color={colors.textSecondary} style={styles.body}>
            MindLog is ready. Every day, I'll check in with you — asking a few simple questions
            about how you're feeling.{'\n\n'}
            Over time, I'll learn your language, remember your patterns, and help you walk into
            every appointment with your story already told.
          </Body>
        </View>
        <Button label="Start my first check-in" onPress={handleStart} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.base, justifyContent: 'space-between', paddingBottom: spacing.xl },
  hero: { flex: 1, justifyContent: 'center' },
  logo: { width: 160, height: 160, alignSelf: 'center', marginBottom: spacing.lg, opacity: 0.9 },
  greeting: { marginBottom: spacing.lg },
  body: { lineHeight: 26 },
});
