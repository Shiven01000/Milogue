import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/services/storage/keys';
import { PatientMemory } from '@/types/memory';
import { DoctorProfile } from '@/types/doctor';
import { CheckinSession } from '@/types/checkin';

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function ts(daysAgo: number, hour = 9, minute = 0): number {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

const PATIENT_CODE = '4821';

const PATIENT_MEMORY: PatientMemory = {
  patientName: 'Alex Johnson',
  setupComplete: true,
  patientCode: PATIENT_CODE,
  dateOfBirth: '1992-04-15',
  gender: 'Non-binary',
  phone: '+1 (555) 023-4187',
  emergencyContactName: 'Jamie Johnson',
  emergencyContactPhone: '+1 (555) 023-4188',
  conditions: ['Anxiety', 'Depression'],
  medications: [
    { name: 'Sertraline', dose: '50mg', frequency: 'daily' },
    { name: 'Lorazepam', dose: '0.5mg', frequency: 'as needed' },
  ],
  emotionVocabulary: [
    { word: 'overwhelmed', firstUsed: dateStr(7), useCount: 4 },
    { word: 'exhausted', firstUsed: dateStr(6), useCount: 3 },
    { word: 'hopeful', firstUsed: dateStr(2), useCount: 2 },
    { word: 'grounded', firstUsed: dateStr(1), useCount: 1 },
  ],
  triggers: [
    { description: 'Work deadline pressure', firstIdentified: dateStr(7), sessionIds: ['demo-1', 'demo-4'] },
    { description: 'Poor sleep quality', firstIdentified: dateStr(6), sessionIds: ['demo-1', 'demo-2'] },
  ],
  lastSessionId: 'demo-7',
  lastSessionSummary: 'Alex felt tired but stable, reporting a calmer week overall after the difficult Monday.',
  totalSessionCount: 7,
  notificationEnabled: true,
  preferredCheckinTime: '09:00',
  assignedDoctorName: 'Dr. Sarah Chen',
  createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
};

const SESSIONS: CheckinSession[] = [
  {
    id: 'demo-1',
    date: dateStr(7),
    startedAt: ts(7),
    completedAt: ts(7) + 13 * 60 * 1000,
    moodScoreAtStart: 4,
    moodScoreAtEnd: 4,
    emotionTags: ['overwhelmed', 'anxious', 'exhausted'],
    tliccCoverage: { time: true, location: true, intensity: true, context: true, change: false },
    sessionSummary: 'Alex reported feeling overwhelmed and anxious with racing thoughts at night and difficulty sleeping before a big deadline.',
    healthSnapshotId: dateStr(7),
    messages: [
      { id: 'dm1-1', role: 'assistant', content: "Hey Alex, good morning. How have you been feeling since we last spoke?", timestamp: ts(7) },
      { id: 'dm1-2', role: 'user', content: "Honestly not great. I barely slept — my mind was just racing all night about the project deadline.", timestamp: ts(7) + 90000 },
      { id: 'dm1-3', role: 'assistant', content: "That sounds really draining. When you say racing thoughts — were they specific worries, or more of a general background hum of anxiety?", timestamp: ts(7) + 120000 },
      { id: 'dm1-4', role: 'user', content: "Specific worries. Like did I send that email, will my manager be upset, that kind of thing. On loop.", timestamp: ts(7) + 200000 },
      { id: 'dm1-5', role: 'assistant', content: "That loop sounds exhausting. Has this happened before, or is this week unusually intense for you?", timestamp: ts(7) + 240000 },
      { id: 'dm1-6', role: 'user', content: "It's worse this week. The deadline is Thursday and I feel completely behind.", timestamp: ts(7) + 310000 },
    ],
  },
  {
    id: 'demo-2',
    date: dateStr(6),
    startedAt: ts(6),
    completedAt: ts(6) + 11 * 60 * 1000,
    moodScoreAtStart: 5,
    moodScoreAtEnd: 6,
    emotionTags: ['tired', 'uncertain', 'slightly better'],
    tliccCoverage: { time: true, location: false, intensity: true, context: true, change: true },
    sessionSummary: 'Alex slept a bit better after taking Lorazepam. Still feeling the weight of the deadline but slightly more grounded than yesterday.',
    healthSnapshotId: dateStr(6),
    messages: [
      { id: 'dm2-1', role: 'assistant', content: "Good morning Alex. Yesterday sounded really rough — how did last night go?", timestamp: ts(6) },
      { id: 'dm2-2', role: 'user', content: "A bit better. I took a half Lorazepam around midnight and that helped. Still tired though.", timestamp: ts(6) + 85000 },
      { id: 'dm2-3', role: 'assistant', content: "I'm glad something helped. How are you feeling going into today — any shift from yesterday?", timestamp: ts(6) + 120000 },
      { id: 'dm2-4', role: 'user', content: "Slightly. Like I can breathe a tiny bit more. I made a to-do list this morning which helped.", timestamp: ts(6) + 190000 },
      { id: 'dm2-5', role: 'assistant', content: "That's a real shift — moving from racing thoughts to a concrete list. What's the most important thing on it today?", timestamp: ts(6) + 230000 },
      { id: 'dm2-6', role: 'user', content: "Finishing the first draft of the presentation. If I can do that I'll feel a lot better.", timestamp: ts(6) + 300000 },
    ],
  },
  {
    id: 'demo-3',
    date: dateStr(5),
    startedAt: ts(5, 10),
    completedAt: ts(5, 10) + 15 * 60 * 1000,
    moodScoreAtStart: 6,
    moodScoreAtEnd: 7,
    emotionTags: ['calmer', 'relieved', 'hopeful'],
    tliccCoverage: { time: true, location: true, intensity: true, context: true, change: true },
    sessionSummary: 'Alex completed the presentation draft and felt significant relief. Mood improving. Mentioned therapy session this week was helpful.',
    healthSnapshotId: dateStr(5),
    messages: [
      { id: 'dm3-1', role: 'assistant', content: "Hey Alex. You had a big goal yesterday — how did the presentation draft go?", timestamp: ts(5, 10) },
      { id: 'dm3-2', role: 'user', content: "I finished it! It's not perfect but it's done. I feel so much lighter.", timestamp: ts(5, 10) + 70000 },
      { id: 'dm3-3', role: 'assistant', content: "That's a huge relief. How are you feeling in your body right now, compared to Monday?", timestamp: ts(5, 10) + 110000 },
      { id: 'dm3-4', role: 'user', content: "Way calmer. My chest isn't tight anymore. I also saw my therapist yesterday which helped a lot.", timestamp: ts(5, 10) + 180000 },
      { id: 'dm3-5', role: 'assistant', content: "I'm really glad to hear that. What did you and your therapist work on, if you don't mind sharing?", timestamp: ts(5, 10) + 220000 },
      { id: 'dm3-6', role: 'user', content: "We talked about my tendency to catastrophize. She gave me some reframing techniques.", timestamp: ts(5, 10) + 295000 },
    ],
  },
  {
    id: 'demo-4',
    date: dateStr(4),
    startedAt: ts(4, 8, 30),
    completedAt: ts(4, 8, 30) + 12 * 60 * 1000,
    moodScoreAtStart: 4,
    moodScoreAtEnd: 5,
    emotionTags: ['anxious', 'overwhelmed', 'frustrated'],
    tliccCoverage: { time: true, location: true, intensity: true, context: true, change: false },
    sessionSummary: 'Panic episode in the morning before the presentation. Alex used breathing techniques and got through it but felt shaken afterward.',
    healthSnapshotId: dateStr(4),
    messages: [
      { id: 'dm4-1', role: 'assistant', content: "Good morning Alex. Today's the presentation day — how are you feeling?", timestamp: ts(4, 8, 30) },
      { id: 'dm4-2', role: 'user', content: "I had a panic attack this morning. Heart racing, couldn't breathe. It came out of nowhere.", timestamp: ts(4, 8, 30) + 80000 },
      { id: 'dm4-3', role: 'assistant', content: "I'm so sorry that happened. Are you feeling safer now? Can you tell me what helped you get through it?", timestamp: ts(4, 8, 30) + 120000 },
      { id: 'dm4-4', role: 'user', content: "I sat on the floor and did box breathing for like 10 minutes. Eventually it passed.", timestamp: ts(4, 8, 30) + 200000 },
      { id: 'dm4-5', role: 'assistant', content: "That took real presence of mind to use that technique when you were that scared. How are you feeling now, with the presentation a few hours away?", timestamp: ts(4, 8, 30) + 250000 },
      { id: 'dm4-6', role: 'user', content: "Shaken but functional. I'm going to do it. I don't have a choice.", timestamp: ts(4, 8, 30) + 320000 },
    ],
  },
  {
    id: 'demo-5',
    date: dateStr(3),
    startedAt: ts(3),
    completedAt: ts(3) + 10 * 60 * 1000,
    moodScoreAtStart: 7,
    moodScoreAtEnd: 8,
    emotionTags: ['proud', 'relieved', 'hopeful'],
    tliccCoverage: { time: true, location: false, intensity: true, context: true, change: true },
    sessionSummary: 'Alex nailed the presentation. Team responded positively. First good sleep in a week. Feeling proud and more optimistic.',
    healthSnapshotId: dateStr(3),
    messages: [
      { id: 'dm5-1', role: 'assistant', content: "Alex! Yesterday was the big day — how did the presentation go?", timestamp: ts(3) },
      { id: 'dm5-2', role: 'user', content: "It went really well. My manager actually said it was one of the clearest briefs she'd seen from me.", timestamp: ts(3) + 65000 },
      { id: 'dm5-3', role: 'assistant', content: "After everything you went through to get there — that must feel incredible. How did you sleep last night?", timestamp: ts(3) + 105000 },
      { id: 'dm5-4', role: 'user', content: "First time in a week I slept through the night. I feel almost like a human again.", timestamp: ts(3) + 170000 },
      { id: 'dm5-5', role: 'assistant', content: "That's such good news. I noticed your mood was at a 4 earlier this week — where would you say you are today?", timestamp: ts(3) + 210000 },
      { id: 'dm5-6', role: 'user', content: "Honestly like a 7 or 8. The Sertraline might actually be kicking in too. Feels different.", timestamp: ts(3) + 280000 },
    ],
  },
  {
    id: 'demo-6',
    date: dateStr(2),
    startedAt: ts(2, 9, 15),
    completedAt: ts(2, 9, 15) + 9 * 60 * 1000,
    moodScoreAtStart: 8,
    moodScoreAtEnd: 8,
    emotionTags: ['grounded', 'hopeful', 'connected'],
    tliccCoverage: { time: true, location: true, intensity: true, context: true, change: true },
    sessionSummary: 'Best check-in of the week. Alex feels grounded and connected, credits consistent Sertraline and resumed exercise. Planning social activity this weekend.',
    healthSnapshotId: dateStr(2),
    messages: [
      { id: 'dm6-1', role: 'assistant', content: "Good morning Alex. You sounded really good yesterday — how's today starting?", timestamp: ts(2, 9, 15) },
      { id: 'dm6-2', role: 'user', content: "Really good. I went for a run this morning for the first time in two weeks. It felt amazing.", timestamp: ts(2, 9, 15) + 75000 },
      { id: 'dm6-3', role: 'assistant', content: "Running can be such a reset. What's feeling different compared to the start of the week?", timestamp: ts(2, 9, 15) + 115000 },
      { id: 'dm6-4', role: 'user', content: "I feel like myself again. Less like I'm just surviving and more like I'm actually living.", timestamp: ts(2, 9, 15) + 185000 },
      { id: 'dm6-5', role: 'assistant', content: "That's a profound shift to notice. Is there anything you want to protect or hold onto to keep this going?", timestamp: ts(2, 9, 15) + 225000 },
      { id: 'dm6-6', role: 'user', content: "Sleep, movement, and not letting work spiral. Those three things made the biggest difference this week.", timestamp: ts(2, 9, 15) + 295000 },
    ],
  },
  {
    id: 'demo-7',
    date: dateStr(1),
    startedAt: ts(1),
    completedAt: ts(1) + 11 * 60 * 1000,
    moodScoreAtStart: 6,
    moodScoreAtEnd: 7,
    emotionTags: ['tired', 'stable', 'content'],
    tliccCoverage: { time: true, location: false, intensity: true, context: true, change: true },
    sessionSummary: 'Alex felt tired after a social weekend but stable and content. Good week overall, medication and sleep improvements noted.',
    healthSnapshotId: dateStr(1),
    messages: [
      { id: 'dm7-1', role: 'assistant', content: "Hey Alex — how was your weekend?", timestamp: ts(1) },
      { id: 'dm7-2', role: 'user', content: "Really nice. Saw some friends I hadn't seen in a while. A bit tired today but in a good way.", timestamp: ts(1) + 70000 },
      { id: 'dm7-3', role: 'assistant', content: "Social tired is different from anxious tired — it sounds like a good kind of exhausted. How would you compare this week to last week overall?", timestamp: ts(1) + 115000 },
      { id: 'dm7-4', role: 'user', content: "Night and day. Last week I was barely coping. This week I felt like a person.", timestamp: ts(1) + 185000 },
      { id: 'dm7-5', role: 'assistant', content: "That's a really meaningful change in just seven days. What do you think made the biggest difference?", timestamp: ts(1) + 230000 },
      { id: 'dm7-6', role: 'user', content: "Honestly? Getting through Thursday. And maybe the medication finally kicking in. I feel more level.", timestamp: ts(1) + 300000 },
    ],
  },
];

const DOCTOR_PROFILE: DoctorProfile = {
  doctorName: 'Dr. Sarah Chen',
  licenseNumber: 'MD-8472610',
  specialty: 'Psychiatrist',
  clinicName: 'Riverside Mental Health',
  patients: [{ name: 'Alex Johnson', code: PATIENT_CODE }],
  setupComplete: true,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export async function seedDemoData(): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.PATIENT_MEMORY,   JSON.stringify(PATIENT_MEMORY)],
    [STORAGE_KEYS.CHECKIN_SESSIONS, JSON.stringify(SESSIONS)],
    [STORAGE_KEYS.DOCTOR_PROFILE,   JSON.stringify(DOCTOR_PROFILE)],
    [STORAGE_KEYS.APP_ROLE,         'patient'],
  ]);
}
