/**
 * Learned POI keywords (KAN-196).
 *
 * Durable store for keyword→POI pairs confirmed by the on-device LLM or a user
 * POI edit, so the dictionary's learned layer survives a restart. One doc per
 * (normalized keyword + language). All reads/writes are scoped to /users/{uid}.
 */

import { getDocs, setDoc, doc, serverTimestamp } from '@react-native-firebase/firestore';
import { registerLearnedKeyword, normalize, type SupportedLang, type PoiResolution } from '../poiInference';
import { learnedKeywordsRef, learnedKeywordId } from './refs';

/** A persisted learned keyword→POI association. */
export interface LearnedKeyword {
  keyword: string;
  poi: PoiResolution;
  lang: SupportedLang;
  source: 'llm' | 'user';
}

/**
 * Persist one learned keyword→POI pair (idempotent upsert keyed by keyword+lang).
 * No-op when the keyword normalizes to empty.
 */
export async function persistLearnedKeyword(
  uid: string,
  entry: LearnedKeyword,
): Promise<void> {
  const key = normalize(entry.keyword);
  if (!key) { return; }
  const ref = doc(learnedKeywordsRef(uid), learnedKeywordId(entry.keyword, entry.lang));
  await setDoc(ref, {
    keyword: key,
    poi: entry.poi,
    lang: entry.lang,
    source: entry.source,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Load all persisted learned keywords for `uid` into the in-memory learned
 * layer. Call on app start so LLM/user-confirmed keywords are available to the
 * rule map. Skips malformed docs; never throws on an individual bad entry.
 */
export async function loadLearnedKeywords(uid: string): Promise<void> {
  const snap = await getDocs(learnedKeywordsRef(uid));
  for (const d of snap.docs) {
    const data = d.data() as Partial<LearnedKeyword>;
    if (typeof data.keyword === 'string' && data.poi && data.lang) {
      registerLearnedKeyword(data.keyword, data.poi, data.lang);
    }
  }
}
