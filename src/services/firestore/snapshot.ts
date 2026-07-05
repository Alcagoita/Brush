/**
 * Shared Firestore snapshot → plain-object mapping helper (KAN-215).
 *
 * Replaces the `snap.docs.map(d => ({ id: d.id, ...d.data() }))` pattern that
 * was duplicated across every domain module in this directory. Most entities
 * key their id field `id`; FollowEntry uses `uid` instead — pass `idKey` to
 * match.
 */

interface DocLike {
  id: string;
  data: () => Record<string, unknown>;
}

interface SnapshotLike {
  docs: DocLike[];
}

export function mapSnapshotDocs<T>(snap: SnapshotLike, idKey: 'id' | 'uid' | 'placeId' = 'id'): T[] {
  // idKey spread last so the canonical doc id always wins over any same-named
  // field that might exist in the stored data.
  return snap.docs.map(d => ({ ...d.data(), [idKey]: d.id } as T));
}
