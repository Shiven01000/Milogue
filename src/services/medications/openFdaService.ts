import { MedicationCandidate, MedicationDatabaseEntry } from '@/types/medication';
import { chatCompletionJSON, chatCompletionWithImage } from '@/api/openai';
import { buildMedicationCandidateSearchMessages, buildMedicationExplanationFromCandidateMessages } from '@/api/prompts';

const OPEN_FDA_BASE = 'https://api.fda.gov/drug/label.json';

type OpenFdaResult = {
  set_id?: string[];
  openfda?: {
    generic_name?: string[];
    brand_name?: string[];
    substance_name?: string[];
  };
  purpose?: string[];
  indications_and_usage?: string[];
  adverse_reactions?: string[];
  warnings?: string[];
  boxed_warning?: string[];
};

type OpenFdaResponse = {
  results?: OpenFdaResult[];
};

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function splitToItems(raw: string, maxItems = 6): string[] {
  const compact = clean(raw);
  if (!compact) return [];

  const chunks = compact
    .split(/(?:;|\.\s+)/)
    .map(s => s.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  for (const chunk of chunks) {
    const normalized = chunk.toLowerCase();
    if (!deduped.some(i => i.toLowerCase() === normalized)) {
      deduped.push(chunk.endsWith('.') ? chunk.slice(0, -1) : chunk);
    }
    if (deduped.length >= maxItems) break;
  }
  return deduped;
}

function firstField(arr?: string[]): string {
  return clean(arr?.[0] ?? '');
}

function buildMedicationEntryFromLabel(label: OpenFdaResult, fallbackName: string): MedicationDatabaseEntry {
  const genericName = firstField(label.openfda?.generic_name) || fallbackName;
  const brandNames = (label.openfda?.brand_name ?? []).map(clean).filter(Boolean).slice(0, 8);
  const purpose = firstField(label.purpose);
  const indications = firstField(label.indications_and_usage);
  const adverse = firstField(label.adverse_reactions);
  const warnings = firstField(label.warnings);
  const boxed = firstField(label.boxed_warning);
  const seriousText = [boxed, warnings].filter(Boolean).join(' ');

  return {
    id: firstField(label.set_id) || `openfda_${genericName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: genericName,
    brandNames,
    whatItDoes:
      purpose ||
      'This medicine has a labeled therapeutic purpose in official drug-label records.',
    whyDoctorsPrescribe:
      indications ||
      'Doctors prescribe this medicine for specific conditions listed in the official label.',
    commonSideEffects:
      splitToItems(adverse, 8).length > 0
        ? splitToItems(adverse, 8)
        : ['Common side effects are listed in official labeling and can vary by person.'],
    seriousSideEffects:
      splitToItems(seriousText, 8).length > 0
        ? splitToItems(seriousText, 8)
        : ['Serious side effects are described in official warnings; contact your doctor if severe symptoms occur.'],
    questionsToAskPharmacistOrDoctor: [
      'What side effects are most important for me to watch for?',
      'Which symptoms mean I should call right away?',
      'Could this interact with my other medicines?',
      'What should I do if side effects become hard to manage?',
    ],
  };
}

async function fetchOpenFda(searchExpr: string, limit = 8): Promise<OpenFdaResult[]> {
  const url = `${OPEN_FDA_BASE}?search=${encodeURIComponent(searchExpr)}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenFDA search failed (${response.status})`);
  }
  const json = (await response.json()) as OpenFdaResponse;
  return json.results ?? [];
}

export async function searchMedicationCandidatesFromOpenFda(query: string): Promise<MedicationCandidate[]> {
  const q = clean(query);
  if (!q) return [];

  const withWildcard = `${q}*`;
  const exprA = `openfda.generic_name:"${withWildcard}" + openfda.brand_name:"${withWildcard}"`;
  const exprB = `openfda.generic_name:${q} + openfda.brand_name:${q}`;

  let labels: OpenFdaResult[] = [];
  try {
    labels = await fetchOpenFda(exprA, 12);
  } catch {
    labels = await fetchOpenFda(exprB, 12);
  }

  const seen = new Set<string>();
  const candidates: MedicationCandidate[] = [];

  for (const label of labels) {
    const generic = firstField(label.openfda?.generic_name);
    const brands = (label.openfda?.brand_name ?? []).map(clean).filter(Boolean).slice(0, 6);
    const name = generic || brands[0];
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({
      id: firstField(label.set_id) || `cand_${candidates.length}_${key.replace(/[^a-z0-9]+/g, '_')}`,
      name,
      brandNames: brands.filter(b => b.toLowerCase() !== key),
    });

    if (candidates.length >= 10) break;
  }

  return candidates;
}

export async function fetchMedicationEntryFromOpenFda(candidate: MedicationCandidate): Promise<MedicationDatabaseEntry> {
  const exactName = clean(candidate.name);
  if (!exactName) throw new Error('Missing medication name');

  // Prefer set_id lookup when available.
  let labels: OpenFdaResult[] = [];
  try {
    labels = await fetchOpenFda(`set_id:"${candidate.id}"`, 1);
  } catch {
    labels = [];
  }

  if (labels.length === 0) {
    const fallbackExpr = `openfda.generic_name:"${exactName}" + openfda.brand_name:"${exactName}"`;
    labels = await fetchOpenFda(fallbackExpr, 1);
  }

  if (labels.length === 0) {
    throw new Error('No label details found');
  }

  return buildMedicationEntryFromLabel(labels[0], exactName);
}

export async function searchMedicationCandidatesWithAI(query: string, openaiApiKey: string): Promise<MedicationCandidate[]> {
  if (!query.trim()) return [];

  try {
    const messages = buildMedicationCandidateSearchMessages(query);
    const raw = await chatCompletionJSON(messages, openaiApiKey, { maxTokens: 512, temperature: 0.1 });
    const parsed = JSON.parse(raw) as { candidates: Array<{ medicationName: string; brandNames: string[] }> };

    return parsed.candidates.map((cand, index) => ({
      id: `ai_${index}_${cand.medicationName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      name: cand.medicationName,
      brandNames: cand.brandNames,
    }));
  } catch (error) {
    console.error('AI medication search failed:', error);
    return [];
  }
}

export async function fetchMedicationEntryWithAI(candidate: MedicationCandidate, openaiApiKey: string): Promise<MedicationDatabaseEntry> {
  try {
    const messages = buildMedicationExplanationFromCandidateMessages(candidate);
    const raw = await chatCompletionJSON(messages, openaiApiKey, { maxTokens: 1024, temperature: 0.2 });
    const parsed = JSON.parse(raw) as any;

    // Convert the explanation format to database entry format
    return {
      id: parsed.medicationId,
      name: parsed.medicationName,
      brandNames: parsed.brandNames,
      whatItDoes: parsed.whatItDoes.content,
      whyDoctorsPrescribe: parsed.whyDoctorsPrescribe.content,
      commonSideEffects: parsed.commonSideEffects.items,
      seriousSideEffects: parsed.seriousSideEffects.items,
      questionsToAskPharmacistOrDoctor: parsed.questionsToAskPharmacistOrDoctor.items,
    };
  } catch (error) {
    console.error('AI medication explanation failed:', error);
    // Fallback to a basic entry
    return {
      id: candidate.id,
      name: candidate.name,
      brandNames: candidate.brandNames,
      whatItDoes: 'This medication is used in mental health treatment.',
      whyDoctorsPrescribe: 'Doctors prescribe this medication for specific mental health conditions.',
      commonSideEffects: ['Side effects vary by person. Consult your doctor.'],
      seriousSideEffects: ['Contact your doctor if you experience severe symptoms.'],
      questionsToAskPharmacistOrDoctor: [
        'What condition is this medication for?',
        'What side effects should I watch for?',
        'Are there any interactions with my other medications?',
      ],
    };
  }
}

export async function identifyMedicationFromImage(
  base64Image: string,
  mimeType: string,
  openaiApiKey: string,
): Promise<string | null> {
  const prompt =
    'Look at this image. It may show a medicine bottle, pill packet, blister pack, or loose pills. ' +
    'Identify the medication name. Reply with only the generic drug name (e.g. "sertraline"), or if you can only see a brand name, reply with that. ' +
    'If you cannot identify any medication, reply with exactly: UNKNOWN';

  try {
    const result = await chatCompletionWithImage(prompt, base64Image, mimeType, openaiApiKey, {
      temperature: 0.1,
      maxTokens: 64,
    });
    const name = result.trim().replace(/^["']|["']$/g, '');
    if (!name || name.toUpperCase() === 'UNKNOWN') return null;
    return name;
  } catch {
    return null;
  }
}

