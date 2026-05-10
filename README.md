# 🧠 Milogue

> **Daily AI check-ins. Wearable-correlated insights. Clinical-ready reports.**

Built for the **natIgnite 2026 AccessTech Hackathon** — 40 hours.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![GPT-4o](https://img.shields.io/badge/GPT--4o-OpenAI-412991?logo=openai&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-black)

---

## Overview

Mental health patients lose critical symptom context between clinical appointments. Milogue bridges that gap.

**Milo** — the app's AI companion — conducts a warm, conversational daily voice check-in with the patient. Behind the scenes, Milo is systematically capturing symptom data across five clinical dimensions using the **T-LICC framework**:

| Dimension | What it captures |
|---|---|
| **T**ime | When did events occur? How long did feelings last? |
| **L**ocation | Where were they? Alone or with others? |
| **I**ntensity | How severe, relative to past episodes? |
| **C**ontext | What triggered it? What was happening? |
| **C**hange | Improving, worsening, or stable since last session? |

T-LICC coverage is tracked automatically — Milo gathers it through natural conversation, never clinical interrogation.

The app has two views:

- **Patient view** — daily check-ins, health insights, medication education, and vocabulary tools
- **Doctor view** — patient dashboard, session history, and a one-click AI clinical report with wearable-correlated narrative

---

## Features

### Patient Features

**AI Voice Check-In (Milo)**
- Conversational check-ins powered by GPT-4o with a warm, empathetic system prompt
- Voice input transcribed via OpenAI Whisper; Milo responds via text-to-speech
- Animated waveform visualizer driven by real-time audio metering (expo-av)
- Milo mascot with four states: idle, listening, speaking, happy
- Animated subtitle bar chunked in 5–8 word segments during Milo's speech
- T-LICC coverage auto-tracked from patient language; coverage indicator shown in real time
- Session closes with a warm summary and mood score

**Facial Emotion Detection**
- Front camera captures a frame every 5 seconds during the check-in
- GPT-4o Vision classifies the patient's facial expression: `neutral`, `stressed`, `sad`, `anxious`, `tired`, `content`
- Detected emotions are added to a session timeline
- Milo receives camera context internally and can gently acknowledge mismatches between what the patient says and how they look

**Live Heart Rate**
- Simulated heart rate rises with stress-language and falls with calm-language during the session
- Displayed as an animated live pulse on the conversation screen
- Session average HR stored with the session record

**Emotion Vocabulary Mirroring**
- Patient's own emotion words are extracted and stored across sessions
- Milo reflects those exact words back in future check-ins to strengthen rapport
- Top 15 most-used emotion words are included in every system prompt

**Wearable Data (Fitbit Mock)**
- 30 days of realistic mock health data: sleep quality, HRV, resting HR, steps, active calories, stand hours
- Includes a simulated stress period (days 18–22) with degraded physiological metrics
- HRV classified against a 30-day rolling average (five-tier trend)
- Today's snapshot shown on the home dashboard and fed into the Milo check-in context

**Vocabulary Flashcard Builder**
- Generates 5 AI-powered emotion vocabulary flashcards from the patient's recent descriptions
- Each card includes: word, simple definition, why it fits the patient's own words, an example sentence, related words, and intensity level (mild / moderate / intense)
- Helps patients develop more precise emotional vocabulary over time

**Medication Knowledge**
- Search any medication via OpenFDA or GPT-4o fallback
- Image-based pill recognition using GPT-4o Vision
- Plain-language explanations: what it does, why doctors prescribe it, common and serious side effects, questions to ask your pharmacist
- Responds in the patient's preferred language (80+ languages, set once during onboarding)
- Strict safety net: refuses dosing advice or personal medical guidance

**Mental Health Education (Conditions)**
- Learn about diagnosed conditions in simple, jargon-free language
- AI-generated explanations with symptom lists and educational disclaimers
- "Ask or Explore" section: ask a question or describe symptoms to find related conditions
- Responds in the patient's preferred language (80+ languages)
- Content is scoped to the patient's diagnosed conditions only

**Check-in History**
- All sessions listed chronologically, grouped by week
- Tap any session to expand: full T-LICC coverage badges, duration, mood scores, emotion tags, and conversation transcript

**Voice Cloning**
- Record a voice sample and clone it via ElevenLabs
- Cloned voice is used for all future Milo TTS responses
- Voice preference stored in patient memory (male / female / custom cloned)

**Patient Profile & Settings**
- Name, date of birth, gender, phone, emergency contact
- Assigned doctor display
- Preferred check-in time and notification toggle
- Simulated Fitbit sync button (re-seeds health data with slight jitter)
- Logout

---

### Doctor Features

**Patient Dashboard**
- Doctors connect to patients via a unique patient code
- 30-day mood trend chart, HRV trend, and sleep quality visualized
- Last 14 sessions listed with emotion tags, mood scores, and summaries

**One-Click Clinical Report**
- Generates a full structured clinical summary using GPT-4o in JSON mode
- Report covers all five T-LICC dimensions plus trends and recommendations
- **Wearable-correlated narrative**: 2–3 paragraphs cross-correlating mood scores with HRV and sleep data, identifying which physiological patterns preceded high-intensity episodes
- Includes facial emotion arc from sessions where camera detection was active
- Doctor can ask follow-up questions about the report in a chat interface

**Medication & Condition Overview**
- View the patient's full medication list, diagnosed conditions, and identified triggers

**Remote Call Trigger**
- Doctor can trigger an incoming call notification to the patient
- Patient sees a full-screen "Incoming Call" UI from their doctor

---

## Tech Stack

| Concern | Library / Service |
|---|---|
| Framework | React Native 0.81.5 + Expo ~54 (managed workflow) |
| Language | TypeScript 5.9 (strict mode) |
| AI — Conversation | OpenAI GPT-4o (`gpt-4o`) via Chat Completions |
| AI — Vision | GPT-4o Vision (facial emotion detection, pill recognition) |
| AI — Transcription | OpenAI Whisper (`whisper-1`) |
| AI — TTS (default) | OpenAI TTS (`tts-1-hd`, voice: fable) |
| AI — TTS (premium) | ElevenLabs multilingual v2 + voice cloning |
| AI — TTS (fallback) | Google Gemini TTS (voice: Aoede) |
| Medication database | OpenFDA Drug Label API |
| State management | Zustand 5.0 |
| Persistence | AsyncStorage 2.2 |
| Audio recording | expo-av 16 (HIGH_QUALITY preset, real-time metering) |
| Camera | expo-camera 17 (front-facing, periodic frame capture) |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Animation | React Native Reanimated 4.1 |
| Charts | react-native-svg 15 |
| Gradients | expo-linear-gradient 15 |
| Haptics | expo-haptics 15 |

---

## Project Structure

```
src/
├── api/
│   ├── openai.ts                  # Chat Completions, JSON mode, Vision, Whisper wrappers
│   └── prompts.ts                 # All GPT-4o system prompt builders (check-in, report, medication, etc.)
│
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Typography.tsx
│   │   ├── WaveformVisualizer.tsx # Real-time audio level bars
│   │   ├── LoadingPulse.tsx       # Breathing animation while Milo responds
│   │   ├── ProgressDots.tsx
│   │   └── VoicePicker.tsx        # Voice preference selector
│   ├── checkin/
│   │   ├── ConversationBubble.tsx
│   │   ├── ConversationThread.tsx
│   │   ├── RecordButton.tsx
│   │   └── CheckinComplete.tsx
│   ├── dashboard/
│   │   ├── StreakBadge.tsx
│   │   ├── MoodTrendChart.tsx
│   │   ├── HealthSummaryCard.tsx
│   │   └── NextCheckinBanner.tsx
│   ├── mascot/
│   │   └── useMiloSpeech.ts       # Milo state machine (idle/listening/speaking/happy)
│   └── report/
│       ├── ReportSection.tsx
│       └── TrendChartFull.tsx
│
├── hooks/
│   ├── useCheckin.ts              # Check-in state machine, T-LICC tracking, GPT-4o calls
│   ├── useAudioRecorder.ts        # expo-av recording + real-time metering
│   ├── useSpeech.ts               # TTS playback (OpenAI / ElevenLabs)
│   ├── useLiveHeartRate.ts        # Simulated live HR tied to conversation sentiment
│   ├── useHealthData.ts           # Loads health snapshots into store
│   └── usePatientMemory.ts        # Patient memory store accessor
│
├── navigation/
│   ├── RootNavigator.tsx          # Role-based routing (patient vs doctor)
│   ├── TabNavigator.tsx           # Patient bottom tabs
│   └── types.ts                   # All navigation param type definitions
│
├── screens/
│   ├── onboarding/
│   │   ├── WelcomeScreen.tsx
│   │   ├── ProfileSetupScreen.tsx # Name, conditions, medications, language (80+), voice, doctor assignment
│   │   └── OnboardingCompleteScreen.tsx
│   ├── home/
│   │   └── HomeScreen.tsx         # Dashboard: streak, mood trend, health summary, feature cards
│   ├── checkin/
│   │   ├── CheckinStartScreen.tsx  # Mood slider before session
│   │   ├── CheckinConversationScreen.tsx # Full conversation UI with camera + waveform + live HR
│   │   └── CheckinSummaryScreen.tsx
│   ├── history/
│   │   └── HistoryScreen.tsx
│   ├── medications/
│   │   └── MedicationKnowledgeScreen.tsx
│   ├── conditions/
│   │   └── ConditionsScreen.tsx
│   ├── vocabulary/
│   │   └── VocabularyFlashcardScreen.tsx
│   ├── patient/
│   │   ├── PatientProfileScreen.tsx
│   │   └── VoiceCloningScreen.tsx
│   └── doctor/
│       └── PatientDetailScreen.tsx # Patient charts, session history, clinical report
│
├── services/
│   ├── healthkit/
│   │   ├── mockData.ts            # 30-day seeded health data generator
│   │   └── healthService.ts       # In-memory health snapshot cache + accessors
│   ├── medications/
│   │   └── openFdaService.ts      # OpenFDA lookup + GPT-4o fallback + image recognition
│   ├── storage/
│   │   ├── checkinStorage.ts      # AsyncStorage CRUD for sessions
│   │   ├── memoryStorage.ts       # AsyncStorage CRUD for patient memory
│   │   └── keys.ts
│   ├── transcription/
│   │   └── whisperService.ts      # OpenAI Whisper m4a → text
│   └── tts/
│       ├── openaiTtsService.ts    # OpenAI tts-1-hd → mp3 → playback
│       ├── elevenlabsTtsService.ts # ElevenLabs multilingual v2 + cloneVoice()
│       └── geminiTtsService.ts    # Gemini TTS (PCM → WAV → playback)
│
├── store/
│   ├── checkinStore.ts            # Active session state (messages, emotion timeline, T-LICC)
│   ├── memoryStore.ts             # Patient memory (persisted to AsyncStorage)
│   ├── healthStore.ts             # Health snapshots
│   └── index.ts
│
├── types/
│   ├── checkin.ts                 # CheckinSession, ConversationMessage, TLICCCoverage, DetectedEmotion
│   ├── health.ts                  # HealthSnapshot, SleepData, HRVData
│   ├── memory.ts                  # PatientMemory (includes voice prefs, doctor assignment, patient code)
│   ├── medication.ts
│   ├── conditions.ts
│   ├── vocabulary.ts
│   └── report.ts                  # ClinicalSummary, ReportSection
│
└── utils/
    ├── dateUtils.ts
    ├── emotionExtractor.ts
    ├── reportFormatter.ts
    └── validation.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Expo Go](https://expo.dev/client) installed on your iPhone (iOS 16+)
- An OpenAI API key with GPT-4o access

### Installation

```bash
# Clone the repo
git clone https://github.com/Shiven01000/Milogue.git
cd Milogue

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then fill in your keys (see [Environment Variables](#environment-variables) below).

### Run

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone. The app will load with 30 days of pre-seeded mock health data.

---

## Environment Variables

| Variable | Required | Description | Where to get it |
|---|---|---|---|
| `EXPO_PUBLIC_OPENAI_API_KEY` | ✅ Yes | Powers all GPT-4o conversations, Whisper transcription, and TTS | [platform.openai.com](https://platform.openai.com/api-keys) |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY` | Optional | Enables premium TTS and voice cloning | [elevenlabs.io](https://elevenlabs.io) → Profile → API Key |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Optional | Fallback TTS provider | [aistudio.google.com](https://aistudio.google.com) |
| `EXPO_PUBLIC_SEED_DEMO_DATA` | Optional | Set to `true` to pre-load 30 days of mock health data on first launch | — |
| `EXPO_PUBLIC_ENABLE_WHISPER` | Optional | Set to `true` to use Whisper for voice transcription (uses OpenAI credits) | — |

> The app works with only `EXPO_PUBLIC_OPENAI_API_KEY` set. ElevenLabs and Gemini keys unlock additional TTS options.

---

## Demo

### Full Patient Flow (end to end)

1. **Launch** → select **Patient** on the role selection screen
2. **Onboarding** → enter name, select conditions (e.g. Anxiety, ADHD), add medications, choose a language (80+ available with search), choose a voice preference
3. **Home screen** → tap **Start Check-In**
4. **Mood slider** → rate your current mood (1–10), tap Continue
5. **Conversation screen** → Milo greets you. Tap the record button, speak, release. Milo responds via voice and animated subtitles
6. Continue the conversation (8–12 exchanges). T-LICC coverage fills in as you talk
7. Tap **End Session** → view the session summary, mood score, and emotion tags
8. Return to **Home** → your streak badge and mood chart update

### Switching to Doctor View

1. Tap **Profile** → scroll to bottom → **Log Out**
2. On the role selection screen, tap **Doctor**
3. Complete doctor onboarding (name)
4. From the patients list, tap **Connect Patient** and enter the patient's unique code (shown in the patient's Profile screen)
5. Open the patient detail to see 30-day charts, session history, medication list, and triggers

### Generating a Clinical Report

1. In the doctor view, open a patient's detail screen
2. Scroll to the **Clinical Summary** section → tap **Generate Report**
3. GPT-4o generates a full T-LICC structured report with a wearable-correlated narrative
4. Tap any section to expand. Use the chat box to ask follow-up questions about the report

### Triggering a Remote Call (Doctor → Patient)

1. In the doctor's patient detail screen, tap **Schedule Call**
2. The patient's device shows a full-screen incoming call UI from the doctor

### Pre-Seeded Demo Data

With `EXPO_PUBLIC_SEED_DEMO_DATA=true`, the app pre-loads:
- 30 days of realistic Fitbit-style health data (HRV, sleep, steps, calories)
- A simulated stress period on days 18–22 with degraded physiological metrics visible in the clinical report

---

## Architecture Notes

### Doctor–Patient Connection

Each patient has a unique `patientCode` generated at onboarding (stored in `PatientMemory`). The doctor enters this code to connect. Patient memory and session history are stored on-device via AsyncStorage — for a production deployment, this would be replaced by a cloud backend (e.g. Supabase or Firebase) with the same interface.

### AI Conversation Memory

`PatientMemory` accumulates across sessions:
- `emotionVocabulary[]` — words the patient uses to describe feelings, ranked by frequency
- `triggers[]` — recurring environmental or contextual patterns
- `lastSessionSummary` — 2-sentence summary of the previous session

All of this is injected into every Milo system prompt, so Milo always has full context of who the patient is and what they've shared before.

### Health Data Abstraction

`healthService.ts` exposes a simple interface (`getHealthSnapshot`, `getHealthRange`) that is currently backed by deterministic mock data. Swapping in a real HealthKit or Fitbit integration only requires replacing `mockData.ts` — no other files change.

### Storage

All data uses AsyncStorage with typed wrappers in `src/services/storage/`. Replacing AsyncStorage with a cloud backend (Supabase, Firebase, etc.) requires only updating those service files — all hooks and stores remain unchanged.

---

## Team

Built at **natIgnite 2026** by Team Milogue

- **Shiven Lakhanpal**
- **Ruhan Shah**
- **Farhan Naim**
- **Rey Eleccion**

---

## License

MIT License — see [LICENSE](LICENSE) for details.
