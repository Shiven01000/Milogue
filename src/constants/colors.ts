export const colors = {
  background: '#F0EEF8',
  surface: '#FFFFFF',
  surfaceAlt: '#E8E5F5',

  primary: '#6E5CE6',
  primaryLight: '#8B5CF6',
  primaryDeep: '#3D2A99',
  primaryFaint: 'rgba(110,92,230,0.10)',

  cardMoodTop: '#3ECFBE',
  cardMoodBot: '#1AAC99',
  cardMoodShadow: '#0D7A6E',
  cardSleepTop: '#60A5FA',
  cardSleepBot: '#3B82F6',
  cardSleepShadow: '#1D4ED8',
  cardVoiceTop: '#A78BFA',
  cardVoiceBot: '#7C3AED',
  cardVoiceShadow: '#4C1D95',
  cardReportTop: '#FB923C',
  cardReportBot: '#EA580C',
  cardReportShadow: '#9A3412',

  streakTop: '#FB923C',
  streakBot: '#EF4444',
  streakShadow: '#991B1B',

  textPrimary: '#1A1030',
  textSecondary: '#7B6FA8',
  textTertiary: '#9B93BE',
  textInverse: '#FFFFFF',

  moodLow: '#EA580C',
  moodMid: '#60A5FA',
  moodHigh: '#6E5CE6',
  chartLine: '#8B5CF6',

  border: 'rgba(150,130,210,0.15)',
  borderStrong: 'rgba(150,130,210,0.30)',

  success: '#3ECFBE',
  warning: '#FB923C',
  error: '#EF4444',

  recording: '#EF4444',
  recordingFaint: '#FEE2E2',
  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.06)',
} as const;

export type ColorKey = keyof typeof colors;
