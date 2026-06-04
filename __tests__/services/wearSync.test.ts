/**
 * KAN-35 — wearSync service unit tests.
 *
 * Covers:
 *   - syncTasksToWatch filters out done tasks before serialising
 *   - syncTasksToWatch sends only id/title/category/done fields
 *   - syncTasksToWatch no-ops on iOS
 */

import { Task } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSyncTasks = jest.fn();

jest.mock('../../src/native/WearSyncModule', () => ({
  __esModule: true,
  default: { syncTasks: (...args: unknown[]) => mockSyncTasks(...args) },
}));

jest.mock('@react-native-firebase/firestore', () => () => ({}));

// Platform.OS default is 'android'; individual tests override via spy below.
jest.mock('react-native', () => ({
  Platform:      { OS: 'android' },
  NativeModules: {},
}));

import { syncTasksToWatch } from '../../src/services/wearSync';
import { Platform } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-1',
    title:     'Buy groceries',
    category:  'errands',
    done:      false,
    date:      '2026-06-10',
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Task['createdAt'],
    ...overrides,
  } as Task;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('syncTasksToWatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to Android before each test.
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
  });

  it('calls syncTasks with JSON of undone tasks', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Buy groceries', done: false }),
      makeTask({ id: 't2', title: 'Call dentist',  done: false }),
    ];

    syncTasksToWatch(tasks);

    expect(mockSyncTasks).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(mockSyncTasks.mock.calls[0][0]);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual({ id: 't1', title: 'Buy groceries', category: 'errands', done: false });
    expect(sent[1]).toEqual({ id: 't2', title: 'Call dentist',  category: 'errands', done: false });
  });

  it('filters out done tasks', () => {
    const tasks = [
      makeTask({ id: 't1', done: false }),
      makeTask({ id: 't2', done: true }),
    ];

    syncTasksToWatch(tasks);

    const sent = JSON.parse(mockSyncTasks.mock.calls[0][0]);
    expect(sent).toHaveLength(1);
    expect(sent[0].id).toBe('t1');
  });

  it('sends an empty array when all tasks are done', () => {
    syncTasksToWatch([makeTask({ done: true })]);

    const sent = JSON.parse(mockSyncTasks.mock.calls[0][0]);
    expect(sent).toHaveLength(0);
  });

  it('sends an empty array when the task list is empty', () => {
    syncTasksToWatch([]);

    const sent = JSON.parse(mockSyncTasks.mock.calls[0][0]);
    expect(sent).toHaveLength(0);
  });

  it('does not include extra fields beyond id/title/category/done', () => {
    syncTasksToWatch([makeTask({ id: 't1', done: false })]);

    const sent = JSON.parse(mockSyncTasks.mock.calls[0][0]);
    expect(Object.keys(sent[0]).sort()).toEqual(['category', 'done', 'id', 'title']);
  });

  it('no-ops on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    syncTasksToWatch([makeTask()]);
    expect(mockSyncTasks).not.toHaveBeenCalled();
  });
});
