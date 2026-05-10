import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Animated, Easing } from 'react-native';
import { colors } from '@/constants/colors';

interface RecordButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPressIn, onPressOut, disabled }: RecordButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const ringLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
      ringAnim.setValue(0);
      ringLoop.current = Animated.loop(
        Animated.timing(ringAnim, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true })
      );
      ringLoop.current.start();
    } else {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      ringLoop.current?.stop();
      Animated.timing(ringAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
    return () => ringLoop.current?.stop();
  }, [isRecording, scale, ringAnim]);

  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.25, 0.1, 0] });
  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });

  return (
    <View style={styles.wrapper} accessibilityLabel={isRecording ? 'Release to stop recording' : 'Hold to record'}>
      <Animated.View style={[styles.ring, { opacity: isRecording ? ringOpacity : 0, transform: [{ scale: ringScale }] }]} />
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled} accessibilityRole="button">
        <Animated.View style={[styles.button, isRecording && styles.buttonRecording, { transform: [{ scale }] }]}>
          <Text style={styles.icon}>{isRecording ? '⏹' : '🎙'}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.recording },
  button: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  buttonRecording: { backgroundColor: colors.recording },
  icon: { fontSize: 28 },
});
