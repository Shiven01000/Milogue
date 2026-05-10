export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

let _idCounter = 0;
export function generateId(): string {
  return `${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2, 9)}`;
}
