/**
 * parseMessageToTask — KAN-89
 *
 * Firebase HTTPS Callable function (v2).
 *
 * Accepts a free-text message from the user and uses Claude Haiku to extract
 * structured task data via tool use.
 *
 * Input:  { text: string }
 * Output: { title: string; suggestedPoi: PoiType | null; suggestedTime: string | null; confidence: 'high' | 'medium' | 'low' }
 *
 * Security:
 *   - Firebase Callable automatically verifies the caller's Firebase Auth token.
 *   - The Anthropic API key is stored as a Firebase Secret ("ANTHROPIC_API_KEY")
 *     and never committed to source.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

type PoiType = 'atm' | 'cafe' | 'supermarket' | 'pharmacy';
type Confidence = 'high' | 'medium' | 'low';

export interface ParseMessageInput {
  text: string;
}

export interface ParseMessageOutput {
  title: string;
  suggestedPoi: PoiType | null;
  suggestedTime: string | null;
  confidence: Confidence;
}

interface CreateTaskArgs {
  title: string;
  /** The model may return any of the enum values including 'none'. */
  suggestedPoi?: PoiType | 'none' | null;
  suggestedTime?: string | null;
  confidence: Confidence;
}

// ─── Secret ───────────────────────────────────────────────────────────────────

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

// ─── Tool definition ──────────────────────────────────────────────────────────

const CREATE_TASK_TOOL: Anthropic.Tool = {
  name: 'create_task',
  description:
    'Extract structured task information from a natural-language message. ' +
    'Always call this tool — do not return plain text.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description:
          'Concise task title (max 80 chars). ' +
          'Rephrase as an actionable to-do if needed.',
      },
      suggestedPoi: {
        type: 'string',
        enum: ['atm', 'cafe', 'supermarket', 'pharmacy', 'none'],
        description:
          'Location type most relevant to this task. ' +
          'Use "none" if no physical location is needed.',
      },
      suggestedTime: {
        type: 'string',
        description:
          'Scheduled time in "HH:MM" 24-hour format, or null if no time was mentioned.',
        nullable: true,
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description:
          '"high" = task intent is completely clear; ' +
          '"medium" = mostly clear but some ambiguity; ' +
          '"low" = very little context, just doing best-effort parsing.',
      },
    },
    required: ['title', 'suggestedPoi', 'confidence'],
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Build the fallback response when Haiku does not return a tool call.
 */
export function buildFallback(text: string): ParseMessageOutput {
  return {
    title: text.slice(0, 80),
    suggestedPoi: null,
    suggestedTime: null,
    confidence: 'low',
  };
}

/**
 * Convert the raw args from the Claude tool call into our output shape.
 */
export function argsToOutput(args: CreateTaskArgs): ParseMessageOutput {
  const poiValue = args.suggestedPoi;
  const suggestedPoi: PoiType | null =
    poiValue && poiValue !== 'none' ? (poiValue as PoiType) : null;

  // Validate time format "HH:MM"
  const rawTime = args.suggestedTime ?? null;
  const suggestedTime =
    rawTime && /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : null;

  return {
    title: (args.title ?? '').slice(0, 80),
    suggestedPoi,
    suggestedTime,
    confidence: args.confidence,
  };
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const parseMessageToTask = onCall(
  {
    secrets: [anthropicApiKey],
    // Keep the function lightweight — Haiku is fast
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request): Promise<ParseMessageOutput> => {
    // Auth check — Firebase Callable verifies the token automatically, but
    // we still guard against unauthenticated calls explicitly.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const data = request.data as ParseMessageInput;

    if (!data?.text || typeof data.text !== 'string') {
      throw new HttpsError('invalid-argument', '"text" field is required.');
    }

    const text = data.text.trim();
    if (text.length === 0) {
      throw new HttpsError('invalid-argument', '"text" must not be empty.');
    }

    // Fallback: if the message is already very short and clear, skip API call
    // to save tokens (optional optimisation — remove if purity is preferred).
    const MAX_TEXT_LENGTH = 2000;
    const trimmedText = text.slice(0, MAX_TEXT_LENGTH);

    const client = new Anthropic({ apiKey: anthropicApiKey.value() });

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        tool_choice: { type: 'any' },
        tools: [CREATE_TASK_TOOL],
        messages: [
          {
            role: 'user',
            content:
              `Parse the following message into a structured task. ` +
              `Call the create_task tool with your analysis.\n\n` +
              `Message: "${trimmedText}"`,
          },
        ],
      });
    } catch (err) {
      console.error('[parseMessageToTask] Anthropic API error:', err);
      // Graceful degradation — return a low-confidence fallback
      return buildFallback(trimmedText);
    }

    // Extract the first tool-use block
    const toolUseBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (!toolUseBlock) {
      console.warn('[parseMessageToTask] No tool_use block returned — using fallback');
      return buildFallback(trimmedText);
    }

    const args = toolUseBlock.input as CreateTaskArgs;
    return argsToOutput(args);
  },
);
