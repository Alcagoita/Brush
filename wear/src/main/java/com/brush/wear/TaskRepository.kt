/**
 * TaskRepository.kt — in-memory task store for the Wear OS companion app (KAN-35).
 *
 * Exposes a StateFlow that the watch UI (KAN-37) observes. Updated by
 * WearDataListenerService whenever the phone pushes a new task list.
 */

package com.brush.wear

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray

data class WatchTask(
    val id: String,
    val title: String,
    val category: String,
    val done: Boolean,
)

object TaskRepository {

    private val _tasks = MutableStateFlow<List<WatchTask>>(emptyList())
    val tasks: StateFlow<List<WatchTask>> = _tasks

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
        _tasks.value = list
    }
}
