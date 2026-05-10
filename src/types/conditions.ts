export type ConditionLanguageCode = 'en' | 'bn' | 'ar' | 'fr';

export interface ConditionId {
  id: string;
  name: string;
}

export interface ConditionExplanationSectionText {
  title: string;
  content: string;
}

export interface ConditionExplanationSectionList {
  title: string;
  items: string[];
}

export interface ConditionExplanation {
  conditionId: string;
  conditionName: string;
  whatItIs: ConditionExplanationSectionText;
  symptoms: ConditionExplanationSectionList;
  disclaimer: string;
}

export interface ConditionFollowupQA {
  id: string;
  question: string;
  answer: string;
  askedAt: number;
}

export interface ConditionBlurb {
    conditionId: string;
    conditionName: string;
    blurb: string;
  }
  
  export interface ExploreResult {
    type: 'question' | 'symptoms';
    answer?: string;
    matchedConditions?: ConditionBlurb[];
  }