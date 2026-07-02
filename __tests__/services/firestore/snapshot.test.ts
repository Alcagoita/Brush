import { mapSnapshotDocs } from '../../../src/services/firestore/snapshot';

function fakeSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}

describe('mapSnapshotDocs', () => {
  it('maps each doc to { id, ...data() } by default', () => {
    const snap = fakeSnap([
      { id: 'a', data: { title: 'Task A' } },
      { id: 'b', data: { title: 'Task B' } },
    ]);
    expect(mapSnapshotDocs(snap)).toEqual([
      { id: 'a', title: 'Task A' },
      { id: 'b', title: 'Task B' },
    ]);
  });

  it('uses a custom idKey when provided (e.g. FollowEntry uses "uid")', () => {
    const snap = fakeSnap([{ id: 'friend-1', data: { username: 'alice' } }]);
    expect(mapSnapshotDocs(snap, 'uid')).toEqual([
      { uid: 'friend-1', username: 'alice' },
    ]);
  });

  it('returns an empty array for an empty snapshot', () => {
    expect(mapSnapshotDocs(fakeSnap([]))).toEqual([]);
  });

  it('the doc id always wins over a same-named field in the stored data', () => {
    // e.g. FollowEntry's stored data could (incorrectly) contain a stale "uid"
    // field — the real Firestore document id must still be the source of truth.
    const snap = fakeSnap([{ id: 'real-doc-id', data: { uid: 'stale-value', username: 'alice' } }]);
    expect(mapSnapshotDocs(snap, 'uid')).toEqual([
      { uid: 'real-doc-id', username: 'alice' },
    ]);
  });
});
