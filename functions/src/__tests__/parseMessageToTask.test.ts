/**
 * Unit tests for parseMessageToTask helpers — KAN-89
 *
 * We test the pure helper functions (buildFallback, argsToOutput) in isolation
 * so the suite runs without a real Anthropic API key or Firebase emulator.
 *
 * The Cloud Function itself is exercised in integration tests only.
 */

import { buildFallback, argsToOutput, consumeParseRateLimit } from '../parseMessageToTask';

// ─── buildFallback ────────────────────────────────────────────────────────────

describe('buildFallback', () => {
  it('returns a low-confidence response with the raw text as title', () => {
    const result = buildFallback('Buy milk at the supermarket');
    expect(result.title).toBe('Buy milk at the supermarket');
    expect(result.confidence).toBe('low');
    expect(result.suggestedPoi).toBeNull();
    expect(result.suggestedTime).toBeNull();
  });

  it('truncates long titles to 80 characters', () => {
    const longText = 'A'.repeat(200);
    const result = buildFallback(longText);
    expect(result.title).toHaveLength(80);
    expect(result.confidence).toBe('low');
  });

  it('handles an empty string gracefully', () => {
    const result = buildFallback('');
    expect(result.title).toBe('');
    expect(result.confidence).toBe('low');
  });
});

// ─── argsToOutput ─────────────────────────────────────────────────────────────

describe('argsToOutput', () => {
  it('maps high-confidence args with POI and time correctly', () => {
    const result = argsToOutput({
      title: 'Pick up prescription',
      suggestedPoi: 'pharmacy',
      suggestedTime: '14:30',
      confidence: 'high',
    });
    expect(result.title).toBe('Pick up prescription');
    expect(result.suggestedPoi).toBe('pharmacy');
    expect(result.suggestedTime).toBe('14:30');
    expect(result.confidence).toBe('high');
  });

  it('maps medium-confidence args with no POI', () => {
    const result = argsToOutput({
      title: 'Call the dentist',
      suggestedPoi: null,
      suggestedTime: null,
      confidence: 'medium',
    });
    expect(result.suggestedPoi).toBeNull();
    expect(result.suggestedTime).toBeNull();
    expect(result.confidence).toBe('medium');
  });

  it('converts POI value "none" to null', () => {
    const result = argsToOutput({
      title: 'Write a blog post',
      suggestedPoi: 'none' as any, // model may return "none" per enum
      suggestedTime: null,
      confidence: 'high',
    });
    expect(result.suggestedPoi).toBeNull();
  });

  it('validates time format — rejects malformed time strings', () => {
    const result = argsToOutput({
      title: 'Team meeting',
      suggestedPoi: null,
      suggestedTime: 'half past three', // invalid format
      confidence: 'medium',
    });
    expect(result.suggestedTime).toBeNull();
  });

  it('accepts all valid POI types', () => {
    const poiTypes = ['atm', 'cafe', 'supermarket', 'pharmacy'] as const;
    for (const poi of poiTypes) {
      const result = argsToOutput({
        title: 'Task',
        suggestedPoi: poi,
        suggestedTime: null,
        confidence: 'high',
      });
      expect(result.suggestedPoi).toBe(poi);
    }
  });

  it('truncates title to 80 characters', () => {
    const result = argsToOutput({
      title: 'B'.repeat(120),
      suggestedPoi: null,
      suggestedTime: null,
      confidence: 'low',
    });
    expect(result.title).toHaveLength(80);
  });

  it('handles undefined suggestedTime (optional field)', () => {
    const result = argsToOutput({
      title: 'Task without time',
      suggestedPoi: 'cafe',
      // suggestedTime intentionally omitted
      confidence: 'high',
    });
    expect(result.suggestedTime).toBeNull();
  });

  it('handles undefined suggestedPoi (maps to null)', () => {
    const result = argsToOutput({
      title: 'Task',
      // suggestedPoi intentionally omitted — model could skip optional keys
      suggestedTime: null,
      confidence: 'low',
    } as any);
    expect(result.suggestedPoi).toBeNull();
  });

  it('passes through all three confidence levels', () => {
    const levels = ['high', 'medium', 'low'] as const;
    for (const confidence of levels) {
      const result = argsToOutput({
        title: 'Task',
        suggestedPoi: null,
        suggestedTime: null,
        confidence,
      });
      expect(result.confidence).toBe(confidence);
    }
  });
});

describe('consumeParseRateLimit', () => {
  const windowMs = 5 * 60 * 1000;

  it('allows the first request in a new window', () => {
    const result = consumeParseRateLimit(null, 1_000);
    expect(result).toEqual({
      allowed: true,
      next: {
        count: 1,
        windowStartedAtMs: 1_000,
      },
    });
  });

  it('allows requests until the window cap is reached', () => {
    const result = consumeParseRateLimit({
      count: 4,
      windowStartedAtMs: 10_000,
    }, 10_500);
    expect(result).toEqual({
      allowed: true,
      next: {
        count: 5,
        windowStartedAtMs: 10_000,
      },
    });
  });

  it('blocks requests after the cap within the same window', () => {
    const result = consumeParseRateLimit({
      count: 5,
      windowStartedAtMs: 20_000,
    }, 20_100);
    expect(result).toEqual({
      allowed: false,
      next: {
        count: 5,
        windowStartedAtMs: 20_000,
      },
    });
  });

  it('resets the window after it expires', () => {
    const result = consumeParseRateLimit({
      count: 5,
      windowStartedAtMs: 30_000,
    }, 30_000 + windowMs);
    expect(result).toEqual({
      allowed: true,
      next: {
        count: 1,
        windowStartedAtMs: 30_000 + windowMs,
      },
    });
  });
});
