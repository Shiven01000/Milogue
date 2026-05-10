# MindLog — Claude Code Instructions

## Git / GitHub Rules

- **Never add `Co-Authored-By` trailers to commits.** Claude must not appear as a contributor on this repo.
- Do not append any Claude attribution lines to commit messages.
- Commit messages should only reflect the human author (Shiven01000).

---

## Project Overview

**MindLog** — built for natIgnite 2026 AccessTech hackathon (40 hours).

Mental health patients lose critical symptom context between clinical appointments. MindLog is a React Native iOS app that conducts daily AI-driven voice check-ins, passively collects wearable data, and generates structured clinician summary reports.

**AI Provider:** OpenAI (single env var: `OPENAI_API_KEY`)
- Conversational AI: GPT-4o (`gpt-4o`) via Chat Completions API with streaming
- Transcription: Whisper (`whisper-1`)
- Clinician report generation: GPT-4o with JSON mode (`response_format: { type: 'json_object' }`)

**Framework:** T-LICC (Time, Location, Intensity, Context, Change) for symptom capture.

**Three judge "wow" features:**
1. Emotion vocabulary mirroring — Claude reflects the patient's own words back in future sessions
2. Wearable-correlated clinical narrative — cross-correlates mood scores with HRV/sleep in the report
3. Live waveform + breathing pulse — expo-av level meter drives Reanimated bars; breathing pulse while Claude responds

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript strict mode |
| State | Zustand |
| Persistence | AsyncStorage |
| Audio recording | expo-av |
| TTS | expo-speech |
| Charts | Victory Native + react-native-svg |
| Navigation | React Navigation (stack + bottom tabs) |
| Animation | React Native Reanimated |

---

## Team & Branch Ownership

```
main (protected, 2 reviewers required)
  └── develop (1 reviewer required, CI must pass)
        ├── feature/scaffold-and-dashboard  (Person D)
        ├── feature/checkin-ai              (Person A)
        ├── feature/data-layer              (Person B)
        └── feature/clinical-report         (Person C)
```

**Rules:** Feature branches → develop only. Never cross-merge feature branches. main gets a single merge from develop at demo time.

**Conflict avoidance:** Person D defines all `src/types/` on Day 1 (read-only contract after that). Each person owns their files exclusively.

---

## File Structure

```
MindLog/
├── .github/
│   ├── workflows/              # TypeScript + ESLint CI on PR
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
│
├── assets/
│   ├── fonts/Inter-Variable.ttf
│   ├── images/
│   └── sounds/soft-chime.mp3
│
├── src/
│   ├── api/
│   │   ├── openai.ts           # Fetch wrapper for Chat Completions (streaming SSE)
│   │   └── prompts.ts          # Typed system prompt builder functions
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Typography.tsx
│   │   │   ├── ProgressDots.tsx
│   │   │   ├── WaveformVisualizer.tsx
│   │   │   └── LoadingPulse.tsx
│   │   ├── checkin/
│   │   │   ├── ConversationBubble.tsx
│   │   │   ├── ConversationThread.tsx
│   │   │   ├── RecordButton.tsx
│   │   │   └── CheckinComplete.tsx
│   │   ├── dashboard/
│   │   │   ├── StreakBadge.tsx
│   │   │   ├── MoodTrendChart.tsx
│   │   │   ├── HealthSummaryCard.tsx
│   │   │   └── NextCheckinBanner.tsx
│   │   └── report/
│   │       ├── ReportSection.tsx
│   │       └── TrendChartFull.tsx
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── tlicc.ts
│   │
│   ├── hooks/
│   │   ├── useAudioRecorder.ts
│   │   ├── useSpeech.ts
│   │   ├── useCheckin.ts
│   │   ├── useHealthData.ts
│   │   └── usePatientMemory.ts
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── types.ts
│   │
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── ProfileSetupScreen.tsx
│   │   │   └── OnboardingCompleteScreen.tsx
│   │   ├── home/HomeScreen.tsx
│   │   ├── checkin/
│   │   │   ├── CheckinStartScreen.tsx
│   │   │   ├── CheckinConversationScreen.tsx
│   │   │   └── CheckinSummaryScreen.tsx
│   │   ├── history/HistoryScreen.tsx
│   │   └── report/ReportScreen.tsx
│   │
│   ├── services/
│   │   ├── healthkit/
│   │   │   ├── mockData.ts
│   │   │   └── healthService.ts
│   │   ├── storage/
│   │   │   ├── checkinStorage.ts
│   │   │   ├── memoryStorage.ts
│   │   │   └── keys.ts
│   │   └── transcription/
│   │       └── whisperService.ts
│   │
│   ├── store/
│   │   ├── checkinStore.ts
│   │   ├── healthStore.ts
│   │   ├── memoryStore.ts
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── checkin.ts
│   │   ├── health.ts
│   │   ├── memory.ts
│   │   └── report.ts
│   │
│   └── utils/
│       ├── dateUtils.ts
│       ├── emotionExtractor.ts
│       ├── reportFormatter.ts
│       └── validation.ts
```

---

## TypeScript Data Models

```ts
// src/types/checkin.ts
export type TLICCDimension = 'time' | 'location' | 'intensity' | 'context' | 'change';
export interface TLICCCoverage {
  time: boolean; location: boolean; intensity: boolean; context: boolean; change: boolean;
}
export interface ConversationMessage {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: number; isStreaming?: boolean;
}
export interface CheckinSession {
  id: string; date: string; startedAt: number; completedAt: number | null;
  messages: ConversationMessage[]; moodScoreAtStart: number; moodScoreAtEnd?: number;
  emotionTags: string[]; tliccCoverage: TLICCCoverage; claudeSummary: string; healthSnapshotId: string;
}

// src/types/health.ts
export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent';
export type HRVTrend = 'well_above_average' | 'above_average' | 'average' | 'below_average' | 'well_below_average';
export interface SleepData {
  durationHours: number; quality: SleepQuality; deepSleepPercent: number;
  remSleepPercent: number; timeToSleepMinutes: number;
}
export interface HRVData { morningHRV: number; thirtyDayAverage: number; trend: HRVTrend; }
export interface HealthSnapshot {
  id: string; date: string; sleep: SleepData; hrv: HRVData;
  restingHeartRate: number; stepCount: number; activeCalories: number; standHours: number;
}

// src/types/memory.ts
export interface EmotionEntry { word: string; firstUsed: string; useCount: number; }
export interface TriggerEntry { description: string; firstIdentified: string; sessionIds: string[]; }
export interface MedicationEntry { name: string; dose?: string; frequency?: string; }
export interface PatientMemory {
  patientName: string; setupComplete: boolean; conditions: string[];
  medications: MedicationEntry[]; emotionVocabulary: EmotionEntry[];
  triggers: TriggerEntry[]; lastSessionId: string | null; lastSessionSummary: string | null;
  totalSessionCount: number; createdAt: string;
}

// src/types/report.ts
export type ReportSectionKey = 'time' | 'location' | 'intensity' | 'context' | 'change' | 'trends' | 'recommendations';
export interface ReportSection {
  key: ReportSectionKey; title: string; summary: string; keyFindings: string[]; dataPoints?: string[];
}
export interface ClinicalSummary {
  id: string; generatedAt: number; periodStart: string; periodEnd: string;
  patientName: string; sessionCount: number; averageMoodScore: number;
  sections: ReportSection[]; recommendedDiscussionPoints: string[];
  wearableTrendNarrative: string; rawClaudeResponse: string;
}
```

---

## GPT-4o System Prompt Design

`buildCheckinMessages(memory, healthSnapshot)` returns an OpenAI messages array:

```
You are MindLog, a warm and empathetic mental health companion conducting a daily check-in with [PATIENT_NAME].

Your role is to listen deeply and gently gather information across five dimensions (T-LICC) through natural conversation.
You are NOT a therapist. You do NOT diagnose.

## Tone Guidelines
- Speak like a trusted, caring friend who understands mental health
- Use the patient's own words back to them (see vocabulary below)
- Keep each response to 2-3 sentences — this is a voice conversation
- Validate before you probe. Acknowledge before asking.
- Never ask two questions in one turn
- If distressed, slow down, validate more

## Patient Context
Name: [PATIENT_NAME]
Medications: [MEDICATIONS_LIST]
Conditions: [CONDITIONS_LIST]
Known triggers: [TRIGGERS_LIST]
Their emotion vocabulary: [EMOTION_VOCABULARY_LIST]
Last session summary: [LAST_SESSION_SUMMARY]

## Today's Wearable Data
Sleep: [SLEEP_HOURS] hrs ([SLEEP_QUALITY])
HRV: [HRV]ms ([HRV_TREND] vs 30-day avg [HRV_AVERAGE]ms)
Resting HR: [RHR]bpm | Steps: [STEPS]

Use wearable data only if contextually relevant — don't lead with it.

## T-LICC Coverage (internal — never mention to patient)
Naturally gather: Time, Location, Intensity, Context, Change

## Flow
1. Warm greeting, reference last session if available
2. One open question ("How have you been since we last spoke?")
3. Follow patient's lead, go deep on what matters to them
4. After 8–12 exchanges, offer a brief reflection and close warmly
5. Never ask about dimensions in order — let them emerge organically

## Output Format
Plain conversational text only. No lists, headers, or markdown.
```

Clinician report uses `response_format: { type: 'json_object' }` with a separate prompt requesting structured `ClinicalSummary` JSON.

---

## Design Tokens

- Primary: `#4A7C6B` (sage green)
- Background: `#F8F7F5` (warm white)
- Text: `#2D2D2D`

---

## Build Steps (40-Hour Plan)

| Step | Task | Time | Owner |
|---|---|---|---|
| 1 | Project init & scaffold (Expo, deps, tsconfig, eslint, push) | 1.5h | Person D |
| 2 | Type system contract + constants | 1h | Person D → all review |
| 3 | Common components (Button, Card, Typography, WaveformVisualizer, LoadingPulse) | 1.5h | Person D |
| 4 | Navigation shell (all screens as stubs, full type definitions) | 1.5h | Person D |
| 5 | Mock HealthKit engine (30-day generator, healthService, useHealthData, healthStore) | 2h | Person B |
| 6 | Memory & storage layer (PatientMemory persistence, checkinStorage CRUD) | 2h | Person B |
| 7 | OpenAI API wrapper (streaming SSE fetch, prompts.ts) | 2h | Person A |
| 8 | Audio hooks (useAudioRecorder, useSpeech TTS queue) | 2h | Person A |
| 9 | Check-in state machine (useCheckin.ts, T-LICC coverage tracking, emotionExtractor) | 3h | Person A |
| 10 | Check-in UI screens (Start, Conversation, Summary) | 2.5h | Person A |
| 11 | Onboarding (3-screen flow → PatientMemory) | 1.5h | Person D |
| 12 | Dashboard & History screens | 2h | Person D |
| 13 | Clinician report (ReportScreen, reportFormatter, ReportSection, TrendChartFull) | 3h | Person C |
| 14 | Integration & E2E (merge to develop, full flow test, seed demo data) | 4h | All |
| 15 | Polish & demo prep (haptics, a11y labels, transitions, 3-min demo rehearsal) | 8h | All |

---

## Verification Checklist (after each step)

- `npx tsc --noEmit` → 0 errors
- `npx eslint . --ext .ts,.tsx` → 0 warnings
- After Steps 7–9: test check-in end-to-end in iOS Simulator with real API key
- After Step 13: generate full clinician report, verify JSON parses correctly
- Final: full demo run on physical iPhone, timed under 3 minutes

---

## Issue Labels

**Type:** `Feature` / `Bug` / `Polish` / `Blocker`
**Priority:** `P0` / `P1` / `P2`
**Owner:** `Person-A` / `Person-B` / `Person-C` / `Person-D`
