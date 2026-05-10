import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants/spacing';

interface Props { streak: number; }

export function StreakBadge({ streak }: Props) {
  return (
    <View style={styles.shadow}>
      <LinearGradient colors={['#FB923C', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <Text style={styles.flame}>🔥</Text>
        <Text style={styles.count}>{streak}</Text>
        <View>
          <Text style={styles.label}>Day Streak</Text>
          <Text style={styles.sub}>Keep it going!</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 22,
    marginBottom: spacing.base,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 18, gap: 10 },
  flame: { fontSize: 30 },
  count: { fontSize: 38, fontWeight: '900', color: '#fff', lineHeight: 42 },
  label: { fontSize: 14, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginTop: 1 },
});