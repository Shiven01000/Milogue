import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface Props { hasCheckedInToday: boolean; onPress: () => void; }

export function NextCheckinBanner({ hasCheckedInToday, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.shadow} accessibilityRole="button" accessibilityLabel="Start check-in">
      <LinearGradient colors={['#6E5CE6', '#8B5CF6', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <Text style={styles.eyebrow}>Daily Check-In</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{hasCheckedInToday ? 'Start another reflection' : "Start today's reflection"}</Text>
          <View style={styles.circle}>
            <Text style={styles.arrowText}>›</Text>
          </View>
        </View>
        <Text style={styles.sub}>Takes about 5 minutes</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 22,
    marginBottom: spacing.base,
    shadowColor: '#3D2A99',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  banner: { borderRadius: 22, padding: 18 },
  done: {
    borderRadius: 22,
    padding: 18,
    marginBottom: spacing.base,
    backgroundColor: colors.primaryFaint,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  doneTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },
  doneSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, fontWeight: '600' },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '900', color: '#fff', flex: 1 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 18, color: '#fff', fontWeight: '900', lineHeight: 22 },
  sub: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 5 },
});