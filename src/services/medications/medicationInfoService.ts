import { MedicationEntry } from '@/types/memory';
import { MedicationDatabaseEntry } from '@/types/medication';
import { MEDICATION_DATABASE } from '@/services/medications/medicationDatabase';

function normalize(s: string) {
  // Input may contain dose/frequency (e.g. "Sertraline 50mg daily"). Strip common dose patterns first.
  const cleaned = s
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g)\b/gi, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // remove things like "(ER)" loosely
    .replace(/\b(daily|twice|thrice|once|as needed|as-needed|prn)\b/gi, ' ')
    .trim();

  return cleaned.toLowerCase().replace(/\s+/g, ' ');
}

function buildFallbackEntry(med: MedicationEntry): MedicationDatabaseEntry {
  return {
    id: `unknown_${normalize(med.name).replace(/[^a-z0-9]+/g, '_') || 'med'}`,
    name: med.name,
    brandNames: [],
    whatItDoes:
      "We couldn't find this medicine in the demo database yet. Here you can still ask general questions about side effects or how the medicine category is usually explained.",
    whyDoctorsPrescribe:
      'Doctors prescribe medicines for specific conditions based on your health history. For exact reasons for your prescription, ask your doctor or pharmacist.',
    commonSideEffects: ['Common side effects can vary by medicine. Ask your pharmacist what to expect for your specific prescription.'],
    seriousSideEffects: [
      'Serious side effects are different for each medicine. Contact your doctor or seek urgent care if you have severe symptoms.',
    ],
    questionsToAskPharmacistOrDoctor: [
      'What condition is this medicine for in my case?',
      'What side effects should I watch for?',
      'Are there any interactions with my other medicines?',
      'How should I take it safely (timing and instructions)?',
    ],
  };
}

export function resolvePrescribedMedicationEntries(
  prescribed: MedicationEntry[],
): MedicationDatabaseEntry[] {
  const resolved: MedicationDatabaseEntry[] = [];
  const seen = new Set<string>();

  for (const med of prescribed) {
    const q = normalize(med.name);
    if (!q) continue;

    const match = MEDICATION_DATABASE.find(
      e => normalize(e.name) === q || e.brandNames.some(b => normalize(b) === q),
    );

    const entry = match ?? buildFallbackEntry(med);
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    resolved.push(entry);
  }

  return resolved;
}

export function findMedicationInDatabase(query: string): MedicationDatabaseEntry[] {
  const q = normalize(query);
  if (!q) return [];

  return MEDICATION_DATABASE.filter(e => {
    if (normalize(e.name).includes(q)) return true;
    return e.brandNames.some(b => normalize(b).includes(q));
  });
}

