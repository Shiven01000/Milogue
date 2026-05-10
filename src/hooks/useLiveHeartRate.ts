import { useRef, useState, useEffect } from 'react';
import { ConversationMessage } from '@/types/checkin';

const STRESS_WORDS = [
  'anxious', 'scared', 'stressed', 'overwhelmed', 'panic',
  'bad', 'terrible', 'hard', 'awful', 'horrible', 'worried',
];
const CALM_WORDS = [
  'better', 'good', 'okay', 'relaxed', 'fine', 'calm',
  'relieved', 'peaceful', 'grateful', 'happy',
];

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function useLiveHeartRate(
  restingHR: number,
  messages: ConversationMessage[],
): { hr: number; sessionAvgHR: number } {
  const [hr, setHR] = useState(restingHR);
  const [sessionAvgHR, setSessionAvgHR] = useState(restingHR);

  const hrRef = useRef(restingHR);
  const targetRef = useRef(restingHR);
  const samplesRef = useRef<number[]>([restingHR]);

  // Shift target based on most recent user message sentiment
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    const text = userMessages[userMessages.length - 1].content.toLowerCase();
    const hasStress = STRESS_WORDS.some(w => text.includes(w));
    const hasCalm = CALM_WORDS.some(w => text.includes(w));
    if (hasStress) {
      targetRef.current = clamp(hrRef.current + 5 + Math.random() * 5, 55, 120);
    } else if (hasCalm) {
      targetRef.current = clamp(restingHR + (Math.random() - 0.5) * 4, 55, restingHR + 5);
    }
  }, [messages, restingHR]);

  // Tick every 5 seconds — drift toward target with small noise
  useEffect(() => {
    const tick = () => {
      const current = hrRef.current;
      const target = targetRef.current;
      const noise = (Math.random() - 0.5) * 4;
      const pull = (target - current) * 0.15;
      const next = Math.round(clamp(current + pull + noise, 55, 120));
      hrRef.current = next;
      samplesRef.current.push(next);
      const avg = Math.round(
        samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length,
      );
      setHR(next);
      setSessionAvgHR(avg);
    };
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []); // intentionally runs once on mount

  return { hr, sessionAvgHR };
}
