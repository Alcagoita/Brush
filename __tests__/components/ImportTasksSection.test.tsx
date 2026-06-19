/**
 * KAN-83 — ImportTasksSection component tests.
 *
 * Covers:
 *   - Section heading renders
 *   - Correct buttons shown per platform (Android / iOS)
 *   - Pressing a button triggers the connector
 *   - Loading state shown while connector is in flight
 *   - Success result summary shown after a successful import
 *   - Error message + retry hint shown after connector failure
 *   - Error state resets to loading when button is pressed again
 *   - Button is not disabled between successful imports
 */

import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg:       '#fff',
      surface2: '#eee',
      text:     '#000',
      muted:    '#999',
      faint:    '#ccc',
      line:     '#ddd',
      accent:   '#e8a86a',
    },
  }),
}));

// Mock the import service so tests control connector behaviour.
const mockImportFromGoogleTasks    = jest.fn();
const mockImportFromGoogleCalendar = jest.fn();
const mockImportFromReminders      = jest.fn();
const mockImportFromCalendar       = jest.fn();

// Capture the onRetrying callback so tests can trigger it manually
let capturedOnRetrying: ((attempt: number, total: number) => void) | undefined;

jest.mock('../../src/services/import', () => ({
  importFromGoogleTasks:    (...args: unknown[]) => mockImportFromGoogleTasks(...args),
  importFromGoogleCalendar: (...args: unknown[]) => mockImportFromGoogleCalendar(...args),
  importFromReminders:      (...args: unknown[]) => mockImportFromReminders(...args),
  importFromCalendar:       (...args: unknown[]) => mockImportFromCalendar(...args),
  // KAN-93: pass-through so tests control connector behaviour and retry callbacks
  importWithRetry: (importFn: () => Promise<unknown>, onRetrying?: (a: number, t: number) => void) => {
    capturedOnRetrying = onRetrying;
    return importFn();
  },
  IMPORT_TIMEOUT_ERROR: 'IMPORT_TIMEOUT',
}));

// ─── Import component (after mocks) ──────────────────────────────────────────

import ImportTasksSection from '../../src/components/ImportTasksSection';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UID = 'test-uid';

function renderSection() {
  return render(<ImportTasksSection uid={UID} />);
}

// ─── Tests — shared ───────────────────────────────────────────────────────────

describe('ImportTasksSection — section heading', () => {
  it('renders the "IMPORT TASKS" section heading', () => {
    renderSection();
    expect(screen.getByText('IMPORT TASKS')).toBeTruthy();
  });
});

// ─── Tests — Android ─────────────────────────────────────────────────────────

describe('ImportTasksSection — Android', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  afterEach(() => {
    // Reset to the test environment default
    (Platform as any).OS = 'ios';
  });

  it('shows Google Tasks and Google Calendar buttons on Android', () => {
    renderSection();
    expect(screen.getByLabelText('Import from Google Tasks')).toBeTruthy();
    expect(screen.getByLabelText('Import from Google Calendar')).toBeTruthy();
  });

  it('does not show iOS buttons on Android', () => {
    renderSection();
    expect(screen.queryByLabelText('Import from Reminders')).toBeNull();
    expect(screen.queryByLabelText('Import from Calendar')).toBeNull();
  });

  it('calls importFromGoogleTasks with the uid when the button is pressed', async () => {
    mockImportFromGoogleTasks.mockResolvedValueOnce({ imported: 5, skipped: 1, failed: 0 });
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    expect(mockImportFromGoogleTasks).toHaveBeenCalledWith(UID);
  });

  it('shows loading state while Google Tasks connector runs', async () => {
    let resolveImport!: (v: unknown) => void;
    mockImportFromGoogleTasks.mockReturnValueOnce(new Promise(r => { resolveImport = r; }));

    renderSection();
    fireEvent.press(screen.getByLabelText('Import from Google Tasks'));

    // "Importing" button label should be present during in-flight state
    await waitFor(() => expect(screen.getByLabelText('Importing')).toBeTruthy());

    // Clean up
    await act(async () => resolveImport({ imported: 0, skipped: 0, failed: 0 }));
  });

  it('shows success summary after Google Tasks import completes', async () => {
    mockImportFromGoogleTasks.mockResolvedValueOnce({ imported: 12, skipped: 3, failed: 0 });
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    expect(screen.getByText('12 imported · 3 skipped · 0 failed')).toBeTruthy();
  });

  it('shows a user-friendly error message when Google Tasks connector fails with an Error', async () => {
    // Raw error message must NOT be surfaced — wrap all errors in a generic message.
    mockImportFromGoogleTasks.mockRejectedValueOnce(new Error('auth/invalid-credential'));
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    expect(screen.getByText('Import failed. Tap to retry.')).toBeTruthy();
    expect(screen.queryByText('auth/invalid-credential')).toBeNull();
    expect(screen.getByText('Tap the button above to try again.')).toBeTruthy();
  });

  it('shows a user-friendly error message for non-Error rejections', async () => {
    mockImportFromGoogleTasks.mockRejectedValueOnce('oops');
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    expect(screen.getByText('Import failed. Tap to retry.')).toBeTruthy();
  });

  it('button is accessible again after a successful import', async () => {
    mockImportFromGoogleTasks.mockResolvedValue({ imported: 1, skipped: 0, failed: 0 });
    renderSection();

    // First import
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });

    // Second import — connector should be callable again
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });

    expect(mockImportFromGoogleTasks).toHaveBeenCalledTimes(2);
  });

  it('shows "Retrying… (attempt N of 3)" label during backoff (KAN-93)', async () => {
    let resolveImport!: (v: unknown) => void;
    mockImportFromGoogleTasks.mockReturnValueOnce(new Promise(r => { resolveImport = r; }));
    renderSection();
    fireEvent.press(screen.getByLabelText('Import from Google Tasks'));

    await act(async () => {
      capturedOnRetrying?.(2, 3);
    });

    expect(screen.getByText('Retrying… (attempt 2 of 3)')).toBeTruthy();

    // Clean up
    await act(async () => resolveImport({ imported: 0, skipped: 0, failed: 0, cancelled: 0 }));
  });

  it('button is disabled during retrying state (KAN-93)', async () => {
    let resolveImport!: (v: unknown) => void;
    mockImportFromGoogleTasks.mockReturnValueOnce(new Promise(r => { resolveImport = r; }));
    renderSection();
    fireEvent.press(screen.getByLabelText('Import from Google Tasks'));

    await act(async () => { capturedOnRetrying?.(1, 3); });

    const btn = screen.getByLabelText('Retrying… (attempt 1 of 3)');
    expect(btn.props.accessibilityState?.busy).toBe(true);

    await act(async () => resolveImport({ imported: 0, skipped: 0, failed: 0, cancelled: 0 }));
  });

  it('shows neutral "Import cancelled." message when result.cancelled > 0 (KAN-94)', async () => {
    mockImportFromGoogleTasks.mockResolvedValueOnce({ imported: 0, skipped: 0, failed: 0, cancelled: 1 });
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    expect(screen.getByText('Import cancelled.')).toBeTruthy();
    expect(screen.queryByText('Tap the button above to try again.')).toBeNull();
  });

  it('shows distinct timeout message when connector rejects with IMPORT_TIMEOUT (KAN-92)', async () => {
    mockImportFromGoogleTasks.mockRejectedValueOnce(new Error('IMPORT_TIMEOUT'));
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    expect(screen.getByText('Import timed out. Check your connection and try again.')).toBeTruthy();
    expect(screen.queryByText('Import failed. Tap to retry.')).toBeNull();
  });

  it('each source button is independent — pressing one does not affect the other', async () => {
    mockImportFromGoogleTasks.mockResolvedValueOnce({ imported: 3, skipped: 0, failed: 0 });
    mockImportFromGoogleCalendar.mockResolvedValueOnce({ imported: 7, skipped: 2, failed: 1 });
    renderSection();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Tasks'));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Google Calendar'));
    });

    expect(screen.getByText('3 imported · 0 skipped · 0 failed')).toBeTruthy();
    expect(screen.getByText('7 imported · 2 skipped · 1 failed')).toBeTruthy();
  });
});

// ─── Tests — iOS ─────────────────────────────────────────────────────────────

describe('ImportTasksSection — iOS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  it('shows Reminders and Calendar buttons on iOS', () => {
    renderSection();
    expect(screen.getByLabelText('Import from Reminders')).toBeTruthy();
    expect(screen.getByLabelText('Import from Calendar')).toBeTruthy();
  });

  it('does not show Android buttons on iOS', () => {
    renderSection();
    expect(screen.queryByLabelText('Import from Google Tasks')).toBeNull();
    expect(screen.queryByLabelText('Import from Google Calendar')).toBeNull();
  });

  it('calls importFromReminders with the uid when pressed', async () => {
    mockImportFromReminders.mockResolvedValueOnce({ imported: 2, skipped: 0, failed: 0 });
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Reminders'));
    });
    expect(mockImportFromReminders).toHaveBeenCalledWith(UID);
  });

  it('shows success summary after Reminders import', async () => {
    mockImportFromReminders.mockResolvedValueOnce({ imported: 4, skipped: 1, failed: 0 });
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Reminders'));
    });
    expect(screen.getByText('4 imported · 1 skipped · 0 failed')).toBeTruthy();
  });

  it('shows a user-friendly error state when Calendar connector fails', async () => {
    mockImportFromCalendar.mockRejectedValueOnce(new Error('Permission denied'));
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Import from Calendar'));
    });
    expect(screen.getByText('Import failed. Tap to retry.')).toBeTruthy();
    expect(screen.queryByText('Permission denied')).toBeNull();
  });
});
