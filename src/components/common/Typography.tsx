import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';

interface TypographyProps {
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
  accessibilityLabel?: string;
  numberOfLines?: number;
}

const makeText = (size: number, weight: TextStyle['fontWeight'], defaultColor: string) =>
  function TextComponent({ children, style, color, accessibilityLabel, numberOfLines }: TypographyProps) {
    return (
      <Text
        style={[{ fontSize: size, fontWeight: weight, color: color ?? defaultColor }, style]}
        accessibilityLabel={accessibilityLabel}
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
    );
  };

export const Display = makeText(typography.size.display, typography.weight.bold, colors.textPrimary);
export const H1 = makeText(typography.size.xxl, typography.weight.bold, colors.textPrimary);
export const H2 = makeText(typography.size.xl, typography.weight.semiBold, colors.textPrimary);
export const H3 = makeText(typography.size.lg, typography.weight.semiBold, colors.textPrimary);
export const Body = makeText(typography.size.md, typography.weight.regular, colors.textPrimary);
export const BodySmall = makeText(typography.size.base, typography.weight.regular, colors.textSecondary);
export const Caption = makeText(typography.size.sm, typography.weight.regular, colors.textTertiary);
export const Label = makeText(typography.size.sm, typography.weight.semiBold, colors.textSecondary);
