export type ReportSectionKey =
  | 'time'
  | 'location'
  | 'intensity'
  | 'context'
  | 'change'
  | 'trends'
  | 'recommendations';

export interface ReportSection {
  key: ReportSectionKey;
  title: string;
  summary: string;
  keyFindings: string[];
  dataPoints?: string[];
}

export interface ClinicalSummary {
  id: string;
  generatedAt: number;
  periodStart: string;
  periodEnd: string;
  patientName: string;
  sessionCount: number;
  averageMoodScore: number;
  sections: ReportSection[];
  recommendedDiscussionPoints: string[];
  wearableTrendNarrative: string;
  rawGptResponse: string;
}
