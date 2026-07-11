import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export interface PoiInferenceMissSummary {
  sentence: string;
  count: number;
}

export interface PoiInferenceMissSweepResult {
  totalDocs: number;
  reviewableDocs: number;
  ignoredDocs: number;
  uniqueSentences: number;
  topSentences: PoiInferenceMissSummary[];
}

function normalizeSentence(sentence: string): string {
  return sentence.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isReviewableSentence(sentence: string): boolean {
  const trimmed = sentence.trim();
  return trimmed.length >= 4 && /[a-zA-ZÀ-ÿ]/.test(trimmed);
}

export function summarizePoiInferenceMisses(
  sentences: string[],
  limit: number = 50,
): PoiInferenceMissSweepResult {
  const counts = new Map<string, PoiInferenceMissSummary>();
  let ignoredDocs = 0;
  let reviewableDocs = 0;

  for (const sentence of sentences) {
    if (!isReviewableSentence(sentence)) {
      ignoredDocs += 1;
      continue;
    }
    reviewableDocs += 1;
    const normalized = normalizeSentence(sentence);
    const existing = counts.get(normalized);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(normalized, { sentence: normalized, count: 1 });
    }
  }

  const topSentences = Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.sentence.localeCompare(b.sentence))
    .slice(0, limit);

  return {
    totalDocs: sentences.length,
    reviewableDocs,
    ignoredDocs,
    uniqueSentences: counts.size,
    topSentences,
  };
}

export async function sweepPoiInferenceMissesCollection(
  db: admin.firestore.Firestore,
  limit: number = 50,
): Promise<PoiInferenceMissSweepResult> {
  const snap = await db.collectionGroup('poiInferenceMisses').get();
  const sentences = snap.docs
    .map(doc => doc.get('sentence'))
    .filter((value): value is string => typeof value === 'string');

  return summarizePoiInferenceMisses(sentences, limit);
}

export const sweepPoiInferenceMisses = onSchedule('0 7 * * 1', async () => {
  const summary = await sweepPoiInferenceMissesCollection(admin.firestore());
  console.log('[sweepPoiInferenceMisses] summary', JSON.stringify(summary, null, 2));
});
