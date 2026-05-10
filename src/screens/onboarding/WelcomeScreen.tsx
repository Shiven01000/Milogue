import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Display, Body } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Display style={styles.logo}>MindLog</Display>
          <Body color={colors.textSecondary} style={styles.tagline}>
            A quiet space between appointments.{'\n'}
            Your thoughts, remembered.
          </Body>
        </View>

        <View style={styles.footer}>
          <Button
            label="Get started"
            onPress={() => navigation.navigate('ProfileSetup')}
          />
          <Body color={colors.textTertiary} style={styles.privacy}>
            Your data stays on your device. Always.
          </Body>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    color: colors.primary,
    marginBottom: spacing.base,
  },
  tagline: {
    lineHeight: 26,
  },
  footer: {
    gap: spacing.base,
    paddingBottom: spacing.lg,
  },
  privacy: {
    textAlign: 'center',
  },
});
