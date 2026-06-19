/**
 * TaskRepository.kt — in-memory task store for the Wear OS companion app (KAN-35).
 *
 * Exposes a StateFlow that the watch UI (KAN-37) observes. Updated by
 * WearDataListenerService whenever the phone pushes a new task list.
 *
 * KAN-106: adds pendingSync tracking. When markDoneOptimistic() is called, a 5-second
 * timer starts. If the authoritative DataClient sync (updateFromJson) hasn't arrived
 * by then, the task's pendingSync flag is set to true so the UI can show a ⚠ indicator.
 * Calling updateFromJson() clears all pending entries — the authoritative list reconciles.
 */

package com.brush.wear

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray

private const val PENDING_SYNC_TIMEOUT_MS = 5_000L

data class WatchTask(
    val id: String,
    val title: String,
    val category: String,
    val done: Boolean,
    val pendingSync: Boolean = false,
)

object TaskRepository {

    private val _tasks = MutableStateFlow<List<WatchTask>>(emptyList())
    val tasks: StateFlow<List<WatchTask>> = _tasks

    // Replaceable for unit tests — production uses Dispatchers.Default.
    internal var scope: CoroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // Task IDs where mark-done was sent but DataClient hasn't reconciled yet.
    // ConcurrentHashMap.newKeySet — accessed from UI thread, Default coroutine, and service callbacks.
    private val pendingTaskIds: MutableSet<String> = java.util.concurrent.ConcurrentHashMap.newKeySet()

    /**
     * Optimistically mark a task done before the phone confirms via DataClient.
     * Starts a 5-second timer; if no authoritative sync arrives, sets pendingSync=true.
     */
    fun markDoneOptimistic(taskId: String) {
        pendingTaskIds.add(taskId)
        _tasks.value = _tasks.value.map {
            if (it.id == taskId) it.copy(done = true) else it
        }
        scope.launch {
            delay(PENDING_SYNC_TIMEOUT_MS)
            if (taskId in pendingTaskIds) {
                _tasks.value = _tasks.value.map {
                    if (it.id == taskId) it.copy(pendingSync = true) else it
                }
            }
        }
    }

    /**
     * Replace the task list with authoritative data from the phone.
     * Clears all pending entries — DataClient sync is the reconciliation point.
     */
    fun updateFromJson(json: String) {
        val list = mutableListOf<WatchTask>()
        runCatching {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    WatchTask(
                        id       = obj.getString("id"),
                        title    = obj.getString("title"),
                        category = obj.optString("category", "personal"),
                        done     = obj.optBoolean("done", false),
                    )
                )
            }
        }.onFailure { e ->
            android.util.Log.e("TaskRepository", "Failed to parse task JSON: ${e.message}")
        }
        pendingTaskIds.clear()
        _tasks.value = list
    }
}
