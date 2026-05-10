export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent';

export type HRVTrend =
  | 'well_above_average'
  | 'above_average'
  | 'average'
  | 'below_average'
  | 'well_below_average';

export interface SleepData {
  durationHours: number;
  quality: SleepQuality;
  deepSleepPercent: number;
  remSleepPercent: number;
  timeToSleepMinutes: number;
}

export interface HRVData {
  morningHRV: number;
  thirtyDayAverage: number;
  trend: HRVTrend;
}

export interface HealthSnapshot {
  id: string;
  date: string;
  sleep: SleepData;
  hrv: HRVData;
  restingHeartRate: number;
  stepCount: number;
  activeCalories: number;
  standHours: number;
}
