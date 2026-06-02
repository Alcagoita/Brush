/**
 * KAN-59 — useCategoriesScreen hook tests.
 *
 * Covers independently-testable hook behaviour (no JSX):
 *   - CategoriesUiState: loading → success on subscription callback
 *   - CategoriesUiState: loading → error on subscription error callback
 *   - retryKey: incrementing re-triggers the subscription
 *   - handleAdd: sets sheetVisible=true, editing=null
 *   - handleEdit: sets sheetVisible=true, editing=the category
 *   - handleSave (edit mode): calls updateCategory, closes sheet
 *   - handleSave (add mode): calls addCategory (sheet stays open until snapshot)
 *   - handleCloseSheet: closes the sheet
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToCategories = jest.fn();
const mockAddCategory           = jest.fn();
const mockUpdateCategory        = jest.fn();
const mockDeleteCategory        = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToCategories: (...args: unknown[]) => mockSubscribeToCategories(...args),
  addCategory:           (...args: unknown[]) => mockAddCategory(...args),
  updateCategory:        (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory:        (...args: unknown[]) => mockDeleteCategory(...args),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { act, renderHook } from '@testing-library/react-native';
import { useCategoriesScreen } from '../../src/hooks/useCategoriesScreen';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const UID = 'test-uid';

const CAT = {
  id:        'cat-1',
  name:      'Gym',
  color:     '#ff0000',
  poi:       null,
  isBuiltIn: false,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function setupSuccessSubscription(cats: any[] = []) {
  mockSubscribeToCategories.mockImplementation(
    (_uid: string, onSuccess: (cats: any[]) => void) => {
      onSuccess(cats);
      return jest.fn();
    },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAddCategory.mockResolvedValue('new-id');
  mockUpdateCategory.mockResolvedValue(undefined);
  mockDeleteCategory.mockResolvedValue(undefined);
  setupSuccessSubscription();
});

describe('useCategoriesScreen — subscription', () => {
  it('starts in loading state', () => {
    mockSubscribeToCategories.mockReturnValue(jest.fn()); // never fires
    const { result } = renderHook(() => useCategoriesScreen(UID));
    expect(result.current.categoriesState.status).toBe('loading');
  });

  it('transitions to success when the subscription fires', async () => {
    setupSuccessSubscription([CAT]);
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    expect(result.current.categoriesState.status).toBe('success');
    expect(result.current.customCategories).toHaveLength(1);
    expect(result.current.customCategories[0].id).toBe('cat-1');
  });

  it('transitions to error when the subscription fires an error', async () => {
    mockSubscribeToCategories.mockImplementation(
      (_uid: string, _onSuccess: unknown, onError: (err: Error) => void) => {
        onError(new Error('Network error'));
        return jest.fn();
      },
    );
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    expect(result.current.categoriesState.status).toBe('error');
  });

  it('re-subscribes when retryKey is incremented', async () => {
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    const callsBefore = mockSubscribeToCategories.mock.calls.length;
    act(() => { result.current.setRetryKey(k => k + 1); });
    await act(async () => {});

    expect(mockSubscribeToCategories.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('useCategoriesScreen — sheet visibility', () => {
  it('handleAdd opens the sheet with editing=null', async () => {
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    expect(result.current.sheetVisible).toBe(false);
    act(() => { result.current.handleAdd(); });
    expect(result.current.sheetVisible).toBe(true);
    expect(result.current.editing).toBeNull();
  });

  it('handleEdit opens the sheet with the category as editing', async () => {
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    act(() => { result.current.handleEdit(CAT as any); });
    expect(result.current.sheetVisible).toBe(true);
    expect(result.current.editing?.id).toBe('cat-1');
  });

  it('handleCloseSheet closes the sheet', async () => {
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    act(() => { result.current.handleAdd(); });
    expect(result.current.sheetVisible).toBe(true);

    act(() => { result.current.handleCloseSheet(); });
    expect(result.current.sheetVisible).toBe(false);
  });
});

describe('useCategoriesScreen — handleSave', () => {
  const DATA = { name: 'Gym', color: '#ff0000', poi: null };

  it('calls addCategory in add mode (editing=null)', async () => {
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    act(() => { result.current.handleAdd(); });
    await act(async () => { result.current.handleSave(DATA); });
    await act(async () => {});

    expect(mockAddCategory).toHaveBeenCalledWith(UID, DATA);
    expect(mockUpdateCategory).not.toHaveBeenCalled();
  });

  it('calls updateCategory and closes the sheet in edit mode', async () => {
    const { result } = renderHook(() => useCategoriesScreen(UID));
    await act(async () => {});

    act(() => { result.current.handleEdit(CAT as any); });
    await act(async () => { result.current.handleSave({ ...DATA, name: 'Updated' }); });
    await act(async () => {});

    expect(mockUpdateCategory).toHaveBeenCalledWith(UID, 'cat-1', { ...DATA, name: 'Updated' });
    // Sheet should close immediately on edit
    expect(result.current.sheetVisible).toBe(false);
  });
});
