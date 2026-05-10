const EMOTION_SEEDS = new Set([
  'anxious', 'anxiety', 'worried', 'nervous', 'scared', 'afraid', 'fearful', 'panic',
  'depressed', 'sad', 'hopeless', 'empty', 'numb', 'hollow', 'low', 'down',
  'angry', 'frustrated', 'irritated', 'annoyed', 'overwhelmed', 'stressed',
  'happy', 'grateful', 'calm', 'peaceful', 'content', 'relieved', 'hopeful',
  'tired', 'exhausted', 'drained', 'foggy', 'heavy', 'scattered', 'disconnected',
  'restless', 'unsettled', 'tense', 'wound up', 'on edge', 'buzzing',
  'lonely', 'isolated', 'disconnected', 'misunderstood',
  'overwhelmed', 'buried', 'stuck', 'trapped', 'lost',
  'okay', 'fine', 'meh', 'flat', 'neutral', 'blah',
]);

export function extractEmotionWords(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const word of EMOTION_SEEDS) {
    if (lower.includes(word)) {
      found.add(word);
    }
  }

  // Also extract adjectives after "felt", "feeling", "feel"
  const feelPattern = /(?:felt?|feeling)\s+(?:so\s+|really\s+|very\s+|a\s+bit\s+)?(\w+)/gi;
  let match;
  while ((match = feelPattern.exec(text)) !== null) {
    const word = match[1].toLowerCase();
    if (word.length > 3 && !['like', 'that', 'this', 'when', 'good', 'well'].includes(word)) {
      found.add(word);
    }
  }

  return Array.from(found);
}
