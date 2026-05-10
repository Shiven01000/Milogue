import { DetectedEmotion } from '@/types/checkin';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const VALID_EMOTIONS: DetectedEmotion[] = [
  'neutral', 'stressed', 'sad', 'anxious', 'tired', 'content',
];

export interface StreamChunk {
  delta: string;
  done: boolean;
}

const BASE_URL = 'https://api.openai.com/v1';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — please try again.')), ms)
    ),
  ]);
}

export async function chatCompletion(
  messages: ChatMessage[],
  apiKey: string,
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { model = 'gpt-4o', temperature = 0.85, maxTokens = 512 } = options;

  const response = await withTimeout(
    fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    }),
    12000
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await withTimeout(
    response.json() as Promise<{ choices: Array<{ message: { content: string } }> }>,
    8000
  );
  return data.choices[0].message.content;
}

export async function chatCompletionJSON(
  messages: ChatMessage[],
  apiKey: string,
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { model = 'gpt-4o', temperature = 0.3, maxTokens = 2048 } = options;

  const response = await withTimeout(
    fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    }),
    30000
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await withTimeout(
    response.json() as Promise<{ choices: Array<{ message: { content: string } }> }>,
    10000
  );
  return data.choices[0].message.content;
}

export async function chatCompletionWithImage(
  textPrompt: string,
  base64Image: string,
  mimeType: string,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { temperature = 0.2, maxTokens = 256 } = options;

  const response = await withTimeout(
    fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } },
              { type: 'text', text: textPrompt },
            ],
          },
        ],
      }),
    }),
    20000
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI vision error ${response.status}: ${err}`);
  }

  const data = await withTimeout(
    response.json() as Promise<{ choices: Array<{ message: { content: string } }> }>,
    10000
  );
  return data.choices[0].message.content;
}

export async function detectFacialEmotion(
  base64Image: string,
  apiKey: string
): Promise<DetectedEmotion | null> {
  try {
    const response = await withTimeout(
      fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'low',
                  },
                },
                {
                  type: 'text',
                  text: "Look at this person's face and return only one word from this list that best describes their emotional state: neutral, stressed, sad, anxious, tired, content",
                },
              ],
            },
          ],
          max_tokens: 5,
          temperature: 0,
        }),
      }),
      15000
    );

    if (!response.ok) return null;
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const word = data.choices[0].message.content.trim().toLowerCase() as DetectedEmotion;
    return VALID_EMOTIONS.includes(word) ? word : null;
  } catch {
    return null;
  }
}
