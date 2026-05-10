import { ClinicalSummary, ReportSection, ReportSectionKey } from '@/types/report';
import { EmotionSample } from '@/types/checkin';

const SECTION_TITLES: Record<ReportSectionKey, string> = {
  time: 'Time & Duration Patterns',
  location: 'Location & Social Context',
  intensity: 'Symptom Intensity',
  context: 'Triggers & Context',
  change: 'Trajectory & Change',
  trends: 'Wearable & Mood Trends',
  recommendations: 'Recommended Discussion Points',
};

export function parseClinicalSummaryFromJSON(
  raw: string,
  patientName: string,
  periodStart: string,
  periodEnd: string,
  sessionCount: number,
  averageMoodScore: number
): ClinicalSummary {
  let parsed: Partial<ClinicalSummary>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = buildFallbackSummary(raw);
  }

  const sections: ReportSection[] = (parsed.sections ?? []).map(s => ({
    ...s,
    title: SECTION_TITLES[s.key as ReportSectionKey] ?? s.title,
  }));

  return {
    id: `report_${Date.now()}`,
    generatedAt: Date.now(),
    periodStart,
    periodEnd,
    patientName,
    sessionCount,
    averageMoodScore,
    sections,
    recommendedDiscussionPoints: parsed.recommendedDiscussionPoints ?? [],
    wearableTrendNarrative: parsed.wearableTrendNarrative ?? '',
    rawGptResponse: raw,
  };
}

export function formatEmotionArc(timeline: EmotionSample[]): string {
  if (timeline.length === 0) return '';
  return timeline
    .map(s => {
      const m = Math.floor(s.offsetSeconds / 60);
      const sec = s.offsetSeconds % 60;
      return `${s.emotion} (${m}:${sec.toString().padStart(2, '0')})`;
    })
    .join(' → ');
}

function buildFallbackSummary(raw: string): Partial<ClinicalSummary> {
  return {
    sections: [],
    recommendedDiscussionPoints: ['Review session transcripts for additional context.'],
    wearableTrendNarrative: raw.slice(0, 500),
  };
}
