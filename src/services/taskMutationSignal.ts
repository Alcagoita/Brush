/**
 * taskMutationSignal.ts — KAN-285 follow-up.
 *
 * TodayScreen's focus effect used to call refresh() (10 parallel Firestore
 * reads — tasks, user, prefs, categories, points, both inbox counts, trips,
 * mall snapshot) unconditionally on every return to the screen, because
 * that's the only mechanism edits made elsewhere (TaskFormScreen, a shared
 * task accepted, a task toggled from CalendarScreen) had to reach Today.
 *
 * Rather than guessing from navigation source or adding a persistent
 * Firestore listener (explicitly against this project's one-shot-fetch
 * rule), every task-mutating write marks this flag at its actual source —
 * services/firestore/tasks.ts's addTask/updateTask/deleteTask/setTaskDone,
 * and services/sharing.ts's acceptSharedTask. TodayScreen's focus effect
 * consumes it: a real mutation happened somewhere → refresh; nothing did →
 * skip the 10-query refetch entirely.
 *
 * A toggle made on Today itself also sets this (Today's own handleToggle
 * routes through setTaskDone same as everywhere else) — harmless, since
 * no focus transition happens from an in-place toggle; the flag is simply
 * consumed (and correctly triggers a refresh) the next time focus actually
 * changes for any reason.
 */

let _dirty = false;

/** Call from any task-mutating write (see file doc for the current call sites). */
export function markTasksDirty(): void {
  _dirty = true;
}

/** Reads and clears the flag in one step — call once per focus event. */
export function consumeTasksDirty(): boolean {
  const was = _dirty;
  _dirty = false;
  return was;
}

/** Test-only. */
export function __resetTasksDirtyForTests(): void {
  _dirty = false;
}
