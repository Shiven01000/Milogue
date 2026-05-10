import { HealthSnapshot, SleepData, SleepQuality, HRVData, HRVTrend } from '@/types/health';
import { generateId } from '@/utils/validation';

// Seeded pseudo-random for reproducible demo data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hrv30DayAverage(snapshots: HealthSnapshot[]): number {
  if (snapshots.length === 0) return 42;
  return snapshots.reduce((s, n) => s + n.hrv.morningHRV, 0) / snapshots.length;
}

function classifyHRVTrend(hrv: number, avg: number): HRVTrend {
  const ratio = hrv / avg;
  if (ratio >= 1.2) return 'well_above_average';
  if (ratio >= 1.05) return 'above_average';
  if (ratio >= 0.95) return 'average';
  if (ratio >= 0.8) return 'below_average';
  return 'well_below_average';
}

function classifySleepQuality(hours: number, deep: number): SleepQuality {
  if (hours >= 7.5 && deep >= 18) return 'excellent';
  if (hours >= 6.5 && deep >= 14) return 'good';
  if (hours >= 5.5) return 'fair';
  return 'poor';
}

export function generateMockHealthData(days = 30): HealthSnapshot[] {
  const rand = seededRandom(42);
  const snapshots: HealthSnapshot[] = [];

  // Base physiological profiles
  const baseHRV = 38 + rand() * 10;
  const baseRHR = 60 + rand() * 8;
  const baseSleep = 6.8 + rand() * 0.8;

  // Simulate a rough patch around days 18-22 (for demo narrative interest)
  const stressPeriod = { start: 18, end: 22 };

  for (let i = days - 1; i >= 0; i--) {
    const dayOfWeek = new Date(Date.now() - i * 86400000).getDay(); // 0=Sun
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isStressPeriod = i >= stressPeriod.start && i <= stressPeriod.end;

    // Sleep: worse on Sundays (late night), better mid-week
    const sundayPenalty = dayOfWeek === 0 ? -1.2 : 0;
    const stressPenalty = isStressPeriod ? -1.5 : 0;
    const sleepVariance = (rand() - 0.5) * 1.2;
    const sleepHours = Math.max(4, baseSleep + sundayPenalty + stressPenalty + sleepVariance);

    // Sleep debt carries forward (simplified: prior night sleep affects HRV)
    const prevSleep = snapshots[snapshots.length - 1]?.sleep.durationHours ?? baseSleep;
    const sleepDebtFactor = (prevSleep - 7) * 0.3;

    const deepPercent = Math.round(clampLocal(14 + (rand() - 0.3) * 10 + (sleepHours - 6) * 2, 8, 30));
    const remPercent = Math.round(clampLocal(18 + (rand() - 0.5) * 8, 12, 28));
    const timeToSleep = Math.round(clampLocal(15 + rand() * 30 + (isStressPeriod ? 25 : 0), 8, 75));

    const sleep: SleepData = {
      durationHours: Math.round(sleepHours * 10) / 10,
      quality: classifySleepQuality(sleepHours, deepPercent),
      deepSleepPercent: deepPercent,
      remSleepPercent: remPercent,
      timeToSleepMinutes: timeToSleep,
    };

    // HRV: lower on stress period, recovers after rest
    const hrvVariance = (rand() - 0.5) * 8;
    const hrvStressDrop = isStressPeriod ? -14 : 0;
    const hrvSleepBoost = sleepDebtFactor;
    const morningHRV = Math.round(clampLocal(baseHRV + hrvVariance + hrvStressDrop + hrvSleepBoost, 18, 80));

    // Resting HR: inversely related to HRV
    const rhrVariance = (rand() - 0.5) * 6;
    const rhrStressRise = isStressPeriod ? 8 : 0;
    const restingHeartRate = Math.round(clampLocal(baseRHR + rhrVariance + rhrStressRise, 52, 85));

    // Steps: lower on stress period, higher on weekends (varied)
    const baseSteps = isWeekend ? 9000 : 7000;
    const stepsVariance = (rand() - 0.5) * 4000;
    const stepsDrop = isStressPeriod ? -2500 : 0;
    const stepCount = Math.round(clampLocal(baseSteps + stepsVariance + stepsDrop, 1500, 18000));

    const activeCalories = Math.round(stepCount * 0.05 + rand() * 80);
    const standHours = Math.round(clampLocal(8 + rand() * 6 + (isStressPeriod ? -3 : 0), 4, 16));

    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];

    snapshots.push({
      id: generateId(),
      date,
      sleep,
      hrv: {
        morningHRV,
        thirtyDayAverage: 0, // filled after generation
        trend: 'average', // filled after generation
      },
      restingHeartRate,
      stepCount,
      activeCalories,
      standHours,
    });
  }

  // Fill in 30-day average and trend
  const avg = hrv30DayAverage(snapshots);
  return snapshots.map(s => ({
    ...s,
    hrv: {
      ...s.hrv,
      thirtyDayAverage: Math.round(avg * 10) / 10,
      trend: classifyHRVTrend(s.hrv.morningHRV, avg),
    },
  }));
}

function clampLocal(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
