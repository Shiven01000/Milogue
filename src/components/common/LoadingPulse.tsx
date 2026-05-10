import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@/constants/colors';
import { Caption } from './Typography';

interface LoadingPulseProps {
  label?: string;
}

export function LoadingPulse({ label = 'Listening...' }: LoadingPulseProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.04] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity, transform: [{ scale }] }]} />
      <Caption>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
