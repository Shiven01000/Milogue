import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckinSession, ConversationMessage, TLICCCoverage } from '@/types/checkin';
import { PatientMemory } from '@/types/memory';
import { STORAGE_KEYS } from '@/services/storage/keys';

function demoMsg(id: string, role: 'user' | 'assistant', content: string, ts: number): ConversationMessage {
  return { id, role, content, timestamp: ts, isStreaming: false };
}

function fullTLICC(): TLICCCoverage {
  return { time: true, location: true, intensity: true, context: true, change: true };
}

function partialTLICC(overrides: Partial<TLICCCoverage> = {}): TLICCCoverage {
  return { time: false, location: false, intensity: false, context: false, change: false, ...overrides };
}

function dayTs(daysAgo: number, hourOffset = 9): number {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hourOffset, 0, 0, 0);
  return d.getTime();
}

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const DEMO_SESSIONS: CheckinSession[] = [
  {
    id: 'demo_s1',
    date: isoDate(6),
    startedAt: dayTs(6),
    completedAt: dayTs(6, 9) + 7 * 60 * 1000,
    moodScoreAtStart: 3,
    emotionTags: ['anxious', 'overwhelmed', 'tired'],
    tliccCoverage: fullTLICC(),
    sessionSummary: 'Patient reported severe anxiety before a work presentation, describing feeling overwhelmed for most of the morning and struggling to concentrate despite having slept adequately.',
    healthSnapshotId: 'health_mock_6',
    messages: [
      demoMsg('dm_1_1', 'assistant', "Hi Alex, good to see you. How are you feeling as we start today?", dayTs(6)),
      demoMsg('dm_1_2', 'user', "Not great honestly. I have a big presentation at work in a few hours and I've been anxious since yesterday night.", dayTs(6) + 30000),
      demoMsg('dm_1_3', 'assistant', "That sounds really stressful — an important presentation looming is a lot to carry. When did that anxious feeling start building up?", dayTs(6) + 60000),
      demoMsg('dm_1_4', 'user', "Since last night around 8pm. I couldn't sleep properly. I kept going over my slides in my head.", dayTs(6) + 90000),
      demoMsg('dm_1_5', 'assistant', "So the anxiety has been with you overnight — that's exhausting. On a scale of how intense it feels compared to other anxious days, where would you put it?", dayTs(6) + 120000),
      demoMsg('dm_1_6', 'user', "Probably a 7 or 8 out of 10. It's more intense than usual. My chest feels tight.", dayTs(6) + 150000),
      demoMsg('dm_1_7', 'assistant', "Chest tightness, difficulty sleeping, ruminating over the slides — your body is really feeling this one. Is there anything about the presentation specifically that's driving the fear?", dayTs(6) + 180000),
      demoMsg('dm_1_8', 'user', "My manager will be there and there's been tension between us lately. I'm worried I'll freeze up or say something wrong.", dayTs(6) + 210000),
    ],
  },
  {
    id: 'demo_s2',
    date: isoDate(5),
    startedAt: dayTs(5),
    completedAt: dayTs(5, 9) + 6 * 60 * 1000,
    moodScoreAtStart: 5,
    emotionTags: ['relieved', 'drained', 'proud'],
    tliccCoverage: fullTLICC(),
    sessionSummary: 'Patient described relief after completing the presentation yesterday, though still feels emotionally drained from the buildup; noted the session went better than expected but the tension with their manager remains unresolved.',
    healthSnapshotId: 'health_mock_5',
    messages: [
      demoMsg('dm_2_1', 'assistant', "Hi Alex. Yesterday sounded really stressful with that presentation — how did it go?", dayTs(5)),
      demoMsg('dm_2_2', 'user', "It actually went okay. Not perfect but better than I expected. I didn't freeze up.", dayTs(5) + 30000),
      demoMsg('dm_2_3', 'assistant', "That's a real win — you showed up even when you were dreading it. How are you feeling now that it's behind you?", dayTs(5) + 60000),
      demoMsg('dm_2_4', 'user', "Relieved, but kind of drained? Like the anxiety burned through all my energy. I slept 10 hours last night.", dayTs(5) + 90000),
      demoMsg('dm_2_5', 'assistant', "Your body needed that recovery. The tension with your manager — did anything shift after the presentation?", dayTs(5) + 120000),
      demoMsg('dm_2_6', 'user', "Not really. He said it was fine but there was no warmth. I still feel like I'm walking on eggshells around him.", dayTs(5) + 150000),
      demoMsg('dm_2_7', 'assistant', "Walking on eggshells — that's a draining place to be, especially at work where you spend so much time. How long has this tension been there?", dayTs(5) + 180000),
      demoMsg('dm_2_8', 'user', "About three weeks since he gave me critical feedback in front of the team. I haven't been able to shake it.", dayTs(5) + 210000),
    ],
  },
  {
    id: 'demo_s3',
    date: isoDate(4),
    startedAt: dayTs(4),
    completedAt: dayTs(4, 9) + 8 * 60 * 1000,
    moodScoreAtStart: 4,
    emotionTags: ['stressed', 'isolated', 'low'],
    tliccCoverage: partialTLICC({ time: true, context: true, intensity: true }),
    sessionSummary: 'Patient described ongoing low mood linked to workplace stress, reported withdrawing from friends and social activities over the past two weeks, and expressed concern about the pattern worsening.',
    healthSnapshotId: 'health_mock_4',
    messages: [
      demoMsg('dm_3_1', 'assistant', "Good morning Alex. You mentioned feeling drained yesterday — how are things today?", dayTs(4)),
      demoMsg('dm_3_2', 'user', "Still pretty low. I've been avoiding my friends. I cancelled plans twice this week.", dayTs(4) + 30000),
      demoMsg('dm_3_3', 'assistant', "Withdrawing from the people around you — that can feel protective but also lonelier over time. What's been making it hard to show up for plans?", dayTs(4) + 60000),
      demoMsg('dm_3_4', 'user', "I just don't have the energy. And I don't want to talk about work stuff and have to explain everything.", dayTs(4) + 90000),
      demoMsg('dm_3_5', 'assistant', "You're carrying a lot and don't want to perform being okay for others — that makes total sense. How long has this low energy and pulling back been going on?", dayTs(4) + 120000),
      demoMsg('dm_3_6', 'user', "About two weeks. Maybe since the incident with my manager.", dayTs(4) + 150000),
      demoMsg('dm_3_7', 'assistant', "Two weeks is a significant stretch to be running on empty. Has your sleep or appetite changed at all during this time?", dayTs(4) + 180000),
      demoMsg('dm_3_8', 'user', "I'm sleeping more but still tired. And I've been stress eating, which makes me feel worse about myself.", dayTs(4) + 210000),
    ],
  },
  {
    id: 'demo_s4',
    date: isoDate(3),
    startedAt: dayTs(3),
    completedAt: dayTs(3, 9) + 5 * 60 * 1000,
    moodScoreAtStart: 6,
    emotionTags: ['calmer', 'hopeful', 'reflective'],
    tliccCoverage: partialTLICC({ time: true, change: true, context: true }),
    sessionSummary: 'Patient reported a slightly better day, having taken a walk outside and talked briefly with a friend; mood was more stable though underlying work anxiety persists.',
    healthSnapshotId: 'health_mock_3',
    messages: [
      demoMsg('dm_4_1', 'assistant', "Hi Alex. Yesterday you talked about pulling away from people — how did today start?", dayTs(3)),
      demoMsg('dm_4_2', 'user', "Better actually. I went for a walk this morning and texted a friend. Small things but it helped.", dayTs(3) + 30000),
      demoMsg('dm_4_3', 'assistant', "Those small steps matter a lot. Going outside and reaching out — what made today feel different enough to do those things?", dayTs(3) + 60000),
      demoMsg('dm_4_4', 'user', "I think I just got tired of feeling stuck. And the walk cleared my head a bit.", dayTs(3) + 90000),
      demoMsg('dm_4_5', 'assistant', "Sometimes the tiredness of being stuck becomes its own push forward. Is the work situation still weighing on you, or did the walk give it a different perspective?", dayTs(3) + 120000),
      demoMsg('dm_4_6', 'user', "Still there, but I felt less trapped today. I'm thinking about whether I should talk to HR or something.", dayTs(3) + 150000),
    ],
  },
  {
    id: 'demo_s5',
    date: isoDate(2),
    startedAt: dayTs(2),
    completedAt: dayTs(2, 9) + 9 * 60 * 1000,
    moodScoreAtStart: 5,
    emotionTags: ['uncertain', 'anxious', 'conflicted'],
    tliccCoverage: fullTLICC(),
    sessionSummary: 'Patient is weighing whether to escalate workplace conflict to HR, expressed fear about retaliation and feeling unsupported; anxiety remains moderate with physical symptoms including shoulder tension.',
    healthSnapshotId: 'health_mock_2',
    messages: [
      demoMsg('dm_5_1', 'assistant', "Good morning Alex. Yesterday you mentioned thinking about HR — have you given that more thought?", dayTs(2)),
      demoMsg('dm_5_2', 'user', "A lot actually. I'm scared it'll make things worse. What if he retaliates?", dayTs(2) + 30000),
      demoMsg('dm_5_3', 'assistant', "That fear makes a lot of sense — you're in a vulnerable position and you don't know how he'd respond. What specifically are you most worried would happen?", dayTs(2) + 60000),
      demoMsg('dm_5_4', 'user', "That he'd give me worse projects, or find a way to push me out. I've seen it happen to others.", dayTs(2) + 90000),
      demoMsg('dm_5_5', 'assistant', "You've seen this play out before with others, so this isn't an abstract fear — it's based in experience. Is there anyone at work you trust enough to talk to about this first?", dayTs(2) + 120000),
      demoMsg('dm_5_6', 'user', "There's one colleague, Sarah, who's been through something similar. I might reach out to her.", dayTs(2) + 150000),
      demoMsg('dm_5_7', 'assistant', "That sounds like a really thoughtful step — getting a perspective from someone who's navigated it. How is your body feeling through all this? You mentioned chest tightness last week.", dayTs(2) + 180000),
      demoMsg('dm_5_8', 'user', "The chest is better but my shoulders are really tense. I notice it most in meetings.", dayTs(2) + 210000),
    ],
  },
  {
    id: 'demo_s6',
    date: isoDate(1),
    startedAt: dayTs(1),
    completedAt: dayTs(1, 9) + 6 * 60 * 1000,
    moodScoreAtStart: 7,
    emotionTags: ['supported', 'lighter', 'hopeful'],
    tliccCoverage: partialTLICC({ change: true, context: true, time: true }),
    sessionSummary: 'Patient spoke with colleague Sarah and felt validated and less alone; mood noticeably improved, reporting the first morning in two weeks where anxiety was not the first thing they felt.',
    healthSnapshotId: 'health_mock_1',
    messages: [
      demoMsg('dm_6_1', 'assistant', "Hi Alex. Did you manage to talk to Sarah?", dayTs(1)),
      demoMsg('dm_6_2', 'user', "I did, yesterday afternoon. It really helped. She went through almost the exact same thing two years ago.", dayTs(1) + 30000),
      demoMsg('dm_6_3', 'assistant', "That sense of being understood — you're not the only one who's been here — sounds like it landed. How did you feel after talking to her?", dayTs(1) + 60000),
      demoMsg('dm_6_4', 'user', "Lighter. Like I've been carrying this alone for weeks and someone finally got it without me having to explain everything.", dayTs(1) + 90000),
      demoMsg('dm_6_5', 'assistant', "Lighter is a really meaningful shift. Did anything she share change how you're thinking about next steps?", dayTs(1) + 120000),
      demoMsg('dm_6_6', 'user', "She said to document everything first before going to HR. Which feels more manageable than jumping straight in.", dayTs(1) + 150000),
      demoMsg('dm_6_7', 'assistant', "A clear first step instead of a big unknown leap — that can really reduce the anxiety. How did this morning feel compared to the past couple of weeks?", dayTs(1) + 180000),
      demoMsg('dm_6_8', 'user', "Actually better. It was the first morning in a while where I didn't wake up with that dread feeling immediately.", dayTs(1) + 210000),
    ],
  },
  {
    id: 'demo_s7',
    date: isoDate(0),
    startedAt: dayTs(0),
    completedAt: dayTs(0, 9) + 7 * 60 * 1000,
    moodScoreAtStart: 7,
    emotionTags: ['grounded', 'hopeful', 'tired'],
    tliccCoverage: fullTLICC(),
    sessionSummary: 'Patient reports mood stabilizing around 7/10 with a clearer plan for the workplace situation; still experiencing fatigue but no longer feeling trapped, with improved sleep over the last two nights.',
    healthSnapshotId: 'health_mock_0',
    messages: [
      demoMsg('dm_7_1', 'assistant', "Good morning Alex. The last couple of days have sounded more hopeful — how are you today?", dayTs(0)),
      demoMsg('dm_7_2', 'user', "Yeah, I'd say I'm a 7 today. Still tired but not that heavy anxious tired.", dayTs(0) + 30000),
      demoMsg('dm_7_3', 'assistant', "There's a real difference between tired from recovery and tired from dread — sounds like you're in the former. How are you sleeping?", dayTs(0) + 60000),
      demoMsg('dm_7_4', 'user', "Better the last two nights. More like normal sleep, not that heavy crashing thing.", dayTs(0) + 90000),
      demoMsg('dm_7_5', 'assistant', "Your sleep coming back is a really good sign that your nervous system is getting some relief. Have you started the documentation Sarah suggested?", dayTs(0) + 120000),
      demoMsg('dm_7_6', 'user', "Started yesterday. I have three incidents written down so far. It feels less overwhelming when it's on paper.", dayTs(0) + 150000),
      demoMsg('dm_7_7', 'assistant', "Getting it out of your head and into writing — that's exactly the kind of concrete step that builds a sense of control. Where do you want to take things from here?", dayTs(0) + 180000),
      demoMsg('dm_7_8', 'user', "Keep documenting for another week and then decide. I feel like I have a plan now instead of just spinning.", dayTs(0) + 210000),
    ],
  },
];

const DEMO_MEMORY: PatientMemory = {
  patientName: 'Alex',
  setupComplete: true,
  conditions: ['Generalized Anxiety Disorder', 'Mild Depression'],
  medications: [
    { name: 'Sertraline', dose: '50mg', frequency: 'daily' },
    { name: 'Hydroxyzine', dose: '25mg', frequency: 'as needed' },
  ],
  emotionVocabulary: [
    { word: 'anxious', firstUsed: isoDate(6), useCount: 4 },
    { word: 'drained', firstUsed: isoDate(5), useCount: 3 },
    { word: 'overwhelmed', firstUsed: isoDate(6), useCount: 2 },
    { word: 'lighter', firstUsed: isoDate(1), useCount: 2 },
    { word: 'hopeful', firstUsed: isoDate(3), useCount: 2 },
    { word: 'grounded', firstUsed: isoDate(0), useCount: 1 },
  ],
  triggers: [
    {
      description: 'Conflict with manager / being criticized in front of colleagues',
      firstIdentified: isoDate(6),
      sessionIds: ['demo_s1', 'demo_s2', 'demo_s3', 'demo_s5'],
    },
    {
      description: 'High-stakes work presentations',
      firstIdentified: isoDate(6),
      sessionIds: ['demo_s1'],
    },
  ],
  lastSessionId: 'demo_s7',
  lastSessionSummary: DEMO_SESSIONS[6].sessionSummary,
  totalSessionCount: 7,
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

export async function seedDemoData(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CHECKIN_SESSIONS, JSON.stringify(DEMO_SESSIONS));
  await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_MEMORY, JSON.stringify(DEMO_MEMORY));
  console.log('[DemoSeeder] Seeded 7 sessions + patient memory for Alex');
}

export async function clearDemoData(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEYS.CHECKIN_SESSIONS, STORAGE_KEYS.PATIENT_MEMORY]);
  console.log('[DemoSeeder] Cleared all demo data');
}
