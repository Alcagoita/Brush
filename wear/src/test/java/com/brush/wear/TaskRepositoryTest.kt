/**
 * TaskRepositoryTest.kt — KAN-107 offline scenario tests.
 *
 * Covers the four required mark-done offline scenarios using the pure-Kotlin
 * TaskRepository singleton. The Wearable DataClient and Firebase layers are not
 * exercised here — they are represented by calling updateFromJson() (or not) to
 * simulate whether the authoritative DataClient sync arrived.
 *
 * Test matrix:
 *
 * | # | Scenario                         | Watch state after        | pendingSync |
 * |---|----------------------------------|--------------------------|-------------|
 * | 1 | Happy path                       | done=true, reconciled    | false       |
 * | 2 | No connected nodes (no sync)     | done=true, unreconciled  | true (>5s)  |
 * | 3 | Firestore write fails (no sync)  | done=true, unreconciled  | true (>5s)  |
 * | 4 | Reconnect — DataClient reconciles| done=true, reconciled    | false       |
 *
 * Scenarios 2 and 3 produce identical watch-side state: the optimistic update
 * stays and pendingSync becomes true after 5s because no authoritative sync
 * arrives in either case. The difference (message queued vs. dropped) is covered
 * by MarkDoneClient's pendingQueue, which is not exercised here.
 */

package com.brush.wear

import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TaskRepositoryTest {

    private val testDispatcher = StandardTestDispatcher()
    private val testScope      = TestScope(testDispatcher)

    @Before
    fun setUp() {
        // Inject test scope so delay() runs on virtual time, not real time.
        TaskRepository.scope = testScope
        // Reset to a known empty state.
        TaskRepository.updateFromJson("[]")
    }

    // ── 1. Happy path ─────────────────────────────────────────────────────────────
    // Tap mark-done → DataClient sync arrives before the 5s timeout → reconciled.

    @Test
    fun `happy path - DataClient sync arrives before timeout, pendingSync stays false`() =
        testScope.runTest {
            TaskRepository.updateFromJson(taskJson("t1", done = false))

            TaskRepository.markDoneOptimistic("t1")

            // DataClient sync arrives immediately (phone reachable, Firestore updated).
            TaskRepository.updateFromJson(taskJson("t1", done = true))

            val task = TaskRepository.tasks.value.first { it.id == "t1" }
            assertTrue("task should be done", task.done)
            assertFalse("pendingSync should be cleared by sync", task.pendingSync)
        }

    // ── 2. No connected nodes ─────────────────────────────────────────────────────
    // Phone unreachable → message queued → no DataClient sync → pendingSync=true after 5s.

    @Test
    fun `no connected nodes - optimistic update stays, pendingSync set after 5s timeout`() =
        testScope.runTest {
            TaskRepository.updateFromJson(taskJson("t1", done = false))

            TaskRepository.markDoneOptimistic("t1")

            // Immediately: task optimistically done, not yet flagged
            val taskImmediate = TaskRepository.tasks.value.first { it.id == "t1" }
            assertTrue("task should be optimistically done", taskImmediate.done)
            assertFalse("pendingSync should not be set yet", taskImmediate.pendingSync)

            // No DataClient sync arrives. Advance past the 5s timeout.
            advanceTimeBy(5_001)

            val taskAfterTimeout = TaskRepository.tasks.value.first { it.id == "t1" }
            assertTrue("task should still be done", taskAfterTimeout.done)
            assertTrue("pendingSync should be set after timeout", taskAfterTimeout.pendingSync)
        }

    // ── 3. Firestore write fails (unauthenticated) ────────────────────────────────
    // Phone received message but Firestore write failed → no DataClient sync sent back
    // → watch stays in optimistic state → pendingSync=true after 5s.
    //
    // Watch-side observable behaviour is identical to scenario 2: the distinction
    // (message delivered vs. not delivered) is on the phone side. Both result in
    // no authoritative DataClient sync arriving at the watch.

    @Test
    fun `firestore write fails - watch stays in optimistic done state, pendingSync set after 5s`() =
        testScope.runTest {
            TaskRepository.updateFromJson(taskJson("t1", done = false))

            TaskRepository.markDoneOptimistic("t1")

            // Phone received message but Firestore rejected it (unauthenticated).
            // No DataClient sync is sent back — simulate by not calling updateFromJson.
            advanceTimeBy(5_001)

            val task = TaskRepository.tasks.value.first { it.id == "t1" }
            assertTrue("task should remain optimistically done", task.done)
            assertTrue("pendingSync should be set — Firestore failed, no reconciliation", task.pendingSync)
        }

    // ── 4. Reconnect after offline ────────────────────────────────────────────────
    // Watch was offline → message queued → phone reconnects → queue flushed → Firestore
    // updated → DataClient sync arrives → watch reconciled.

    @Test
    fun `reconnect - DataClient sync after reconnect clears pendingSync`() =
        testScope.runTest {
            TaskRepository.updateFromJson(taskJson("t1", done = false))

            TaskRepository.markDoneOptimistic("t1")

            // Phone was offline — pendingSync will set at 5s if we don't reconcile.
            // Simulate reconnect: MarkDoneClient.flushPendingQueue() runs on phone reconnect,
            // Firestore is updated, DataClient sync arrives at the watch.
            advanceTimeBy(2_000) // reconnect before timeout

            TaskRepository.updateFromJson(taskJson("t1", done = true))

            val task = TaskRepository.tasks.value.first { it.id == "t1" }
            assertTrue("task should be done after reconciliation", task.done)
            assertFalse("pendingSync should be cleared by DataClient sync", task.pendingSync)
        }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private fun taskJson(id: String, done: Boolean): String =
        """[{"id":"$id","title":"Buy milk","category":"errands","done":$done}]"""
}
