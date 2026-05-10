export type FlashcardIntensity = 'mild' | 'moderate' | 'intense';

export interface EmotionFlashcard {
  word: string;
  simpleDefinition: string;
  exampleSentence: string;
  relatedWords: string[];
  intensity: FlashcardIntensity;
  whyItFits: string;
}
