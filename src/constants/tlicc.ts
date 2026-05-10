import { TLICCDimension } from '@/types/checkin';

export interface TLICCInfo {
  key: TLICCDimension;
  label: string;
  description: string;
  icon: string;
}

export const TLICC_DIMENSIONS: TLICCInfo[] = [
  {
    key: 'time',
    label: 'Time',
    description: 'When did it happen, how long did it last',
    icon: '⏱',
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Where were you, were you alone',
    icon: '📍',
  },
  {
    key: 'intensity',
    label: 'Intensity',
    description: 'How severe, relative to past experiences',
    icon: '📊',
  },
  {
    key: 'context',
    label: 'Context',
    description: 'What triggered it, what was happening',
    icon: '🔍',
  },
  {
    key: 'change',
    label: 'Change',
    description: 'Getting better, worse, or stable',
    icon: '📈',
  },
];

export const EMPTY_TLICC_COVERAGE = {
  time: false,
  location: false,
  intensity: false,
  context: false,
  change: false,
};
