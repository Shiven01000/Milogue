const UNSAFE_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\bshould\s+i\s+stop\b/i, reason: 'Stopping or changing medication is personal medical advice.' },
  { re: /\bstop\s+(taking|using)\b/i, reason: 'Stopping medication is personal medical advice.' },
  { re: /\bshould\s+i\s+(take|start)\b/i, reason: 'Starting medication is personal medical advice.' },
  { re: /\b(can\s+)?i\s*(take|use)\b.*\bmore\b/i, reason: 'Asking to take more is personal medical advice.' },
  { re: /\bincrease\b.*\bdose\b/i, reason: 'Dose increases are personal medical advice.' },
  { re: /\bchange\b.*\bdose\b/i, reason: 'Dose changes are personal medical advice.' },
  { re: /\bhow\s+(much|many)\b.*\b(dose|mg)\b/i, reason: 'Dose guidance is personal medical advice.' },
  { re: /\b(dose|mg|milligram(s)?)\b/i, reason: 'Dose details are personal medical advice.' },
  { re: /\bwhat\s+dose\b/i, reason: 'Dose guidance is personal medical advice.' },
];

export function isUnsafeMedicationQuestion(question: string): { unsafe: boolean; reason?: string } {
  const q = question.trim();
  if (!q) return { unsafe: false };

  for (const item of UNSAFE_PATTERNS) {
    if (item.re.test(q)) return { unsafe: true, reason: item.reason };
  }

  // Heuristic for “take another/extra” style questions.
  if (/\b(take|take another|extra)\b/i.test(q) && /\bnow|right\s+now|tonight|today/i.test(q)) {
    return { unsafe: true, reason: 'Timing/dosing questions are personal medical advice.' };
  }

  return { unsafe: false };
}

export function getMedicationSafetyBlockedMessage(): string {
  return (
    'I can help explain what medicines and side effects mean, but I can’t help with personal decisions like stopping, changing, or dosing. ' +
    'For questions about your dose or whether to stop, please contact your doctor or pharmacist.'
  );
}

