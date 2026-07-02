/**
 * useCategoriesScreen — KAN-59 / KAN-218
 *
 * ViewModel-layer hook for CategoriesScreen. Owns all custom-category
 * data state (one-shot fetch, not a live subscription — KAN-218) and CRUD
 * callbacks. No JSX — independently testable with renderHook.
 *
 * CategoriesScreen becomes a pure rendering component that calls this hook
 * and delegates all state management and Firestore interaction to it.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  addCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../services/firestore';
import { Category, CategoriesUiState } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// getCategories() orders by name — keep optimistic local edits in the same
// order so the list doesn't jump out of sync with a post-reload fetch.
function sortByName(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface CategoriesScreenState {
  /** UiState for the custom categories list — loading / success / error (KAN-57). */
  categoriesState:  CategoriesUiState;
  /**
   * Incremented by the "Try again" button to re-trigger the subscription
   * without unmounting the screen (KAN-58).
   */
  retryKey:         number;
  setRetryKey:      Dispatch<SetStateAction<number>>;
  /**
   * Custom categories from the success branch of categoriesState.
   * Falls back to [] while loading or errored.
   */
  customCategories: Category[];
  sheetVisible:     boolean;
  /** Non-null when the sheet is open in edit mode; null for add mode. */
  editing:          Category | null;
  handleAdd:        () => void;
  handleEdit:       (cat: Category) => void;
  handleDelete:     (cat: Category) => void;
  handleSave:       (data: Omit<Category, 'id' | 'isBuiltIn'>) => void;
  handleCloseSheet: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param uid Firebase user ID. Pass an empty string when signed out — the
 *            hook will skip all Firestore calls.
 */
export function useCategoriesScreen(uid: string): CategoriesScreenState {

  const [categoriesState, setCategoriesState] = useState<CategoriesUiState>({ status: 'loading' });
  const [retryKey,        setRetryKey]        = useState(0);
  const [sheetVisible,    setSheetVisible]    = useState(false);
  const [editing,         setEditing]         = useState<Category | null>(null);

  const customCategories = categoriesState.status === 'success'
    ? categoriesState.categories
    : [];

  // ── One-shot fetch (KAN-218) ─────────────────────────────────────────────────

  // Guards against an older request (e.g. from a fast double-tap of "Try
  // again") resolving after a newer one and clobbering its result.
  const fetchSeq = useRef(0);

  const loadCategories = useCallback(async () => {
    if (!uid) { return; }
    const seq = ++fetchSeq.current;
    setCategoriesState({ status: 'loading' });
    try {
      const cats = await getCategories(uid);
      if (fetchSeq.current !== seq) { return; } // superseded by a newer request
      setCategoriesState({ status: 'success', categories: cats });
    } catch (err) {
      if (fetchSeq.current !== seq) { return; }
      console.warn('[useCategoriesScreen] categories fetch error', err);
      setCategoriesState({
        status:  'error',
        message: 'Could not load categories. Check your connection.',
      });
    }
  }, [uid]);

  // retryKey re-triggers this on the "Try again" button (KAN-58).
  useEffect(() => { loadCategories(); }, [loadCategories, retryKey]);

  // ── Callbacks ───────────────────────────────────────────────────────────────

  const handleAdd = useCallback(() => {
    setEditing(null);
    setSheetVisible(true);
  }, []);

  const handleEdit = useCallback((cat: Category) => {
    setEditing(cat);
    setSheetVisible(true);
  }, []);

  const handleDelete = useCallback((cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Tasks using this category will keep their assignment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Delete',
          style: 'destructive',
          onPress: () =>
            deleteCategory(uid, cat.id)
              .then(() => setCategoriesState(prev => prev.status === 'success'
                ? { status: 'success', categories: prev.categories.filter(c => c.id !== cat.id) }
                : prev))
              .catch(err => console.warn('[useCategoriesScreen] delete failed', err)),
        },
      ],
    );
  }, [uid]);

  const handleSave = useCallback((data: Omit<Category, 'id' | 'isBuiltIn'>) => {
    if (editing) {
      // EDIT: close immediately; apply the patch locally once the write confirms.
      const editingId = editing.id;
      setSheetVisible(false);
      updateCategory(uid, editingId, data)
        .then(() => setCategoriesState(prev => prev.status === 'success'
          ? { status: 'success', categories: sortByName(prev.categories.map(c => c.id === editingId ? { ...c, ...data } : c)) }
          : prev))
        .catch(err => console.warn('[useCategoriesScreen] updateCategory failed', err));
    } else {
      // ADD: close the sheet and append locally once the write confirms.
      addCategory(uid, data)
        .then(id => {
          setCategoriesState(prev => prev.status === 'success'
            ? { status: 'success', categories: sortByName([...prev.categories, { id, ...data, isBuiltIn: false }]) }
            : prev);
          setSheetVisible(false);
        })
        .catch(err => console.warn('[useCategoriesScreen] addCategory failed', err));
    }
  }, [uid, editing]);

  const handleCloseSheet = useCallback(() => setSheetVisible(false), []);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    categoriesState,
    retryKey,
    setRetryKey,
    customCategories,
    sheetVisible,
    editing,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
    handleCloseSheet,
  };
}
