/**
 * useCategoriesScreen — KAN-59
 *
 * ViewModel-layer hook for CategoriesScreen. Owns all custom-category
 * data state, the Firestore subscription, and CRUD callbacks. No JSX —
 * independently testable with renderHook.
 *
 * CategoriesScreen becomes a pure rendering component that calls this hook
 * and delegates all state management and Firestore interaction to it.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  addCategory,
  deleteCategory,
  subscribeToCategories,
  updateCategory,
} from '../services/firestore';
import { Category, CategoriesUiState } from '../types';

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

  // Tracks the previous list length — used to detect a newly-added category
  // so the sheet auto-closes once the Firestore write is confirmed.
  const prevCatsLenRef = useRef(0);

  // ── Live subscription (KAN-57 / KAN-58) ─────────────────────────────────────

  useEffect(() => {
    if (!uid) { return; }
    setCategoriesState({ status: 'loading' });
    return subscribeToCategories(uid, (cats) => {
      setCategoriesState({ status: 'success', categories: cats });
    }, (err) => {
      console.warn('[useCategoriesScreen] categories subscription error', err);
      setCategoriesState({
        status:  'error',
        message: 'Could not load categories. Check your connection.',
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, retryKey]);

  // ── Auto-close sheet when a new category appears in the Firestore snapshot ──
  // Firestore's local cache fires the subscription before (or just as) addCategory()
  // resolves, so this closes the sheet as soon as the write is visible.

  useEffect(() => {
    if (sheetVisible && editing === null && customCategories.length > prevCatsLenRef.current) {
      setSheetVisible(false);
    }
    prevCatsLenRef.current = customCategories.length;
  }, [customCategories, sheetVisible, editing]);

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
            deleteCategory(uid, cat.id).catch(err =>
              console.warn('[useCategoriesScreen] delete failed', err),
            ),
        },
      ],
    );
  }, [uid]);

  const handleSave = useCallback((data: Omit<Category, 'id' | 'isBuiltIn'>) => {
    if (editing) {
      // EDIT: close immediately; write runs in the background.
      setSheetVisible(false);
      updateCategory(uid, editing.id, data).catch(err =>
        console.warn('[useCategoriesScreen] updateCategory failed', err),
      );
    } else {
      // ADD: fire-and-forget; the useEffect above closes the sheet when the
      // new item appears in the Firestore snapshot.
      addCategory(uid, data).catch(err =>
        console.warn('[useCategoriesScreen] addCategory failed', err),
      );
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
