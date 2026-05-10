import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const MAX_WIDTH = Math.min(width - 48, 360);

interface SubtitleBarProps {
  text: string;
}

export function SubtitleBar({ text }: SubtitleBarProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (text) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [text, opacity]);

  if (!text) return null;

  return (
    <Animated.View style={[styles.pill, { opacity }]}>
      <Animated.Text style={styles.text}>{text}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    maxWidth: MAX_WIDTH,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
});
