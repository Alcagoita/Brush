import {
  isReviewableSentence,
  summarizePoiInferenceMisses,
  sweepPoiInferenceMissesCollection,
} from '../sweepPoiInferenceMisses';

describe('isReviewableSentence', () => {
  it('accepts useful natural-language phrases', () => {
    expect(isReviewableSentence('buy some bread')).toBe(true);
    expect(isReviewableSentence('relaxing place')).toBe(true);
  });

  it('rejects empty or noise-only input', () => {
    expect(isReviewableSentence('')).toBe(false);
    expect(isReviewableSentence('   ')).toBe(false);
    expect(isReviewableSentence('...')).toBe(false);
    expect(isReviewableSentence('123')).toBe(false);
  });
});

describe('summarizePoiInferenceMisses', () => {
  it('normalizes and aggregates repeated phrases', () => {
    const summary = summarizePoiInferenceMisses([
      'Buy Some Bread',
      'buy some bread',
      ' relaxing place ',
      '...',
    ]);

    expect(summary.totalDocs).toBe(4);
    expect(summary.reviewableDocs).toBe(3);
    expect(summary.ignoredDocs).toBe(1);
    expect(summary.uniqueSentences).toBe(2);
    expect(summary.topSentences[0]).toEqual({ sentence: 'buy some bread', count: 2 });
  });
});

describe('sweepPoiInferenceMissesCollection', () => {
  it('reads the collection group and summarizes sentence values', async () => {
    const getMock = jest.fn().mockResolvedValue({
      docs: [
        { get: (field: string) => field === 'sentence' ? 'buy some bread' : undefined },
        { get: (field: string) => field === 'sentence' ? 'Buy Some Bread' : undefined },
        { get: (field: string) => field === 'sentence' ? '...' : undefined },
      ],
    });
    const db = {
      collectionGroup: jest.fn(() => ({ get: getMock })),
    } as unknown as import('firebase-admin').firestore.Firestore;

    const summary = await sweepPoiInferenceMissesCollection(db);

    expect(db.collectionGroup).toHaveBeenCalledWith('poiInferenceMisses');
    expect(summary.topSentences[0]).toEqual({ sentence: 'buy some bread', count: 2 });
    expect(summary.ignoredDocs).toBe(1);
  });
});
