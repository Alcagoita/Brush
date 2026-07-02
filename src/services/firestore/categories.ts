import { getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from '@react-native-firebase/firestore';
import type { Category } from '../../types';
import { registerCategoryKeywords, replaceCategoryKeywords } from '../poiInference';
import { categoriesRef, categoryRef } from './refs';
import { mapSnapshotDocs } from './snapshot';

/**
 * Subscribe to the user's custom categories (built-ins are not stored here).
 * Returns an unsubscribe function — call on component unmount.
 */
export function subscribeToCategories(
  uid: string,
  onUpdate: (categories: Category[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(categoriesRef(uid), orderBy('name', 'asc')),
    snap => {
      if (!snap) return;
      onUpdate(mapSnapshotDocs<Category>(snap).map(c => ({ ...c, isBuiltIn: false })));
    },
    onError,
  );
}

/**
 * Create a new custom category.
 * Returns the auto-generated Firestore document ID.
 */
export async function addCategory(
  uid: string,
  data: Omit<Category, 'id' | 'isBuiltIn'>,
): Promise<string> {
  const ref = await addDoc(categoriesRef(uid), { ...data, isBuiltIn: false });
  // Feed the new POI's wording into the inference dictionary (KAN-195) so future
  // imports recognise it. No-op when the category has no POI association.
  registerCategoryKeywords({ name: data.name, poi: data.poi });
  return ref.id;
}

/**
 * Update a custom category's name, color, or poi.
 * Built-in categories should never be passed here.
 */
export async function updateCategory(
  uid: string,
  categoryId: string,
  data: Partial<Pick<Category, 'name' | 'color' | 'poi'>>,
): Promise<void> {
  const ref = categoryRef(uid, categoryId);
  await updateDoc(ref, data);
  // Keep the inference dictionary in sync on any name/POI change (KAN-195).
  // registerCategoryKeywords only adds — it can't purge a stale keyword left
  // behind by a rename, so rebuild the whole category layer from the current
  // list (same as getCategories) rather than re-registering just this one.
  if (data.name !== undefined || data.poi !== undefined) {
    await getCategories(uid);
  }
}

/**
 * Permanently delete a custom category.
 * The caller is responsible for ensuring it is not a built-in category.
 */
export async function deleteCategory(uid: string, categoryId: string): Promise<void> {
  await deleteDoc(categoryRef(uid, categoryId));
  // Rebuild the inference dictionary so the deleted category's keywords stop
  // matching immediately, instead of waiting for the next getCategories() call.
  await getCategories(uid);
}

export async function getCategories(uid: string): Promise<Category[]> {
  const snap = await getDocs(query(categoriesRef(uid), orderBy('name', 'asc')));
  const categories = mapSnapshotDocs<Category>(snap).map(c => ({ ...c, isBuiltIn: false }));
  // Rebuild the inference dictionary's category layer from the current list on
  // load, so user-added POIs survive an app restart and renamed/deleted ones
  // stop matching (durable store lands in KAN-196).
  replaceCategoryKeywords(categories);
  return categories;
}
