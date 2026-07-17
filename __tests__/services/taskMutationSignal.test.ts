/**
 * KAN-285 follow-up — taskMutationSignal.
 *
 * The flag TodayScreen's focus effect gates its refresh() call on: set by
 * any task-mutating write, consumed (read + cleared) once per focus check.
 */

import { markTasksDirty, consumeTasksDirty, __resetTasksDirtyForTests } from '../../src/services/taskMutationSignal';

describe('taskMutationSignal', () => {
  beforeEach(() => {
    __resetTasksDirtyForTests();
  });

  it('starts clean — consumeTasksDirty() is false with no prior mark', () => {
    expect(consumeTasksDirty()).toBe(false);
  });

  it('returns true once after a mark, then false again (consumed)', () => {
    markTasksDirty();
    expect(consumeTasksDirty()).toBe(true);
    expect(consumeTasksDirty()).toBe(false);
  });

  it('collapses multiple marks between checks into a single true', () => {
    markTasksDirty();
    markTasksDirty();
    markTasksDirty();
    expect(consumeTasksDirty()).toBe(true);
    expect(consumeTasksDirty()).toBe(false);
  });
});
