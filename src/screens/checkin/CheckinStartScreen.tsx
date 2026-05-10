import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import MascotScene from '@/components/mascot/MascotScene';
import { Body, Caption } from '@/components/common/Typography';
import { spacing } from '@/constants/spacing';
import { useCheckinStore } from '@/store/checkinStore';
import { useCheckin } from '@/hooks/useCheckin';
import { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CheckinStartScreen() {
  const navigation = useNavigation<Nav>();
  const [moodScore, setMoodScore] = useState(5);
  const { setMoodScore: storeMoodScore } = useCheckinStore();
  const { initSession } = useCheckin();
  const scoreAnim = useRef(new Animated.Value(5)).current;

  const handleSliderChange = (value: number) => {
    const rounded = Math.round(value);
    setMoodScore(rounded);
    Animated.spring(scoreAnim, { toValue: rounded, useNativeDriver: true }).start();
  };

  const handleStart = () => {
    storeMoodScore(moodScore);
    const sessionId = initSession();
    navigation.navigate('CheckinFlow', { sessionId });
  };

  const scoreScale = scoreAnim.interpolate({
    inputRange: [1, 5, 10],
    outputRange: [0.9, 1, 1.12],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <MascotScene state="idle" />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Caption style={styles.backButtonText}>‹ Back</Caption>
        </TouchableOpacity>

        <View style={styles.bottomSection}>
          <Animated.Text
            style={[styles.scoreNumber, { transform: [{ scale: scoreScale }] }]}
            accessibilityLabel={`Mood score ${moodScore} out of 10`}
          >
            {moodScore}
          </Animated.Text>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={moodScore}
              onValueChange={handleSliderChange}
              minimumTrackTintColor="#AFA9EC"
              maximumTrackTintColor="rgba(255,255,255,0.35)"
              thumbTintColor="#7F77DD"
              accessibilityLabel="Mood score slider"
            />
            <View style={styles.sliderLabels}>
              <Caption style={styles.sliderLabel}>😔 Not great</Caption>
              <Caption style={styles.sliderLabel}>😄 Amazing</Caption>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Start Check-in"
          >
            <Body style={styles.startButtonText}>Start Check-in</Body>
          </TouchableOpacity>

          <Caption style={styles.privacyNotice}>
            🔒 MindLog uses your front camera during check-ins to better understand how you are feeling. Camera data is never stored or transmitted — only the emotion label is saved.
          </Caption>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.85)',
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    lineHeight: 72,
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  startButton: {
    height: 56,
    paddingHorizontal: spacing.xxl,
    borderRadius: 28,
    backgroundColor: '#AFA9EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
  },
  privacyNotice: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
});
