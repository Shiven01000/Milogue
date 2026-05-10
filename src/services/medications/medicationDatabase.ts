import { MedicationDatabaseEntry } from '@/types/medication';

// Mock "verified medication info" database.
// In the real build, replace this with a medical database/API lookup.
export const MEDICATION_DATABASE: MedicationDatabaseEntry[] = [
  {
    id: 'sertraline',
    name: 'Sertraline',
    brandNames: ['Zoloft'],
    whatItDoes:
      'Sertraline is an antidepressant (an SSRI). It can help improve mood and reduce symptoms of anxiety by affecting brain chemicals involved in mood and stress.',
    whyDoctorsPrescribe:
      'Doctors commonly prescribe sertraline for conditions like depression and anxiety. Some people are also prescribed it for panic disorder or similar anxiety-related conditions.',
    commonSideEffects: [
      'Nausea or stomach upset',
      'Headache',
      'Sleep changes (feeling sleepy or difficulty sleeping)',
      'Dizziness',
      'Tiredness',
      'Changes in appetite',
      'Sexual side effects',
    ],
    seriousSideEffects: [
      'Signs of an allergic reaction (swelling, rash, trouble breathing)',
      'Severe agitation, confusion, fever, or muscle stiffness (possible serotonin syndrome)',
      'Unusual bleeding or bruising',
      'Worsening mood or suicidal thoughts, especially early in treatment or after dose changes',
    ],
    questionsToAskPharmacistOrDoctor: [
      'How long does it usually take to start feeling better?',
      'What side effects are common in the first 1–2 weeks, and when should they improve?',
      'What should I do if I miss a dose?',
      'Are there any foods, alcohol, or other medicines I should avoid?',
    ],
  },
  {
    id: 'hydroxyzine',
    name: 'Hydroxyzine',
    brandNames: ['Atarax', 'Vistaril'],
    whatItDoes:
      'Hydroxyzine is an antihistamine that doctors also use for anxiety or itching. It can help calm the nervous system and reduce feelings of worry.',
    whyDoctorsPrescribe:
      'Doctors may prescribe hydroxyzine for anxiety symptoms, sometimes for short-term relief. It is also used for allergic itch and other itch-related problems.',
    commonSideEffects: [
      'Sleepiness or drowsiness',
      'Dry mouth',
      'Dizziness',
      'Headache',
      'Constipation',
    ],
    seriousSideEffects: [
      'Severe drowsiness or trouble staying awake (especially if combined with other sedating medicines)',
      'Fainting, very fast or irregular heartbeat',
      'Signs of an allergic reaction (swelling, rash, trouble breathing)',
    ],
    questionsToAskPharmacistOrDoctor: [
      'Will it make me sleepy, and should I avoid driving?',
      'Can I drink alcohol while taking this?',
      'What medicines should not be taken together with it?',
      'What signs mean I should call the doctor right away?',
    ],
  },
];

