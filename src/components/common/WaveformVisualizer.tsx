import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/colors';

const BAR_COUNT = 7;

interface WaveformVisualizerProps {
  level: number;
  isActive: boolean;
}

function Bar({ index, level, isActive }: { index: number; level: number; isActive: boolean }) {
  const height = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    const variance = Math.abs(Math.sin((index + 1) * 1.3));
    const target = isActive ? 4 + level * 40 * (0.5 + 0.5 * variance) : 4;
    Animated.spring(height, { toValue: target, damping: 12, stiffness: 200, useNativeDriver: false }).start();
  }, [level, isActive, height, index]);

  return <Animated.View style={[styles.bar, { height }]} />;
}

export function WaveformVisualizer({ level, isActive }: WaveformVisualizerProps) {
  return (
    <View style={styles.container} accessibilityLabel="Audio level indicator">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <Bar key={i} index={i} level={level} isActive={isActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 52 },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.recording, minHeight: 4 },
});
