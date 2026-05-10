const NTFY_BASE = 'https://ntfy.sh';

function topic(patientCode: string): string {
  return `mindlog-checkin-${patientCode}`;
}

export async function scheduleCall(
  patientCode: string,
  doctorName: string
): Promise<void> {
  const res = await fetch(`${NTFY_BASE}/${topic(patientCode)}`, {
    method: 'POST',
    headers: {
      Title: 'Check-in Call',
      Priority: 'high',
      'Content-Type': 'text/plain',
    },
    body: `${doctorName} is starting your daily check-in`,
  });
  if (!res.ok) throw new Error(`ntfy error ${res.status}`);
}

export async function pollForIncomingCall(
  patientCode: string,
  sinceSeconds: number
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `${NTFY_BASE}/${topic(patientCode)}/json?poll=1&since=${sinceSeconds}`,
      { signal: controller.signal }
    );
    if (!res.ok) return false;
    const text = await res.text();
    return text
      .trim()
      .split('\n')
      .filter(Boolean)
      .some(line => {
        try {
          return JSON.parse(line).event === 'message';
        } catch {
          return false;
        }
      });
  } finally {
    clearTimeout(timeout);
  }
}
